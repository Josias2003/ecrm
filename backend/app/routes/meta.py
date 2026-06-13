from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.models import School, Teacher
from app.data.rwanda_districts import RWANDA_DISTRICTS, DISTRICT_NAMES, PROVINCE_COLORS, RWANDA_CENTER, RWANDA_BOUNDS

meta_router = APIRouter(prefix="/api/meta", tags=["Meta"])

@meta_router.get("/districts")
def list_districts():
    return {
        "districts": RWANDA_DISTRICTS,
        "names": DISTRICT_NAMES,
        "provinces": list(PROVINCE_COLORS.keys()),
        "province_colors": PROVINCE_COLORS,
        "center": RWANDA_CENTER,
        "bounds": RWANDA_BOUNDS,
        "total": len(DISTRICT_NAMES),
    }


@meta_router.get("/stats")
def public_stats(db: Session = Depends(get_db)):
    """Live counts for landing page — no auth required."""
    school_count = db.query(func.count(School.id)).scalar() or 0
    teacher_count = db.query(func.count(Teacher.id)).scalar() or 0
    district_count = db.query(func.count(func.distinct(School.district))).scalar() or len(DISTRICT_NAMES)
    return {
        "schools": school_count,
        "teachers": teacher_count,
        "districts": district_count,
    }
