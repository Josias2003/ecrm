"""Validate user role + district/school assignment rules."""

from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.data.rwanda_districts import DISTRICT_NAMES
from app.models.models import User, School, RoleEnum

NATIONAL = "National"


def _role_value(role) -> str:
    return role.value if hasattr(role, "value") else str(role)


def validate_user_scope(
    db: Session,
    *,
    role,
    district: Optional[str],
    school_id: Optional[int],
    exclude_user_id: Optional[int] = None,
) -> tuple[Optional[str], Optional[int]]:
    """Return normalized (district, school_id). Raises HTTPException on invalid scope."""
    if isinstance(role, str):
        role = RoleEnum(role)
    rv = _role_value(role)

    if len(rv) < 1:
        raise HTTPException(400, "Role is required")

    district = (district or "").strip() or None
    if district == NATIONAL:
        district = NATIONAL

    if rv in ("admin", "reb"):
        district = NATIONAL
        school_id = None
    elif rv in ("district", "enumerator"):
        if not district or district == NATIONAL:
            raise HTTPException(400, f"{rv.title()} role requires an assigned district")
        if district not in DISTRICT_NAMES:
            raise HTTPException(400, f"Unknown district: {district}")
        school_id = None
    elif rv == "school":
        if not district or district == NATIONAL:
            raise HTTPException(400, "School Head requires an assigned district")
        if district not in DISTRICT_NAMES:
            raise HTTPException(400, f"Unknown district: {district}")
        if not school_id:
            raise HTTPException(400, "School Head must be linked to a school")
        school = db.query(School).filter(School.id == school_id).first()
        if not school:
            raise HTTPException(400, "Selected school does not exist")
        if school.district != district:
            raise HTTPException(
                400,
                f"School is in {school.district}; user district must match",
            )
        q = db.query(User).filter(
            User.role == RoleEnum.school,
            User.school_id == school_id,
            User.is_active == True,
        )
        if exclude_user_id:
            q = q.filter(User.id != exclude_user_id)
        existing = q.first()
        if existing:
            raise HTTPException(
                400,
                f"School already has an active head ({existing.full_name}). Deactivate or reassign first.",
            )
    elif rv == "community":
        school_id = None
        if district == NATIONAL:
            district = None
        elif district and district not in DISTRICT_NAMES:
            raise HTTPException(400, f"Unknown district: {district}")
    else:
        raise HTTPException(400, f"Unknown role: {rv}")

    return district, school_id


def user_out_school_name(db: Session, school_id: Optional[int]) -> Optional[str]:
    if not school_id:
        return None
    school = db.query(School).filter(School.id == school_id).first()
    return school.name if school else None
