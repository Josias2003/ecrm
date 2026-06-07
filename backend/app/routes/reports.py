from datetime import datetime, date
from typing import List, Optional
import io

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.core.database import get_db
from app.core.security import get_current_user, get_client_ip
from app.models.models import School, ResourceAlert, Feedback, EnrollmentHistory, AuditLog
from app.schemas.schemas import ReportMeta, ReportPreview

reports_router = APIRouter(prefix="/api/reports", tags=["Reports"])

REPORT_CATALOG = {
    "schools_summary": {
        "label": "Schools Summary",
        "description": "Inventory, status, and staffing across scoped schools — use to prioritise resource allocation.",
        "roles": ["reb", "district", "school", "enumerator"],
    },
    "alerts_summary": {
        "label": "Resource Alerts",
        "description": "Active and historical resource gap alerts — use to target urgent interventions.",
        "roles": ["reb", "district", "school"],
    },
    "feedback_summary": {
        "label": "Community Feedback",
        "description": "Community and school-submitted issues — use to track response and accountability.",
        "roles": ["reb", "district", "school", "community"],
    },
    "enrollment_trends": {
        "label": "Enrollment Trends",
        "description": "Year-on-year enrollment — use for capacity and teacher deployment planning.",
        "roles": ["reb", "district", "school"],
    },
    "gps_coverage": {
        "label": "GPS Coverage",
        "description": "Field mapping progress — use to plan enumerator verification visits.",
        "roles": ["reb", "district", "enumerator"],
    },
    "district_overview": {
        "label": "District Overview",
        "description": "Aggregated district comparison — use for regional equity and budget discussions.",
        "roles": ["reb", "district"],
    },
}


def _role_value(cu) -> str:
    return cu.role.value if hasattr(cu.role, "value") else str(cu.role)


def _enum_val(v) -> str:
    return v.value if hasattr(v, "value") else str(v)


def _parse_dates(from_date: Optional[str], to_date: Optional[str]):
    today = date.today()
    if from_date:
        start = datetime.strptime(from_date, "%Y-%m-%d").date()
    else:
        start = today.replace(day=1)
    if to_date:
        end = datetime.strptime(to_date, "%Y-%m-%d").date()
    else:
        end = today
    if start > end:
        raise HTTPException(400, "from_date must be before to_date")
    start_dt = datetime.combine(start, datetime.min.time())
    end_dt = datetime.combine(end, datetime.max.time())
    return start, end, start_dt, end_dt


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


def _log_export(db, cu, desc, ip):
    db.add(AuditLog(
        user_id=cu.id, action_type="EXPORT", description=desc,
        entity="Report", ip_address=ip,
    ))
    db.commit()


def _build_insights(rtype: str, summary: dict, rows: list) -> List[str]:
    insights = []
    if rtype == "schools_summary":
        crit = summary.get("critical", 0)
        total = summary.get("total_schools", 0)
        gps = summary.get("gps_verified", 0)
        if crit:
            insights.append(f"{crit} school(s) are in critical status — schedule district review visits.")
        if total and gps < total:
            insights.append(f"{total - gps} school(s) still lack GPS verification — assign field enumerators.")
        overloaded = summary.get("high_pt_ratio", 0)
        if overloaded:
            insights.append(f"{overloaded} school(s) exceed 1:50 pupil-teacher ratio — teacher deployment needed.")
        if not insights:
            insights.append("School portfolio is within acceptable thresholds for the selected scope.")
    elif rtype == "alerts_summary":
        unresolved = summary.get("unresolved", 0)
        critical = summary.get("critical", 0)
        if critical:
            insights.append(f"{critical} critical alert(s) recorded — escalate to district action plans.")
        if unresolved:
            insights.append(f"{unresolved} alert(s) remain unresolved — track closure in weekly meetings.")
        if not insights:
            insights.append("No significant alert backlog in this period.")
    elif rtype == "feedback_summary":
        pending = summary.get("pending", 0)
        if pending:
            insights.append(f"{pending} feedback item(s) await review — assign officers to clear backlog.")
        resolved = summary.get("resolved", 0)
        total = summary.get("total", 0)
        if total:
            rate = round((resolved / total) * 100) if total else 0
            insights.append(f"Resolution rate: {rate}% — target 80%+ for community trust.")
    elif rtype == "enrollment_trends":
        latest = summary.get("latest_total", 0)
        years = summary.get("years", 0)
        if years >= 2 and rows:
            first = rows[0].get("total_students", 0)
            change = latest - first
            if change > 0:
                insights.append(f"Enrollment grew by {change:,} students since {rows[0].get('year')} — plan classroom expansion.")
            elif change < 0:
                insights.append(f"Enrollment declined by {abs(change):,} — investigate attrition causes.")
        insights.append(f"Latest recorded enrollment: {latest:,} students across {years} year(s).")
    elif rtype == "gps_coverage":
        mapped = summary.get("mapped", 0)
        total = summary.get("total", 0)
        verified = summary.get("verified", 0)
        if total and mapped < total:
            insights.append(f"{total - mapped} school(s) missing coordinates — prioritise field capture.")
        if mapped and verified < mapped:
            insights.append(f"{mapped - verified} mapped school(s) await on-site GPS verification.")
    elif rtype == "district_overview":
        if rows:
            worst = max(rows, key=lambda r: r.get("critical", 0))
            if worst.get("critical"):
                insights.append(f"{worst['district']} has the most critical schools ({worst['critical']}) — focus interventions there.")
            best = max(rows, key=lambda r: r.get("students", 0))
            insights.append(f"{best['district']} serves the largest student population ({best['students']:,}).")
    return insights[:5]


