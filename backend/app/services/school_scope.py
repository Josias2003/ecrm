from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.models import School


def scoped_schools_query(db: Session, cu, district=None, school_id=None):
    if cu.role == "admin":
        raise HTTPException(403, "System admin cannot access school records")
    q = db.query(School)
    if cu.role == "district" and cu.district:
        q = q.filter(School.district == cu.district)
    elif cu.role == "enumerator" and cu.district and cu.district != "National":
        q = q.filter(School.district == cu.district)
    elif cu.role == "community" and cu.district and cu.district != "National":
        q = q.filter(School.district == cu.district)
    if cu.role == "school" and cu.school_id:
        q = q.filter(School.id == cu.school_id)
    if school_id:
        q = q.filter(School.id == school_id)
    if district:
        q = q.filter(School.district == district)
    return q
