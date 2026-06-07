from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user, require_roles, get_client_ip
from app.models.models import Feedback, FeedbackMessage, School, AuditLog, User
from app.schemas.schemas import (
    FeedbackOut, FeedbackCreate, FeedbackUpdate,
    FeedbackMessageOut, FeedbackMessageCreate,
)

feedback_router = APIRouter(prefix="/api/feedback", tags=["Feedback"])

FINAL_STATUSES = {"resolved", "closed"}

def log_action(db, user_id, action, desc, entity=None, eid=None, ip_address=None):
    db.add(AuditLog(user_id=user_id, action_type=action,
                    description=desc, entity=entity, entity_id=eid, ip_address=ip_address))

def _feedback_out(fb: Feedback) -> FeedbackOut:
    return FeedbackOut(
        id=fb.id, school_id=fb.school_id, issue_type=fb.issue_type,
        description=fb.description, reporter_name=fb.reporter_name,
        reporter_contact=fb.reporter_contact,
        status=fb.status.value if hasattr(fb.status, "value") else str(fb.status),
        reviewer_note=fb.reviewer_note,
        forwarded_to_reb=bool(fb.forwarded_to_reb),
        school_name=fb.school.name if fb.school else None,
        district=fb.school.district if fb.school else None,
        created_at=fb.created_at, updated_at=fb.updated_at,
    )

def _scope_query(q, cu):
    if cu.role == "community":
        return q.filter(Feedback.user_id == cu.id)
    if cu.role == "district" and cu.district:
        return q.filter(School.district == cu.district)
    if cu.role == "school" and cu.school_id:
        return q.filter(Feedback.school_id == cu.school_id)
    if cu.role == "reb":
        return q.filter(Feedback.forwarded_to_reb == True)
    return q

@feedback_router.get("", response_model=List[FeedbackOut])
def list_feedback(district: Optional[str]=Query(None),
                  school_id: Optional[int]=Query(None),
                  status: Optional[str]=Query(None),
                  issue_type: Optional[str]=Query(None),
                  skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=500),
                  db: Session = Depends(get_db), cu=Depends(get_current_user)):
    q = db.query(Feedback).join(School)
    q = _scope_query(q, cu)
    if district:
        q = q.filter(School.district == district)
    if school_id:
        q = q.filter(Feedback.school_id == school_id)
    if status:
        q = q.filter(Feedback.status == status)
    if issue_type:
        q = q.filter(Feedback.issue_type == issue_type)
    rows = q.order_by(Feedback.created_at.desc()).offset(skip).limit(limit).all()
    return [_feedback_out(fb) for fb in rows]

@feedback_router.post("/", response_model=FeedbackOut, status_code=201)
def submit_feedback(payload: FeedbackCreate, request: Request, db: Session = Depends(get_db),
                    cu=Depends(get_current_user)):
    if cu.role not in ["community", "school"]:
        raise HTTPException(403, "Your role cannot submit community feedback")
    s = db.query(School).filter(School.id == payload.school_id).first()
    if not s:
        raise HTTPException(404, "School not found")
    if cu.role == "school" and cu.school_id and cu.school_id != payload.school_id:
        raise HTTPException(403, "You can only submit feedback for your own school")
    fb = Feedback(**payload.model_dump(), user_id=cu.id)
    db.add(fb)
    db.flush()
    db.add(FeedbackMessage(feedback_id=fb.id, user_id=cu.id, content=payload.description))
    ip = get_client_ip(request)
    log_action(db, cu.id, "FEEDBACK", f"Feedback submitted for {s.name}: {payload.issue_type}", "Feedback", ip_address=ip)
    db.commit()
    db.refresh(fb)
    return _feedback_out(fb)

@feedback_router.patch("/{fid}", response_model=FeedbackOut)
def update_feedback(fid: int, payload: FeedbackUpdate, request: Request, db: Session = Depends(get_db),
                    cu=Depends(require_roles("reb","district"))):
    fb = db.query(Feedback).join(School).filter(Feedback.id == fid).first()
    if not fb:
        raise HTTPException(404, "Feedback not found")
    if cu.role == "district" and cu.district and fb.school.district != cu.district:
        raise HTTPException(403, "You can only update feedback in your district")
    if cu.role == "reb" and not fb.forwarded_to_reb:
        raise HTTPException(403, "This feedback was not forwarded to REB")

    current = fb.status.value if hasattr(fb.status, "value") else str(fb.status)
    if current in FINAL_STATUSES and payload.status and payload.status.value not in FINAL_STATUSES:
        pass  # allow reopen via /reopen endpoint only
    elif current in FINAL_STATUSES:
        raise HTTPException(400, "Use reopen to roll back closed feedback")

    next_status = payload.status.value if payload.status else current
    note = (payload.reviewer_note or "").strip()

    if next_status != current:
        if current == "pending" and next_status in ("resolved", "closed"):
            raise HTTPException(400, "Review feedback before resolving or closing it")
        if next_status in ("resolved", "closed") and len(note) < 12:
            raise HTTPException(422, "A note is required when resolving or closing (min 12 characters)")
        fb.status = payload.status

    if note:
        fb.reviewer_note = note

    fb.reviewed_by = cu.id
    fb.reviewed_at = datetime.utcnow()
    ip = get_client_ip(request)
    log_action(db, cu.id, "UPDATE", f"Feedback #{fid} → {next_status}", "Feedback", fid, ip_address=ip)
    db.commit()
    db.refresh(fb)
    return _feedback_out(fb)

