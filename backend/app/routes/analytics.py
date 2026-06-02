from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.models.models import School, ResourceAlert, Feedback, EnrollmentHistory, StatusEnum, FeedbackStatusEnum
from app.schemas.schemas import NationalStats, DistrictStats

analytics_router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@analytics_router.get("/national", response_model=NationalStats)
def national_stats(db: Session = Depends(get_db),
                   cu=Depends(require_roles("admin","reb"))):
    ss = db.query(School).all()
    return NationalStats(
        total_schools=len(ss),
        total_students=sum((s.students_boys or 0)+(s.students_girls or 0) for s in ss),
        total_teachers=sum((s.teachers_male or 0)+(s.teachers_female or 0) for s in ss),
        critical_schools=sum(1 for s in ss if s.status == StatusEnum.critical),
        moderate_schools=sum(1 for s in ss if s.status == StatusEnum.moderate),
        good_schools=sum(1 for s in ss if s.status == StatusEnum.good),
        schools_with_water=sum(1 for s in ss if s.has_water),
        schools_with_electricity=sum(1 for s in ss if s.has_electricity),
        schools_with_library=sum(1 for s in ss if s.has_library),
        schools_with_ict=sum(1 for s in ss if s.has_ict_lab),
        schools_gps_verified=sum(1 for s in ss if s.gps_verified),
        total_alerts=db.query(ResourceAlert).filter(ResourceAlert.is_resolved == False).count(),
        pending_feedback=db.query(Feedback).filter(Feedback.status == FeedbackStatusEnum.pending).count(),
    )

@analytics_router.get("/districts", response_model=List[DistrictStats])
def district_stats(db: Session = Depends(get_db), cu=Depends(get_current_user)):
    results = []
    for (dist,) in db.query(School.district).distinct():
        ss = db.query(School).filter(School.district == dist).all()
        stu = sum((s.students_boys or 0)+(s.students_girls or 0) for s in ss)
        tea = sum((s.teachers_male or 0)+(s.teachers_female or 0) for s in ss)
        results.append(DistrictStats(
            district=dist, total_schools=len(ss), total_students=stu, total_teachers=tea,
            critical_schools=sum(1 for s in ss if s.status == StatusEnum.critical),
            moderate_schools=sum(1 for s in ss if s.status == StatusEnum.moderate),
            good_schools=sum(1 for s in ss if s.status == StatusEnum.good),
            avg_pupil_teacher_ratio=round(stu/tea, 2) if tea else 0,
            schools_with_water=sum(1 for s in ss if s.has_water),
            schools_with_electricity=sum(1 for s in ss if s.has_electricity),
        ))
    return results

@analytics_router.get("/resource-gaps")
def resource_gaps(district: Optional[str]=Query(None),
                  db: Session = Depends(get_db), cu=Depends(get_current_user)):
    q = db.query(School)
    if cu.role == "district" and cu.district:
        q = q.filter(School.district == cu.district)
    elif district:
        q = q.filter(School.district == district)
    ss = q.all()
    total_stu = sum((s.students_boys or 0)+(s.students_girls or 0) for s in ss)
    return {
        "textbooks":  {"have": sum(s.textbooks or 0 for s in ss), "need": total_stu},
        "desks":      {"have": sum(s.desks or 0 for s in ss),     "need": total_stu},
        "toilets":    {"have": sum(((s.toilets_boys or 0)+(s.toilets_girls or 0))*30 for s in ss), "need": total_stu},
        "classrooms": {"have": sum(s.classrooms or 0 for s in ss)*40, "need": total_stu},
    }

