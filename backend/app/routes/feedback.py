from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user, require_roles, get_client_ip
from app.models.models import Feedback, School, AuditLog
from app.schemas.schemas import FeedbackOut, FeedbackCreate, FeedbackUpdate

feedback_router = APIRouter(prefix="/api/feedback", tags=["Feedback"])

def log_action(db, user_id, action, desc, entity=None, eid=None, ip_address=None):
    db.add(AuditLog(user_id=user_id, action_type=action,
                    description=desc, entity=entity, entity_id=eid, ip_address=ip_address))

@feedback_router.get("/", response_model=List[FeedbackOut])
def list_feedback(district: Optional[str]=Query(None),
                  school_id: Optional[int]=Query(None),
                  status: Optional[str]=Query(None),
                  issue_type: Optional[str]=Query(None),
                  skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=500),
                  db: Session = Depends(get_db), cu=Depends(get_current_user)):
    q = db.query(Feedback).join(School)
    if cu.role == "district" and cu.district:
        q = q.filter(School.district == cu.district)
    if cu.role == "school" and cu.school_id:
        q = q.filter(Feedback.school_id == cu.school_id)
    if district:
        q = q.filter(School.district == district)
    if school_id:
        q = q.filter(Feedback.school_id == school_id)
    if status:
        q = q.filter(Feedback.status == status)
    if issue_type:
        q = q.filter(Feedback.issue_type == issue_type)
    return q.order_by(Feedback.created_at.desc()).offset(skip).limit(limit).all()

@feedback_router.post("/", response_model=FeedbackOut, status_code=201)
def submit_feedback(payload: FeedbackCreate, request: Request, db: Session = Depends(get_db),
                    cu=Depends(get_current_user)):
    s = db.query(School).filter(School.id == payload.school_id).first()
    if not s:
        raise HTTPException(404, "School not found")
    fb = Feedback(**payload.model_dump(), user_id=cu.id)
    db.add(fb)
    ip = get_client_ip(request)
    log_action(db, cu.id, "FEEDBACK", f"Feedback submitted for {s.name}: {payload.issue_type}", "Feedback", ip_address=ip)
    db.commit()
    db.refresh(fb)
    return fb

@feedback_router.patch("/{fid}", response_model=FeedbackOut)
def update_feedback(fid: int, payload: FeedbackUpdate, request: Request, db: Session = Depends(get_db),
                    cu=Depends(require_roles("admin","reb","district"))):
    fb = db.query(Feedback).filter(Feedback.id == fid).first()
    if not fb:
        raise HTTPException(404, "Feedback not found")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(fb, k, v)
    fb.reviewed_by = cu.id
    fb.reviewed_at = datetime.utcnow()
    ip = get_client_ip(request)
    log_action(db, cu.id, "UPDATE", f"Feedback #{fid} → {payload.status}", "Feedback", fid, ip_address=ip)
    db.commit()
    db.refresh(fb)
    return fb
