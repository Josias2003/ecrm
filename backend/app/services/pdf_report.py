"""Professional PDF report generator for ECRM decision-making reports."""
from datetime import datetime
from io import BytesIO
from typing import Any, Dict, List, Optional

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

NAVY = colors.HexColor("#0F172A")
BLUE = colors.HexColor("#2563EB")
BLUE_LT = colors.HexColor("#EFF6FF")
BORDER = colors.HexColor("#E2E8F0")

# Reports that are always wide — use landscape PDF
WIDE_REPORT_TYPES = {
    "school_dossier", "schools_summary", "teacher_roster", "no_internet",
    "no_water", "no_electricity", "textbook_deficit", "desk_deficit",
    "toilet_deficit", "classroom_pressure", "high_pt_ratio", "critical_schools",
    "gps_coverage", "unmapped_schools", "gps_unverified", "national_equity",
    "data_entry_compliance", "infrastructure_stale", "audit_summary",
}

LANDSCAPE_COLUMN_THRESHOLD = 6
LANDSCAPE_ROW_THRESHOLD = 40


def should_use_landscape(rows: List[dict], report_type: Optional[str] = None) -> bool:
    if report_type and report_type in WIDE_REPORT_TYPES:
        return True
    if not rows:
        return False
    col_count = len(rows[0])
    if col_count >= LANDSCAPE_COLUMN_THRESHOLD:
        return True
    if col_count >= 5 and len(rows) >= LANDSCAPE_ROW_THRESHOLD:
        return True
    return False


def _styles():
    base = getSampleStyleSheet()
    return {
        "body": ParagraphStyle("RBody", parent=base["Normal"], fontSize=10,
                               textColor=NAVY, leading=14),
        "section": ParagraphStyle("RSection", parent=base["Heading2"], fontSize=13,
                                  textColor=NAVY, spaceBefore=16, spaceAfter=8, fontName="Helvetica-Bold"),
        "insight": ParagraphStyle("RInsight", parent=base["Normal"], fontSize=10,
                                  textColor=NAVY, leftIndent=12, bulletIndent=0, spaceAfter=6),
        "footer": ParagraphStyle("RFooter", parent=base["Normal"], fontSize=8,
                                 textColor=colors.HexColor("#64748B"), alignment=1),
        "kpi_label": ParagraphStyle("KpiL", parent=base["Normal"], fontSize=8,
                                    textColor=colors.HexColor("#64748B"), alignment=1),
        "kpi_value": ParagraphStyle("KpiV", parent=base["Normal"], fontSize=16,
                                    textColor=NAVY, alignment=1, fontName="Helvetica-Bold"),
    }


def _header_table(title: str, period: str, generated_by: str, generated_at: datetime, content_w: float) -> Table:
    data = [
        [Paragraph("<b>ECRM</b> — Education Community Resource Mapping", ParagraphStyle(
            "h", fontSize=9, textColor=colors.white, fontName="Helvetica-Bold"))],
        [Paragraph(title, ParagraphStyle("ht", fontSize=16, textColor=colors.white, fontName="Helvetica-Bold"))],
        [Paragraph(f"Period: {period}  ·  Prepared for: {generated_by}", ParagraphStyle(
            "hp", fontSize=9, textColor=colors.HexColor("#CBD5E1")))],
        [Paragraph(f"Generated: {generated_at.strftime('%d %b %Y %H:%M UTC')}", ParagraphStyle(
            "hg", fontSize=8, textColor=colors.HexColor("#94A3B8")))],
    ]
    t = Table(data, colWidths=[content_w])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NAVY),
        ("LEFTPADDING", (0, 0), (-1, -1), 16),
        ("RIGHTPADDING", (0, 0), (-1, -1), 16),
        ("TOPPADDING", (0, 0), (0, 0), 14),
        ("BOTTOMPADDING", (0, -1), (-1, -1), 14),
        ("TOPPADDING", (0, 1), (-1, -2), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -2), 4),
    ]))
    return t


def _kpi_row(summary: Dict[str, Any], styles, content_w: float) -> Table:
    items = list(summary.items())[:8]
    if not items:
        return Spacer(1, 0)
    labels = [Paragraph(str(k), styles["kpi_label"]) for k, _ in items]
    values = [Paragraph(str(v), styles["kpi_value"]) for _, v in items]
    col_w = content_w / len(items)
    t = Table([labels, values], colWidths=[col_w] * len(items))
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BLUE_LT),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return t


def _data_table(rows: List[dict], content_w: float, landscape_mode: bool) -> Table:
    if not rows:
        return Paragraph("<i>No records for the selected scope.</i>", getSampleStyleSheet()["Normal"])
    keys = list(rows[0].keys())
    headers = [str(k) for k in keys]
    body = [headers]
    max_rows = 200 if landscape_mode else 120
    cell_limit = 200 if landscape_mode else 120
    font_size = 7 if len(keys) >= 10 else (8 if landscape_mode else 8)
    for row in rows[:max_rows]:
        body.append([str(row.get(k, ""))[:cell_limit] for k in keys])
    col_w = content_w / max(len(keys), 1)
    t = Table(body, colWidths=[col_w] * len(keys), repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), font_size + 1),
        ("FONTSIZE", (0, 1), (-1, -1), font_size),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ("GRID", (0, 0), (-1, -1), 0.25, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
    ]))
    return t


def build_report_pdf(
    *,
    title: str,
    description: str,
    period_from: str,
    period_to: str,
    generated_by: str,
    role: str,
    summary: Dict[str, Any],
    insights: List[str],
    rows: List[dict],
    report_type: Optional[str] = None,
) -> bytes:
    landscape_mode = should_use_landscape(rows, report_type)
    pagesize = landscape(A4) if landscape_mode else A4
    margin = 1.2 * cm
    page_w, _ = pagesize
    content_w = page_w - 2 * margin

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=pagesize,
        leftMargin=margin, rightMargin=margin,
        topMargin=1.0 * cm, bottomMargin=1.2 * cm,
    )
    styles = _styles()
    period = f"{period_from} to {period_to}"
    orient_note = " (Landscape)" if landscape_mode else ""
    story = [
        _header_table(title, period, f"{generated_by} ({role.replace('_', ' ').title()})", datetime.utcnow(), content_w),
        Spacer(1, 12),
        Paragraph(description + orient_note, styles["body"]),
        Spacer(1, 8),
        _kpi_row(summary, styles, content_w),
    ]

    if insights:
        story += [
            Spacer(1, 10),
            Paragraph("Executive Insights", styles["section"]),
            HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=6),
        ]
        for line in insights:
            story.append(Paragraph(f"• {line}", styles["insight"]))

    story += [
        Spacer(1, 10),
        Paragraph("Detailed Records", styles["section"]),
        HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=6),
        _data_table(rows, content_w, landscape_mode),
        Spacer(1, 16),
        Paragraph(
            "ECRM Rwanda — Confidential internal report for education resource planning and decision support.",
            styles["footer"],
        ),
    ]

    doc.build(story)
    return buf.getvalue()
