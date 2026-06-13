from sqlalchemy.orm import Session

from app.models.models import SystemSetting


def _ensure_defaults(db: Session):
    from app.routes.settings import ensure_default_settings
    ensure_default_settings(db)


def get_setting(db: Session, key: str, default: str = "") -> str:
    _ensure_defaults(db)
    row = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    return row.value if row else default


def get_int_setting(db: Session, key: str, default: int) -> int:
    try:
        return int(get_setting(db, key, str(default)))
    except (TypeError, ValueError):
        return default


def get_bool_setting(db: Session, key: str, default: bool = False) -> bool:
    return get_setting(db, key, str(default).lower()).lower() in ("true", "1", "yes")


def min_password_length(db: Session) -> int:
    return max(6, get_int_setting(db, "min_password_length", 8))


def get_equity_weights(db: Session) -> dict:
    return {
        "infra": get_int_setting(db, "equity_weight_infra", 30),
        "teachers": get_int_setting(db, "equity_weight_teachers", 25),
        "resources": get_int_setting(db, "equity_weight_resources", 25),
        "connectivity": get_int_setting(db, "equity_weight_connectivity", 20),
    }
