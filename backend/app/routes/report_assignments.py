from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, get_client_ip, role_str
from app.models.models import (
    ReportAssignment, ReportAssignmentStatusEnum, User, School, AuditLog, RoleEnum,
)
from app.schemas.schemas import (
    ReportAssignmentCreate, ReportAssignmentUpdate, ReportAssignmentOut, ReportAssigneeOut,
)
from app.services.report_catalog import REPORT_CATALOG, ASSIGNABLE_BY

report_assignments_router = APIRouter(prefix="/api/report-assignments", tags=["Report Assignments"])


def _report_label(rtype: str) -> str:
    meta = REPORT_CATALOG.get(rtype)
    return meta["label"] if meta else rtype.replace("_", " ").title()


def _serialize(db: Session, a: ReportAssignment) -> ReportAssignmentOut:
    req = db.query(User).filter(User.id == a.requested_by_id).first()
    assignee = db.query(User).filter(User.id == a.assigned_to_id).first()
    school = db.query(School).filter(School.id == a.school_id).first() if a.school_id else None
    status = a.status.value if hasattr(a.status, "value") else str(a.status)
    return ReportAssignmentOut(
        id=a.id,
        report_type=a.report_type,
        report_label=_report_label(a.report_type),
        title=a.title,
        instructions=a.instructions,
        requested_by_id=a.requested_by_id,
        requested_by_name=req.full_name if req else None,
        assigned_to_id=a.assigned_to_id,
        assigned_to_name=assignee.full_name if assignee else None,
        district=a.district,
        school_id=a.school_id,
        school_name=school.name if school else None,
        due_date=a.due_date,
        status=status,
        response_note=a.response_note,
        reviewer_note=a.reviewer_note,
        submitted_at=a.submitted_at,
        resolved_at=a.resolved_at,
        created_at=a.created_at,
    )


def _can_assign(cu) -> bool:
    return role_str(cu) in ASSIGNABLE_BY


def _allowed_target_roles(cu) -> List[str]:
    return ASSIGNABLE_BY.get(role_str(cu), [])


def _validate_assignment_chain(db: Session, cu, assignee: User, school_id: Optional[int]):
    role = role_str(cu)
    target_role = role_str(assignee)
    allowed = _allowed_target_roles(cu)
    if target_role not in allowed:
        raise HTTPException(400, f"You cannot assign report tasks to {target_role} users")

    if role == "reb":
        if target_role != "district":
            raise HTTPException(400, "REB officers assign tasks to district officers only")
        if cu.district and assignee.district and cu.district != assignee.district:
            pass  # REB is national
    elif role == "district":
        if assignee.district and cu.district and assignee.district != cu.district:
            raise HTTPException(400, "Assignee must be in your district")
        if target_role == "school" and school_id:
            school = db.query(School).filter(School.id == school_id).first()
            if not school or school.district != cu.district:
                raise HTTPException(400, "School must be in your district")
            if assignee.school_id and assignee.school_id != school_id:
                raise HTTPException(400, "Assignee is not the head of the selected school")
    elif role == "admin":
        pass


@report_assignments_router.get("/assignees", response_model=List[ReportAssigneeOut])
def list_assignees(
    role_filter: Optional[str] = Query(None),
    district: Optional[str] = Query(None),
    school_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    cu=Depends(get_current_user),
):
    if not _can_assign(cu):
        raise HTTPException(403, "Your role cannot assign report tasks")
    allowed = _allowed_target_roles(cu)
    q = db.query(User).filter(User.is_active == True)
    if role_filter:
        if role_filter not in allowed:
            raise HTTPException(400, "Invalid assignee role for your account")
        q = q.filter(User.role == role_filter)
    else:
        q = q.filter(User.role.in_(allowed))
    if role_str(cu) == "district" and cu.district:
        q = q.filter(User.district == cu.district)
    elif district:
        q = q.filter(User.district == district)
    if school_id:
        q = q.filter(User.school_id == school_id)
    users = q.order_by(User.full_name).limit(200).all()
    return [
        ReportAssigneeOut(
            id=u.id,
            full_name=u.full_name,
            role=role_str(u),
            district=u.district,
            school_id=u.school_id,
        )
        for u in users
    ]


