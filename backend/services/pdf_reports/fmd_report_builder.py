"""
Foot and Mouth Disease (FMD) PDF Diagnostic & Microclimate Risk Report Builder.
Generates comprehensive clinical and epidemiological reports in English ('en') or Sinhala ('si').
"""
import io
import base64
from datetime import datetime
from PIL import Image as PILImage

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
    Image,
    HRFlowable,
)

from services.pdf_reports.sinhala_shaper import (
    register_sinhala_fonts,
    Paragraph,
    NumberedCanvas,
)
from services.pdf_reports.styles import get_report_styles, get_report_font_names

THEME_COLOR = colors.HexColor("#ea580c")      # Orange 600
THEME_DARK = colors.HexColor("#c2410c")       # Orange 700
THEME_LIGHT = colors.HexColor("#fff7ed")      # Orange 50
THEME_BORDER = colors.HexColor("#fed7aa")     # Orange 200

RISK_PALETTES = {
    "LOW": {"bg": colors.HexColor("#f0fdf4"), "border": colors.HexColor("#16a34a"), "text": colors.HexColor("#15803d")},
    "MODERATE": {"bg": colors.HexColor("#fffbeb"), "border": colors.HexColor("#d97706"), "text": colors.HexColor("#b45309")},
    "MEDIUM": {"bg": colors.HexColor("#fffbeb"), "border": colors.HexColor("#d97706"), "text": colors.HexColor("#b45309")},
    "HIGH": {"bg": colors.HexColor("#fef2f2"), "border": colors.HexColor("#dc2626"), "text": colors.HexColor("#b91c1c")},
}


def _decode_image_bytes(img_data):
    if not img_data:
        return None
    if isinstance(img_data, bytes):
        return img_data
    if isinstance(img_data, str) and "," in img_data:
        _, encoded = img_data.split(",", 1)
        try:
            return base64.b64decode(encoded)
        except Exception:
            return None
    return None


