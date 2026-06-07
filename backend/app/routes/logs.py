from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from fastapi import HTTPException
from app.core.security import get_current_user, require_roles
from app.models.models import AuditLog, EnrollmentHistory, School, User
from app.schemas.schemas import AuditLogOut, EnrollmentHistoryOut

logs_router = APIRouter(prefix="/api/logs", tags=["Logs"])

@logs_router.get("", response_model=List[AuditLogOut])
def get_logs(limit: int=Query(50, le=500),
             action_type: Optional[str]=Query(None),
             db: Session = Depends(get_db), cu=Depends(require_roles("admin"))):
    q = db.query(AuditLog)
    if action_type:
        q = q.filter(AuditLog.action_type == action_type)
    rows = q.order_by(AuditLog.created_at.desc()).limit(limit).all()
    out = []
    for log in rows:
        user_name = None
        if log.user_id:
            u = db.query(User).filter(User.id == log.user_id).first()
            user_name = u.full_name if u else None
        out.append(AuditLogOut(
            id=log.id, user_id=log.user_id, action_type=log.action_type,
            description=log.description, entity=log.entity, entity_id=log.entity_id,
            ip_address=log.ip_address, user_name=user_name, created_at=log.created_at,
        ))
    return out

enrollment_router = APIRouter(prefix="/api/enrollment", tags=["Enrollment"])

@enrollment_router.get("/{school_id}", response_model=List[EnrollmentHistoryOut])
def get_enrollment(school_id: int, db: Session = Depends(get_db), cu=Depends(get_current_user)):
    # role-based access
    if cu.role == "school":
        if not cu.school_id or cu.school_id != school_id:
            raise HTTPException(403, "You can only access your own school's enrollment history")
    elif cu.role in ["district", "enumerator", "community"]:
        if cu.district and cu.district != "National":
            school = db.query(School).filter(School.id == school_id).first()
            if not school:
                raise HTTPException(404, "School not found")
            if school.district != cu.district:
                raise HTTPException(403, "Access denied for this district")
    elif cu.role not in ["admin", "reb"]:
        raise HTTPException(403, "Access denied for this role")

    return (
        db.query(EnrollmentHistory)
        .filter(EnrollmentHistory.school_id == school_id)
        .order_by(EnrollmentHistory.year)
        .all()
    )
