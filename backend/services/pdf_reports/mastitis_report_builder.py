"""
Bovine Mastitis PDF Diagnostic & Biomarker Report Builder.
Generates comprehensive clinical, biomarker, and veterinary handover reports in English ('en') or Sinhala ('si').
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
from services.pdf_reports.styles import get_report_styles

THEME_COLOR = colors.HexColor("#0f766e")      # Teal 700
THEME_DARK = colors.HexColor("#115e59")       # Teal 800
THEME_LIGHT = colors.HexColor("#f0fdfa")      # Teal 50
THEME_BORDER = colors.HexColor("#99f6e4")     # Teal 200

SEVERITY_PALETTES = {
    "negative": {"bg": colors.HexColor("#f0fdf4"), "border": colors.HexColor("#16a34a"), "text": colors.HexColor("#15803d")},
    "mild": {"bg": colors.HexColor("#fffbeb"), "border": colors.HexColor("#d97706"), "text": colors.HexColor("#b45309")},
    "moderate": {"bg": colors.HexColor("#fff7ed"), "border": colors.HexColor("#ea580c"), "text": colors.HexColor("#c2410c")},
    "severe": {"bg": colors.HexColor("#fef2f2"), "border": colors.HexColor("#dc2626"), "text": colors.HexColor("#b91c1c")},
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


def generate_mastitis_pdf(payload: dict, language: str = "en") -> bytes:
    """Generate a publication-grade Bovine Mastitis Diagnostic Report PDF in English or Sinhala."""
    register_sinhala_fonts()
    is_si = (language == "si")
    styles = get_report_styles(language)

    result = payload.get("result") or payload
    cattle_info = payload.get("cattle_info") or payload.get("cow") or {}
    farmer_info = payload.get("farmer_info") or {}

    raw_pred = str(result.get("prediction") or "Normal")
    is_mastitis = "mastitis" in raw_pred.lower()

    sev_obj = result.get("severity")
    if isinstance(sev_obj, dict):
        sev_label = sev_obj.get("severity_label")
        sev_str = str(sev_obj.get("severity_level") or "").lower()
    elif isinstance(sev_obj, str):
        sev_label = sev_obj
        sev_str = sev_obj.lower()
    else:
        sev_label = None
        sev_str = ""

    stage_str = str(result.get("stage") or sev_label or ("Moderate Mastitis" if is_mastitis else "No Mastitis"))

    if "severe" in stage_str.lower() or "critical" in stage_str.lower() or "severe" in sev_str or "3" in sev_str:
        sev_key = "severe"
    elif "moderate" in stage_str.lower() or "moderate" in sev_str or "2" in sev_str:
        sev_key = "moderate"
    elif "mild" in stage_str.lower() or "mild" in sev_str or "1" in sev_str:
        sev_key = "mild"
    else:
        sev_key = "moderate" if is_mastitis else "negative"

    cur_style = SEVERITY_PALETTES.get(sev_key, SEVERITY_PALETTES["negative"])

    conf_val = result.get("confidence") or result.get("confidence_score") or 0.91
    try:
        conf_float = float(str(conf_val).replace("%", "").strip())
        if conf_float > 1.0:
            conf_float = conf_float / 100.0
    except Exception:
        conf_float = 0.91

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
    report_id = payload.get("report_id") or f"RPT-MST-{datetime.now().strftime('%Y%m%d')}-{abs(hash(str(result))) % 1000:03d}"

    title_text = (
        "ගව බුරුලු ප්‍රදාහය (මැස්ටයිටිස්) පශු වෛද්‍ය සායනික සහ ජෛව දර්ශක වාර්තාව"
        if is_si
        else "Bovine Mastitis Veterinary Clinical Assessment & Biomarker Report"
    )
    subtitle_text = (
        "CattleSense AI — බහුමාධ්‍ය ගැඹුරු ඉගෙනුම, කිරි ජෛව දර්ශක සහ අවදානම් ඇගයීම"
        if is_si
        else "CattleSense AI — Multimodal Deep Learning, Milk Biomarkers & Risk Staging"
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

    # 2. Cow Profile Metadata Box
    cow_name = cattle_info.get("name") or ("ගවයා" if is_si else "Cow")
    cow_tag = cattle_info.get("tag_id") or ("සටහන් කර නැත" if is_si else "Not recorded")
    cow_breed = cattle_info.get("breed") or ("කිරි ගව / මිශ්‍ර" if is_si else "Dairy Cattle")
    cow_age = f"{cattle_info.get('age', 'N/A')} {'වසර' if is_si else 'yrs'}"
    farmer_name = farmer_info.get("name") or ("ලියාපදිංචි ගොවිපළ" if is_si else "Registered Herd Manager")

    meta_rows = [
        [
            Paragraph(f"<b>{'සත්වයාගේ නම' if is_si else 'Animal Name'}:</b> {cow_name}", styles["BodyCustom"]),
            Paragraph(f"<b>{'කරපටි / ටැග් අංකය' if is_si else 'Tag ID'}:</b> {cow_tag}", styles["BodyCustom"]),
            Paragraph(f"<b>{'හිමිකරු' if is_si else 'Owner'}:</b> {farmer_name}", styles["BodyCustom"]),
        ],
        [
            Paragraph(f"<b>{'ප්‍රභේදය' if is_si else 'Breed'}:</b> {cow_breed}", styles["BodyCustom"]),
            Paragraph(f"<b>{'වයස' if is_si else 'Age'}:</b> {cow_age}", styles["BodyCustom"]),
            Paragraph(f"<b>{'මොඩියුලය' if is_si else 'Module'}:</b> Mastitis Multimodal", styles["BodyCustom"]),
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

    # 3. Diagnostic Severity Classification Card
    stage_si_map = {
        "negative": "නිරෝගී (බුරුලු ප්‍රදාහය නොමැත)",
        "mild": "මෘදු බුරුලු ප්‍රදාහය (Mild Mastitis)",
        "moderate": "මධ්‍යස්ථ බුරුලු ප්‍රදාහය (Moderate Mastitis)",
        "severe": "උග්‍ර බුරුලු ප්‍රදාහය (Severe Mastitis)",
    }
    stage_disp = stage_si_map.get(sev_key, stage_str) if is_si else stage_str

    diag_data = [
        [
            Paragraph(
                f"<font size=8 color='#64748b'>{'රෝග විනිශ්චය සහ අවධිය' if is_si else 'DIAGNOSTIC STAGE'}</font><br/>"
                f"<font size=11 color='{cur_style['text'].hexval()}'><b>{stage_disp}</b></font>",
                styles["BodyCustom"],
            ),
            Paragraph(
                f"<font size=8 color='#64748b'>{'ප්‍රධාන ප්‍රතිඵලය' if is_si else 'PREDICTION'}</font><br/>"
                f"<font size=11 color='{cur_style['text'].hexval()}'><b>{'ධනාත්මක (Mastitis)' if is_mastitis and is_si else raw_pred}</b></font>",
                styles["BodyCustom"],
            ),
            Paragraph(
                f"<font size=8 color='#64748b'>{'විශ්වාසනීයත්වය' if is_si else 'CONFIDENCE'}</font><br/>"
                f"<font size=12 color='#0f172a'><b>{conf_float * 100:.1f}%</b></font>",
                styles["BodyCustom"],
            ),
        ]
    ]
    diag_table = Table(diag_data, colWidths=[270, 130, 123])
    diag_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), cur_style['bg']),
        ('BOX', (0, 0), (-1, -1), 1.0, cur_style['border']),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(diag_table)
    story.append(Spacer(1, 10))

    # 4. Numerical Biomarkers Table
    story.append(Paragraph(
        f"<b>{'කිරි ජෛව දර්ශක මිනුම් (Numerical Biomarkers)' if is_si else 'Milk Numerical Biomarkers & Physiological Parameters'}</b>",
        styles["SectionHeader"],
    ))

    num_m = result.get("numerical_measurements") or {}
    temp_val = f"{num_m.get('Milk_Temperature', 36.5)} °C"
    ph_val = f"{num_m.get('Milk_pH', 6.75)}"
    cond_val = f"{num_m.get('Milk_Conductivity', 5.12)} mS/cm"
    yield_val = f"{num_m.get('Milk_Yield', 15.0)} L"

    bio_rows = [
        [
            Paragraph(f"<b>{'ජෛව දර්ශකය' if is_si else 'Biomarker Parameter'}</b>", styles["TableHeading"]),
            Paragraph(f"<b>{'මිනුම් අගය' if is_si else 'Observed Value'}</b>", styles["TableHeading"]),
            Paragraph(f"<b>{'සාමාන්‍ය පරාසය' if is_si else 'Standard Physiological Range'}</b>", styles["TableHeading"]),
        ],
        [
            Paragraph("කිරි විද්‍යුත් සන්නායකතාවය (Conductivity)" if is_si else "Electrical Conductivity", styles["TableCellTextBold"]),
            Paragraph(cond_val, styles["TableCellText"]),
            Paragraph("4.0 - 5.5 mS/cm (සාමාන්‍ය)" if is_si else "4.0 - 5.5 mS/cm (Healthy threshold)", styles["TableCellText"]),
        ],
        [
            Paragraph("කිරි pH අගය (Milk pH)" if is_si else "Milk pH Level", styles["TableCellTextBold"]),
            Paragraph(ph_val, styles["TableCellText"]),
            Paragraph("6.5 - 6.8 (සාමාන්‍ය)" if is_si else "6.5 - 6.8 (Normal cow milk)", styles["TableCellText"]),
        ],
        [
            Paragraph("කිරි උෂ්ණත්වය (Milk Temp)" if is_si else "Milk Temperature", styles["TableCellTextBold"]),
            Paragraph(temp_val, styles["TableCellText"]),
            Paragraph("36.0 - 37.5 °C" if is_si else "36.0 - 37.5 °C", styles["TableCellText"]),
        ],
        [
            Paragraph("දෛනික කිරි අස්වැන්න (Daily Yield)" if is_si else "Daily Milk Yield", styles["TableCellTextBold"]),
            Paragraph(yield_val, styles["TableCellText"]),
            Paragraph("සාමාන්‍ය දෛනික මට්ටම" if is_si else "Baseline herd quota", styles["TableCellText"]),
        ],
    ]
    bio_table = Table(bio_rows, colWidths=[200, 120, 203])
    bio_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), THEME_COLOR),
        ('BOX', (0, 0), (-1, -1), 0.5, THEME_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#f1f5f9")),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(bio_table)
    story.append(Spacer(1, 10))

    # 5. Immediate Clinical & Management Actions
    story.append(Paragraph(
        f"<b>{'ක්ෂණික ගොවිපළ සහ පශු වෛද්‍ය පියවර (Merck Veterinary Manual)' if is_si else 'Immediate Clinical Management & Veterinary Recommendations'}</b>",
        styles["SectionHeader"],
    ))

    if sev_key in ("severe", "moderate"):
        if is_si:
            guidance = [
                "<b>1. හුදකලා කර අවසන්ව දෙවීම:</b> රෝගී ගවයා අනෙකුත් නිරෝගී ගවයින්ගෙන් වෙන් කර, කිරි දෙවීමේදී සැමවිටම අවසන් වරට දොවන්න.",
                "<b>2. කිරි පරිභෝජනය තහනම්:</b> මෙම සත්වයාගේ කිරි මිනිස් පරිභෝජනයට හෝ පැටවුන්ට බීම සඳහා කිසිසේත්ම ලබා නොදෙන්න.",
                "<b>3. පශු වෛද්‍ය ප්‍රතිකාර:</b> බුරුල්ල තුළට ප්‍රතිජීවක (Intramammary infusions) හෝ වේදනා නාශක ලබාදීම සඳහා පශු වෛද්‍යවරයා අමතන්න.",
                "<b>4. තෙතමනය හා සනීපාරක්ෂාව:</b> කිරි දෙවීමට පෙර හා පසු තනපුඩු විෂබීජ නාශක දියරයක (0.5% අයඩින්) බහාලන්න (Teat dipping).",
            ]
        else:
            guidance = [
                "<b>1. Segregation & Milking Order:</b> Milk the affected cow strictly last using dedicated clusters to prevent transmission.",
                "<b>2. Milk Withholding:</b> Discard milk from clinical quarters. Do not feed mastitic milk containing clots to calves.",
                "<b>3. Veterinary Prescription:</b> Consult the veterinary surgeon for intramammary antibiotic infusions and systemic NSAIDs.",
                "<b>4. Post-Milking Teat Disinfection:</b> Apply post-milking teat dip (0.5% available iodine) immediately following cluster removal.",
            ]
    else:
        if is_si:
            guidance = [
                "<b>1. පිරිසිදුකම පවත්වා ගැනීම:</b> ගව මඩුව වියළිව හා පිරිසිදුව තබාගන්න; කිරි දොවන ස්ථානයේ තෙතමනය අවම කරන්න.",
                "<b>2. පූර්ව සහ පසු තනපුඩු සේදීම:</b> කිරි දෙවීමට පෙර හා පසු තනපුඩු විෂබීජ නාශක දියරයෙන් පිරිසිදු කරන්න.",
                "<b>3. කිරි පරීක්ෂාව:</b> දිනපතා කිරිවල කැටි ගැසීම් හෝ වෙනස්කම් පිළිබඳව නිරීක්ෂණය කරන්න.",
            ]
        else:
            guidance = [
                "<b>1. Routine Hygiene:</b> Maintain clean, dry, well-bedded cubicles to minimize environmental pathogens.",
                "<b>2. Teat Dipping:</b> Ensure consistent pre- and post-milking teat sanitation across all milking sessions.",
                "<b>3. Ongoing Monitoring:</b> Perform regular California Mastitis Tests (CMT) to detect subclinical shifts early.",
            ]

    guidance_table = Table([[Paragraph(pt, styles["BodyCustom"])] for pt in guidance], colWidths=[523])
    guidance_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), THEME_LIGHT),
        ('BOX', (0, 0), (-1, -1), 0.5, THEME_BORDER),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#ccfbf1")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(guidance_table)
    story.append(Spacer(1, 10))

    # 6. Disclaimer
    disclaimer_text = (
        "<b>වගකීම් සීමාව:</b> මෙම වාර්තාව CattleSense කෘත්‍රිම බුද්ධි ආකෘතිය මගින් සායනික තීරණ සහාය සඳහා සකස් කරන ලද්දකි. නිල රෝග විනිශ්චය සහ ප්‍රතිකාර සඳහා පශු වෛද්‍යවරයෙකුගේ නිර්දේශය අත්‍යවශ්‍ය වේ."
        if is_si
        else "<b>DISCLAIMER:</b> This report is generated by CattleSense AI to assist dairy farmers and clinical veterinarians in mastitis triage. It does not replace bacterial culture or clinical veterinary judgment."
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
    canvas_maker.brand_title = "CattleSense — Mastitis Clinical Report"
    canvas_maker.brand_title_si = "CattleSense — බුරුලු ප්‍රදාහය (මැස්ටයිටිස්) වාර්තාව"

    doc.build(story, canvasmaker=canvas_maker)
    return buffer.getvalue()
