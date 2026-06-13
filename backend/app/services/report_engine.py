"""Build criterion reports with human-readable row labels for decision-making."""
from datetime import datetime, timedelta
from typing import List, Optional, Tuple

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.models.models import (
    School, ResourceAlert, Feedback, EnrollmentHistory,
    FieldCollection, Teacher, User, AuditLog, ServiceRequest,
    RoleEnum, AccountStatusEnum, FeedbackStatusEnum,
)
from app.services.report_catalog import REPORT_CATALOG
from app.services.school_metrics import infrastructure_score, connectivity_label


def _role_value(cu) -> str:
    return cu.role.value if hasattr(cu.role, "value") else str(cu.role)


def _enum_val(v) -> str:
    return v.value if hasattr(v, "value") else str(v)


def _students(s: School) -> int:
    return (s.students_boys or 0) + (s.students_girls or 0)


def _teachers(s: School) -> int:
    return (s.teachers_male or 0) + (s.teachers_female or 0)


def _head_name(db: Session, school: School) -> str:
    u = db.query(User).filter(
        User.school_id == school.id,
        User.role == RoleEnum.school,
        User.is_active == True,
    ).first()
    return u.full_name if u else "—"


def _updated(s: School) -> str:
    if s.updated_at:
        return s.updated_at.strftime("%Y-%m-%d")
    return "—"


def _school_scope(q, cu):
    role = _role_value(cu)
    if role == "district" and cu.district:
        return q.filter(School.district == cu.district)
    if role == "enumerator" and cu.district and cu.district != "National":
        return q.filter(School.district == cu.district)
    if role == "school" and cu.school_id:
        return q.filter(School.id == cu.school_id)
    if role == "community" and cu.district and cu.district != "National":
        return q.filter(School.district == cu.district)
    return q


def _connectivity_row(db: Session, s: School) -> dict:
    stu = _students(s)
    tea = _teachers(s)
    ratio = round(stu / tea, 1) if tea else None
    return {
        "School": s.name,
        "District": s.district,
        "Sector": s.sector,
        "Head Teacher": _head_name(db, s),
        "Students": stu,
        "Teachers": tea,
        "Pupil-Teacher Ratio": f"1:{ratio}" if ratio else "—",
        "Internet": "Yes" if s.has_internet else "No",
        "Electricity": "Yes" if s.has_electricity else "No",
        "Water": "Yes" if s.has_water else "No",
        "Connectivity": connectivity_label(s),
        "Last Updated": _updated(s),
    }


def _dossier_row(db: Session, s: School) -> dict:
    stu = _students(s)
    tea = _teachers(s)
    toilets = (s.toilets_boys or 0) + (s.toilets_girls or 0)
    ratio = round(stu / tea, 1) if tea else None
    return {
        "School": s.name,
        "District": s.district,
        "Sector": s.sector,
        "Status": _enum_val(s.status).title(),
        "Head Teacher": _head_name(db, s),
        "Students": stu,
        "Teachers": tea,
        "Pupil-Teacher Ratio": f"1:{ratio}" if ratio else "—",
        "Textbooks": s.textbooks or 0,
        "Desks": s.desks or 0,
        "Classrooms": s.classrooms or 0,
        "Usable Classrooms": s.classrooms_good or 0,
        "Toilets": toilets,
        "Water": "Yes" if s.has_water else "No",
        "Electricity": "Yes" if s.has_electricity else "No",
        "Internet": "Yes" if s.has_internet else "No",
        "Library": "Yes" if s.has_library else "No",
        "ICT Lab": "Yes" if s.has_ict_lab else "No",
        "Science Lab": "Yes" if s.has_science_lab else "No",
        "Infrastructure Score": infrastructure_score(s),
        "GPS Verified": "Yes" if s.gps_verified else "No",
        "Last Updated": _updated(s),
    }


