"""
Milk Fever (Parturient Paresis / Hypocalcemia) PDF Diagnostic Report Builder.
Generates comprehensive clinical, nutritional, and veterinary reports in English ('en') or Sinhala ('si').
"""
import io
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
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

STAGE_PALETTES = {
    "Subclinical": {"bg": colors.HexColor("#eff6ff"), "border": colors.HexColor("#3b82f6"), "text": colors.HexColor("#1d4ed8")},
    "Mild": {"bg": colors.HexColor("#fffbeb"), "border": colors.HexColor("#d97706"), "text": colors.HexColor("#b45309")},
    "Moderate": {"bg": colors.HexColor("#fff7ed"), "border": colors.HexColor("#ea580c"), "text": colors.HexColor("#c2410c")},
    "Critical": {"bg": colors.HexColor("#fef2f2"), "border": colors.HexColor("#dc2626"), "text": colors.HexColor("#b91c1c")},
}

STAGE_SINHALA = {
    "Subclinical": "උපසායනික (Subclinical - අඩු කැල්සියම්)",
    "Mild": "මෘදු (Stage 1 - සිටගෙන සිටින මුල් අවධිය)",
    "Moderate": "මධ්‍යස්ථ (Stage 2 - බිම වැතිරී සිටින අවධිය)",
    "Critical": "අසාධ්‍ය (Stage 3 - සිහිසුන් වූ හදිසි අවධිය)",
}