@feedback_router.post("/{fid}/reopen", response_model=FeedbackOut)
def reopen_feedback(fid: int, request: Request, db: Session = Depends(get_db),
                    cu=Depends(require_roles("reb","district"))):
    fb = db.query(Feedback).join(School).filter(Feedback.id == fid).first()
    if not fb:
        raise HTTPException(404, "Feedback not found")
    if cu.role == "district" and cu.district and fb.school.district != cu.district:
        raise HTTPException(403, "Access denied")
    if cu.role == "reb" and not fb.forwarded_to_reb:
        raise HTTPException(403, "Not forwarded to REB")
    current = fb.status.value if hasattr(fb.status, "value") else str(fb.status)
    if current not in FINAL_STATUSES:
        raise HTTPException(400, "Only resolved or closed feedback can be reopened")
    from app.models.models import FeedbackStatusEnum
    fb.status = FeedbackStatusEnum.reviewed
    ip = get_client_ip(request)
    log_action(db, cu.id, "UPDATE", f"Feedback #{fid} reopened to reviewed", "Feedback", fid, ip_address=ip)
    db.commit()
    db.refresh(fb)
    return _feedback_out(fb)

@feedback_router.post("/{fid}/forward", response_model=FeedbackOut)
def forward_to_reb(fid: int, request: Request, db: Session = Depends(get_db),
                   cu=Depends(require_roles("district"))):
    fb = db.query(Feedback).join(School).filter(Feedback.id == fid).first()
    if not fb:
        raise HTTPException(404, "Feedback not found")
    if cu.district and fb.school.district != cu.district:
        raise HTTPException(403, "Access denied")
    fb.forwarded_to_reb = True
    fb.forwarded_at = datetime.utcnow()
    ip = get_client_ip(request)
    log_action(db, cu.id, "UPDATE", f"Forwarded feedback #{fid} to REB", "Feedback", fid, ip_address=ip)
    db.commit()
    db.refresh(fb)
    return _feedback_out(fb)

@feedback_router.get("/{fid}/messages", response_model=List[FeedbackMessageOut])
def list_messages(fid: int, db: Session = Depends(get_db), cu=Depends(get_current_user)):
    fb = db.query(Feedback).join(School).filter(Feedback.id == fid).first()
    if not fb:
        raise HTTPException(404, "Feedback not found")
    q = db.query(Feedback).join(School).filter(Feedback.id == fid)
    q = _scope_query(q, cu)
    if not q.first():
        raise HTTPException(403, "Access denied")
    msgs = db.query(FeedbackMessage).filter(FeedbackMessage.feedback_id == fid).order_by(FeedbackMessage.created_at).all()
    out = []
    for m in msgs:
        author = db.query(User).filter(User.id == m.user_id).first()
        out.append(FeedbackMessageOut(
            id=m.id, feedback_id=m.feedback_id, user_id=m.user_id, content=m.content,
            author_name=author.full_name if author else "Unknown",
            author_role=author.role.value if author else None,
            created_at=m.created_at,
        ))
    return out

@feedback_router.post("/{fid}/messages", response_model=FeedbackMessageOut, status_code=201)
def post_message(fid: int, payload: FeedbackMessageCreate, request: Request,
                 db: Session = Depends(get_db), cu=Depends(get_current_user)):
    fb = db.query(Feedback).join(School).filter(Feedback.id == fid).first()
    if not fb:
        raise HTTPException(404, "Feedback not found")
    allowed = cu.role in ("district", "reb", "community", "school")
    if cu.role == "community" and fb.user_id != cu.id:
        raise HTTPException(403, "Access denied")
    if cu.role == "school" and fb.school_id != cu.school_id:
        raise HTTPException(403, "Access denied")
    if cu.role == "district" and cu.district and fb.school.district != cu.district:
        raise HTTPException(403, "Access denied")
    if cu.role == "reb" and not fb.forwarded_to_reb:
        raise HTTPException(403, "Not forwarded to REB")
    if not allowed:
        raise HTTPException(403, "Access denied")
    content = (payload.content or "").strip()
    if not content:
        raise HTTPException(400, "Message cannot be empty")
    msg = FeedbackMessage(feedback_id=fid, user_id=cu.id, content=content)
    db.add(msg)
    ip = get_client_ip(request)
    log_action(db, cu.id, "FEEDBACK", f"Message on feedback #{fid}", "Feedback", fid, ip_address=ip)
    db.commit()
    db.refresh(msg)
    return FeedbackMessageOut(
        id=msg.id, feedback_id=msg.feedback_id, user_id=msg.user_id, content=msg.content,
        author_name=cu.full_name, author_role=cu.role.value,
        created_at=msg.created_at,
    )
