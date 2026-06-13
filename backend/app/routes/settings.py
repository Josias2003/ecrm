from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_roles, get_client_ip
from app.models.models import SystemSetting, AuditLog, User, ServiceRequest, AccountStatusEnum
from app.schemas.schemas import SystemSettingOut, SystemSettingUpdate

DEFAULT_SETTINGS = [
    ("community_auto_approve", "true", "Auto-approve community registrations"),
    ("min_password_length", "8", "Minimum password length"),
    ("support_email", "admin@reb.rw", "System support contact email"),
    ("equity_weight_infra", "30", "Gap analysis — infrastructure weight %"),
    ("equity_weight_teachers", "25", "Gap analysis — teachers weight %"),
    ("equity_weight_resources", "25", "Gap analysis — resources weight %"),
    ("equity_weight_connectivity", "20", "Gap analysis — connectivity weight %"),
]


def ensure_default_settings(db: Session):
    for key, value, label in DEFAULT_SETTINGS:
        if not db.query(SystemSetting).filter(SystemSetting.key == key).first():
            db.add(SystemSetting(key=key, value=value, label=label))
    db.commit()


settings_router = APIRouter(prefix="/api/settings", tags=["Settings"])


@settings_router.get("/", response_model=List[SystemSettingOut])
def list_settings(db: Session = Depends(get_db), cu=Depends(require_roles("admin"))):
    ensure_default_settings(db)
    rows = db.query(SystemSetting).order_by(SystemSetting.key).all()
    return [SystemSettingOut(key=r.key, value=r.value, label=r.label, updated_at=r.updated_at) for r in rows]


@settings_router.patch("/{key}", response_model=SystemSettingOut)
def update_setting(
    key: str,
    payload: SystemSettingUpdate,
    request: Request,
    db: Session = Depends(get_db),
    cu=Depends(require_roles("admin")),
):
    ensure_default_settings(db)
    row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not row:
        raise HTTPException(404, "Setting not found")
    row.value = payload.value.strip()
    row.updated_by = cu.id
    row.updated_at = datetime.utcnow()
    ip = get_client_ip(request)
    db.add(AuditLog(
        user_id=cu.id, action_type="UPDATE",
        description=f"Updated setting {key}",
        entity="SystemSetting", ip_address=ip,
    ))
    db.commit()
    db.refresh(row)
    return SystemSettingOut(key=row.key, value=row.value, label=row.label, updated_at=row.updated_at)
