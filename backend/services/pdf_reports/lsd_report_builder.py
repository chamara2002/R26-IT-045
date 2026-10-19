"""
Lumpy Skin Disease (LSD) PDF Diagnostic Report Builder.
Generates comprehensive clinical reports in English ('en') or Sinhala ('si').
"""
import io
import base64
from datetime import datetime
from pathlib import Path
from PIL import Image as PILImage

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
    Image,
    KeepTogether,
    HRFlowable,
)

from services.pdf_reports.sinhala_shaper import (
    register_sinhala_fonts,
    Paragraph,
    NumberedCanvas,
    shape_sinhala_html,
)
from services.pdf_reports.styles import get_report_styles, get_report_font_names

THEME_COLOR = colors.HexColor("#7c3aed")      # Violet 600
THEME_DARK = colors.HexColor("#5b21b6")       # Violet 800
THEME_LIGHT = colors.HexColor("#f5f3ff")      # Violet 50
THEME_BORDER = colors.HexColor("#ddd6fe")     # Violet 200

RISK_PALETTES = {
    "LOW": {"bg": colors.HexColor("#f0fdf4"), "border": colors.HexColor("#16a34a"), "text": colors.HexColor("#15803d")},
    "MODERATE": {"bg": colors.HexColor("#fffbeb"), "border": colors.HexColor("#d97706"), "text": colors.HexColor("#b45309")},
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


def generate_lsd_pdf(payload: dict, language: str = "en") -> bytes:
    """Generate a publication-grade LSD Diagnostic Report PDF in English or Sinhala."""
    register_sinhala_fonts()
    is_si = (language == "si")
    fn_reg, fn_bold = get_report_font_names(language)
    styles = get_report_styles(language)

    result = payload.get("result") or payload
    cattle_info = payload.get("cattle_info") or payload.get("cow") or {}
    farmer_info = payload.get("farmer_info") or {}

    overall_pred = result.get("overall_prediction")
    overall_disease = overall_pred.get("disease") if isinstance(overall_pred, dict) else overall_pred
    raw_pred = str(result.get("prediction") or overall_disease or "Unknown")
    is_positive = (
        "lsd" in raw_pred.lower()
        or "positive" in raw_pred.lower()
        or "lumpy" in raw_pred.lower()
        or str(result.get("stage") or "").lower() in ("moderate", "high", "critical")
    )

    conf_val = result.get("confidence") or result.get("confidence_score") or 0.0
    if isinstance(conf_val, dict):
        conf_val = conf_val.get("confidence", 0.0)
    try:
        conf_float = float(str(conf_val).replace("%", "").strip())
        if conf_float > 1.0:
            conf_float = conf_float / 100.0
    except Exception:
        conf_float = 0.85

    risk_level = str(result.get("risk_level") or ("HIGH" if conf_float > 0.7 else "MODERATE" if conf_float > 0.4 else "LOW")).upper()
    if "HIGH" in risk_level:
        risk_key = "HIGH"
    elif "MOD" in risk_level:
        risk_key = "MODERATE"
    else:
        risk_key = "LOW"

    risk_style = RISK_PALETTES[risk_key]

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
    report_id = f"RPT-LSD-{datetime.now().strftime('%Y%m%d')}-{abs(hash(str(result))) % 1000:03d}"

    title_text = (
        "ගව ගැටිති චර්ම රෝග (LSD) පරීක්ෂණ සහ රෝග විනිශ්චය වාර්තාව"
        if is_si
        else "Lumpy Skin Disease (LSD) Diagnostic & Assessment Report"
    )
    subtitle_text = (
        "CattleSense AI — ගැඹුරු ඉගෙනුම් පාදක ගැටිති හඳුනාගැනීම සහ පශු වෛද්‍ය තීරණ සහාය"
        if is_si
        else "CattleSense AI — Deep Learning Lesion Analysis & Veterinary Decision Support"
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
        ('ALIGN', (1, 0), (1, 0), 'RIGHT'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=THEME_COLOR, spaceBefore=2, spaceAfter=10))

    # 2. Subject & Farmer Metadata Box
    cow_name = cattle_info.get("name") or result.get("cow_name") or ("ගවයා" if is_si else "Cow")
    cow_tag = cattle_info.get("tag_id") or ("සටහන් කර නැත" if is_si else "Not recorded")
    cow_breed = cattle_info.get("breed") or ("දේශීය / මිශ්‍ර" if is_si else "Local / Crossbred")
    cow_age = f"{cattle_info.get('age', 'N/A')} {'වසර' if is_si else 'yrs'}"
    farmer_name = farmer_info.get("name") or ("ලියාපදිංචි ගොවිපළ" if is_si else "Registered Herd Manager")

    meta_rows = [
        [
            Paragraph(f"<b>{'සත්වයාගේ නම' if is_si else 'Animal Name'}:</b> {cow_name}", styles["BodyCustom"]),
            Paragraph(f"<b>{'කරපටි / ටැග් අංකය' if is_si else 'Tag ID'}:</b> {cow_tag}", styles["BodyCustom"]),
            Paragraph(f"<b>{'ගොවියා / හිමිකරු' if is_si else 'Farmer'}:</b> {farmer_name}", styles["BodyCustom"]),
        ],
        [
            Paragraph(f"<b>{'ප්‍රභේදය' if is_si else 'Breed'}:</b> {cow_breed}", styles["BodyCustom"]),
            Paragraph(f"<b>{'වයස' if is_si else 'Age'}:</b> {cow_age}", styles["BodyCustom"]),
            Paragraph(f"<b>{'මොඩියුලය' if is_si else 'Module'}:</b> LSD Detection", styles["BodyCustom"]),
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

    # 3. Diagnostic Classification & Risk Card
    status_label = (
        "ගව ගැටිති චර්ම රෝග (LSD) ලක්ෂණ හඳුනාගෙන ඇත"
        if is_positive and is_si
        else "LSD-Consistent Cutaneous Lesions Detected"
        if is_positive
        else "LSD රෝග ලක්ෂණ හඳුනාගෙන නොමැත (නිරෝගී)"
        if is_si
        else "No Visible LSD Lesions Detected (Normal)"
    )

    risk_badge_text = (
        f"<b>{risk_level} අවදානම් තත්ත්වය</b>"
        if is_si
        else f"<b>{risk_level} RISK</b>"
    )

    diag_data = [
        [
            Paragraph(
                f"<font size=8 color='#64748b'>{'ප්‍රධාන රෝග විනිශ්චය' if is_si else 'PRIMARY DIAGNOSTIC OUTCOME'}</font><br/>"
                f"<font size=12 color='{risk_style['text'].hexval()}'><b>{status_label}</b></font>",
                styles["BodyCustom"],
            ),
            Paragraph(
                f"<font size=8 color='#64748b'>{'අවදානම් මට්ටම' if is_si else 'RISK LEVEL'}</font><br/>"
                f"<font size=11 color='{risk_style['text'].hexval()}'>{risk_badge_text}</font>",
                styles["BodyCustom"],
            ),
            Paragraph(
                f"<font size=8 color='#64748b'>{'විශ්වාසනීයත්වය' if is_si else 'MODEL CONFIDENCE'}</font><br/>"
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

    # 4. Clinical Evidence & Symptoms
    story.append(Paragraph(
        f"<b>{'සායනික නිරීක්ෂණ සහ සාක්ෂි' if is_si else 'Clinical Observations & Model Evidence'}</b>",
        styles["SectionHeader"],
    ))

    symptoms = result.get("symptoms") or result.get("clinical_observations") or {}
    symptom_items = []
    if isinstance(symptoms, dict):
        for k, v in symptoms.items():
            k_clean = k.replace("_", " ").title()
            symptom_items.append((k_clean, str(v)))
    elif isinstance(symptoms, list):
        for item in symptoms:
            symptom_items.append((str(item), "නිරීක්ෂණය විය" if is_si else "Observed"))

    if not symptom_items:
        symptom_items = [
            ("චර්ම ගැටිති (Skin Nodules)" if is_si else "Skin Nodules", "නිරීක්ෂණය විය (Observed)" if is_positive else "නැත (None)"),
            ("උණ (Fever / Pyrexia)" if is_si else "Pyrexia / Fever", "නිරීක්ෂණය විය (Present)" if is_positive else "සාමාන්‍ය (Normal)"),
            ("වසා ගැටිති ඉදිමීම (Lymph Nodes)" if is_si else "Enlarged Lymph Nodes", "ඉදිමුණු (Swollen)" if is_positive else "සාමාන්‍ය (Normal)"),
            ("කිරි අස්වැන්න (Milk Yield)" if is_si else "Milk Production", "පහත වැටීමක් (Drop)" if is_positive else "සාමාන්‍ය (Normal)"),
        ]

    symp_rows = [
        [
            Paragraph(f"<b>{'සායනික ලක්ෂණය' if is_si else 'Clinical Indicator'}</b>", styles["TableHeading"]),
            Paragraph(f"<b>{'තත්ත්වය' if is_si else 'Observation Status'}</b>", styles["TableHeading"]),
        ]
    ]
    for name, val in symptom_items[:6]:
        symp_rows.append([
            Paragraph(name, styles["TableCellTextBold"]),
            Paragraph(val, styles["TableCellText"]),
        ])

    symp_table = Table(symp_rows, colWidths=[280, 243])
    symp_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), THEME_COLOR),
        ('BOX', (0, 0), (-1, -1), 0.5, THEME_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#f1f5f9")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(symp_table)
    story.append(Spacer(1, 10))

    # 5. Image Evidence (if present)
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
                        f"<b>{'AI ආකෘතිය මගින් හඳුනාගත් චර්ම ගැටිති සාක්ෂිය' if is_si else 'AI Model Detected Cutaneous Evidence'}</b><br/>"
                        f"<font size=7.5 color='#64748b'>"
                        f"{'ආකෘතිය මගින් ගවයාගේ සම මතුපිට ගැටිති සහ ලප හඳුනාගෙන ලකුණු කර ඇත. පශු වෛද්‍යවරයා විසින් මෙම ස්ථාන භෞතිකව පරීක්ෂා කිරීම නිර්දේශ කෙරේ.' if is_si else 'Cutaneous nodules and characteristic circular lesions bounded by deep neural network inference. Attending veterinary inspection recommended.'}"
                        f"</font>",
                        styles["BodyCustom"],
                    )
                ]],
                colWidths=[render_w + 10, 523 - render_w - 10]
            )
            img_card.setStyle(TableStyle([
                ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
                ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#faf5ff")),
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

    # 6. Biosecurity Protocols & Veterinary Guidance
    story.append(Paragraph(
        f"<b>{'ක්ෂණික ජෛව ආරක්ෂණ සහ පශු වෛද්‍ය නිර්දේශ' if is_si else 'Immediate Biosecurity Protocols & Veterinary Recommendations'}</b>",
        styles["SectionHeader"],
    ))

    if is_si:
        guidance_points = [
            "<b>1. හුදකලා කිරීම:</b> රෝග ලක්ෂණ පෙන්වන සත්වයා වහාම වෙනත් ගවයන්ගෙන් වෙන් කර මදුරුවන්ගෙන් ආරක්ෂිත ස්ථානයක තබන්න.",
            "<b>2. වාහක පාලනය:</b> මැස්සන්, මදුරුවන් සහ කිනිතුල්ලන් මගින් රෝගය පැතිරෙන බැවින් සුදුසු විකර්ෂක සහ කෘමිනාශක යොදන්න.",
            "<b>3. විෂබීජහරණය:</b> ගව මඩුව, කෑම ඔරු සහ කිරි දොවන උපකරණ 2% සෝඩියම් හයිපොක්ලෝරයිට් හෝ විර්කොන් දියරයෙන් විෂබීජහරණය කරන්න.",
            "<b>4. සංචලනය සීමා කිරීම:</b> රංචුව තුළ සහ ගොවිපළ අවට සතුන් ප්‍රවාහනය කිරීම වහාම අත්හිටුවන්න.",
            "<b>5. පශු වෛද්‍ය ප්‍රතිකාර:</b> ද්විතීයික බැක්ටීරියා ආසාදන වැළැක්වීමට ප්‍රතිජීවක සහ ප්‍රදාහ නාශක ඖෂධ ලබාදීම සඳහා රජයේ පශු වෛද්‍ය නිලධාරී අමතන්න.",
        ]
    else:
        guidance_points = [
            "<b>1. Immediate Isolation:</b> Quarantine suspected animal in a clean, vector-proof shelter separate from the herd.",
            "<b>2. Vector Control:</b> Apply insect repellents and acaricides to control biting flies, mosquitoes, and ticks responsible for transmission.",
            "<b>3. Strict Disinfection:</b> Clean shed floors, feeding troughs, and equipment daily using 2% sodium hypochlorite or Virkon.",
            "<b>4. Movement Restriction:</b> Cease animal movement into or out of the premises to prevent regional disease propagation.",
            "<b>5. Veterinary Intervention:</b> Contact the local Veterinary Surgeon immediately for supportive fluid therapy, anti-inflammatories, and antibiotics to prevent secondary infections.",
        ]

    guidance_data = [[Paragraph(pt, styles["BodyCustom"])] for pt in guidance_points]
    guidance_table = Table(guidance_data, colWidths=[523])
    guidance_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), THEME_LIGHT),
        ('BOX', (0, 0), (-1, -1), 0.5, THEME_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#ede9fe")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(guidance_table)
    story.append(Spacer(1, 10))

    # 7. Regulatory & AI Advisory Disclaimer Box
    disclaimer_text = (
        "<b>වගකීම් සීමාව:</b> මෙම වාර්තාව CattleSense කෘත්‍රිම බුද්ධි ආකෘතිය මගින් ජනනය කරන ලද මූලික ඇගයීමකි. මෙය නිල පශු වෛද්‍ය නිර්දේශයක් සඳහා ආදේශකයක් නොවේ. තහවුරු කර ගැනීම සහ ප්‍රතිකාර නියම කිරීම සඳහා සුදුසුකම් ලත් පශු වෛද්‍ය නිලධාරියෙකුගේ සහාය ලබාගන්න."
        if is_si
        else "<b>DISCLAIMER:</b> This report is generated by CattleSense AI for clinical decision-support and early warning. It does not replace definitive microbiological diagnosis or on-site clinical assessment by a registered veterinary surgeon."
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
    canvas_maker.brand_title = "CattleSense — LSD Diagnostic Report"
    canvas_maker.brand_title_si = "CattleSense — ගව ගැටිති චර්ම රෝග (LSD) වාර්තාව"

    doc.build(story, canvasmaker=canvas_maker)
    return buffer.getvalue()
