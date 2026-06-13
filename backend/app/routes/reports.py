from datetime import datetime, date
from typing import List, Optional
import io
import re

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, get_client_ip
from app.models.models import AuditLog
from app.schemas.schemas import ReportMeta, ReportPreview
from app.services.report_catalog import REPORT_CATALOG, CATEGORY_LABELS
from app.services.report_engine import build_report, get_insights, _role_value

reports_router = APIRouter(prefix="/api/reports", tags=["Reports"])

EXPORT_ROW_LIMIT = 5000
SUPPORTED_FORMATS = {"pdf", "xlsx", "excel"}


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


def _log_export(db, cu, desc, ip):
    db.add(AuditLog(
        user_id=cu.id, action_type="EXPORT", description=desc,
        entity="Report", ip_address=ip,
    ))
    db.commit()


def _safe_filename(label: str, start, end, ext: str) -> str:
    safe = re.sub(r"[^\w\-]+", "_", label).strip("_")
    return f"ECRM_{safe}_{start}_{end}.{ext}"


def _build_export_payload(cu, rtype, start, end, start_dt, end_dt, db):
    meta = REPORT_CATALOG[rtype]
    summary, rows = build_report(db, cu, rtype, start_dt, end_dt)
    insights = get_insights(rtype, summary, rows)
    export_rows = rows[:EXPORT_ROW_LIMIT]
    return {
        "meta": meta,
        "summary": summary,
        "insights": insights,
        "rows": export_rows,
        "label": meta["label"],
        "description": meta["description"],
        "period_from": start.isoformat(),
        "period_to": end.isoformat(),
    }


def _make_preview(cu, rtype, start, end, start_dt, end_dt, db):
    payload = _build_export_payload(cu, rtype, start, end, start_dt, end_dt, db)
    meta = payload["meta"]
    return ReportPreview(
        type=rtype,
        label=meta["label"],
        description=meta["description"],
        category=meta["category"],
        category_label=CATEGORY_LABELS.get(meta["category"], meta["category"].title()),
        period_from=start.isoformat(),
        period_to=end.isoformat(),
        generated_at=datetime.utcnow(),
        summary=payload["summary"],
        insights=payload["insights"],
        rows=payload["rows"][:200],
    )


@reports_router.get("/types", response_model=List[ReportMeta])
def list_report_types(cu=Depends(get_current_user)):
    role = _role_value(cu)
    out = []
    for key, meta in REPORT_CATALOG.items():
        if role in meta["roles"]:
            cat = meta["category"]
            out.append(ReportMeta(
                type=key,
                label=meta["label"],
                description=meta["description"],
                category=cat,
                category_label=CATEGORY_LABELS.get(cat, cat.title()),
                dated=meta.get("dated", False),
            ))
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

    fmt = format.lower().strip()
    if fmt == "excel":
        fmt = "xlsx"
    if fmt not in SUPPORTED_FORMATS:
        raise HTTPException(400, "Supported formats: pdf, xlsx")

    start, end, start_dt, end_dt = _parse_dates(from_date, to_date)
    payload = _build_export_payload(cu, type, start, end, start_dt, end_dt, db)
    ip = get_client_ip(request) if request else None

    if fmt == "pdf":
        _log_export(db, cu, f"Exported PDF {payload['label']} ({start} to {end})", ip)
        try:
            from app.services.pdf_report import build_report_pdf
        except ImportError:
            raise HTTPException(500, "PDF export unavailable — run: pip install reportlab")
        file_bytes = build_report_pdf(
            title=payload["label"],
            description=payload["description"],
            period_from=payload["period_from"],
            period_to=payload["period_to"],
            generated_by=cu.full_name,
            role=role,
            summary=payload["summary"],
            insights=payload["insights"],
            rows=payload["rows"],
            report_type=type,
        )
        filename = _safe_filename(payload["label"], start, end, "pdf")
        media = "application/pdf"
    else:
        _log_export(db, cu, f"Exported Excel {payload['label']} ({start} to {end})", ip)
        try:
            from app.services.excel_report import build_report_xlsx
        except ImportError:
            raise HTTPException(500, "Excel export unavailable — run: pip install openpyxl")
        file_bytes = build_report_xlsx(
            title=payload["label"],
            description=payload["description"],
            period_from=payload["period_from"],
            period_to=payload["period_to"],
            generated_by=cu.full_name,
            role=role,
            summary=payload["summary"],
            insights=payload["insights"],
            rows=payload["rows"],
        )
        filename = _safe_filename(payload["label"], start, end, "xlsx")
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
