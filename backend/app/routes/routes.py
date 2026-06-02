from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
import io, csv

from app.core.database import get_db
from app.core.security import (get_current_user, require_roles,
                                hash_password, verify_password, create_access_token)
from app.models.models import (User, School, Teacher, Feedback, ResourceAlert,
                                EnrollmentHistory, AuditLog, StatusEnum)
from app.schemas.schemas import *

# ── helpers ───────────────────────────────────────────────────────
def log(db, user_id, action, desc, entity=None, eid=None):
    db.add(AuditLog(user_id=user_id, action_type=action,
                    description=desc, entity=entity, entity_id=eid))

def compute_status(s):
    total_stu = (s.students_boys or 0) + (s.students_girls or 0)
    total_tea = (s.teachers_male or 0) + (s.teachers_female or 0)
    total_tlt = (s.toilets_boys or 0) + (s.toilets_girls or 0)
    if total_stu == 0: return StatusEnum.moderate
    score = sum([
        bool(s.has_water), bool(s.has_electricity),
        total_tlt >= max(1, total_stu // 50),
        (s.textbooks or 0) >= total_stu * 0.7,
        (s.desks or 0) >= total_stu * 0.8,
        (s.classrooms or 0) >= max(1, total_stu // 45),
        bool(s.has_library), bool(s.gps_verified),
    ])
    return StatusEnum.good if score >= 6 else StatusEnum.moderate if score >= 3 else StatusEnum.critical

def auto_alerts(db, school):
    """Auto-generate resource alerts after school update."""
    db.query(ResourceAlert).filter(ResourceAlert.school_id == school.id).delete()
    total_stu = (school.students_boys or 0) + (school.students_girls or 0)
    total_tea = (school.teachers_male or 0) + (school.teachers_female or 0)
    total_tlt = (school.toilets_boys or 0) + (school.toilets_girls or 0)
    if total_stu == 0: return
    if (school.textbooks or 0) < total_stu * 0.5:
        db.add(ResourceAlert(school_id=school.id, alert_type="textbook_shortage",
            level="critical", message=f"Only {school.textbooks} textbooks for {total_stu} students"))
    elif (school.textbooks or 0) < total_stu * 0.7:
        db.add(ResourceAlert(school_id=school.id, alert_type="textbook_shortage",
            level="warning", message=f"Textbook shortage: {school.textbooks}/{total_stu} available"))
    if (school.desks or 0) < total_stu * 0.6:
        db.add(ResourceAlert(school_id=school.id, alert_type="desk_shortage",
            level="warning", message=f"Desk shortage: {school.desks} desks for {total_stu} students"))
    if total_tlt < total_stu // 50:
        db.add(ResourceAlert(school_id=school.id, alert_type="sanitation_gap",
            level="critical", message=f"Only {total_tlt} toilets for {total_stu} students"))
    if total_stu > 0 and total_tea > 0 and total_stu / total_tea > 50:
        db.add(ResourceAlert(school_id=school.id, alert_type="teacher_overload",
            level="warning", message=f"High P:T ratio 1:{total_stu//total_tea} — recommended max 1:45"))
    if not school.has_water:
        db.add(ResourceAlert(school_id=school.id, alert_type="no_water",
            level="critical", message="No running water — health risk"))
    if not school.gps_verified:
        db.add(ResourceAlert(school_id=school.id, alert_type="gps_unverified",
            level="info", message="GPS not yet field-verified"))

# ══════════════════════════════════════════════════════════════════
#  AUTH
# ══════════════════════════════════════════════════════════════════
auth_router = APIRouter(prefix="/api/auth", tags=["Auth"])

@auth_router.post("/login", response_model=TokenResponse)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account deactivated. Contact admin.")
    token = create_access_token({"sub": str(user.id)})
    log(db, user.id, "LOGIN", f"{user.full_name} signed in")
    db.commit()
    return {"access_token": token, "token_type": "bearer", "user": user}

@auth_router.get("/me", response_model=UserOut)
def me(cu=Depends(get_current_user)): return cu

@auth_router.post("/logout")
def logout(cu=Depends(get_current_user), db: Session = Depends(get_db)):
    log(db, cu.id, "LOGOUT", f"{cu.full_name} signed out"); db.commit()
    return {"message": "Logged out"}

# ══════════════════════════════════════════════════════════════════
#  USERS
# ══════════════════════════════════════════════════════════════════
users_router = APIRouter(prefix="/api/users", tags=["Users"])

@users_router.get("/", response_model=List[UserOut])
def list_users(db: Session = Depends(get_db), cu=Depends(require_roles("admin"))):
    return db.query(User).all()

@users_router.post("/", response_model=UserOut, status_code=201)
def create_user(payload: UserCreate, db: Session = Depends(get_db), cu=Depends(require_roles("admin"))):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(400, "Email already registered")
    u = User(full_name=payload.full_name, email=payload.email,
             hashed_password=hash_password(payload.password),
             role=payload.role, district=payload.district, school_id=payload.school_id)
    db.add(u)
    log(db, cu.id, "CREATE", f"Created user {payload.email} ({payload.role})", "User")
    db.commit(); db.refresh(u); return u

@users_router.patch("/{uid}", response_model=UserOut)
def update_user(uid: int, payload: UserUpdate, db: Session = Depends(get_db), cu=Depends(require_roles("admin"))):
    u = db.query(User).filter(User.id == uid).first()
    if not u: raise HTTPException(404, "User not found")
    for k, v in payload.model_dump(exclude_none=True).items(): setattr(u, k, v)
    log(db, cu.id, "UPDATE", f"Updated user {u.email}", "User", uid)
    db.commit(); db.refresh(u); return u

@users_router.delete("/{uid}")
def delete_user(uid: int, db: Session = Depends(get_db), cu=Depends(require_roles("admin"))):
    u = db.query(User).filter(User.id == uid).first()
    if not u: raise HTTPException(404, "User not found")
    db.delete(u); log(db, cu.id, "DELETE", f"Deleted user {u.email}", "User", uid)
    db.commit(); return {"message": "User deleted"}

# ══════════════════════════════════════════════════════════════════
#  SCHOOLS
# ══════════════════════════════════════════════════════════════════
schools_router = APIRouter(prefix="/api/schools", tags=["Schools"])

@schools_router.get("/", response_model=List[SchoolOut])
def list_schools(district: Optional[str]=Query(None), status: Optional[str]=Query(None),
                 school_type: Optional[str]=Query(None), gps_verified: Optional[bool]=Query(None),
                 db: Session = Depends(get_db), cu=Depends(get_current_user)):
    q = db.query(School)
    if cu.role == "district" and cu.district: q = q.filter(School.district == cu.district)
    if cu.role == "school" and cu.school_id:  q = q.filter(School.id == cu.school_id)
    if district:    q = q.filter(School.district == district)
    if status:      q = q.filter(School.status == status)
    if school_type: q = q.filter(School.school_type == school_type)
    if gps_verified is not None: q = q.filter(School.gps_verified == gps_verified)
    return q.order_by(School.district, School.name).all()

@schools_router.post("/", response_model=SchoolOut, status_code=201)
def create_school(payload: SchoolCreate, db: Session = Depends(get_db),
                  cu=Depends(require_roles("admin","reb","district","enumerator"))):
    s = School(**payload.model_dump())
    s.status = compute_status(s)
    db.add(s); db.flush()
    auto_alerts(db, s)
    log(db, cu.id, "CREATE", f"Registered school: {payload.name}", "School")
    db.commit(); db.refresh(s); return s

@schools_router.get("/{sid}", response_model=SchoolOut)
def get_school(sid: int, db: Session = Depends(get_db), cu=Depends(get_current_user)):
    s = db.query(School).filter(School.id == sid).first()
    if not s: raise HTTPException(404, "School not found")
    return s

@schools_router.patch("/{sid}", response_model=SchoolOut)
def update_school(sid: int, payload: SchoolUpdate, db: Session = Depends(get_db),
                  cu=Depends(get_current_user)):
    s = db.query(School).filter(School.id == sid).first()
    if not s: raise HTTPException(404, "School not found")
    if cu.role == "school" and cu.school_id != sid:
        raise HTTPException(403, "You can only update your own school")
    for k, v in payload.model_dump(exclude_none=True).items(): setattr(s, k, v)
    s.status = compute_status(s)
    auto_alerts(db, s)
    log(db, cu.id, "UPDATE", f"Updated school: {s.name}", "School", sid)
    db.commit(); db.refresh(s); return s

@schools_router.patch("/{sid}/verify-gps")
def verify_gps(sid: int, db: Session = Depends(get_db),
               cu=Depends(require_roles("admin","reb","district","enumerator"))):
    s = db.query(School).filter(School.id == sid).first()
    if not s: raise HTTPException(404, "School not found")
    if not s.latitude or not s.longitude:
        raise HTTPException(400, "School has no GPS coordinates to verify")
    s.gps_verified = True
    s.gps_verified_by = cu.id
    s.gps_verified_at = datetime.utcnow()
    s.status = compute_status(s)
    auto_alerts(db, s)
    log(db, cu.id, "GPS_VERIFY", f"GPS verified for {s.name}", "School", sid)
    db.commit(); return {"message": "GPS coordinates verified", "school_id": sid}

@schools_router.delete("/{sid}")
def delete_school(sid: int, db: Session = Depends(get_db), cu=Depends(require_roles("admin"))):
    s = db.query(School).filter(School.id == sid).first()
    if not s: raise HTTPException(404, "School not found")
    db.delete(s); log(db, cu.id, "DELETE", f"Deleted school {s.name}", "School", sid)
    db.commit(); return {"message": "School deleted"}

# ── Schools export ────────────────────────────────────────────────
@schools_router.get("/export/csv")
def export_schools_csv(district: Optional[str]=Query(None),
                       db: Session = Depends(get_db),
                       cu=Depends(require_roles("admin","reb","district"))):
    q = db.query(School)
    if cu.role == "district": q = q.filter(School.district == cu.district)
    elif district: q = q.filter(School.district == district)
    schools = q.all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID","Name","District","Sector","Type","Students (Boys)",
                     "Students (Girls)","Total Students","Teachers (M)","Teachers (F)",
                     "Total Teachers","P:T Ratio","Classrooms","Textbooks","Desks",
                     "Toilets (Boys)","Toilets (Girls)","Library","ICT Lab","Water",
                     "Electricity","GPS Verified","Latitude","Longitude","Status"])
    for s in schools:
        stu = (s.students_boys or 0) + (s.students_girls or 0)
        tea = (s.teachers_male or 0) + (s.teachers_female or 0)
        writer.writerow([s.id, s.name, s.district, s.sector, s.school_type,
                         s.students_boys, s.students_girls, stu,
                         s.teachers_male, s.teachers_female, tea,
                         f"1:{stu//tea}" if tea else "N/A",
                         s.classrooms, s.textbooks, s.desks,
                         s.toilets_boys, s.toilets_girls,
                         "Yes" if s.has_library else "No",
                         "Yes" if s.has_ict_lab else "No",
                         "Yes" if s.has_water else "No",
                         "Yes" if s.has_electricity else "No",
                         "Yes" if s.gps_verified else "No",
                         s.latitude or "", s.longitude or "", s.status.value])
    output.seek(0)
    log(db, cu.id, "EXPORT", f"Exported schools CSV ({len(schools)} records)", "School")
    db.commit()
    return StreamingResponse(io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=ecrm_schools_{datetime.now().strftime('%Y%m%d')}.csv"})

# ── GeoJSON for GIS ───────────────────────────────────────────────
@schools_router.get("/export/geojson")
def export_geojson(district: Optional[str]=Query(None),
                   db: Session = Depends(get_db), cu=Depends(get_current_user)):
    q = db.query(School).filter(School.latitude.isnot(None))
    if cu.role == "district": q = q.filter(School.district == cu.district)
    elif district: q = q.filter(School.district == district)
    schools = q.all()
    features = []
    for s in schools:
        stu = (s.students_boys or 0) + (s.students_girls or 0)
        tea = (s.teachers_male or 0) + (s.teachers_female or 0)
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [s.longitude, s.latitude]},
            "properties": {
                "id": s.id, "name": s.name, "district": s.district,
                "sector": s.sector, "school_type": s.school_type,
                "status": s.status.value, "students": stu, "teachers": tea,
                "gps_verified": s.gps_verified,
                "has_water": s.has_water, "has_electricity": s.has_electricity,
                "has_library": s.has_library, "has_ict_lab": s.has_ict_lab,
            }
        })
    return {"type": "FeatureCollection", "features": features,
            "metadata": {"total": len(features), "generated_at": datetime.utcnow().isoformat()}}

