"""
PDF Report Generator for Foot and Mouth Disease (FMD) Detection & Hybrid Weather Risk.

Builds a comprehensive, professionally styled diagnostic report summarizing:
- Primary lesion prediction & confidence score
- Regional microclimate & airborne transmission risk (temperature, humidity, rainfall)
- DAPH Sri Lanka 2022 seasonal outbreak window status
- Clinical symptoms and observations
- Actionable veterinary guidance & biosecurity protocols
"""

import base64
import io
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fpdf import FPDF

try:
    from PIL import Image
except ImportError:
    Image = None

# Theme Colors (Orange Theme matching FMD module)
BRAND_COLOR = (234, 88, 12)       # Orange 600
BRAND_COLOR_DARK = (194, 65, 12)  # Orange 700
INK = (15, 23, 42)                # Slate 900
MUTED = (100, 116, 139)           # Slate 500
LIGHT_BORDER = (226, 232, 240)    # Slate 200
CARD_FILL = (248, 250, 252)       # Slate 50
TRACK_FILL = (226, 232, 240)      # Slate 200

RISK_COLORS = {
    "LOW": (16, 185, 129),        # Emerald
    "Low": (16, 185, 129),
    "LOW RISK": (16, 185, 129),
    "MEDIUM": (245, 158, 11),     # Amber
    "Medium": (245, 158, 11),
    "MODERATE": (245, 158, 11),
    "MODERATE RISK": (245, 158, 11),
    "HIGH": (220, 38, 38),        # Red
    "High": (220, 38, 38),
    "HIGH RISK": (220, 38, 38),
    "HIGH CONCERN": (220, 38, 38),
    "POSSIBLE FMD": (220, 38, 38),
}

MARGIN = 14
PAGE_W = 210
CONTENT_W = PAGE_W - 2 * MARGIN


def _decode_data_uri_image(data_uri: Optional[str]) -> Optional[bytes]:
    if not data_uri or "," not in data_uri:
        return None
    _, encoded = data_uri.split(",", 1)
    try:
        return base64.b64decode(encoded)
    except (ValueError, TypeError):
        return None


def _section_header(pdf: FPDF, text: str, y: Optional[float] = None) -> None:
    """Bold section header with colored square marker and underline rule."""
    if y is not None:
        pdf.set_xy(MARGIN, y)
    else:
        pdf.set_x(MARGIN)
    top = pdf.get_y()
    pdf.set_fill_color(*BRAND_COLOR)
    pdf.rect(MARGIN, top + 1.2, 2.5, 2.5, style="F")
    pdf.set_xy(MARGIN + 4.5, top)
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*INK)
    pdf.cell(0, 5, text)
    rule_y = top + 6.2
    pdf.set_draw_color(*LIGHT_BORDER)
    pdf.set_line_width(0.3)
    pdf.line(MARGIN, rule_y, MARGIN + CONTENT_W, rule_y)
    pdf.set_xy(MARGIN, rule_y + 2.5)


def _pill(pdf: FPDF, x: float, y: float, text: str, color: tuple, h: float = 7.0) -> float:
    """Badge pill with centered bold white text."""
    pdf.set_font("Helvetica", "B", 9.5)
    text_w = pdf.get_string_width(text)
    w = text_w + 8
    pdf.set_fill_color(*color)
    try:
        pdf.rect(x, y, w, h, style="F", round_corners=True, corner_radius=h / 2)
    except TypeError:
        pdf.rect(x, y, w, h, style="F")
    pdf.set_text_color(255, 255, 255)
    pdf.set_xy(x, y)
    pdf.cell(w, h, text, align="C")
    pdf.set_text_color(*INK)
    return w


def _gauge_bar(pdf: FPDF, x: float, y: float, w: float, h: float, fraction: float, color: tuple) -> None:
    """Proportional progress gauge bar."""
    fraction = max(0.0, min(1.0, fraction))
    pdf.set_fill_color(*TRACK_FILL)
    try:
        pdf.rect(x, y, w, h, style="F", round_corners=True, corner_radius=h / 2)
    except TypeError:
        pdf.rect(x, y, w, h, style="F")
    fill_w = max(h, w * fraction) if fraction > 0 else 0
    if fill_w > 0:
        pdf.set_fill_color(*color)
        try:
            pdf.rect(x, y, fill_w, h, style="F", round_corners=True, corner_radius=h / 2)
        except TypeError:
            pdf.rect(x, y, fill_w, h, style="F")


