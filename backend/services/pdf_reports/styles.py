"""
Shared styling, typography, and layout primitives for CattleSense PDF Reports.
Supports English ('en') and Sinhala ('si') with automated font selection.
"""
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from services.pdf_reports.sinhala_shaper import register_sinhala_fonts, Paragraph

def get_report_font_names(language="en"):
    if language == "si":
        register_sinhala_fonts()
        return "NotoSansSinhala", "NotoSansSinhala-Bold"
    return "Helvetica", "Helvetica-Bold"

def get_report_styles(language="en"):
    styles = getSampleStyleSheet()
    fn_reg, fn_bold = get_report_font_names(language)

    c_dark = colors.HexColor("#0f172a")
    c_text = colors.HexColor("#334155")
    c_muted = colors.HexColor("#64748b")

    styles.add(ParagraphStyle(
        name="ReportMainTitle",
        fontName=fn_bold,
        fontSize=15,
        leading=19,
        textColor=c_dark,
    ))
    styles.add(ParagraphStyle(
        name="ReportSubTitle",
        fontName=fn_reg,
        fontSize=9.5,
        leading=13,
        textColor=c_muted,
    ))
    styles.add(ParagraphStyle(
        name="SectionHeader",
        fontName=fn_bold,
        fontSize=10.5,
        leading=14,
        textColor=c_dark,
        spaceBefore=8,
        spaceAfter=4,
    ))
    styles.add(ParagraphStyle(
        name="BodyCustom",
        fontName=fn_reg,
        fontSize=8.5,
        leading=12,
        textColor=c_text,
    ))
    styles.add(ParagraphStyle(
        name="BodyCustomBold",
        fontName=fn_bold,
        fontSize=8.5,
        leading=12,
        textColor=c_dark,
    ))
    styles.add(ParagraphStyle(
        name="CardLabel",
        fontName=fn_bold,
        fontSize=7.5,
        leading=9.5,
        textColor=c_muted,
    ))
    styles.add(ParagraphStyle(
        name="CardValue",
        fontName=fn_reg,
        fontSize=8.5,
        leading=11,
        textColor=c_dark,
    ))
    styles.add(ParagraphStyle(
        name="CardValueBold",
        fontName=fn_bold,
        fontSize=8.5,
        leading=11,
        textColor=c_dark,
    ))
    styles.add(ParagraphStyle(
        name="TableHeading",
        fontName=fn_bold,
        fontSize=8,
        leading=10,
        textColor=colors.white,
    ))
    styles.add(ParagraphStyle(
        name="TableCellText",
        fontName=fn_reg,
        fontSize=8,
        leading=10.5,
        textColor=c_text,
    ))
    styles.add(ParagraphStyle(
        name="TableCellTextBold",
        fontName=fn_bold,
        fontSize=8,
        leading=10.5,
        textColor=c_dark,
    ))
    styles.add(ParagraphStyle(
        name="DisclaimerText",
        fontName=fn_reg,
        fontSize=7.5,
        leading=10,
        textColor=c_muted,
    ))
    return styles