# ══════════════════════════════════════════════════════════════════
#  TEACHERS
# ══════════════════════════════════════════════════════════════════
teachers_router = APIRouter(prefix="/api/teachers", tags=["Teachers"])

@teachers_router.get("/", response_model=List[TeacherOut])
def list_teachers(school_id: Optional[int]=Query(None),
                  district: Optional[str]=Query(None),
                  status: Optional[str]=Query(None),
                  db: Session = Depends(get_db), cu=Depends(get_current_user)):
    q = db.query(Teacher).join(School)
    if cu.role == "school" and cu.school_id: q = q.filter(Teacher.school_id == cu.school_id)
    if cu.role == "district" and cu.district: q = q.filter(School.district == cu.district)
    if school_id: q = q.filter(Teacher.school_id == school_id)
    if district:  q = q.filter(School.district == district)
    if status:    q = q.filter(Teacher.status == status)
    return q.all()

@teachers_router.post("/", response_model=TeacherOut, status_code=201)
def create_teacher(payload: TeacherCreate, db: Session = Depends(get_db),
                   cu=Depends(require_roles("admin","reb","district","school","enumerator"))):
    t = Teacher(**payload.model_dump())
    db.add(t)
    log(db, cu.id, "CREATE", f"Added teacher {payload.full_name}", "Teacher")
    db.commit(); db.refresh(t); return t

