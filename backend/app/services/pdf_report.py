"""Professional PDF report generator for ECRM decision-making reports."""
from datetime import datetime
from io import BytesIO
from typing import Any, Dict, List

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
)

NAVY = colors.HexColor("#0F172A")
BLUE = colors.HexColor("#2563EB")
BLUE_LT = colors.HexColor("#EFF6FF")
TEXT2 = colors.HexColor("#64748B")
GREEN = colors.HexColor("#10B981")
AMBER = colors.HexColor("#F59E0B")
RED = colors.HexColor("#EF4444")
BORDER = colors.HexColor("#E2E8F0")


def _styles():
    base = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("RTitle", parent=base["Heading1"], fontSize=20,
                                textColor=NAVY, spaceAfter=6, fontName="Helvetica-Bold"),
        "subtitle": ParagraphStyle("RSub", parent=base["Normal"], fontSize=11,
                                   textColor=TEXT2, spaceAfter=14),
        "section": ParagraphStyle("RSection", parent=base["Heading2"], fontSize=13,
                                  textColor=NAVY, spaceBefore=16, spaceAfter=8, fontName="Helvetica-Bold"),
        "body": ParagraphStyle("RBody", parent=base["Normal"], fontSize=10,
                               textColor=NAVY, leading=14),
        "insight": ParagraphStyle("RInsight", parent=base["Normal"], fontSize=10,
                                  textColor=NAVY, leftIndent=12, bulletIndent=0, spaceAfter=6),
        "footer": ParagraphStyle("RFooter", parent=base["Normal"], fontSize=8,
                                 textColor=TEXT2, alignment=TA_CENTER),
        "kpi_label": ParagraphStyle("KpiL", parent=base["Normal"], fontSize=8,
                                    textColor=TEXT2, alignment=TA_CENTER),
        "kpi_value": ParagraphStyle("KpiV", parent=base["Normal"], fontSize=16,
                                    textColor=NAVY, alignment=TA_CENTER, fontName="Helvetica-Bold"),
    }


def _header_table(title: str, period: str, generated_by: str, generated_at: datetime) -> Table:
    data = [
        [Paragraph(f"<b>ECRM</b> — Education Community Resource Mapping", ParagraphStyle(
            "h", fontSize=9, textColor=colors.white, fontName="Helvetica-Bold"))],
        [Paragraph(title, ParagraphStyle("ht", fontSize=16, textColor=colors.white, fontName="Helvetica-Bold"))],
        [Paragraph(f"Period: {period}  ·  Prepared for: {generated_by}", ParagraphStyle(
            "hp", fontSize=9, textColor=colors.HexColor("#CBD5E1")))],
        [Paragraph(f"Generated: {generated_at.strftime('%d %b %Y %H:%M UTC')}", ParagraphStyle(
            "hg", fontSize=8, textColor=colors.HexColor("#94A3B8")))],
    ]
    t = Table(data, colWidths=[17 * cm])
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


def _kpi_row(summary: Dict[str, Any], styles) -> Table:
    items = list(summary.items())[:6]
    if not items:
        return Spacer(1, 0)
    labels = [Paragraph(k.replace("_", " ").title(), styles["kpi_label"]) for k, _ in items]
    values = [Paragraph(str(v), styles["kpi_value"]) for _, v in items]
    t = Table([labels, values], colWidths=[17 * cm / len(items)] * len(items))
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BLUE_LT),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDER),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return t


def _data_table(rows: List[dict]) -> Table:
    if not rows:
        return Paragraph("<i>No records for the selected period.</i>", getSampleStyleSheet()["Normal"])
    keys = list(rows[0].keys())
    headers = [k.replace("_", " ").title() for k in keys]
    body = [headers]
    for row in rows[:80]:
        body.append([str(row.get(k, ""))[:80] for k in keys])
    col_w = 17 * cm / max(len(keys), 1)
    t = Table(body, colWidths=[col_w] * len(keys), repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLUE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 9),
        ("FONTSIZE", (0, 1), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
        ("GRID", (0, 0), (-1, -1), 0.25, BORDER),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
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
) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        leftMargin=1.5 * cm, rightMargin=1.5 * cm,
        topMargin=1.2 * cm, bottomMargin=1.5 * cm,
    )
    styles = _styles()
    period = f"{period_from} to {period_to}"
    story = [
        _header_table(title, period, f"{generated_by} ({role.replace('_', ' ').title()})", datetime.utcnow()),
        Spacer(1, 14),
        Paragraph(description, styles["body"]),
        Spacer(1, 10),
        _kpi_row(summary, styles),
    ]

    if insights:
        story += [
            Spacer(1, 12),
            Paragraph("Executive Insights", styles["section"]),
            HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=8),
        ]
        for line in insights:
            story.append(Paragraph(f"• {line}", styles["insight"]))

    story += [
        Spacer(1, 12),
        Paragraph("Detailed Records", styles["section"]),
        HRFlowable(width="100%", thickness=1, color=BORDER, spaceAfter=8),
        _data_table(rows),
        Spacer(1, 20),
        Paragraph(
            "ECRM Rwanda — Confidential internal report for education resource planning and decision support.",
            styles["footer"],
        ),
    ]

    doc.build(story)
    return buf.getvalue()
