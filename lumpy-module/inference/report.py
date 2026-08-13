"""PDF report generation for LSD detection results.

Builds a one-page, visually styled summary (annotated image, probability
gauge, risk badge, guidance card, assessment breakdown, timestamp) from the
same result payload returned by /api/predict/assisted - no re-inference
needed.

Must tolerate two payload shapes:
  * "full"    - straight from /api/predict/assisted (image_prediction,
                symptom_prediction, overall_prediction all present).
  * "minimal" - reconstructed from a DB log entry (only prediction,
                confidence, risk_level, recommendation, detected_at,
                cow_name, and maybe annotated_image are present).

IMPORTANT: fpdf2's built-in core "Helvetica" font only supports Latin-1.
Every string literal in this file must be plain ASCII - no em-dashes, curly
quotes, degree signs, etc.
"""
import base64
import io
from datetime import datetime, timezone

from fpdf import FPDF

try:
    from PIL import Image
except ImportError:  # pragma: no cover - Pillow ships with fpdf2 anyway
    Image = None

BRAND_COLOR = (124, 58, 237)  # violet - matches the LSD module's UI theme
BRAND_COLOR_DARK = (91, 33, 182)
INK = (31, 31, 41)
MUTED = (110, 110, 125)
LIGHT_BORDER = (223, 220, 235)
CARD_FILL = (248, 247, 252)
TRACK_FILL = (230, 228, 240)

RISK_COLORS = {
    "LOW RISK": (16, 185, 129),
    "MODERATE RISK": (245, 158, 11),
    "HIGH RISK": (220, 38, 38),
}

MARGIN = 15
PAGE_W = 210
CONTENT_W = PAGE_W - 2 * MARGIN


def _decode_data_uri_image(data_uri):
    if not data_uri or "," not in data_uri:
        return None
    _header, encoded = data_uri.split(",", 1)
    try:
        return base64.b64decode(encoded)
    except (ValueError, TypeError):
        return None


def _image_pixel_size(image_bytes):
    """Return (width, height) in px, or None if it can't be determined."""
    if Image is None:
        return None
    try:
        with Image.open(io.BytesIO(image_bytes)) as im:
            return im.size
    except Exception:
        return None


def _section_header(pdf, text, y=None):
    """Bold heading with a small colored square bullet and underline rule."""
    if y is not None:
        pdf.set_xy(MARGIN, y)
    else:
        pdf.set_x(MARGIN)
    top = pdf.get_y()
    pdf.set_fill_color(*BRAND_COLOR)
    pdf.rect(MARGIN, top + 1.3, 2.6, 2.6, style="F")
    pdf.set_xy(MARGIN + 5, top)
    pdf.set_font("Helvetica", "B", 11.5)
    pdf.set_text_color(*INK)
    pdf.cell(0, 5.2, text)
    rule_y = top + 6.4
    pdf.set_draw_color(*LIGHT_BORDER)
    pdf.set_line_width(0.3)
    pdf.line(MARGIN, rule_y, MARGIN + CONTENT_W, rule_y)
    pdf.set_xy(MARGIN, rule_y + 3)


def _pill(pdf, x, y, text, color, h=7.5):
    """Filled rounded-rect badge with centered bold white text."""
    pdf.set_font("Helvetica", "B", 10.5)
    text_w = pdf.get_string_width(text)
    w = text_w + 10
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


def _gauge_bar(pdf, x, y, w, h, fraction, color):
    """Light gray track + colored fill bar proportional to fraction (0..1)."""
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


def _card(pdf, x, y, w, h, fill=CARD_FILL, border=LIGHT_BORDER):
    pdf.set_fill_color(*fill)
    pdf.set_draw_color(*border)
    pdf.set_line_width(0.3)
    try:
        pdf.rect(x, y, w, h, style="FD", round_corners=True, corner_radius=2.2)
    except TypeError:
        pdf.rect(x, y, w, h, style="FD")


