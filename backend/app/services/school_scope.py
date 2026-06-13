from sqlalchemy.orm import Session

from app.models.models import School


def scoped_schools_query(db: Session, cu, district=None, school_id=None):
    q = db.query(School)
    role = cu.role.value if hasattr(cu.role, "value") else str(cu.role)
    if role in ("admin", "reb"):
        pass
    elif role == "district" and cu.district:
        q = q.filter(School.district == cu.district)
    elif role == "enumerator" and cu.district and cu.district != "National":
        q = q.filter(School.district == cu.district)
    elif role == "community" and cu.district and cu.district != "National":
        q = q.filter(School.district == cu.district)
    if role == "school" and cu.school_id:
        q = q.filter(School.id == cu.school_id)
    if school_id:
        q = q.filter(School.id == school_id)
    if district:
        q = q.filter(School.district == district)
    return q