@analytics_router.get("/enrollment-trends")
def enrollment_trends(school_id: Optional[int]=Query(None),
                      district: Optional[str]=Query(None),
                      db: Session = Depends(get_db), cu=Depends(get_current_user)):
    q = db.query(EnrollmentHistory)
    if school_id:
        q = q.filter(EnrollmentHistory.school_id == school_id)
    elif district:
        sids = [s.id for s in db.query(School).filter(School.district == district).all()]
        q = q.filter(EnrollmentHistory.school_id.in_(sids))
    rows = q.order_by(EnrollmentHistory.year).all()
    by_year = {}
    for r in rows:
        yr = str(r.year)
        if yr not in by_year:
            by_year[yr] = {"year": r.year, "boys": 0, "girls": 0, "total": 0, "teachers": 0}
        by_year[yr]["boys"]    += r.students_boys or 0
        by_year[yr]["girls"]   += r.students_girls or 0
        by_year[yr]["total"]   += (r.students_boys or 0) + (r.students_girls or 0)
        by_year[yr]["teachers"]+= r.teachers or 0
    return list(by_year.values())

@analytics_router.get("/gis-summary")
def gis_summary(db: Session = Depends(get_db), cu=Depends(get_current_user)):
    ss = db.query(School).filter(School.latitude.isnot(None)).all()
    by_district = {}
    for s in ss:
        dist = s.district
        by_district[dist] = by_district.get(dist, 0) + 1
    return {
        "total_mapped": len(ss),
        "gps_verified": sum(1 for s in ss if s.gps_verified),
        "by_status": {
            "good":     sum(1 for s in ss if s.status == StatusEnum.good),
            "moderate": sum(1 for s in ss if s.status == StatusEnum.moderate),
            "critical": sum(1 for s in ss if s.status == StatusEnum.critical),
        },
        "by_district": by_district,
        "coverage_pct": round(len(ss) / max(db.query(School).count(), 1) * 100, 1),
    }


@analytics_router.get("/risk-scores")
def risk_scores(
    district: Optional[str] = Query(None),
    limit: int = Query(15, ge=1, le=200),
    db: Session = Depends(get_db),
    cu=Depends(get_current_user),
):
    """
    Simple risk scoring (0–100) to prioritize interventions.
    Heuristic factors: status, P:T ratio, missing facilities, gps verification.
    """
    q = db.query(School)
    if cu.role in ["district", "enumerator", "community"] and cu.district and cu.district != "National":
        q = q.filter(School.district == cu.district)
    elif district:
        q = q.filter(School.district == district)
    if cu.role == "school" and cu.school_id:
        q = q.filter(School.id == cu.school_id)

    rows = q.all()
    out = []
    for s in rows:
        stu = (s.students_boys or 0) + (s.students_girls or 0)
        tea = (s.teachers_male or 0) + (s.teachers_female or 0)
        ratio = (stu / tea) if tea else None

        score = 0
        reasons = []

        if s.status == StatusEnum.critical:
            score += 35; reasons.append("critical_status")
        elif s.status == StatusEnum.moderate:
            score += 15; reasons.append("moderate_status")

        if ratio is None:
            score += 10; reasons.append("no_teachers_recorded")
        elif ratio > 60:
            score += 25; reasons.append("high_pupil_teacher_ratio")
        elif ratio > 50:
            score += 15; reasons.append("elevated_pupil_teacher_ratio")

        if not s.has_water:
            score += 10; reasons.append("no_water")
        if not s.has_electricity:
            score += 6; reasons.append("no_electricity")
        if not s.has_library:
            score += 4; reasons.append("no_library")
        if not s.gps_verified:
            score += 3; reasons.append("gps_unverified")

        # clamp 0..100
        score = max(0, min(100, int(round(score))))

        out.append({
            "school_id": s.id,
            "name": s.name,
            "district": s.district,
            "sector": s.sector,
            "status": s.status.value,
            "students": stu,
            "teachers": tea,
            "pupil_teacher_ratio": round(ratio, 1) if ratio else None,
            "risk_score": score,
            "reasons": reasons,
        })

    out.sort(key=lambda x: (x["risk_score"], x["students"]), reverse=True)
    return out[:limit]