def _build_report(db, cu, rtype, start_dt, end_dt):
    rows = []
    summary = {}
    role = _role_value(cu)

    if rtype == "schools_summary":
        schools = _school_scope(db.query(School), cu).all()
        for s in schools:
            stu = (s.students_boys or 0) + (s.students_girls or 0)
            tea = (s.teachers_male or 0) + (s.teachers_female or 0)
            ratio = round(stu / tea, 1) if tea else None
            rows.append({
                "name": s.name, "district": s.district, "sector": s.sector,
                "status": _enum_val(s.status), "students": stu, "teachers": tea,
                "pt_ratio": f"1:{ratio}" if ratio else "—",
                "gps_verified": "Yes" if s.gps_verified else "No",
            })
        high_pt = sum(1 for r in rows if r.get("pt_ratio") != "—" and float(r["pt_ratio"].split(":")[1]) > 50)
        summary = {
            "total_schools": len(rows),
            "critical": sum(1 for r in rows if r["status"] == "critical"),
            "gps_verified": sum(1 for r in rows if r["gps_verified"] == "Yes"),
            "high_pt_ratio": high_pt,
        }

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
                "school": school.name if school else a.school_id,
                "level": _enum_val(a.level),
                "type": a.alert_type.replace("_", " ").title(),
                "message": (a.message or "")[:100],
                "status": "Resolved" if a.is_resolved else "Active",
                "date": a.created_at.strftime("%Y-%m-%d") if a.created_at else "",
            })
        summary = {
            "total": len(rows),
            "critical": sum(1 for r in rows if r["level"] == "critical"),
            "unresolved": sum(1 for r in rows if r["status"] == "Active"),
        }

    elif rtype == "feedback_summary":
        q = db.query(Feedback).join(School)
        if role == "district" and cu.district:
            q = q.filter(School.district == cu.district)
        elif role == "school" and cu.school_id:
            q = q.filter(Feedback.school_id == cu.school_id)
        elif role == "community":
            q = q.filter(Feedback.user_id == cu.id)
        elif role == "reb":
            q = q.filter(Feedback.forwarded_to_reb == True)
        items = q.filter(
            and_(Feedback.created_at >= start_dt, Feedback.created_at <= end_dt)
        ).order_by(Feedback.created_at.desc()).all()
        for f in items:
            school = db.query(School).filter(School.id == f.school_id).first()
            rows.append({
                "school": school.name if school else f.school_id,
                "issue_type": f.issue_type,
                "status": _enum_val(f.status),
                "description": (f.description or "")[:100],
                "date": f.created_at.strftime("%Y-%m-%d") if f.created_at else "",
            })
        summary = {
            "total": len(rows),
            "pending": sum(1 for r in rows if r["status"] == "pending"),
            "resolved": sum(1 for r in rows if r["status"] == "resolved"),
        }

    elif rtype == "enrollment_trends":
        q = db.query(EnrollmentHistory).join(School)
        if role == "district" and cu.district:
            q = q.filter(School.district == cu.district)
        elif role == "school" and cu.school_id:
            q = q.filter(EnrollmentHistory.school_id == cu.school_id)
        start_year = start_dt.year
        end_year = end_dt.year
        items = q.filter(
            and_(EnrollmentHistory.year >= start_year, EnrollmentHistory.year <= end_year)
        ).order_by(EnrollmentHistory.year).all()
        by_year = {}
        for e in items:
            total = (e.students_boys or 0) + (e.students_girls or 0)
            by_year[e.year] = by_year.get(e.year, 0) + total
        rows = [{"year": y, "total_students": t} for y, t in sorted(by_year.items())]
        summary = {"years": len(rows), "latest_total": rows[-1]["total_students"] if rows else 0}

    elif rtype == "gps_coverage":
        schools = _school_scope(db.query(School), cu).all()
        for s in schools:
            rows.append({
                "name": s.name, "district": s.district,
                "coordinates": "Yes" if (s.latitude and s.longitude) else "No",
                "gps_verified": "Yes" if s.gps_verified else "No",
                "latitude": s.latitude or "—",
                "longitude": s.longitude or "—",
            })
        summary = {
            "total": len(rows),
            "mapped": sum(1 for r in rows if r["coordinates"] == "Yes"),
            "verified": sum(1 for r in rows if r["gps_verified"] == "Yes"),
        }

    elif rtype == "district_overview":
        if role not in ["reb", "district"]:
            raise HTTPException(403, "Not allowed")
        from app.data.rwanda_districts import DISTRICT_NAMES
        districts = list(DISTRICT_NAMES)
        if role == "district" and cu.district:
            districts = [cu.district]
        for d in districts:
            schools = db.query(School).filter(School.district == d).all()
            stu = sum((s.students_boys or 0) + (s.students_girls or 0) for s in schools)
            tea = sum((s.teachers_male or 0) + (s.teachers_female or 0) for s in schools)
            rows.append({
                "district": d, "schools": len(schools), "students": stu,
                "teachers": tea,
                "critical": sum(1 for s in schools if _enum_val(s.status) == "critical"),
                "pt_ratio": f"1:{round(stu / tea, 1)}" if tea else "—",
            })
        summary = {"districts": len(rows), "total_schools": sum(r["schools"] for r in rows)}

    return summary, rows


