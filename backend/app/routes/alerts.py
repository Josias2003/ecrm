from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from app.core.database import get_db
from app.core.security import get_current_user, require_roles, get_client_ip
from app.models.models import ResourceAlert, School, AuditLog
from app.schemas.schemas import AlertOut, AlertResolve

alerts_router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

def log_action(db, user_id, action, desc, entity=None, eid=None, ip_address=None):
    db.add(AuditLog(user_id=user_id, action_type=action,
                    description=desc, entity=entity, entity_id=eid, ip_address=ip_address))

def _alert_out(a: ResourceAlert) -> AlertOut:
    return AlertOut(
        id=a.id, school_id=a.school_id,
        alert_type=a.alert_type, level=a.level.value if hasattr(a.level, "value") else str(a.level),
        message=a.message, is_resolved=a.is_resolved,
        forwarded_to_reb=bool(a.forwarded_to_reb),
        school_name=a.school.name if a.school else None,
        district=a.school.district if a.school else None,
        created_at=a.created_at,
    )

def _alerts_list_query(db, cu, district=None, school_id=None, level=None, resolved=False):
    q = db.query(ResourceAlert).join(School)
    if cu.role == "district" and cu.district:
        q = q.filter(School.district == cu.district)
    elif cu.role == "reb":
        q = q.filter(ResourceAlert.forwarded_to_reb == True)
    if cu.role == "school" and cu.school_id:
        q = q.filter(ResourceAlert.school_id == cu.school_id)
    if cu.role == "enumerator" and cu.district and cu.district != "National":
        q = q.filter(School.district == cu.district)
    if cu.role == "community":
        return None
    if district:
        q = q.filter(School.district == district)
    if school_id:
        q = q.filter(ResourceAlert.school_id == school_id)
    if level:
        q = q.filter(ResourceAlert.level == level)
    return q.filter(ResourceAlert.is_resolved == resolved)

@alerts_router.get("/count")
def count_alerts(district: Optional[str]=Query(None),
                 school_id: Optional[int]=Query(None),
                 level: Optional[str]=Query(None),
                 resolved: Optional[bool]=Query(False),
                 db: Session = Depends(get_db), cu=Depends(get_current_user)):
    q = _alerts_list_query(db, cu, district, school_id, level, resolved)
    if q is None:
        return {"total": 0}
    return {"total": q.count()}

@alerts_router.get("/", response_model=List[AlertOut])
def list_alerts(district: Optional[str]=Query(None),
                school_id: Optional[int]=Query(None),
                level: Optional[str]=Query(None),
                resolved: Optional[bool]=Query(False),
                skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=500),
                db: Session = Depends(get_db), cu=Depends(get_current_user)):
    q = _alerts_list_query(db, cu, district, school_id, level, resolved)
    if q is None:
        return []
    rows = q.order_by(ResourceAlert.created_at.desc()).offset(skip).limit(limit).all()
    return [_alert_out(a) for a in rows]

@alerts_router.post("/{aid}/forward")
def forward_alert(aid: int, request: Request, db: Session = Depends(get_db),
                  cu=Depends(require_roles("district"))):
    a = db.query(ResourceAlert).join(School).filter(ResourceAlert.id == aid).first()
    if not a:
        raise HTTPException(404, "Alert not found")
    if cu.district and a.school.district != cu.district:
        raise HTTPException(403, "Access denied")
    a.forwarded_to_reb = True
    a.forwarded_at = datetime.utcnow()
    ip = get_client_ip(request)
    log_action(db, cu.id, "UPDATE", f"Forwarded alert #{aid} to REB", "Alert", aid, ip_address=ip)
    db.commit()
    return {"message": "Alert forwarded to REB"}

@alerts_router.patch("/{aid}/resolve")
def resolve_alert(aid: int, payload: AlertResolve, request: Request, db: Session = Depends(get_db),
                  cu=Depends(require_roles("reb","district"))):
    note = payload.resolution_note.strip()
    if len(note) < 12:
        raise HTTPException(422, "Resolution note must describe the action taken")
    a = db.query(ResourceAlert).join(School).filter(ResourceAlert.id == aid).first()
    if not a:
        raise HTTPException(404, "Alert not found")
    if cu.role == "district" and cu.district and a.school.district != cu.district:
        raise HTTPException(403, "You can only resolve alerts in your district")
    if cu.role == "reb" and not a.forwarded_to_reb:
        raise HTTPException(403, "Alert not forwarded to REB")
    if a.is_resolved:
        raise HTTPException(400, "Alert is already resolved")
    a.is_resolved = True
    a.resolved_at = datetime.utcnow()
    ip = get_client_ip(request)
    log_action(db, cu.id, "RESOLVE", f"Alert #{aid} resolved: {note}", "Alert", aid, ip_address=ip)
    db.commit()
    return {"message": "Alert resolved"}

@alerts_router.post("/{aid}/reopen")
def reopen_alert(aid: int, request: Request, db: Session = Depends(get_db),
                 cu=Depends(require_roles("reb","district"))):
    a = db.query(ResourceAlert).join(School).filter(ResourceAlert.id == aid).first()
    if not a:
        raise HTTPException(404, "Alert not found")
    if cu.role == "district" and cu.district and a.school.district != cu.district:
        raise HTTPException(403, "Access denied")
    if cu.role == "reb" and not a.forwarded_to_reb:
        raise HTTPException(403, "Not forwarded to REB")
    if not a.is_resolved:
        raise HTTPException(400, "Alert is not resolved")
    a.is_resolved = False
    a.resolved_at = None
    ip = get_client_ip(request)
    log_action(db, cu.id, "UPDATE", f"Alert #{aid} reopened", "Alert", aid, ip_address=ip)
    db.commit()
    return {"message": "Alert reopened"}