def build_pdf_report(result, generated_at=None):
    """Build a PDF summarising an LSD detection result. Returns raw PDF bytes."""
    generated_at = generated_at or datetime.now(timezone.utc)

    prediction = result.get("prediction") or "Unknown"
    risk_level = result.get("risk_level") or result.get("stage") or "LOW RISK"
    risk_color = RISK_COLORS.get(risk_level, MUTED)
    probability = result.get("confidence", 0.0) or 0.0
    recommendation = result.get("recommendation") or result.get("advice") or \
        "No specific guidance available. Consult a veterinarian for further assessment."
    detected_at = result.get("detected_at")
    cow_name = result.get("cow_name")

    image_pred = result.get("image_prediction")
    symptom_pred = result.get("symptom_prediction")
    overall = result.get("overall_prediction") or {}

    pdf = FPDF(unit="mm", format="A4")
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    # ---- Header band -----------------------------------------------------
    header_h = 26
    pdf.set_fill_color(*BRAND_COLOR)
    pdf.rect(0, 0, PAGE_W, header_h, style="F")
    pdf.set_fill_color(*BRAND_COLOR_DARK)
    pdf.rect(0, header_h - 1.6, PAGE_W, 1.6, style="F")

    pdf.set_text_color(255, 255, 255)
    pdf.set_font("Helvetica", "B", 16.5)
    pdf.set_xy(MARGIN, 6)
    pdf.cell(0, 8, "Lumpy Skin Disease Detection Report")
    pdf.set_font("Helvetica", "", 9.5)
    pdf.set_xy(MARGIN, 14.5)
    pdf.cell(0, 6, "AI-Assisted Diagnostic Summary")

    # compact info row, right-aligned inside header
    pdf.set_font("Helvetica", "", 8.3)
    info_lines = [f"Generated: {generated_at.strftime('%Y-%m-%d %H:%M UTC')}"]
    if detected_at:
        info_lines.append(f"Detected: {detected_at}")
    if cow_name:
        info_lines.append(f"Cow: {cow_name}")
    iy = 7
    for line in info_lines:
        pdf.set_xy(PAGE_W - MARGIN - 75, iy)
        pdf.cell(75, 4.6, line, align="R")
        iy += 5

    pdf.set_text_color(*INK)
    y = header_h + 8

    # ---- Result summary card ----------------------------------------------
    card_h = 34
    _card(pdf, MARGIN, y, CONTENT_W, card_h)

    inner_x = MARGIN + 6
    inner_y = y + 5.5
    pdf.set_xy(inner_x, inner_y)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*MUTED)
    pdf.cell(0, 4.5, "PREDICTION")
    pdf.set_xy(inner_x, inner_y + 5)
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(*INK)
    pdf.cell(0, 7, prediction)

    _pill(pdf, PAGE_W - MARGIN - 6 - 45, inner_y + 2, risk_level, risk_color)

    gauge_y = inner_y + 15.5
    pdf.set_xy(inner_x, gauge_y)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*MUTED)
    pdf.cell(0, 4.5, "OVERALL LSD PROBABILITY")

    prob_text = f"{probability * 100:.1f}%"
    pdf.set_font("Helvetica", "B", 11)
    pdf.set_text_color(*risk_color)
    prob_w = pdf.get_string_width(prob_text)
    pdf.set_xy(PAGE_W - MARGIN - 6 - prob_w, gauge_y - 0.3)
    pdf.cell(prob_w, 5, prob_text)
    pdf.set_text_color(*INK)

    bar_y = gauge_y + 5.5
    bar_w = CONTENT_W - 12
    _gauge_bar(pdf, inner_x, bar_y, bar_w, 4.2, probability, risk_color)

    y = y + card_h + 8

    # ---- Annotated image ----------------------------------------------
    image_bytes = _decode_data_uri_image(result.get("annotated_image"))
    if image_bytes:
        target_w = 120.0
        pixel_size = _image_pixel_size(image_bytes)
        if pixel_size and pixel_size[0] > 0:
            aspect_h = target_w * (pixel_size[1] / pixel_size[0])
        else:
            aspect_h = target_w * 0.75
        max_img_h = 95.0
        if aspect_h > max_img_h:
            aspect_h = max_img_h
            target_w = aspect_h * (pixel_size[0] / pixel_size[1]) if pixel_size else target_w

        frame_pad = 3.5
        frame_w = target_w + 2 * frame_pad
        frame_h = aspect_h + 2 * frame_pad
        frame_x = (PAGE_W - frame_w) / 2

        pdf.set_fill_color(255, 255, 255)
        pdf.set_draw_color(*LIGHT_BORDER)
        pdf.set_line_width(0.3)
        pdf.rect(frame_x, y, frame_w, frame_h, style="FD")
        pdf.image(io.BytesIO(image_bytes), x=frame_x + frame_pad, y=y + frame_pad, w=target_w, h=aspect_h)

        caption_y = y + frame_h + 1.5
        pdf.set_xy(MARGIN, caption_y)
        pdf.set_font("Helvetica", "I", 8.3)
        pdf.set_text_color(*MUTED)
        pdf.cell(0, 4.5, "Final output: detected nodule regions highlighted on the analyzed image", align="C")
        pdf.set_text_color(*INK)
        y = caption_y + 8
    else:
        y += 2

    # ---- Guidance card (colored left accent strip) -----------------------
    pdf.set_y(y)
    _section_header(pdf, "Guidance")
    y = pdf.get_y()

    pdf.set_font("Helvetica", "", 9.8)
    text_w = CONTENT_W - 10
    lines = pdf.multi_cell(text_w, 5.4, recommendation, align="L", dry_run=True, output="LINES")
    guidance_h = max(14, len(lines) * 5.4 + 7)

    pdf.set_fill_color(*CARD_FILL)
    pdf.set_draw_color(*LIGHT_BORDER)
    pdf.set_line_width(0.3)
    try:
        pdf.rect(MARGIN, y, CONTENT_W, guidance_h, style="FD", round_corners=True, corner_radius=2)
    except TypeError:
        pdf.rect(MARGIN, y, CONTENT_W, guidance_h, style="FD")
    pdf.set_fill_color(*risk_color)
    pdf.rect(MARGIN, y, 2.4, guidance_h, style="F")

    pdf.set_xy(MARGIN + 6, y + 3.5)
    pdf.set_text_color(*INK)
    pdf.multi_cell(text_w, 5.4, recommendation, align="L")
    pdf.set_text_color(*INK)

    y = y + guidance_h + 8

    # ---- Assessment breakdown ---------------------------------------------
    pdf.set_y(y)
    _section_header(pdf, "Assessment Breakdown")
    y = pdf.get_y()

    if image_pred is not None:
        image_weight_pct = int(round((overall.get("image_weight", 1) or 0) * 100))
        image_prob = image_pred.get("probability", 0) or 0
        num_det = image_pred.get("num_detections", 0) or 0

        col_gap = 6
        col_w = (CONTENT_W - col_gap) / 2
        block_h = 26

        # Left block: photo analysis
        _card(pdf, MARGIN, y, col_w, block_h)
        bx = MARGIN + 5
        pdf.set_xy(bx, y + 4)
        pdf.set_font("Helvetica", "B", 9.3)
        pdf.set_text_color(*INK)
        pdf.cell(col_w - 10, 5, f"Photo analysis ({image_weight_pct}% weight)")
        pdf.set_xy(bx, y + 10)
        pdf.set_font("Helvetica", "B", 13)
        pdf.set_text_color(*BRAND_COLOR)
        pdf.cell(col_w - 10, 6, f"{image_prob * 100:.1f}%")
        pdf.set_text_color(*INK)
        _gauge_bar(pdf, bx, y + 17, col_w - 10, 3.2, image_prob, BRAND_COLOR)
        pdf.set_xy(bx, y + 21.2)
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(*MUTED)
        det_word = "region" if num_det == 1 else "regions"
        pdf.cell(col_w - 10, 4, f"{num_det} nodule {det_word} detected")
        pdf.set_text_color(*INK)

        # Right block: symptom checklist
        rx = MARGIN + col_w + col_gap
        _card(pdf, rx, y, col_w, block_h)
        bx2 = rx + 5
        if symptom_pred:
            symptom_weight_pct = int(round((overall.get("symptom_weight", 0) or 0) * 100))
            symptom_prob = symptom_pred.get("probability", 0) or 0
            risk_label = symptom_pred.get("risk_label", "N/A")
            pdf.set_xy(bx2, y + 4)
            pdf.set_font("Helvetica", "B", 9.3)
            pdf.cell(col_w - 10, 5, f"Symptom checklist ({symptom_weight_pct}% weight)")
            pdf.set_xy(bx2, y + 10)
            pdf.set_font("Helvetica", "B", 13)
            pdf.set_text_color(*BRAND_COLOR)
            pdf.cell(col_w - 10, 6, f"{symptom_prob * 100:.1f}%")
            pdf.set_text_color(*INK)
            _gauge_bar(pdf, bx2, y + 17, col_w - 10, 3.2, symptom_prob, BRAND_COLOR)
            pdf.set_xy(bx2, y + 21.2)
            pdf.set_font("Helvetica", "", 8)
            pdf.set_text_color(*MUTED)
            pdf.cell(col_w - 10, 4, f"Reported risk: {risk_label}")
            pdf.set_text_color(*INK)
        else:
            pdf.set_xy(bx2, y + 4)
            pdf.set_font("Helvetica", "B", 9.3)
            pdf.cell(col_w - 10, 5, "Symptom checklist")
            pdf.set_xy(bx2, y + 11)
            pdf.set_font("Helvetica", "", 8.6)
            pdf.set_text_color(*MUTED)
            pdf.multi_cell(col_w - 10, 4.6, "Not provided - this was an image-only result.")
            pdf.set_text_color(*INK)

        y = y + block_h + 6
    else:
        note_h = 18
        pdf.set_fill_color(*CARD_FILL)
        pdf.set_draw_color(*LIGHT_BORDER)
        pdf.set_line_width(0.3)
        try:
            pdf.rect(MARGIN, y, CONTENT_W, note_h, style="FD", round_corners=True, corner_radius=2)
        except TypeError:
            pdf.rect(MARGIN, y, CONTENT_W, note_h, style="FD")
        pdf.set_fill_color(*MUTED)
        pdf.rect(MARGIN, y, 2.4, note_h, style="F")
        pdf.set_xy(MARGIN + 6, y + 4.5)
        pdf.set_font("Helvetica", "I", 9.3)
        pdf.set_text_color(*MUTED)
        pdf.multi_cell(
            CONTENT_W - 10, 5,
            "Detailed image/symptom breakdown was not retained for this historical record - "
            "only the final result is available. Run a new check for a full breakdown.",
        )
        pdf.set_text_color(*INK)
        y = y + note_h + 6

    # ---- Footer -------------------------------------------------------
    footer_y = 270
    pdf.set_draw_color(*LIGHT_BORDER)
    pdf.set_line_width(0.3)
    pdf.line(MARGIN, footer_y, MARGIN + CONTENT_W, footer_y)
    pdf.set_xy(MARGIN, footer_y + 2)
    pdf.set_font("Helvetica", "I", 7.6)
    pdf.set_text_color(120, 120, 120)
    pdf.multi_cell(
        CONTENT_W, 4,
        "This report is generated by an automated detection tool and is intended to support, "
        "not replace, professional veterinary diagnosis.",
    )

    return bytes(pdf.output())
