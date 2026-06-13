from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_roles, get_client_ip, role_str
from app.models.models import ServiceRequest, User, AuditLog, RequestStatusEnum
from app.schemas.schemas import ServiceRequestCreate, ServiceRequestUpdate, ServiceRequestOut

requests_router = APIRouter(prefix="/api/requests", tags=["Service Requests"])


def _serialize_request(db: Session, r: ServiceRequest) -> ServiceRequestOut:
    user = db.query(User).filter(User.id == r.user_id).first()
    status = r.status.value if hasattr(r.status, "value") else str(r.status)
    return ServiceRequestOut(
        id=r.id,
        user_id=r.user_id,
        user_name=user.full_name if user else None,
        user_email=user.email if user else None,
        request_type=r.request_type,
        title=r.title,
        description=r.description,
        status=status,
        admin_note=r.admin_note,
        entity_type=r.entity_type,
        entity_id=r.entity_id,
        resolved_by=r.resolved_by,
        resolved_at=r.resolved_at,
        created_at=r.created_at,
    )


@requests_router.get("/", response_model=List[ServiceRequestOut])
def list_requests(
    status: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    cu=Depends(get_current_user),
):
    role = role_str(cu)
    q = db.query(ServiceRequest)
    if role != "admin":
        q = q.filter(ServiceRequest.user_id == cu.id)
    if status:
        q = q.filter(ServiceRequest.status == status)
    rows = q.order_by(ServiceRequest.created_at.desc()).limit(200).all()
    return [_serialize_request(db, r) for r in rows]


@requests_router.post("/", response_model=ServiceRequestOut, status_code=201)
def create_request(
    payload: ServiceRequestCreate,
    request: Request,
    db: Session = Depends(get_db),
    cu=Depends(get_current_user),
):
    if role_str(cu) == "admin":
        raise HTTPException(400, "Admins resolve requests; they do not submit them")
    title = payload.title.strip()
    description = payload.description.strip()
    if not title or not description:
        raise HTTPException(400, "Title and description are required")
    r = ServiceRequest(
        user_id=cu.id,
        request_type=payload.request_type,
        title=title,
        description=description,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        status=RequestStatusEnum.pending,
    )
    db.add(r)
    ip = get_client_ip(request)
    db.add(AuditLog(
        user_id=cu.id, action_type="REQUEST",
        description=f"Submitted request: {title}",
        entity="ServiceRequest", ip_address=ip,
    ))
    db.commit()
    db.refresh(r)
    return _serialize_request(db, r)


@requests_router.patch("/{rid}", response_model=ServiceRequestOut)
def update_request(
    rid: int,
    payload: ServiceRequestUpdate,
    request: Request,
    db: Session = Depends(get_db),
    cu=Depends(require_roles("admin")),
):
    r = db.query(ServiceRequest).filter(ServiceRequest.id == rid).first()
    if not r:
        raise HTTPException(404, "Request not found")
    data = payload.model_dump(exclude_unset=True)
    if "status" in data:
        try:
            r.status = RequestStatusEnum(data["status"])
        except ValueError:
            raise HTTPException(400, "Invalid status")
        if r.status in (RequestStatusEnum.approved, RequestStatusEnum.resolved, RequestStatusEnum.rejected):
            r.resolved_by = cu.id
            r.resolved_at = datetime.utcnow()
    if "admin_note" in data:
        r.admin_note = data["admin_note"]
    ip = get_client_ip(request)
    db.add(AuditLog(
        user_id=cu.id, action_type="UPDATE",
        description=f"Updated service request #{rid} — {r.status.value}",
        entity="ServiceRequest", entity_id=rid, ip_address=ip,
    ))
    db.commit()
    db.refresh(r)
    return _serialize_request(db, r)
