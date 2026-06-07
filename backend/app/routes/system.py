from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles
from app.models.models import User, AuditLog, School

system_router = APIRouter(prefix="/api/system", tags=["System"])

@system_router.get("/health-stats")
def health_stats(db: Session = Depends(get_db), cu=Depends(require_roles("admin"))):
    since = datetime.utcnow() - timedelta(hours=24)
    users = db.query(User).all()
    by_role = {}
    for u in users:
        role = u.role.value if hasattr(u.role, "value") else str(u.role)
        by_role[role] = by_role.get(role, 0) + 1
    recent_logs = db.query(AuditLog).filter(AuditLog.created_at >= since).count()
    failed_logins = (
        db.query(AuditLog)
        .filter(AuditLog.action_type == "LOGIN_FAILED", AuditLog.created_at >= since)
        .count()
    )
    return {
        "api_status": "ok",
        "total_users": len(users),
        "active_users": sum(1 for u in users if u.is_active),
        "inactive_users": sum(1 for u in users if not u.is_active),
        "users_by_role": by_role,
        "total_schools": db.query(School).count(),
        "audit_events_24h": recent_logs,
        "failed_logins_24h": failed_logins,
    }