@teachers_router.patch("/{tid}", response_model=TeacherOut)
def update_teacher(tid: int, payload: TeacherUpdate, db: Session = Depends(get_db),
                   cu=Depends(get_current_user)):
    t = db.query(Teacher).filter(Teacher.id == tid).first()
    if not t: raise HTTPException(404, "Teacher not found")
    for k, v in payload.model_dump(exclude_none=True).items(): setattr(t, k, v)
    log(db, cu.id, "UPDATE", f"Updated teacher {t.full_name}", "Teacher", tid)
    db.commit(); db.refresh(t); return t

@teachers_router.delete("/{tid}")
def delete_teacher(tid: int, db: Session = Depends(get_db),
                   cu=Depends(require_roles("admin","district","school"))):
    t = db.query(Teacher).filter(Teacher.id == tid).first()
    if not t: raise HTTPException(404, "Teacher not found")
    db.delete(t); log(db, cu.id, "DELETE", f"Removed teacher {t.full_name}", "Teacher", tid)
    db.commit(); return {"message": "Teacher removed"}

@teachers_router.get("/workload/analysis")
def workload_analysis(district: Optional[str]=Query(None),
                      db: Session = Depends(get_db), cu=Depends(get_current_user)):
    """Teacher workload analysis — subjects per teacher, overloaded schools."""
    q = db.query(School)
    if cu.role == "district" and cu.district: q = q.filter(School.district == cu.district)
    elif district: q = q.filter(School.district == district)
    schools = q.all()
    analysis = []
    for s in schools:
        stu = (s.students_boys or 0) + (s.students_girls or 0)
        tea = (s.teachers_male or 0) + (s.teachers_female or 0)
        ratio = round(stu / tea, 1) if tea > 0 else 0
        analysis.append({
            "school_id": s.id, "school_name": s.name,
            "district": s.district, "students": stu,
            "teachers": tea, "ratio": ratio,
            "overloaded": ratio > 50,
            "recommended_teachers": max(1, round(stu / 40)),
            "teacher_gap": max(0, round(stu / 40) - tea),
        })
    return sorted(analysis, key=lambda x: x["ratio"], reverse=True)

