from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
import io, csv

from app.core.database import get_db
from app.core.security import get_current_user, require_roles, get_client_ip
from app.models.models import School, Teacher, ResourceAlert, AuditLog, StatusEnum
from app.schemas.schemas import SchoolOut, SchoolCreate, SchoolUpdate

schools_router = APIRouter(prefix="/api/schools", tags=["Schools"])

def log_action(db, user_id, action, desc, entity=None, eid=None, ip_address=None):
    db.add(AuditLog(user_id=user_id, action_type=action,
                    description=desc, entity=entity, entity_id=eid, ip_address=ip_address))

def compute_status(s):
    total_stu = (s.students_boys or 0) + (s.students_girls or 0)
    total_tea = (s.teachers_male or 0) + (s.teachers_female or 0)
    total_tlt = (s.toilets_boys or 0) + (s.toilets_girls or 0)
    if total_stu == 0:
        return StatusEnum.moderate
    score = sum([
        bool(s.has_water), bool(s.has_electricity),
        total_tlt >= max(1, total_stu // 50),
        (s.textbooks or 0) >= total_stu * 0.7,
        (s.desks or 0) >= total_stu * 0.8,
        (s.classrooms or 0) >= max(1, total_stu // 45),
        bool(s.has_library), bool(s.gps_verified),
    ])
    if score >= 6:
        return StatusEnum.good
    elif score >= 3:
        return StatusEnum.moderate
    else:
        return StatusEnum.critical

def auto_alerts(db, school):
    db.query(ResourceAlert).filter(ResourceAlert.school_id == school.id).delete()
    total_stu = (school.students_boys or 0) + (school.students_girls or 0)
    total_tea = (school.teachers_male or 0) + (school.teachers_female or 0)
    total_tlt = (school.toilets_boys or 0) + (school.toilets_girls or 0)
    if total_stu == 0:
        return
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

@schools_router.get("/", response_model=List[SchoolOut])
def list_schools(district: Optional[str]=Query(None), status: Optional[str]=Query(None),
                 school_type: Optional[str]=Query(None), gps_verified: Optional[bool]=Query(None),
                 skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=500),
                 db: Session = Depends(get_db), cu=Depends(get_current_user)):
    q = db.query(School)
    if cu.role == "district" and cu.district:
        q = q.filter(School.district == cu.district)
    if cu.role == "school" and cu.school_id:
        q = q.filter(School.id == cu.school_id)
    if district:
        q = q.filter(School.district == district)
    if status:
        q = q.filter(School.status == status)
    if school_type:
        q = q.filter(School.school_type == school_type)
    if gps_verified is not None:
        q = q.filter(School.gps_verified == gps_verified)
    return q.order_by(School.district, School.name).offset(skip).limit(limit).all()

@schools_router.post("/", response_model=SchoolOut, status_code=201)
def create_school(payload: SchoolCreate, request: Request, db: Session = Depends(get_db),
                  cu=Depends(require_roles("admin","reb","district","enumerator"))):
    s = School(**payload.model_dump())
    s.status = compute_status(s)
    db.add(s)
    db.flush()
    auto_alerts(db, s)
    ip = get_client_ip(request)
    log_action(db, cu.id, "CREATE", f"Registered school: {payload.name}", "School", ip_address=ip)
    db.commit()
    db.refresh(s)
    return s

@schools_router.get("/{sid}", response_model=SchoolOut)
def get_school(sid: int, db: Session = Depends(get_db), cu=Depends(get_current_user)):
    s = db.query(School).filter(School.id == sid).first()
    if not s:
        raise HTTPException(404, "School not found")
    # enforce same isolation rules as list endpoints
    if cu.role == "school" and cu.school_id and cu.school_id != sid:
        raise HTTPException(403, "You can only access your own school")
    if cu.role in ["district", "enumerator", "community"] and cu.district and cu.district != "National":
        if s.district != cu.district:
            raise HTTPException(403, "Access denied for this district")
    return s

@schools_router.patch("/{sid}", response_model=SchoolOut)
def update_school(sid: int, payload: SchoolUpdate, request: Request, db: Session = Depends(get_db),
                  cu=Depends(get_current_user)):
    s = db.query(School).filter(School.id == sid).first()
    if not s:
        raise HTTPException(404, "School not found")
    if cu.role == "school" and cu.school_id != sid:
        raise HTTPException(403, "You can only update your own school")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(s, k, v)
    s.status = compute_status(s)
    auto_alerts(db, s)
    ip = get_client_ip(request)
    log_action(db, cu.id, "UPDATE", f"Updated school: {s.name}", "School", sid, ip_address=ip)
    db.commit()
    db.refresh(s)
    return s

@schools_router.patch("/{sid}/verify-gps")
def verify_gps(sid: int, request: Request, db: Session = Depends(get_db),
               cu=Depends(require_roles("admin","reb","district","enumerator"))):
    s = db.query(School).filter(School.id == sid).first()
    if not s:
        raise HTTPException(404, "School not found")
    if not s.latitude or not s.longitude:
        raise HTTPException(400, "School has no GPS coordinates to verify")
    s.gps_verified = True
    s.gps_verified_by = cu.id
    s.gps_verified_at = datetime.utcnow()
    s.status = compute_status(s)
    auto_alerts(db, s)
    ip = get_client_ip(request)
    log_action(db, cu.id, "GPS_VERIFY", f"GPS verified for {s.name}", "School", sid, ip_address=ip)
    db.commit()
    return {"message": "GPS coordinates verified", "school_id": sid}

@schools_router.delete("/{sid}")
def delete_school(sid: int, request: Request, db: Session = Depends(get_db), cu=Depends(require_roles("admin"))):
    s = db.query(School).filter(School.id == sid).first()
    if not s:
        raise HTTPException(404, "School not found")
    db.delete(s)
    ip = get_client_ip(request)
    log_action(db, cu.id, "DELETE", f"Deleted school {s.name}", "School", sid, ip_address=ip)
    db.commit()
    return {"message": "School deleted"}

@schools_router.get("/export/csv")
def export_schools_csv(district: Optional[str]=Query(None),
                       db: Session = Depends(get_db),
                       cu=Depends(require_roles("admin","reb","district"))):
    q = db.query(School)
    if cu.role == "district":
        q = q.filter(School.district == cu.district)
    elif district:
        q = q.filter(School.district == district)
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
    return StreamingResponse(io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=ecrm_schools_{datetime.now().strftime('%Y%m%d')}.csv"})

@schools_router.get("/export/geojson")
def export_geojson(district: Optional[str]=Query(None),
                   db: Session = Depends(get_db), cu=Depends(get_current_user)):
    q = db.query(School).filter(School.latitude.isnot(None))
    if cu.role == "district":
        q = q.filter(School.district == cu.district)
    elif district:
        q = q.filter(School.district == district)
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
