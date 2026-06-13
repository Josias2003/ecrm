from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.security import get_current_user, require_roles, get_client_ip
from app.models.models import Teacher, School, AuditLog
from app.schemas.schemas import TeacherOut, TeacherCreate, TeacherUpdate

teachers_router = APIRouter(prefix="/api/teachers", tags=["Teachers"])

def log_action(db, user_id, action, desc, entity=None, eid=None, ip_address=None):
    db.add(AuditLog(user_id=user_id, action_type=action,
                    description=desc, entity=entity, entity_id=eid, ip_address=ip_address))

def _teacher_school(db, school_id):
    return db.query(School).filter(School.id == school_id).first()

def _assert_teacher_scope(cu, school: School):
    if cu.role == "school" and cu.school_id and school.id != cu.school_id:
        raise HTTPException(403, "You can only manage teachers at your own school")
    if cu.role == "district" and cu.district and school.district != cu.district:
        raise HTTPException(403, "You can only manage teachers in your district")

def _teachers_query(db, cu, school_id=None, district=None, status=None):
    role = cu.role.value if hasattr(cu.role, "value") else str(cu.role)
    if role in ("enumerator", "community"):
        raise HTTPException(403, "Your role cannot access teacher records")
    q = db.query(Teacher).join(School)
    if role == "school" and cu.school_id:
        q = q.filter(Teacher.school_id == cu.school_id)
    if cu.role == "district" and cu.district:
        q = q.filter(School.district == cu.district)
    if school_id:
        q = q.filter(Teacher.school_id == school_id)
    if district:
        q = q.filter(School.district == district)
    if status:
        q = q.filter(Teacher.status == status)
    return q

@teachers_router.get("/count")
def count_teachers(school_id: Optional[int]=Query(None),
                   district: Optional[str]=Query(None),
                   status: Optional[str]=Query(None),
                   db: Session = Depends(get_db), cu=Depends(get_current_user)):
    return {"total": _teachers_query(db, cu, school_id, district, status).count()}

@teachers_router.get("/", response_model=List[TeacherOut])
def list_teachers(school_id: Optional[int]=Query(None),
                  district: Optional[str]=Query(None),
                  status: Optional[str]=Query(None),
                  skip: int = Query(0, ge=0), limit: int = Query(200, ge=1, le=5000),
                  db: Session = Depends(get_db), cu=Depends(get_current_user)):
    q = _teachers_query(db, cu, school_id, district, status)
    return q.offset(skip).limit(limit).all()

@teachers_router.post("/", response_model=TeacherOut, status_code=201)
def create_teacher(payload: TeacherCreate, request: Request, db: Session = Depends(get_db),
                   cu=Depends(require_roles("admin", "district", "school"))):
    school = _teacher_school(db, payload.school_id)
    if not school:
        raise HTTPException(404, "School not found")
    if cu.role not in ("admin",):
        _assert_teacher_scope(cu, school)
    t = Teacher(**payload.model_dump())
    db.add(t)
    ip = get_client_ip(request)
    log_action(db, cu.id, "CREATE", f"Added teacher {payload.full_name}", "Teacher", ip_address=ip)
    db.commit()
    db.refresh(t)
    return t

@teachers_router.patch("/{tid}", response_model=TeacherOut)
def update_teacher(tid: int, payload: TeacherUpdate, request: Request, db: Session = Depends(get_db),
                   cu=Depends(require_roles("admin", "district", "school"))):
    row = db.query(Teacher, School).join(School).filter(Teacher.id == tid).first()
    if not row:
        raise HTTPException(404, "Teacher not found")
    t, school = row
    if cu.role not in ("admin",):
        _assert_teacher_scope(cu, school)
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(t, k, v)
    ip = get_client_ip(request)
    log_action(db, cu.id, "UPDATE", f"Updated teacher {t.full_name}", "Teacher", tid, ip_address=ip)
    db.commit()
    db.refresh(t)
    return t

@teachers_router.delete("/{tid}")
def delete_teacher(tid: int, request: Request, db: Session = Depends(get_db),
                   cu=Depends(require_roles("admin", "district", "school"))):
    t = db.query(Teacher).filter(Teacher.id == tid).first()
    if not t:
        raise HTTPException(404, "Teacher not found")
    school = _teacher_school(db, t.school_id)
    if school and cu.role not in ("admin",):
        _assert_teacher_scope(cu, school)
    db.delete(t)
    ip = get_client_ip(request)
    log_action(db, cu.id, "DELETE", f"Removed teacher {t.full_name}", "Teacher", tid, ip_address=ip)
    db.commit()
    return {"message": "Teacher removed"}

@teachers_router.get("/workload/analysis")
def workload_analysis(district: Optional[str]=Query(None),
                      db: Session = Depends(get_db), cu=Depends(get_current_user)):
    role = cu.role.value if hasattr(cu.role, "value") else str(cu.role)
    if role in ("enumerator", "community", "school"):
        raise HTTPException(403, "Your role cannot access teacher workload analysis")
    q = db.query(School)
    if role == "district" and cu.district:
        q = q.filter(School.district == cu.district)
    elif district:
        q = q.filter(School.district == district)
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