def generate_milk_fever_pdf(payload: dict, language: str = "en") -> bytes:
    """Generate a publication-grade Milk Fever Diagnostic Report PDF in English or Sinhala."""
    register_sinhala_fonts()
    is_si = (language == "si")
    styles = get_report_styles(language)

    result = payload.get("result") or payload
    cattle_info = payload.get("cattle_info") or payload.get("cow") or {}
    farmer_info = payload.get("farmer_info") or {}

    stage = str(result.get("stage") or result.get("prediction") or "Mild").capitalize()
    if "Sub" in stage:
        stage_key = "Subclinical"
    elif "Mod" in stage:
        stage_key = "Moderate"
    elif "Crit" in stage or "Sev" in stage:
        stage_key = "Critical"
    else:
        stage_key = "Mild"

    stage_style = STAGE_PALETTES.get(stage_key, STAGE_PALETTES["Mild"])

    conf_val = result.get("confidence") or result.get("confidence_score") or 0.88
    try:
        conf_float = float(str(conf_val).replace("%", "").strip())
        if conf_float > 1.0:
            conf_float = conf_float / 100.0
    except Exception:
        conf_float = 0.88

    risk_score = result.get("risk_score") or int(conf_float * 100)

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
    report_id = f"RPT-MF-{datetime.now().strftime('%Y%m%d')}-{abs(hash(str(result))) % 1000:03d}"

    title_text = (
        "ක්ෂීර උණ (හයිපොකැල්සීමියාව) සායනික ඇගයීම් සහ රෝග විනිශ්චය වාර්තාව"
        if is_si
        else "Milk Fever (Hypocalcemia) Clinical Assessment & Diagnostic Report"
    )
    subtitle_text = (
        "CattleSense AI — මැෂින් ලර්නින් පාදක ක්ෂීර උණ අවධි වර්ගීකරණය සහ ජෛව දර්ශක ඇගයීම"
        if is_si
        else "CattleSense AI — Machine Learning Parturient Paresis Staging & Biomarker Triage"
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
    cow_breed = cattle_info.get("breed") or ("කිරි ගව / දේශීය" if is_si else "Dairy Cattle")
    cow_age = f"{cattle_info.get('age', 'N/A')} {'වසර' if is_si else 'yrs'}"
    lactation_str = f"{cattle_info.get('lactation_count') or cattle_info.get('current_lactation') or '2+'}"
    farmer_name = farmer_info.get("name") or ("ලියාපදිංචි ගොවිපළ" if is_si else "Registered Herd Manager")

    meta_rows = [
        [
            Paragraph(f"<b>{'සත්වයාගේ නම' if is_si else 'Animal Name'}:</b> {cow_name}", styles["BodyCustom"]),
            Paragraph(f"<b>{'කරපටි / ටැග් අංකය' if is_si else 'Tag ID'}:</b> {cow_tag}", styles["BodyCustom"]),
            Paragraph(f"<b>{'කිරි මුර සංඛ්‍යාව' if is_si else 'Lactation'}:</b> {lactation_str}", styles["BodyCustom"]),
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

    # 3. Diagnostic Staging Card
    stage_display = STAGE_SINHALA.get(stage_key, stage_key) if is_si else f"Stage: {stage_key} Hypocalcemia"
    diag_data = [
        [
            Paragraph(
                f"<font size=8 color='#64748b'>{'සායනික අවධිය' if is_si else 'CLINICAL STAGE ASSESSMENT'}</font><br/>"
                f"<font size=11 color='{stage_style['text'].hexval()}'><b>{stage_display}</b></font>",
                styles["BodyCustom"],
            ),
            Paragraph(
                f"<font size=8 color='#64748b'>{'අවදානම් ලකුණු' if is_si else 'RISK SCORE'}</font><br/>"
                f"<font size=12 color='{stage_style['text'].hexval()}'><b>{risk_score}/100</b></font>",
                styles["BodyCustom"],
            ),
            Paragraph(
                f"<font size=8 color='#64748b'>{'ආකෘති විශ්වාසනීයත්වය' if is_si else 'MODEL CONFIDENCE'}</font><br/>"
                f"<font size=12 color='#0f172a'><b>{conf_float * 100:.1f}%</b></font>",
                styles["BodyCustom"],
            ),
        ]
    ]
    diag_table = Table(diag_data, colWidths=[270, 130, 123])
    diag_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), stage_style['bg']),
        ('BOX', (0, 0), (-1, -1), 1.0, stage_style['border']),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(diag_table)
    story.append(Spacer(1, 10))

    # 4. Biomarker & Physiological Parameters
    story.append(Paragraph(
        f"<b>{'කායික ලක්ෂණ සහ ජෛව දර්ශක ඇගයීම' if is_si else 'Physiological Parameters & Biomarker Indicators'}</b>",
        styles["SectionHeader"],
    ))

    feat_vals = result.get("feature_values") or {}
    ca_estimate = "< 1.5 mmol/L (අඩු)" if stage_key in ("Moderate", "Critical") else "1.5 - 2.0 mmol/L (අවදානම්)" if is_si else "< 1.5 mmol/L (Critically Low)" if stage_key in ("Moderate", "Critical") else "1.5 - 2.0 mmol/L (Subclinical Deficit)"

    bio_rows = [
        [
            Paragraph(f"<b>{'දර්ශකය' if is_si else 'Biomarker / Sign'}</b>", styles["TableHeading"]),
            Paragraph(f"<b>{'නිරීක්ෂිත අගය' if is_si else 'Observed / Modeled'}</b>", styles["TableHeading"]),
            Paragraph(f"<b>{'සායනික අර්ථකථනය' if is_si else 'Clinical Interpretation'}</b>", styles["TableHeading"]),
        ],
        [
            Paragraph("රුධිර කැල්සියම් මට්ටම (Serum Calcium)" if is_si else "Estimated Serum Calcium", styles["TableCellTextBold"]),
            Paragraph(ca_estimate, styles["TableCellText"]),
            Paragraph("පැටවා දැමීමෙන් පසු ක්ෂීර නිෂ්පාදනයට කැල්සියම් වැයවීම" if is_si else "Acute drain due to sudden colostrum synthesis", styles["TableCellText"]),
        ],
        [
            Paragraph("ඉරියව්ව (Posture & Recumbency)" if is_si else "Posture & Stance", styles["TableCellTextBold"]),
            Paragraph("බිම වැතිරී සිටී (Recumbent)" if stage_key in ("Moderate", "Critical") else "සිටගෙන සිටී (Standing)" if is_si else "Recumbent (Downer Cow)" if stage_key in ("Moderate", "Critical") else "Standing with tremors", styles["TableCellText"]),
            Paragraph("S-හැඩැති බෙල්ල / නැගිටීමට නොහැකි වීම" if is_si else "Sternal/lateral recumbency characteristic of paresis", styles["TableCellText"]),
        ],
        [
            Paragraph("ශරීර උෂ්ණත්වය (Body Temperature)" if is_si else "Body Temperature / Extremities", styles["TableCellTextBold"]),
            Paragraph(f"{feat_vals.get('body_temp', '37.8')}°C / සිසිල් කන්" if is_si else f"{feat_vals.get('body_temp', '37.8')}°C / Cold ears", styles["TableCellText"]),
            Paragraph("උප උෂ්ණත්වය (Subnormal / Hypothermia)" if is_si else "Subnormal core temperature & cold extremities", styles["TableCellText"]),
        ],
    ]
    bio_table = Table(bio_rows, colWidths=[180, 150, 193])
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

    # 5. Immediate Clinical & Nutritional Interventions
    story.append(Paragraph(
        f"<b>{'ක්ෂණික ප්‍රතිකාර සහ කළමනාකරණ උපදෙස් (Merck Manual පදනම් කරගත්)' if is_si else 'Immediate Clinical Management & Nutritional Intervention'}</b>",
        styles["SectionHeader"],
    ))

    if stage_key == "Critical":
        if is_si:
            guidance = [
                "<b>1. හදිසි පශු වෛද්‍ය කැඳවීම:</b> සත්වයා අසාධ්‍ය තත්ත්වයේ සිටින බැවින් මිනිත්තු කිහිපයක් ඇතුළත පශු වෛද්‍යවරයෙකු අමතන්න (ක්ෂණික ඇමතුම්: +94 11 2 888 888).",
                "<b>2. කිසිදු දියරයක් මුඛයෙන් නොදෙන්න:</b> ගිලීමේ හැකියාව නැති බැවින් මුඛයෙන් දියර දීමෙන් පෙනහළුවලට ගොස් මරණය සිදුවිය හැක.",
                "<b>3. පපුව මත රඳවන්න:</b> සත්වයා පැත්තට වැටී ඇත්නම් වහාම පපුව මත හිඳුවා පිදුරු මිටි තබා නොවැටෙන සේ රඳවන්න (ආමාශය පිපීම වැළැක්වීමට).",
                "<b>4. නහරගත කැල්සියම් එන්නත් (IV Calcium):</b> පශු වෛද්‍යවරයා විසින් 23% කැල්සියම් බොරෝග්ලූකොනේට් නහරගතව සෙමින් ලබාදිය යුතුය.",
            ]
        else:
            guidance = [
                "<b>1. EMERGENCY VET CALL:</b> Call attending veterinarian immediately (Emergency hotline: +94 11 2 888 888). Minutes count.",
                "<b>2. DO NOT DRENCH:</b> Cow cannot swallow. Oral fluids will enter lungs causing fatal aspiration pneumonia.",
                "<b>3. Sternal Position:</b> Prop cow upright on chest with straw bales to prevent ruminal bloat and regurgitation.",
                "<b>4. IV Calcium Therapy:</b> Slow intravenous infusion of 400ml 23% Calcium Borogluconate under veterinary supervision.",
            ]
    elif stage_key == "Moderate":
        if is_si:
            guidance = [
                "<b>1. පශු වෛද්‍යවරයා අමතන්න:</b> බිම වැටී නැගිටීමට නොහැකි බැවින් නහරගත හෝ සම යට කැල්සියම් ලබාදීමට පශු වෛද්‍යවරයා කැඳවන්න.",
                "<b>2. මුඛයෙන් දියර පෙවීමෙන් වළකින්න:</b> ගිලීමේ අපහසුතා ඇති බැවින් මුඛයෙන් ඖෂධ පෙවීම නොකරන්න.",
                "<b>3. පිදුරු ඇතිරිලි:</b> ලිස්සා නොයන වියළි පිදුරු ඇතිරිල්ලක් මත සත්වයා රඳවා කකුල් පිරිමදින්න.",
                "<b>4. සම්පූර්ණයෙන්ම කිරි නොදොවන්න:</b> මුල් පැය 48 තුළ සම්පූර්ණයෙන් කිරි දෙවීමෙන් වළකින්න.",
            ]
        else:
            guidance = [
                "<b>1. Veterinary Attention Required:</b> Call veterinary surgeon for IV or subcutaneous Calcium Borogluconate therapy.",
                "<b>2. Avoid Oral Liquids:</b> Swallowing reflex is impaired; oral drenching poses severe aspiration risk.",
                "<b>3. Bedding & Positioning:</b> Move to non-slip bedding, prop upright, and massage limbs to stimulate blood circulation.",
                "<b>4. Do Not Milk Out Completely:</b> Avoid complete udder evacuation during the first 24-48 hours post-treatment.",
            ]
    else:  # Mild or Subclinical
        if is_si:
            guidance = [
                "<b>1. මුඛ කැල්සියම් බෝලස් (Oral Calcium Bolus):</b> මුඛයෙන් ලබාදෙන කැල්සියම් පේස්ට් හෝ බෝලස් 1-2ක් වහාම ලබාදෙන්න.",
                "<b>2. මැග්නීසියම් සහ මොලැසස්:</b> උණුසුම් වතුර සමඟ මොලැසස් සහ මැග්නීසියම් මිශ්‍ර කර පානයට දෙන්න.",
                "<b>3. නිරීක්ෂණය:</b> මාංශ පේශි වෙව්ලීම හෝ අත්පා සිසිල් වීම පිළිබඳව දිනකට දෙවරක් පරීක්ෂා කරන්න.",
                "<b>4. පශු වෛද්‍ය සහාය:</b> පැය 2-4ක් ඇතුළත තත්ත්වය යහපත් නොවන්නේ නම් පශු වෛද්‍යවරයා අමතන්න.",
            ]
        else:
            guidance = [
                "<b>1. Oral Calcium Supplementation:</b> Administer 1-2 oral calcium boluses/pastes (50g Ca) immediately.",
                "<b>2. Electrolytes & Molasses:</b> Provide warm water supplemented with electrolytes and molasses for rapid energy.",
                "<b>3. Monitor Progression:</b> Check cow twice daily for muscle tremors, ear temperature, and rumination behavior.",
                "<b>4. Escalate if Necessary:</b> If ambulatory condition deteriorates within 2-4 hours, summon veterinarian immediately.",
            ]

    guidance_data = [[Paragraph(pt, styles["BodyCustom"])] for pt in guidance]
    guidance_table = Table(guidance_data, colWidths=[523])
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

    # 6. Clinical Disclaimer
    disclaimer_text = (
        "<b>වගකීම් සීමාව:</b> මෙම වාර්තාව CattleSense කෘත්‍රිම බුද්ධි ආකෘතිය මගින් ගවයාගේ කැල්සියම් තත්ත්වය ඇගයීමට සකස් කරන ලද්දකි. මෙය වෛද්‍ය ප්‍රතිකාරයක් නොවන අතර හදිසි අවස්ථාවකදී සුදුසුකම් ලත් පශු වෛද්‍යවරයෙකුගේ උපදෙස් ලබාගත යුතුය."
        if is_si
        else "<b>CLINICAL DISCLAIMER:</b> This assessment is generated by CattleSense AI to assist farmers and clinical staff in hypocalcemia triage. Intravenous therapeutics must only be administered by a qualified veterinary professional."
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
    canvas_maker.brand_title = "CattleSense — Milk Fever Clinical Report"
    canvas_maker.brand_title_si = "CattleSense — ක්ෂීර උණ සායනික වාර්තාව"

    doc.build(story, canvasmaker=canvas_maker)
    return buffer.getvalue()