# ══════════════════════════════════════════════════════════════════
#  FEEDBACK
# ══════════════════════════════════════════════════════════════════
feedback_router = APIRouter(prefix="/api/feedback", tags=["Feedback"])

@feedback_router.get("/", response_model=List[FeedbackOut])
def list_feedback(district: Optional[str]=Query(None),
                  school_id: Optional[int]=Query(None),
                  status: Optional[str]=Query(None),
                  issue_type: Optional[str]=Query(None),
                  db: Session = Depends(get_db), cu=Depends(get_current_user)):
    q = db.query(Feedback).join(School)
    if cu.role == "district" and cu.district: q = q.filter(School.district == cu.district)
    if cu.role == "school" and cu.school_id:  q = q.filter(Feedback.school_id == cu.school_id)
    if district:   q = q.filter(School.district == district)
    if school_id:  q = q.filter(Feedback.school_id == school_id)
    if status:     q = q.filter(Feedback.status == status)
    if issue_type: q = q.filter(Feedback.issue_type == issue_type)
    return q.order_by(Feedback.created_at.desc()).all()

@feedback_router.post("/", response_model=FeedbackOut, status_code=201)
def submit_feedback(payload: FeedbackCreate, db: Session = Depends(get_db),
                    cu=Depends(get_current_user)):
    s = db.query(School).filter(School.id == payload.school_id).first()
    if not s: raise HTTPException(404, "School not found")
    fb = Feedback(**payload.model_dump(), user_id=cu.id)
    db.add(fb)
    log(db, cu.id, "FEEDBACK", f"Feedback submitted for {s.name}: {payload.issue_type}", "Feedback")
    db.commit(); db.refresh(fb); return fb