def _card(pdf: FPDF, x: float, y: float, w: float, h: float, fill: tuple = CARD_FILL, border: tuple = LIGHT_BORDER) -> None:
    pdf.set_fill_color(*fill)
    pdf.set_draw_color(*border)
    pdf.set_line_width(0.3)
    try:
        pdf.rect(x, y, w, h, style="FD", round_corners=True, corner_radius=2.0)
    except TypeError:
        pdf.rect(x, y, w, h, style="FD")


def build_fmd_pdf_report(payload: Dict[str, Any], generated_at: Optional[datetime] = None) -> bytes:
    """Build a comprehensive FMD PDF report and return raw PDF bytes."""
    generated_at = generated_at or datetime.now(timezone.utc)
    result = payload.get("result") or payload

    risk_level = str(result.get("risk_level") or result.get("stage") or "Low").upper()
    predicted_label = str(result.get("predicted_label") or "")
    is_positive = predicted_label in ("1", "Diseased", "FMD Positive") or "HIGH" in risk_level

    outcome_text = "FMD-Consistent Lesions Detected" if is_positive else "No Visible FMD Lesions Detected"
    risk_color = RISK_COLORS.get(risk_level, (16, 185, 129))

    conf_raw = result.get("confidence_score") or result.get("confidence") or 0.0
    if isinstance(conf_raw, str):
        try:
            conf_score = float(conf_raw.replace("%", "").strip()) / 100.0
        except ValueError:
            conf_score = 0.0
    else:
        conf_score = float(conf_raw)

    recommendation = (
        result.get("recommendation")
        or result.get("advice")
        or "Isolate suspect animal immediately, maintain strict biosecurity, and consult local veterinary surgeon."
    )

    weather = result.get("weather_risk") or {}
    hybrid = result.get("hybrid_assessment") or {}
    cow_info = payload.get("cattle_info") or payload.get("cow") or {}

    pdf = FPDF(unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=12)
    pdf.add_page()

    # 1. Header Banner
    header_h = 24
    pdf.set_fill_color(*BRAND_COLOR)
    pdf.rect(0, 0, PAGE_W, header_h, style="F")
    pdf.set_fill_color(*BRAND_COLOR_DARK)
    pdf.rect(0, header_h - 1.5, PAGE_W, 1.5, style="F")

    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 15)
    pdf.set_xy(MARGIN, 5)
    pdf.cell(0, 7, "Foot & Mouth Disease Diagnostic Report")
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_xy(MARGIN, 13)
    pdf.cell(0, 5, "CattleSense AI - Multimodal Lesion & Regional Microclimate Transmission Analysis")

    # Header metadata on right side
    pdf.set_font("Helvetica", "", 8)
    info_lines = [
        f"Date: {generated_at.strftime('%Y-%m-%d %H:%M UTC')}",
    ]
    if cow_info.get("name") or cow_info.get("tag_id"):
        cow_tag = cow_info.get("tag_id") or "N/A"
        cow_name = cow_info.get("name") or "Cow"
        info_lines.append(f"Subject: {cow_name} (#{cow_tag})")

    iy = 5.5
    for line in info_lines:
        pdf.set_xy(PAGE_W - MARGIN - 65, iy)
        pdf.cell(65, 4.2, line, align="R")
        iy += 4.5

    pdf.set_text_color(*INK)
    y = header_h + 6

    # 2. Subject & Farm Information Strip
    if cow_info:
        card_h = 16
        _card(pdf, MARGIN, y, CONTENT_W, card_h)
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(*MUTED)
        pdf.set_xy(MARGIN + 4, y + 2.5)
        pdf.cell(40, 4, "ANIMAL DETAILS")
        pdf.set_xy(MARGIN + 55, y + 2.5)
        pdf.cell(40, 4, "BREED / AGE")
        pdf.set_xy(MARGIN + 110, y + 2.5)
        pdf.cell(40, 4, "LOCATION / DISTRICT")

        pdf.set_font("Helvetica", "B", 9)
        pdf.set_text_color(*INK)
        pdf.set_xy(MARGIN + 4, y + 7.5)
        pdf.cell(45, 5, f"{cow_info.get('name', 'Cattle')} ({cow_info.get('tag_id', 'Tag N/A')})")

        breed_str = f"{cow_info.get('breed', 'Dairy')} / {cow_info.get('age', 'N/A')} yrs"
        pdf.set_xy(MARGIN + 55, y + 7.5)
        pdf.cell(45, 5, breed_str)

        district_str = str(payload.get("district") or weather.get("district") or "Sri Lanka Regional")
        pdf.set_xy(MARGIN + 110, y + 7.5)
        pdf.cell(60, 5, district_str)

        y += card_h + 5

    # 3. Primary Diagnostic Result Card
    card_h = 32
    _card(pdf, MARGIN, y, CONTENT_W, card_h)
    inner_x = MARGIN + 5
    inner_y = y + 4.5

    pdf.set_xy(inner_x, inner_y)
    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(*MUTED)
    pdf.cell(0, 4, "DIAGNOSTIC CLASSIFICATION")

    pdf.set_xy(inner_x, inner_y + 4.5)
    pdf.set_font("Helvetica", "B", 12.5)
    pdf.set_text_color(*INK)
    pdf.cell(0, 6.5, outcome_text)

    # Risk badge
    _pill(pdf, PAGE_W - MARGIN - 5 - 40, inner_y + 1, f"{risk_level} RISK", risk_color)

    # Gauge
    gauge_y = inner_y + 13.5
    pdf.set_xy(inner_x, gauge_y)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*MUTED)
    pdf.cell(0, 4, "LESION CONFIDENCE PROBABILITY")

    prob_text = f"{conf_score * 100:.1f}%"
    pdf.set_font("Helvetica", "B", 10.5)
    pdf.set_text_color(*risk_color)
    prob_w = pdf.get_string_width(prob_text)
    pdf.set_xy(PAGE_W - MARGIN - 5 - prob_w, gauge_y - 0.5)
    pdf.cell(prob_w, 4.5, prob_text)
    pdf.set_text_color(*INK)

    bar_y = gauge_y + 4.5
    bar_w = CONTENT_W - 10
    _gauge_bar(pdf, inner_x, bar_y, bar_w, 3.8, conf_score, risk_color)

    y += card_h + 6

    # 4. Regional Weather & Microclimate Transmission Risk
    _section_header(pdf, "Regional Microclimate & Airborne Spread Risk", y)
    y = pdf.get_y()

    col_w = (CONTENT_W - 5) / 2
    box_h = 32

    # Left Box: Weather Metrics
    _card(pdf, MARGIN, y, col_w, box_h)
    bx = MARGIN + 4
    pdf.set_xy(bx, y + 3)
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(*INK)
    pdf.cell(col_w - 8, 4.5, "Live Weather Observations")

    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(*MUTED)
    pdf.set_xy(bx, y + 8.5)
    temp_val = f"{weather.get('temperature', 'N/A')} °C" if weather.get("temperature") is not None else "Not recorded"
    hum_val = f"{weather.get('humidity', 'N/A')} %" if weather.get("humidity") is not None else "Not recorded"
    rain_val = f"{weather.get('rainfall', 'N/A')} mm" if weather.get("rainfall") is not None else "Not recorded"
    pdf.cell(col_w - 8, 4, f"Temperature: {temp_val}   |   Humidity: {hum_val}")
    pdf.set_xy(bx, y + 13)
    pdf.cell(col_w - 8, 4, f"24h Precipitation: {rain_val}")

    pdf.set_xy(bx, y + 18)
    w_level = str(weather.get("level") or weather.get("risk_level") or "Standard").upper()
    w_color = RISK_COLORS.get(w_level, (16, 185, 129))
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(*INK)
    pdf.cell(38, 4.5, "Airborne Spread Risk:")
    _pill(pdf, bx + 38, y + 17.5, w_level, w_color, h=5.5)

    # Right Box: DAPH Seasonal Risk Window & Hybrid Fusion
    rx = MARGIN + col_w + 5
    _card(pdf, rx, y, col_w, box_h)
    bx2 = rx + 4
    pdf.set_xy(bx2, y + 3)
    pdf.set_font("Helvetica", "B", 8.5)
    pdf.set_text_color(*INK)
    pdf.cell(col_w - 8, 4.5, "DAPH Seasonal Window & Hybrid Assessment")

    seasonal_active = weather.get("seasonal_active", False)
    season_text = "Active Epidemic Period (Dec-Feb)" if seasonal_active else "Standard Season (Non-Peak)"
    season_color = (220, 38, 38) if seasonal_active else (100, 116, 139)

    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(*season_color)
    pdf.set_xy(bx2, y + 8.5)
    pdf.cell(col_w - 8, 4, f"Season Window: {season_text}")

    overall_hybrid = hybrid.get("overall_assessment") or (
        "HIGH CONCERN" if is_positive else "LOW CURRENT CONCERN"
    )
    pdf.set_xy(bx2, y + 14)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(*INK)
    pdf.cell(36, 4.5, "Overall Assessment:")
    hy_color = RISK_COLORS.get(overall_hybrid, (220, 38, 38) if is_positive else (16, 185, 129))
    _pill(pdf, bx2 + 36, y + 13.5, overall_hybrid, hy_color, h=5.5)

    pdf.set_xy(bx2, y + 21)
    pdf.set_font("Helvetica", "I", 7)
    pdf.set_text_color(*MUTED)
    pdf.multi_cell(col_w - 8, 3.2, "Ref: Department of Animal Production & Health (DAPH) Sri Lanka.")

    y += box_h + 6

    # 5. Clinical Symptoms Checklist & Observations
    _section_header(pdf, "Clinical Symptoms & Physical Findings", y)
    y = pdf.get_y()

    symptoms_list = []
    sym_dict = payload.get("symptoms") or result.get("symptoms") or {}
    if not isinstance(sym_dict, dict):
        sym_dict = {}

    if sym_dict.get("lesions_in_mouth") or payload.get("lesionsInMouth") or result.get("lesionsInMouth"):
        symptoms_list.append("Blisters / Ulcers on tongue or oral mucosa")
    if sym_dict.get("lesions_on_hooves") or payload.get("lesionsOnHooves") or result.get("lesionsOnHooves"):
        symptoms_list.append("Lesions or erosions on coronary band / hooves")
    if sym_dict.get("excessive_drooling") or payload.get("excessiveDrooling") or result.get("excessiveDrooling"):
        symptoms_list.append("Excessive ropy salivation / drooling")
    if sym_dict.get("high_fever") or payload.get("highFever") or result.get("highFever"):
        symptoms_list.append("Elevated body temperature (High Fever)")
    if sym_dict.get("lameness") or payload.get("lamenessOrLimping") or result.get("lamenessOrLimping"):
        symptoms_list.append("Severe lameness / limping / foot soreness")
    if sym_dict.get("reduced_feed_intake") or payload.get("reducedFeedIntake") or result.get("reducedFeedIntake"):
        symptoms_list.append("Loss of appetite / difficulty feeding")
    if sym_dict.get("milk_drop") or payload.get("milkDropInDairy") or result.get("milkDropInDairy"):
        symptoms_list.append("Sharp drop in daily milk yield")

    sym_card_h = 24 if symptoms_list else 16
    _card(pdf, MARGIN, y, CONTENT_W, sym_card_h)
    pdf.set_xy(MARGIN + 4, y + 3)
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(*INK)
    pdf.cell(0, 4, "Reported Symptoms:")

    pdf.set_font("Helvetica", "", 7.8)
    pdf.set_text_color(*INK)
    if symptoms_list:
        pdf.set_xy(MARGIN + 4, y + 8)
        items_str = "   *  " + "      *  ".join(symptoms_list)
        pdf.multi_cell(CONTENT_W - 8, 4.2, items_str)
    else:
        pdf.set_xy(MARGIN + 4, y + 8)
        pdf.set_text_color(*MUTED)
        pdf.cell(0, 4, "No specific clinical symptoms were checked during this diagnostic submission.")

    y += sym_card_h + 6

    # 6. Actionable Veterinary Guidance
    _section_header(pdf, "Actionable Veterinary Guidance & Biosecurity Protocols", y)
    y = pdf.get_y()

    text_w = CONTENT_W - 8
    pdf.set_font("Helvetica", "", 8.5)
    alert_h = 26

    tint = tuple(round(c + (255 - c) * 0.88) for c in risk_color)
    pdf.set_fill_color(*tint)
    pdf.set_draw_color(*risk_color)
    pdf.set_line_width(0.3)
    try:
        pdf.rect(MARGIN, y, CONTENT_W, alert_h, style="FD", round_corners=True, corner_radius=2.0)
    except TypeError:
        pdf.rect(MARGIN, y, CONTENT_W, alert_h, style="FD")
    pdf.set_fill_color(*risk_color)
    pdf.rect(MARGIN, y, 2.4, alert_h, style="F")

    pdf.set_xy(MARGIN + 5, y + 3.5)
    pdf.set_text_color(*INK)
    pdf.multi_cell(text_w, 4.4, recommendation)

    # 7. Standard Footer
    footer_y = 276
    pdf.set_draw_color(*LIGHT_BORDER)
    pdf.set_line_width(0.3)
    pdf.line(MARGIN, footer_y, MARGIN + CONTENT_W, footer_y)
    pdf.set_xy(MARGIN, footer_y + 1.5)
    pdf.set_font("Helvetica", "I", 7)
    pdf.set_text_color(120, 120, 120)
    pdf.multi_cell(
        CONTENT_W, 3.2,
        "Disclaimer: This report is generated by CattleSense automated AI diagnostics to assist farm biosecurity and veterinary management. "
        "It does not replace confirmation by a licensed Veterinary Surgeon (VS).",
    )

    try:
        out = pdf.output()
    except TypeError:
        out = pdf.output(dest="S")
    if isinstance(out, str):
        return out.encode("latin1")
    return bytes(out)
