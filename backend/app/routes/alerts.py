from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user, require_roles, get_client_ip
from app.models.models import ResourceAlert, School, AuditLog
from app.schemas.schemas import AlertOut

alerts_router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

def log_action(db, user_id, action, desc, entity=None, eid=None, ip_address=None):
    db.add(AuditLog(user_id=user_id, action_type=action,
                    description=desc, entity=entity, entity_id=eid, ip_address=ip_address))

@alerts_router.get("/", response_model=List[AlertOut])
def list_alerts(district: Optional[str]=Query(None),
                school_id: Optional[int]=Query(None),
                level: Optional[str]=Query(None),
                resolved: Optional[bool]=Query(False),
                skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=500),
                db: Session = Depends(get_db), cu=Depends(get_current_user)):
    q = db.query(ResourceAlert).join(School)
    if cu.role == "district" and cu.district:
        q = q.filter(School.district == cu.district)
    if cu.role == "school" and cu.school_id:
        q = q.filter(ResourceAlert.school_id == cu.school_id)
    if district:
        q = q.filter(School.district == district)
    if school_id:
        q = q.filter(ResourceAlert.school_id == school_id)
    if level:
        q = q.filter(ResourceAlert.level == level)
    q = q.filter(ResourceAlert.is_resolved == resolved)
    return q.order_by(ResourceAlert.created_at.desc()).offset(skip).limit(limit).all()

@alerts_router.patch("/{aid}/resolve")
def resolve_alert(aid: int, request: Request, db: Session = Depends(get_db),
                  cu=Depends(require_roles("admin","reb","district"))):
    a = db.query(ResourceAlert).filter(ResourceAlert.id == aid).first()
    if not a:
        raise HTTPException(404, "Alert not found")
    a.is_resolved = True
    a.resolved_at = datetime.utcnow()
    ip = get_client_ip(request)
    log_action(db, cu.id, "RESOLVE", f"Alert #{aid} resolved", "Alert", aid, ip_address=ip)
    db.commit()
    return {"message": "Alert resolved"}