@feedback_router.patch("/{fid}", response_model=FeedbackOut)
def update_feedback(fid: int, payload: FeedbackUpdate, db: Session = Depends(get_db),
                    cu=Depends(require_roles("admin","reb","district"))):
    fb = db.query(Feedback).filter(Feedback.id == fid).first()
    if not fb: raise HTTPException(404, "Feedback not found")
    for k, v in payload.model_dump(exclude_none=True).items(): setattr(fb, k, v)
    fb.reviewed_by = cu.id; fb.reviewed_at = datetime.utcnow()
    log(db, cu.id, "UPDATE", f"Feedback #{fid} → {payload.status}", "Feedback", fid)
    db.commit(); db.refresh(fb); return fb

# ══════════════════════════════════════════════════════════════════
#  ALERTS
# ══════════════════════════════════════════════════════════════════
alerts_router = APIRouter(prefix="/api/alerts", tags=["Alerts"])

@alerts_router.get("/", response_model=List[AlertOut])
def list_alerts(district: Optional[str]=Query(None),
                school_id: Optional[int]=Query(None),
                level: Optional[str]=Query(None),
                resolved: Optional[bool]=Query(False),
                db: Session = Depends(get_db), cu=Depends(get_current_user)):
    q = db.query(ResourceAlert).join(School)
    if cu.role == "district" and cu.district: q = q.filter(School.district == cu.district)
    if cu.role == "school" and cu.school_id:  q = q.filter(ResourceAlert.school_id == cu.school_id)
    if district:  q = q.filter(School.district == district)
    if school_id: q = q.filter(ResourceAlert.school_id == school_id)
    if level:     q = q.filter(ResourceAlert.level == level)
    q = q.filter(ResourceAlert.is_resolved == resolved)
    return q.order_by(ResourceAlert.created_at.desc()).all()

@alerts_router.patch("/{aid}/resolve")
def resolve_alert(aid: int, db: Session = Depends(get_db),
                  cu=Depends(require_roles("admin","reb","district"))):
    a = db.query(ResourceAlert).filter(ResourceAlert.id == aid).first()
    if not a: raise HTTPException(404, "Alert not found")
    a.is_resolved = True; a.resolved_at = datetime.utcnow()
    log(db, cu.id, "RESOLVE", f"Alert #{aid} resolved", "Alert", aid)
    db.commit(); return {"message": "Alert resolved"}