@report_assignments_router.get("/", response_model=List[ReportAssignmentOut])
def list_assignments(
    scope: str = Query("all"),
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    cu=Depends(get_current_user),
):
    role = role_str(cu)
    q = db.query(ReportAssignment)
    if scope == "incoming":
        q = q.filter(ReportAssignment.assigned_to_id == cu.id)
    elif scope == "outgoing":
        q = q.filter(ReportAssignment.requested_by_id == cu.id)
    elif role == "admin":
        pass
    else:
        q = q.filter(
            (ReportAssignment.assigned_to_id == cu.id)
            | (ReportAssignment.requested_by_id == cu.id)
        )
    if status:
        q = q.filter(ReportAssignment.status == status)
    rows = q.order_by(ReportAssignment.created_at.desc()).limit(200).all()
    return [_serialize(db, a) for a in rows]


@report_assignments_router.post("/", response_model=ReportAssignmentOut, status_code=201)
def create_assignment(
    payload: ReportAssignmentCreate,
    request: Request,
    db: Session = Depends(get_db),
    cu=Depends(get_current_user),
):
    if not _can_assign(cu):
        raise HTTPException(403, "Your role cannot assign report tasks")
    if payload.report_type not in REPORT_CATALOG:
        raise HTTPException(400, "Unknown report type")
    assignee = db.query(User).filter(User.id == payload.assigned_to_id).first()
    if not assignee:
        raise HTTPException(404, "Assignee not found")
    _validate_assignment_chain(db, cu, assignee, payload.school_id)

    due = None
    if payload.due_date:
        try:
            due = datetime.strptime(payload.due_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(400, "due_date must be YYYY-MM-DD")

    district = assignee.district or cu.district
    if payload.school_id:
        school = db.query(School).filter(School.id == payload.school_id).first()
        if school:
            district = school.district

    a = ReportAssignment(
        report_type=payload.report_type,
        title=payload.title.strip(),
        instructions=(payload.instructions or "").strip() or None,
        requested_by_id=cu.id,
        assigned_to_id=payload.assigned_to_id,
        district=district,
        school_id=payload.school_id,
        due_date=due,
        status=ReportAssignmentStatusEnum.pending,
    )
    db.add(a)
    ip = get_client_ip(request)
    db.add(AuditLog(
        user_id=cu.id, action_type="ASSIGN",
        description=f"Assigned report task: {a.title}",
        entity="ReportAssignment", entity_id=a.id, ip_address=ip,
    ))
    db.commit()
    db.refresh(a)
    return _serialize(db, a)


@report_assignments_router.patch("/{aid}", response_model=ReportAssignmentOut)
def update_assignment(
    aid: int,
    payload: ReportAssignmentUpdate,
    request: Request,
    db: Session = Depends(get_db),
    cu=Depends(get_current_user),
):
    a = db.query(ReportAssignment).filter(ReportAssignment.id == aid).first()
    if not a:
        raise HTTPException(404, "Assignment not found")

    role = role_str(cu)
    is_assignee = a.assigned_to_id == cu.id
    is_requester = a.requested_by_id == cu.id
    is_admin = role == "admin"

    if not (is_assignee or is_requester or is_admin):
        raise HTTPException(403, "Not allowed")

    if payload.status:
        new_status = payload.status
        valid = {s.value for s in ReportAssignmentStatusEnum}
        if new_status not in valid:
            raise HTTPException(400, "Invalid status")

        if new_status in ("in_progress", "submitted") and not (is_assignee or is_admin):
            raise HTTPException(403, "Only the assignee can update task progress")
        if new_status in ("accepted", "rejected") and not (is_requester or is_admin):
            raise HTTPException(403, "Only the requester can accept or reject submissions")

        a.status = ReportAssignmentStatusEnum(new_status)
        if new_status == "submitted":
            a.submitted_at = datetime.utcnow()
        if new_status in ("accepted", "rejected"):
            a.resolved_at = datetime.utcnow()
            a.resolved_by_id = cu.id

    if payload.response_note is not None and (is_assignee or is_admin):
        a.response_note = payload.response_note.strip() or None
    if payload.reviewer_note is not None and (is_requester or is_admin):
        a.reviewer_note = payload.reviewer_note.strip() or None

    ip = get_client_ip(request)
    db.add(AuditLog(
        user_id=cu.id, action_type="UPDATE",
        description=f"Updated report assignment #{aid}",
        entity="ReportAssignment", entity_id=aid, ip_address=ip,
    ))
    db.commit()
    db.refresh(a)
    return _serialize(db, a)