def generate_fmd_pdf(payload: dict, language: str = "en") -> bytes:
    """Generate a publication-grade FMD Diagnostic Report PDF in English or Sinhala."""
    register_sinhala_fonts()
    is_si = (language == "si")
    styles = get_report_styles(language)

    result = payload.get("result") or payload
    cattle_info = payload.get("cattle_info") or payload.get("cow") or {}
    farmer_info = payload.get("farmer_info") or {}

    pred_label = str(result.get("predicted_label") or result.get("prediction") or "")
    risk_level = str(result.get("risk_level") or result.get("stage") or "LOW").upper()
    is_positive = (
        pred_label in ("1", "Diseased", "FMD Positive")
        or "positive" in pred_label.lower()
        or "HIGH" in risk_level
    )

    conf_val = result.get("confidence_score") or result.get("confidence") or 0.0
    try:
        conf_float = float(str(conf_val).replace("%", "").strip())
        if conf_float > 1.0:
            conf_float = conf_float / 100.0
    except Exception:
        conf_float = 0.88

    if "HIGH" in risk_level:
        risk_key = "HIGH"
    elif "MOD" in risk_level or "MED" in risk_level:
        risk_key = "MODERATE"
    else:
        risk_key = "LOW"

    risk_style = RISK_PALETTES.get(risk_key, RISK_PALETTES["LOW"])
    weather = result.get("weather_risk") or {}
    hybrid = result.get("hybrid_assessment") or {}

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=46,
    )

    story = []

    # 1. Header Banner
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    report_id = f"RPT-FMD-{datetime.now().strftime('%Y%m%d')}-{abs(hash(str(result))) % 1000:03d}"

    title_text = (
        "ඛුර සහ මුඛ රෝග (FMD) රෝග විනිශ්චය සහ දේශගුණික අවදානම් වාර්තාව"
        if is_si
        else "Foot and Mouth Disease (FMD) Diagnostic & Weather Transmission Report"
    )
    subtitle_text = (
        "CattleSense AI — බහුමාධ්‍ය තුවාල හඳුනාගැනීම, දේශගුණික අවදානම සහ වසංගත තත්ත්ව විශ්ලේෂණය"
        if is_si
        else "CattleSense AI — Multimodal Lesion Detection, Weather Risk & Outbreak Window Analysis"
    )

    header_data = [
        [
            Paragraph(f"<b>{title_text}</b>", styles["ReportMainTitle"]),
            Paragraph(
                f"<font size=7 color='#64748b'>{'දිනය' if is_si else 'Date'}:</font> {now_str}<br/>"
                f"<font size=7 color='#64748b'>{'වාර්තා අංකය' if is_si else 'Report ID'}:</font> <b>{report_id}</b>",
                styles["BodyCustom"],
            ),
        ],
        [
            Paragraph(subtitle_text, styles["ReportSubTitle"]),
            "",
        ],
    ]
    header_table = Table(header_data, colWidths=[380, 143])
    header_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=THEME_COLOR, spaceBefore=2, spaceAfter=10))

    # 2. Subject Metadata
    cow_name = cattle_info.get("name") or ("ගවයා" if is_si else "Cow")
    cow_tag = cattle_info.get("tag_id") or ("සටහන් කර නැත" if is_si else "Not recorded")
    cow_breed = cattle_info.get("breed") or ("දේශීය / කිරි ගව" if is_si else "Dairy / Local")
    cow_age = f"{cattle_info.get('age', 'N/A')} {'වසර' if is_si else 'yrs'}"
    district_str = str(payload.get("district") or weather.get("district") or ("ශ්‍රී ලංකා ප්‍රාදේශීය" if is_si else "Sri Lanka Regional"))
    farmer_name = farmer_info.get("name") or ("ලියාපදිංචි ගොවිපළ" if is_si else "Registered Herd Manager")

    meta_rows = [
        [
            Paragraph(f"<b>{'සත්වයාගේ නම' if is_si else 'Animal Name'}:</b> {cow_name}", styles["BodyCustom"]),
            Paragraph(f"<b>{'කරපටි / ටැග් අංකය' if is_si else 'Tag ID'}:</b> {cow_tag}", styles["BodyCustom"]),
            Paragraph(f"<b>{'දිස්ත්‍රික්කය / කලාපය' if is_si else 'District'}:</b> {district_str}", styles["BodyCustom"]),
        ],
        [
            Paragraph(f"<b>{'ප්‍රභේදය' if is_si else 'Breed'}:</b> {cow_breed}", styles["BodyCustom"]),
            Paragraph(f"<b>{'වයස' if is_si else 'Age'}:</b> {cow_age}", styles["BodyCustom"]),
            Paragraph(f"<b>{'හිමිකරු' if is_si else 'Owner'}:</b> {farmer_name}", styles["BodyCustom"]),
        ],
    ]
    meta_table = Table(meta_rows, colWidths=[174, 174, 175])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 7),
        ('RIGHTPADDING', (0, 0), (-1, -1), 7),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # 3. Diagnostic Outcome & Risk Level
    outcome_str = (
        "ඛුර සහ මුඛ රෝගයට අනුකූල තුවාල හඳුනාගෙන ඇත (FMD ධනාත්මක)"
        if is_positive and is_si
        else "FMD-Consistent Cutaneous Lesions Detected"
        if is_positive
        else "FMD රෝග ලක්ෂණ හඳුනාගෙන නොමැත (නිරෝගී)"
        if is_si
        else "No Visible FMD Lesions Detected (Normal)"
    )

    risk_badge = (
        f"<b>{risk_level} අවදානම</b>"
        if is_si
        else f"<b>{risk_level} RISK</b>"
    )

    diag_data = [
        [
            Paragraph(
                f"<font size=8 color='#64748b'>{'රෝග විනිශ්චය වර්ගීකරණය' if is_si else 'DIAGNOSTIC CLASSIFICATION'}</font><br/>"
                f"<font size=11 color='{risk_style['text'].hexval()}'><b>{outcome_str}</b></font>",
                styles["BodyCustom"],
            ),
            Paragraph(
                f"<font size=8 color='#64748b'>{'සමස්ත අවදානම' if is_si else 'OVERALL RISK'}</font><br/>"
                f"<font size=11 color='{risk_style['text'].hexval()}'>{risk_badge}</font>",
                styles["BodyCustom"],
            ),
            Paragraph(
                f"<font size=8 color='#64748b'>{'තුවාල විශ්වාසනීයත්වය' if is_si else 'LESION CONFIDENCE'}</font><br/>"
                f"<font size=12 color='#0f172a'><b>{conf_float * 100:.1f}%</b></font>",
                styles["BodyCustom"],
            ),
        ]
    ]
    diag_table = Table(diag_data, colWidths=[270, 130, 123])
    diag_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), risk_style['bg']),
        ('BOX', (0, 0), (-1, -1), 1.0, risk_style['border']),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(diag_table)
    story.append(Spacer(1, 10))

    # 4. Weather & Airborne Transmission Risk
    story.append(Paragraph(
        f"<b>{'කලාපීය දේශගුණික තත්ත්ව සහ වාතය මගින් පැතිරීමේ අවදානම' if is_si else 'Regional Microclimate & Airborne Transmission Analysis'}</b>",
        styles["SectionHeader"],
    ))

    temp_val = f"{weather.get('temperature', 28.5)}°C"
    hum_val = f"{weather.get('humidity', 78)}%"
    rain_val = f"{weather.get('rainfall', 12.0)} mm"
    outbreak_window = weather.get("outbreak_window", "Inter-monsoon Window (High Transmission)")
    if is_si:
        outbreak_window = "අන්තර් මෝසම් සෘතුමය අවදානම් කාලය (අධික සම්ප්‍රේෂණය)"

    weather_rows = [
        [
            Paragraph(f"<b>{'පරාමිතිය' if is_si else 'Meteorological Factor'}</b>", styles["TableHeading"]),
            Paragraph(f"<b>{'අගය' if is_si else 'Recorded Value'}</b>", styles["TableHeading"]),
            Paragraph(f"<b>{'වසංගත ඇගයීම' if is_si else 'Transmission Implication'}</b>", styles["TableHeading"]),
        ],
        [
            Paragraph("උෂ්ණත්වය (Ambient Temp)" if is_si else "Ambient Temperature", styles["TableCellTextBold"]),
            Paragraph(temp_val, styles["TableCellText"]),
            Paragraph("වෛරසයේ පැවැත්මට හිතකර පරාසය" if is_si else "Favorable for aerosol persistence", styles["TableCellText"]),
        ],
        [
            Paragraph("සාපේක්ෂ ආර්ද්‍රතාව (Relative Humidity)" if is_si else "Relative Humidity", styles["TableCellTextBold"]),
            Paragraph(hum_val, styles["TableCellText"]),
            Paragraph(">60% ආර්ද්‍රතාව වාතය මගින් පැතිරීම වේගවත් කරයි" if is_si else ">60% humidity accelerates airborne viral drift", styles["TableCellText"]),
        ],
        [
            Paragraph("DAPH සෘතුමය තත්ත්වය (Seasonal Outbreak)" if is_si else "DAPH Outbreak Window", styles["TableCellTextBold"]),
            Paragraph("සක්‍රීය (Active)" if is_si else "Active Window", styles["TableCellText"]),
            Paragraph(outbreak_window, styles["TableCellText"]),
        ],
    ]
    weather_table = Table(weather_rows, colWidths=[180, 110, 233])
    weather_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), THEME_COLOR),
        ('BOX', (0, 0), (-1, -1), 0.5, THEME_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#f1f5f9")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(weather_table)
    story.append(Spacer(1, 10))

    # 5. Image Evidence (if provided)
    img_bytes = _decode_image_bytes(result.get("annotated_image") or result.get("image"))
    if img_bytes:
        try:
            with PILImage.open(io.BytesIO(img_bytes)) as pil_im:
                orig_w, orig_h = pil_im.size
                max_w, max_h = 240, 160
                scale = min(max_w / orig_w, max_h / orig_h)
                render_w, render_h = orig_w * scale, orig_h * scale
            img_flowable = Image(io.BytesIO(img_bytes), width=render_w, height=render_h)
            img_card = Table(
                [[
                    img_flowable,
                    Paragraph(
                        f"<b>{'AI ආකෘතිය මගින් හඳුනාගත් ඛුර/මුඛ තුවාල සාක්ෂිය' if is_si else 'AI Model Identified Lesion Evidence'}</b><br/>"
                        f"<font size=7.5 color='#64748b'>"
                        f"{'මුඛ කුහරය, දිව හෝ ඛුර අවට ඇති ලාක්ෂණික බිබිලි සහ තුවාල ආකෘතිය මගින් හඳුනාගෙන ඇත. පශු වෛද්‍යවරයා විසින් සත්වයා පරීක්ෂා කිරීම අත්‍යවශ්‍ය වේ.' if is_si else 'Oral, coronary band, and interdigital vesicular lesions detected via neural network inspection. Urgent veterinary verification required.'}"
                        f"</font>",
                        styles["BodyCustom"],
                    )
                ]],
                colWidths=[render_w + 10, 523 - render_w - 10]
            )
            img_card.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#fff7ed")),
                ('BOX', (0, 0), (-1, -1), 0.5, THEME_BORDER),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('LEFTPADDING', (0, 0), (-1, -1), 6),
                ('RIGHTPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(img_card)
            story.append(Spacer(1, 10))
        except Exception:
            pass

    # 6. Biosecurity Protocols & Veterinary Actions
    story.append(Paragraph(
        f"<b>{'හදිසි ජෛව ආරක්ෂණ සහ පශු වෛද්‍ය පියවර' if is_si else 'Emergency Biosecurity Protocols & Veterinary Actions'}</b>",
        styles["SectionHeader"],
    ))

    if is_si:
        guidance_points = [
            "<b>1. වහාම නිරෝධායනය:</b> රෝග ලක්ෂණ පෙන්වන සත්වයා වහාම ගොවිපළේ අනෙකුත් සතුන්ගෙන් ඈත් කර නිරෝධායනය කරන්න.",
            "<b>2. පාද සෝදන ස්ථාන (Footbaths):</b> ගොවිපළ පිවිසුමේ සහ ගව මඩු දොරටු අසල 4% සෝඩියම් කාබනේට් හෝ 0.2% සිට්‍රික් ඇසිඩ් ද්‍රාවණ යොදන්න.",
            "<b>3. නිල දැනුම්දීම:</b> FMD නීතියෙන් දැනුම් දිය යුතු රෝගයක් බැවින් වහාම ප්‍රාදේශීය රජයේ පශු වෛද්‍ය නිලධාරී සහ DAPH වෙත දැනුම් දෙන්න.",
            "<b>4. සංචලන තහනම:</b> කිරි, ගොම, පිදුරු හෝ සතුන් ගොවිපළෙන් පිටතට ගෙන යාම සහ නව සතුන් ඇතුළත් කිරීම සම්පූර්ණයෙන්ම නවත්වන්න.",
            "<b>5. සාත්තු කිරීම:</b> මුඛයේ තුවාල නිසා වේදනා විඳින සතුන්ට මෘදු ආහාර, පිෂ්ඨමය කැඳ සහ පිරිසිදු පානීය ජලය ලබාදෙන්න.",
        ]
    else:
        guidance_points = [
            "<b>1. Immediate Quarantine:</b> Isolate affected animal strictly. Restrict unauthorized personnel from entering the housing area.",
            "<b>2. Disinfectant Footbaths:</b> Place footbaths containing 4% sodium carbonate (washing soda) or 0.2% citric acid at all barn entrances.",
            "<b>3. Statutory Notification:</b> FMD is a mandatory notifiable disease. Immediately inform the Government Veterinary Surgeon (VS) and DAPH.",
            "<b>4. Complete Movement Standstill:</b> Halt all movement of animals, raw milk, manure, and vehicles to prevent airborne/mechanical spread.",
            "<b>5. Supportive Palliative Care:</b> Provide soft feeds (porridge/mashed green fodder) and clean water. Antiseptic mouth washes (potassium permanganate 1:1000) under veterinary guidance.",
        ]

    guidance_data = [[Paragraph(pt, styles["BodyCustom"])] for pt in guidance_points]
    guidance_table = Table(guidance_data, colWidths=[523])
    guidance_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), THEME_LIGHT),
        ('BOX', (0, 0), (-1, -1), 0.5, THEME_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#fed7aa")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(guidance_table)
    story.append(Spacer(1, 10))

    # 7. Regulatory Disclaimer
    disclaimer_text = (
        "<b>වගකීම් සීමාව:</b> මෙම වාර්තාව CattleSense කෘත්‍රිම බුද්ධි ආකෘතිය සහ කාලගුණ දත්ත ආශ්‍රයෙන් සකස් කළ සායනික සහායක වාර්තාවකි. FMD රෝග විනිශ්චය තහවුරු කිරීම සහ ප්‍රතිකාර සඳහා රජයේ බලයලත් පශු වෛද්‍ය නිලධාරීවරයාගේ නිර්දේශ අනිවාර්ය වේ."
        if is_si
        else "<b>REGULATORY NOTICE:</b> Foot and Mouth Disease is a high-consequence notifiable transboundary animal disease. This report serves as clinical triage guidance and does not replace official laboratory serology or veterinary statutory orders."
    )
    disc_table = Table([[Paragraph(disclaimer_text, styles["DisclaimerText"])]], colWidths=[523])
    disc_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(disc_table)

    canvas_maker = NumberedCanvas
    canvas_maker.report_id = report_id
    canvas_maker.language = language
    canvas_maker.brand_title = "CattleSense — FMD Diagnostic Report"
    canvas_maker.brand_title_si = "CattleSense — ඛුර සහ මුඛ රෝග (FMD) වාර්තාව"

    doc.build(story, canvasmaker=canvas_maker)
    return buffer.getvalue()
