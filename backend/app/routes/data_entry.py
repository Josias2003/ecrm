from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_roles, get_client_ip
from app.models.models import FieldCollection, School, User, AuditLog
from app.schemas.schemas import FieldCollectionCreate, FieldCollectionOut
from app.routes.schools import _assert_school_scope, log_action

data_entry_router = APIRouter(prefix="/api/data-entry", tags=["Data Entry"])

VALID_TYPES = {"survey", "infra", "teachers", "resources", "enrollment"}


def _serialize(row: FieldCollection, db: Session) -> FieldCollectionOut:
    u = db.query(User).filter(User.id == row.user_id).first()
    return FieldCollectionOut(
        id=row.id,
        school_id=row.school_id,
        user_id=row.user_id,
        user_name=u.full_name if u else None,
        collection_type=row.collection_type,
        notes=row.notes,
        created_at=row.created_at,
    )


@data_entry_router.get("/", response_model=List[FieldCollectionOut])
def list_collections(
    school_id: Optional[int] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    cu=Depends(require_roles("school", "district", "enumerator", "admin")),
):
    q = db.query(FieldCollection)
    role = cu.role.value if hasattr(cu.role, "value") else str(cu.role)
    if role == "school":
        if not cu.school_id:
            return []
        q = q.filter(FieldCollection.school_id == cu.school_id)
    elif role in ("district", "enumerator") and cu.district and cu.district != "National":
        sids = [s.id for s in db.query(School).filter(School.district == cu.district).all()]
        q = q.filter(FieldCollection.school_id.in_(sids))
    if school_id:
        school = db.query(School).filter(School.id == school_id).first()
        if not school:
            raise HTTPException(404, "School not found")
        _assert_school_scope(cu, school)
        q = q.filter(FieldCollection.school_id == school_id)
    rows = q.order_by(FieldCollection.created_at.desc()).limit(limit).all()
    return [_serialize(r, db) for r in rows]


@data_entry_router.post("/", response_model=FieldCollectionOut, status_code=201)
def record_collection(
    payload: FieldCollectionCreate,
    request: Request,
    db: Session = Depends(get_db),
    cu=Depends(require_roles("school", "district", "enumerator", "admin")),
):
    if payload.collection_type not in VALID_TYPES:
        raise HTTPException(400, f"Invalid collection type. Use one of: {', '.join(sorted(VALID_TYPES))}")
    school = db.query(School).filter(School.id == payload.school_id).first()
    if not school:
        raise HTTPException(404, "School not found")
    _assert_school_scope(cu, school)
    if cu.role == "school" and cu.school_id != payload.school_id:
        raise HTTPException(403, "You can only record collections for your school")

    row = FieldCollection(
        school_id=payload.school_id,
        user_id=cu.id,
        collection_type=payload.collection_type,
        notes=(payload.notes or "").strip() or None,
    )
    db.add(row)
    ip = get_client_ip(request)
    log_action(
        db, cu.id, "CREATE",
        f"Field collection ({payload.collection_type}) for {school.name}",
        "FieldCollection", None, ip_address=ip,
    )
    db.commit()
    db.refresh(row)
    return _serialize(row, db)