def _resource_gap_row(db: Session, s: School, resource: str) -> dict:
    stu = _students(s)
    row = _dossier_row(db, s)
    if resource == "textbook":
        have, need = s.textbooks or 0, stu
        row["Have"] = have
        row["Need"] = need
        row["Gap"] = have - need
    elif resource == "desk":
        have, need = s.desks or 0, stu
        row["Have"] = have
        row["Need"] = need
        row["Gap"] = have - need
    elif resource == "toilet":
        have = (s.toilets_boys or 0) + (s.toilets_girls or 0)
        need = max(1, (stu + 29) // 30)
        row["Have"] = have
        row["Need"] = need
        row["Gap"] = have - need
    elif resource == "classroom":
        usable = s.classrooms_good or s.classrooms or 0
        need = max(1, (stu + 44) // 45)
        row["Usable Classrooms"] = usable
        row["Need"] = need
        row["Students Per Room"] = round(stu / usable, 1) if usable else "—"
        row["Gap"] = usable - need
    return row


def _build_insights(rtype: str, summary: dict, rows: list) -> List[str]:
    insights = []
    total = summary.get("Total Schools") or summary.get("Total Records") or summary.get("Total") or 0
    if rtype in ("no_internet", "no_water", "no_electricity"):
        n = summary.get("Matching Schools", len(rows))
        if n:
            insights.append(f"{n} school(s) match this criterion — review line items before budget meetings.")
        else:
            insights.append("No schools match this criterion in your scope.")
    elif rtype == "schools_summary":
        crit = summary.get("Critical Schools", 0)
        if crit:
            insights.append(f"{crit} school(s) are in critical status — schedule district review visits.")
        gps = summary.get("GPS Verified", 0)
        if total and gps < total:
            insights.append(f"{total - gps} school(s) still lack GPS verification.")
    elif rtype == "textbook_deficit":
        n = len(rows)
        if n:
            insights.append(f"{n} school(s) need textbook procurement — see Gap column for quantities.")
    elif rtype == "unresolved_alerts":
        n = len(rows)
        if n:
            insights.append(f"{n} open alert(s) — assign school heads to verify and close.")
    elif rtype == "feedback_backlog":
        pending = summary.get("Pending", 0)
        if pending:
            insights.append(f"{pending} feedback item(s) await review — target 80%+ resolution rate.")
    elif rtype == "data_entry_compliance":
        n = len(rows)
        if n:
            insights.append(f"{n} school(s) missed data entry — assign heads to complete surveys.")
    elif rtype == "district_overview" and rows:
        worst = max(rows, key=lambda r: r.get("Critical Schools", 0))
        if worst.get("Critical Schools"):
            insights.append(
                f"{worst['District']} has the most critical schools ({worst['Critical Schools']})."
            )
    elif rtype == "national_equity" and rows:
        low_inet = min(rows, key=lambda r: r.get("Internet %", 100))
        insights.append(f"Lowest internet coverage: {low_inet['District']} ({low_inet.get('Internet %', 0)}%).")
    if not insights:
        insights.append("Review detailed records below for planning decisions.")
    return insights[:5]


def build_report(
    db: Session, cu, rtype: str, start_dt: datetime, end_dt: datetime,
) -> Tuple[dict, list]:
    rows: list = []
    summary: dict = {}
    role = _role_value(cu)

    if rtype == "schools_summary":
        schools = _school_scope(db.query(School), cu).all()
        for s in schools:
            stu, tea = _students(s), _teachers(s)
            ratio = round(stu / tea, 1) if tea else None
            rows.append({
                "School": s.name,
                "District": s.district,
                "Sector": s.sector,
                "Status": _enum_val(s.status).title(),
                "Students": stu,
                "Teachers": tea,
                "Pupil-Teacher Ratio": f"1:{ratio}" if ratio else "—",
                "GPS Verified": "Yes" if s.gps_verified else "No",
            })
        high_pt = sum(
            1 for r in rows
            if r["Pupil-Teacher Ratio"] != "—" and float(r["Pupil-Teacher Ratio"].split(":")[1]) > 50
        )
        summary = {
            "Total Schools": len(rows),
            "Critical Schools": sum(1 for r in rows if r["Status"] == "Critical"),
            "GPS Verified": sum(1 for r in rows if r["GPS Verified"] == "Yes"),
            "High P-T Ratio": high_pt,
        }

    elif rtype == "school_dossier":
        schools = _school_scope(db.query(School), cu).all()
        for s in schools:
            rows.append(_dossier_row(db, s))
        summary = {"Total Schools": len(rows), "Critical Schools": sum(1 for s in schools if _enum_val(s.status) == "critical")}

    elif rtype == "no_internet":
        schools = [s for s in _school_scope(db.query(School), cu).all() if not s.has_internet]
        for s in schools:
            rows.append(_connectivity_row(db, s))
        summary = {"Matching Schools": len(rows), "Total Scoped": len(_school_scope(db.query(School), cu).all())}

    elif rtype == "no_water":
        schools = [s for s in _school_scope(db.query(School), cu).all() if not s.has_water]
        for s in schools:
            rows.append(_connectivity_row(db, s))
        summary = {"Matching Schools": len(rows)}

    elif rtype == "no_electricity":
        schools = [s for s in _school_scope(db.query(School), cu).all() if not s.has_electricity]
        for s in schools:
            rows.append(_connectivity_row(db, s))
        summary = {"Matching Schools": len(rows)}

    elif rtype == "no_library":
        schools = [s for s in _school_scope(db.query(School), cu).all() if not s.has_library]
        for s in schools:
            r = _dossier_row(db, s)
            rows.append({k: r[k] for k in ("School", "District", "Sector", "Head Teacher", "Students", "Library", "Last Updated")})
        summary = {"Matching Schools": len(rows)}

    elif rtype == "no_ict_lab":
        schools = [s for s in _school_scope(db.query(School), cu).all() if not s.has_ict_lab]
        for s in schools:
            r = _dossier_row(db, s)
            rows.append({k: r[k] for k in ("School", "District", "Sector", "Head Teacher", "Students", "ICT Lab", "Internet", "Last Updated")})
        summary = {"Matching Schools": len(rows)}

    elif rtype == "no_science_lab":
        schools = [s for s in _school_scope(db.query(School), cu).all() if not s.has_science_lab]
        for s in schools:
            r = _dossier_row(db, s)
            rows.append({k: r[k] for k in ("School", "District", "Sector", "Head Teacher", "Students", "Science Lab", "Last Updated")})
        summary = {"Matching Schools": len(rows)}

    elif rtype == "infrastructure_stale":
        cutoff = datetime.utcnow() - timedelta(days=365)
        schools = _school_scope(db.query(School), cu).all()
        stale = []
        for s in schools:
            last_infra = (
                db.query(FieldCollection)
                .filter(
                    FieldCollection.school_id == s.id,
                    FieldCollection.collection_type == "infrastructure",
                )
                .order_by(FieldCollection.created_at.desc())
                .first()
            )
            old = (not s.updated_at or s.updated_at.replace(tzinfo=None) < cutoff)
            if last_infra:
                ca = last_infra.created_at
                if ca and ca.replace(tzinfo=None) >= cutoff:
                    old = False
            if old:
                stale.append(s)
        for s in stale:
            rows.append({
                "School": s.name,
                "District": s.district,
                "Sector": s.sector,
                "Head Teacher": _head_name(db, s),
                "Last Updated": _updated(s),
                "Action": "Request infrastructure audit",
            })
        summary = {"Stale Schools": len(rows)}

    elif rtype == "textbook_deficit":
        schools = [s for s in _school_scope(db.query(School), cu).all() if _students(s) > 0 and (s.textbooks or 0) < _students(s)]
        for s in schools:
            rows.append(_resource_gap_row(db, s, "textbook"))
        summary = {"Schools With Shortage": len(rows)}

    elif rtype == "desk_deficit":
        schools = [s for s in _school_scope(db.query(School), cu).all() if _students(s) > 0 and (s.desks or 0) < _students(s)]
        for s in schools:
            rows.append(_resource_gap_row(db, s, "desk"))
        summary = {"Schools With Shortage": len(rows)}

    elif rtype == "toilet_deficit":
        for s in _school_scope(db.query(School), cu).all():
            stu = _students(s)
            if stu > 0:
                have = (s.toilets_boys or 0) + (s.toilets_girls or 0)
                if have < max(1, (stu + 29) // 30):
                    rows.append(_resource_gap_row(db, s, "toilet"))
        summary = {"Schools With Shortage": len(rows)}

    elif rtype == "classroom_pressure":
        for s in _school_scope(db.query(School), cu).all():
            stu = _students(s)
            usable = s.classrooms_good or s.classrooms or 0
            if stu > 0 and usable > 0 and stu / usable > 45:
                rows.append(_resource_gap_row(db, s, "classroom"))
            elif stu > 0 and usable == 0:
                rows.append(_resource_gap_row(db, s, "classroom"))
        summary = {"Overcrowded Schools": len(rows)}

    elif rtype == "high_pt_ratio":
        for s in _school_scope(db.query(School), cu).all():
            stu, tea = _students(s), _teachers(s)
            if tea > 0 and stu / tea > 50:
                rows.append(_dossier_row(db, s))
        summary = {"Schools Over 1:50": len(rows)}

    elif rtype == "critical_schools":
        schools = [s for s in _school_scope(db.query(School), cu).all() if _enum_val(s.status) == "critical"]
        for s in schools:
            rows.append(_dossier_row(db, s))
        summary = {"Critical Schools": len(rows)}

    elif rtype == "teacher_roster":
        q = db.query(Teacher).join(School)
        if role == "district" and cu.district:
            q = q.filter(School.district == cu.district)
        elif role == "school" and cu.school_id:
            q = q.filter(Teacher.school_id == cu.school_id)
        elif role == "enumerator" and cu.district:
            q = q.filter(School.district == cu.district)
        teachers = q.order_by(School.name, Teacher.full_name).all()
        for t in teachers:
            school = db.query(School).filter(School.id == t.school_id).first()
            rows.append({
                "School": school.name if school else t.school_id,
                "District": school.district if school else "—",
                "Teacher": t.full_name,
                "Gender": t.gender,
                "Subject": t.subject,
                "Qualification": t.qualification,
                "Contract": t.employment_type,
                "Status": t.status,
            })
        summary = {"Total Teachers": len(rows), "Schools Covered": len({t.school_id for t in teachers})}

    elif rtype == "gps_coverage":
        schools = _school_scope(db.query(School), cu).all()
        for s in schools:
            rows.append({
                "School": s.name,
                "District": s.district,
                "Sector": s.sector,
                "Coordinates": "Yes" if (s.latitude and s.longitude) else "No",
                "GPS Verified": "Yes" if s.gps_verified else "No",
                "Latitude": s.latitude if s.latitude else "—",
                "Longitude": s.longitude if s.longitude else "—",
            })
        summary = {
            "Total Schools": len(rows),
            "Mapped": sum(1 for r in rows if r["Coordinates"] == "Yes"),
            "Verified": sum(1 for r in rows if r["GPS Verified"] == "Yes"),
        }

    elif rtype == "unmapped_schools":
        schools = [s for s in _school_scope(db.query(School), cu).all() if not (s.latitude and s.longitude)]
        for s in schools:
            rows.append({
                "School": s.name,
                "District": s.district,
                "Sector": s.sector,
                "Head Teacher": _head_name(db, s),
                "Action": "Capture GPS coordinates",
            })
        summary = {"Unmapped Schools": len(rows)}

    elif rtype == "gps_unverified":
        schools = [
            s for s in _school_scope(db.query(School), cu).all()
            if s.latitude and s.longitude and not s.gps_verified
        ]
        for s in schools:
            rows.append({
                "School": s.name,
                "District": s.district,
                "Sector": s.sector,
                "Latitude": s.latitude,
                "Longitude": s.longitude,
                "Action": "Verify on site",
            })
        summary = {"Awaiting Verification": len(rows)}

    elif rtype == "alerts_summary":
        q = db.query(ResourceAlert).join(School)
        if role == "district" and cu.district:
            q = q.filter(School.district == cu.district)
        elif role == "school" and cu.school_id:
            q = q.filter(ResourceAlert.school_id == cu.school_id)
        elif role == "reb":
            q = q.filter(ResourceAlert.forwarded_to_reb == True)
        alerts = q.filter(
            and_(ResourceAlert.created_at >= start_dt, ResourceAlert.created_at <= end_dt)
        ).order_by(ResourceAlert.created_at.desc()).all()
        for a in alerts:
            school = db.query(School).filter(School.id == a.school_id).first()
            rows.append({
                "School": school.name if school else str(a.school_id),
                "District": school.district if school else "—",
                "Level": _enum_val(a.level).title(),
                "Type": a.alert_type.replace("_", " ").title(),
                "Message": a.message or "",
                "Status": "Resolved" if a.is_resolved else "Active",
                "Date": a.created_at.strftime("%Y-%m-%d") if a.created_at else "",
            })
        summary = {
            "Total Alerts": len(rows),
            "Critical": sum(1 for r in rows if r["Level"] == "Critical"),
            "Unresolved": sum(1 for r in rows if r["Status"] == "Active"),
        }

    elif rtype == "unresolved_alerts":
        q = db.query(ResourceAlert).join(School).filter(ResourceAlert.is_resolved == False)
        if role == "district" and cu.district:
            q = q.filter(School.district == cu.district)
        elif role == "school" and cu.school_id:
            q = q.filter(ResourceAlert.school_id == cu.school_id)
        elif role == "reb":
            q = q.filter(ResourceAlert.forwarded_to_reb == True)
        for a in q.order_by(ResourceAlert.created_at.desc()).all():
            school = db.query(School).filter(School.id == a.school_id).first()
            rows.append({
                "School": school.name if school else str(a.school_id),
                "District": school.district if school else "—",
                "Level": _enum_val(a.level).title(),
                "Type": a.alert_type.replace("_", " ").title(),
                "Message": a.message or "",
                "Date": a.created_at.strftime("%Y-%m-%d") if a.created_at else "",
            })
        summary = {"Open Alerts": len(rows)}

    elif rtype == "feedback_summary":
        q = db.query(Feedback).join(School)
        if role == "district" and cu.district:
            q = q.filter(School.district == cu.district)
        elif role == "school" and cu.school_id:
            q = q.filter(Feedback.school_id == cu.school_id)
        elif role == "reb":
            q = q.filter(Feedback.forwarded_to_reb == True)
        items = q.filter(
            and_(Feedback.created_at >= start_dt, Feedback.created_at <= end_dt)
        ).order_by(Feedback.created_at.desc()).all()
        for f in items:
            school = db.query(School).filter(School.id == f.school_id).first()
            rows.append({
                "School": school.name if school else str(f.school_id),
                "Issue Type": f.issue_type,
                "Status": _enum_val(f.status).title(),
                "Description": f.description or "",
                "Date": f.created_at.strftime("%Y-%m-%d") if f.created_at else "",
            })
        summary = {
            "Total": len(rows),
            "Pending": sum(1 for r in rows if r["Status"] == "Pending"),
            "Resolved": sum(1 for r in rows if r["Status"] == "Resolved"),
        }

    elif rtype == "feedback_backlog":
        q = db.query(Feedback).join(School).filter(
            Feedback.status.in_([FeedbackStatusEnum.pending, FeedbackStatusEnum.reviewed])
        )
        if role == "district" and cu.district:
            q = q.filter(School.district == cu.district)
        elif role == "reb":
            q = q.filter(Feedback.forwarded_to_reb == True)
        for f in q.order_by(Feedback.created_at.desc()).all():
            school = db.query(School).filter(School.id == f.school_id).first()
            rows.append({
                "School": school.name if school else str(f.school_id),
                "District": school.district if school else "—",
                "Issue Type": f.issue_type,
                "Status": _enum_val(f.status).title(),
                "Description": f.description or "",
                "Date": f.created_at.strftime("%Y-%m-%d") if f.created_at else "",
            })
        summary = {"Backlog Items": len(rows), "Pending": sum(1 for r in rows if r["Status"] == "Pending")}

    elif rtype == "my_submissions":
        items = (
            db.query(Feedback)
            .filter(
                Feedback.user_id == cu.id,
                and_(Feedback.created_at >= start_dt, Feedback.created_at <= end_dt),
            )
            .order_by(Feedback.created_at.desc())
            .all()
        )
        for f in items:
            school = db.query(School).filter(School.id == f.school_id).first()
            rows.append({
                "School": school.name if school else str(f.school_id),
                "Issue Type": f.issue_type,
                "Status": _enum_val(f.status).title(),
                "Description": f.description or "",
                "Date": f.created_at.strftime("%Y-%m-%d") if f.created_at else "",
            })
        summary = {"My Submissions": len(rows), "Pending": sum(1 for r in rows if r["Status"] == "Pending")}

    elif rtype == "enrollment_trends":
        q = db.query(EnrollmentHistory).join(School)
        if role == "district" and cu.district:
            q = q.filter(School.district == cu.district)
        elif role == "school" and cu.school_id:
            q = q.filter(EnrollmentHistory.school_id == cu.school_id)
        start_year, end_year = start_dt.year, end_dt.year
        items = q.filter(
            and_(EnrollmentHistory.year >= start_year, EnrollmentHistory.year <= end_year)
        ).order_by(EnrollmentHistory.year).all()
        by_year = {}
        for e in items:
            boys = e.students_boys or 0
            girls = e.students_girls or 0
            by_year.setdefault(e.year, {"boys": 0, "girls": 0, "teachers": 0})
            by_year[e.year]["boys"] += boys
            by_year[e.year]["girls"] += girls
            by_year[e.year]["teachers"] += e.teachers or 0
        for y in sorted(by_year):
            d = by_year[y]
            rows.append({
                "Year": y,
                "Boys": d["boys"],
                "Girls": d["girls"],
                "Total Students": d["boys"] + d["girls"],
                "Teachers": d["teachers"],
            })
        latest = rows[-1]["Total Students"] if rows else 0
        summary = {"Years Covered": len(rows), "Latest Enrollment": latest}

    elif rtype == "data_entry_compliance":
        required_types = {"survey", "resources", "infrastructure"}
        schools = _school_scope(db.query(School), cu).all()
        for s in schools:
            missing = []
            for ctype in required_types:
                hit = (
                    db.query(FieldCollection)
                    .filter(
                        FieldCollection.school_id == s.id,
                        FieldCollection.collection_type == ctype,
                        and_(FieldCollection.created_at >= start_dt, FieldCollection.created_at <= end_dt),
                    )
                    .first()
                )
                if not hit:
                    missing.append(ctype.title())
            if missing:
                rows.append({
                    "School": s.name,
                    "District": s.district,
                    "Head Teacher": _head_name(db, s),
                    "Missing Updates": ", ".join(missing),
                    "Action": "Assign data entry task",
                })
        summary = {"Non-Compliant Schools": len(rows)}

    elif rtype == "district_overview":
        from app.data.rwanda_districts import DISTRICT_NAMES
        districts = list(DISTRICT_NAMES)
        if role == "district" and cu.district:
            districts = [cu.district]
        for d in districts:
            schools = db.query(School).filter(School.district == d).all()
            stu = sum(_students(s) for s in schools)
            tea = sum(_teachers(s) for s in schools)
            rows.append({
                "District": d,
                "Schools": len(schools),
                "Students": stu,
                "Teachers": tea,
                "Critical Schools": sum(1 for s in schools if _enum_val(s.status) == "critical"),
                "Pupil-Teacher Ratio": f"1:{round(stu / tea, 1)}" if tea else "—",
            })
        summary = {"Districts": len(rows), "Total Schools": sum(r["Schools"] for r in rows)}

    elif rtype == "national_equity":
        from app.data.rwanda_districts import DISTRICT_NAMES
        for d in DISTRICT_NAMES:
            schools = db.query(School).filter(School.district == d).all()
            n = len(schools) or 1
            stu = sum(_students(s) for s in schools)
            rows.append({
                "District": d,
                "Schools": len(schools),
                "Students": stu,
                "Critical Schools": sum(1 for s in schools if _enum_val(s.status) == "critical"),
                "Water %": round(100 * sum(1 for s in schools if s.has_water) / n, 1),
                "Electricity %": round(100 * sum(1 for s in schools if s.has_electricity) / n, 1),
                "Internet %": round(100 * sum(1 for s in schools if s.has_internet) / n, 1),
                "GPS Verified %": round(100 * sum(1 for s in schools if s.gps_verified) / n, 1),
            })
        summary = {"Districts": len(rows)}

    elif rtype == "audit_summary":
        logs = (
            db.query(AuditLog)
            .filter(and_(AuditLog.created_at >= start_dt, AuditLog.created_at <= end_dt))
            .order_by(AuditLog.created_at.desc())
            .limit(500)
            .all()
        )
        for log in logs:
            user = db.query(User).filter(User.id == log.user_id).first() if log.user_id else None
            rows.append({
                "Date": log.created_at.strftime("%Y-%m-%d %H:%M") if log.created_at else "",
                "User": user.full_name if user else "—",
                "Action": log.action_type,
                "Description": log.description or "",
                "Entity": log.entity or "—",
            })
        summary = {"Audit Entries": len(rows)}

    elif rtype == "service_requests_register":
        reqs = (
            db.query(ServiceRequest)
            .filter(and_(ServiceRequest.created_at >= start_dt, ServiceRequest.created_at <= end_dt))
            .order_by(ServiceRequest.created_at.desc())
            .all()
        )
        for r in reqs:
            user = db.query(User).filter(User.id == r.user_id).first()
            status = r.status.value if hasattr(r.status, "value") else str(r.status)
            rows.append({
                "Date": r.created_at.strftime("%Y-%m-%d") if r.created_at else "",
                "User": user.full_name if user else "—",
                "Type": r.request_type.replace("_", " ").title(),
                "Title": r.title,
                "Status": status.title(),
            })
        pending = sum(
            1 for r in reqs
            if (r.status.value if hasattr(r.status, "value") else str(r.status)) == "pending"
        )
        summary = {"Total Requests": len(rows), "Pending": pending}

    elif rtype == "registration_pipeline":
        users = (
            db.query(User)
            .filter(User.account_status == AccountStatusEnum.pending)
            .order_by(User.created_at.desc())
            .all()
        )
        for u in users:
            rows.append({
                "Name": u.full_name,
                "Email": u.email,
                "Requested Role": _enum_val(u.role).title(),
                "District": u.district or "—",
                "Registered": u.created_at.strftime("%Y-%m-%d") if u.created_at else "",
            })
        summary = {"Pending Accounts": len(rows)}

    else:
        raise ValueError(f"Unknown report type: {rtype}")

    return summary, rows


def get_insights(rtype: str, summary: dict, rows: list) -> List[str]:
    return _build_insights(rtype, summary, rows)