# ══════════════════════════════════════════════════════════════════
#  ANALYTICS
# ══════════════════════════════════════════════════════════════════
analytics_router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@analytics_router.get("/national", response_model=NationalStats)
def national_stats(db: Session = Depends(get_db),
                   cu=Depends(require_roles("admin","reb"))):
    ss = db.query(School).all()
    return NationalStats(
        total_schools=len(ss),
        total_students=sum((s.students_boys or 0)+(s.students_girls or 0) for s in ss),
        total_teachers=sum((s.teachers_male or 0)+(s.teachers_female or 0) for s in ss),
        critical_schools=sum(1 for s in ss if s.status == "critical"),
        moderate_schools=sum(1 for s in ss if s.status == "moderate"),
        good_schools=sum(1 for s in ss if s.status == "good"),
        schools_with_water=sum(1 for s in ss if s.has_water),
        schools_with_electricity=sum(1 for s in ss if s.has_electricity),
        schools_with_library=sum(1 for s in ss if s.has_library),
        schools_with_ict=sum(1 for s in ss if s.has_ict_lab),
        schools_gps_verified=sum(1 for s in ss if s.gps_verified),
        total_alerts=db.query(ResourceAlert).filter(ResourceAlert.is_resolved == False).count(),
        pending_feedback=db.query(Feedback).filter(Feedback.status == "pending").count(),
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
            critical_schools=sum(1 for s in ss if s.status == "critical"),
            moderate_schools=sum(1 for s in ss if s.status == "moderate"),
            good_schools=sum(1 for s in ss if s.status == "good"),
            avg_pupil_teacher_ratio=round(stu/tea, 2) if tea else 0,
            schools_with_water=sum(1 for s in ss if s.has_water),
            schools_with_electricity=sum(1 for s in ss if s.has_electricity),
        ))
    return results

@analytics_router.get("/resource-gaps")
def resource_gaps(district: Optional[str]=Query(None),
                  db: Session = Depends(get_db), cu=Depends(get_current_user)):
    q = db.query(School)
    if cu.role == "district" and cu.district: q = q.filter(School.district == cu.district)
    elif district: q = q.filter(School.district == district)
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
    if school_id: q = q.filter(EnrollmentHistory.school_id == school_id)
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
    """Summary data for the GIS dashboard map."""
    ss = db.query(School).filter(School.latitude.isnot(None)).all()
    return {
        "total_mapped": len(ss),
        "gps_verified": sum(1 for s in ss if s.gps_verified),
        "by_status": {
            "good":     sum(1 for s in ss if s.status == "good"),
            "moderate": sum(1 for s in ss if s.status == "moderate"),
            "critical": sum(1 for s in ss if s.status == "critical"),
        },
        "by_district": {
            dist: sum(1 for s in ss if s.district == dist)
            for dist in ["Gasabo","Kicukiro","Nyarugenge"]
        },
        "coverage_pct": round(len(ss) / max(db.query(School).count(), 1) * 100, 1),
    }

# ══════════════════════════════════════════════════════════════════
#  AUDIT LOGS
# ══════════════════════════════════════════════════════════════════
logs_router = APIRouter(prefix="/api/logs", tags=["Logs"])

@logs_router.get("/", response_model=List[AuditLogOut])
def get_logs(limit: int=Query(50, le=500),
             action_type: Optional[str]=Query(None),
             db: Session = Depends(get_db), cu=Depends(require_roles("admin"))):
    q = db.query(AuditLog)
    if action_type: q = q.filter(AuditLog.action_type == action_type)
    return q.order_by(AuditLog.created_at.desc()).limit(limit).all()

# ══════════════════════════════════════════════════════════════════
#  ENROLLMENT HISTORY
# ══════════════════════════════════════════════════════════════════
enrollment_router = APIRouter(prefix="/api/enrollment", tags=["Enrollment"])

@enrollment_router.get("/{school_id}", response_model=List[EnrollmentHistoryOut])
def get_enrollment(school_id: int, db: Session = Depends(get_db), cu=Depends(get_current_user)):
    return db.query(EnrollmentHistory).filter(
        EnrollmentHistory.school_id == school_id
    ).order_by(EnrollmentHistory.year).all()