def _make_preview(cu, rtype, start, end, start_dt, end_dt, db):
    meta = REPORT_CATALOG[rtype]
    summary, rows = _build_report(db, cu, rtype, start_dt, end_dt)
    insights = _build_insights(rtype, summary, rows)
    return ReportPreview(
        type=rtype,
        label=meta["label"],
        description=meta["description"],
        period_from=start.isoformat(),
        period_to=end.isoformat(),
        generated_at=datetime.utcnow(),
        summary=summary,
        insights=insights,
        rows=rows[:200],
    )


@reports_router.get("/types", response_model=List[ReportMeta])
def list_report_types(cu=Depends(get_current_user)):
    role = _role_value(cu)
    out = []
    for key, meta in REPORT_CATALOG.items():
        if role in meta["roles"]:
            out.append(ReportMeta(type=key, label=meta["label"], description=meta["description"]))
    return out


@reports_router.get("/preview", response_model=ReportPreview)
def preview_report(
    type: str = Query(...),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    cu=Depends(get_current_user),
):
    role = _role_value(cu)
    if type not in REPORT_CATALOG or role not in REPORT_CATALOG[type]["roles"]:
        raise HTTPException(403, "Report type not available for your role")
    start, end, start_dt, end_dt = _parse_dates(from_date, to_date)
    return _make_preview(cu, type, start, end, start_dt, end_dt, db)


@reports_router.get("/export")
def export_report(
    type: str = Query(...),
    from_date: Optional[str] = Query(None),
    to_date: Optional[str] = Query(None),
    format: str = Query("pdf"),
    request: Request = None,
    db: Session = Depends(get_db),
    cu=Depends(get_current_user),
):
    role = _role_value(cu)
    if type not in REPORT_CATALOG or role not in REPORT_CATALOG[type]["roles"]:
        raise HTTPException(403, "Report type not available for your role")
    if format != "pdf":
        raise HTTPException(400, "Only PDF export is supported")
    start, end, start_dt, end_dt = _parse_dates(from_date, to_date)
    preview = _make_preview(cu, type, start, end, start_dt, end_dt, db)
    ip = get_client_ip(request) if request else None
    _log_export(db, cu, f"Exported PDF {type} ({start} to {end})", ip)

    try:
        from app.services.pdf_report import build_report_pdf
    except ImportError:
        raise HTTPException(500, "PDF export unavailable — run: pip install reportlab")
    pdf_bytes = build_report_pdf(
        title=preview.label,
        description=preview.description,
        period_from=preview.period_from,
        period_to=preview.period_to,
        generated_by=cu.full_name,
        role=role,
        summary=preview.summary,
        insights=preview.insights,
        rows=preview.rows,
    )
    filename = f"ECRM_{type}_{start}_{end}.pdf"
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
