from fastapi import APIRouter
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
