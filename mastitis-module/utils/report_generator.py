"""
Professional Veterinary Assessment Report Generator for CattleSense Mastitis Module.
Generates comprehensive, multi-page, publication-grade PDF case handover reports
integrating:
- Cattle & Farmer metadata
- Farmer Q&A (Clinical observations)
- Numerical Biomarkers (Complete or Missing-Input-Aware Model 2)
- Milk Log integration
- Image Analysis & Grad-CAM Explainability (3-panel visual interpretation)
- Multimodal Hybrid Fusion Staging
- Severity Engine classification & Critical Alerts
- Conservative Farmer Immediate Actions (Merck Veterinary Manual guidance)
- Fillable Veterinary Handover Section
- AI Disclaimers & Peer-Reviewed References
"""
import os
import sys
import io
import uuid
from datetime import datetime
from pathlib import Path
import numpy as np
import cv2
from PIL import Image as PILImage

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    Image,
    HRFlowable,
    KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

# Add parent directory for imports
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from config.config import Config, get_config


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas for precise page count computation and standard headers/footers.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []
        self.report_id = getattr(self, "report_id", "RPT-MAST")

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#0f766e"))

        # Top Running Header (Pages > 1)
        if self._pageNumber > 1:
            self.drawString(36, 808, "CattleSense — ML-Based Early Detection of Cattle Diseases")
            self.setFont("Helvetica", 8)
            self.setFillColor(colors.HexColor("#64748b"))
            self.drawRightString(559, 808, "MASTITIS ASSESSMENT & VETERINARY REVIEW REPORT")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(36, 802, 559, 802)

        # Bottom Running Footer (All Pages)
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(36, 42, 559, 42)

        self.setFont("Helvetica", 7.5)
        self.setFillColor(colors.HexColor("#64748b"))
        self.drawString(
            36, 30,
            "CattleSense — AI-Assisted Veterinary Decision-Support | Confidential — For Farmer & Veterinary Use"
        )
        report_id_str = getattr(self, "report_id", "RPT-MAST")
        self.drawRightString(
            559, 30,
            f"Report ID: {report_id_str} | Page {self._pageNumber} of {page_count}"
        )
        self.restoreState()


class VeterinaryReportGenerator:
    """
    Generates structured, professional Veterinary Case Handover PDFs for Mastitis.
    """

    def __init__(self):
        self.config = get_config()
        self._init_styles()

    def _init_styles(self):
        """Initialize harmonious typography and color palettes."""
        self.styles = getSampleStyleSheet()

        # Palette definition
        self.c_primary = colors.HexColor("#0f766e")       # Teal 700
        self.c_secondary = colors.HexColor("#0369a1")     # Sky 700
        self.c_dark = colors.HexColor("#0f172a")          # Slate 900
        self.c_text = colors.HexColor("#334155")          # Slate 700
        self.c_muted = colors.HexColor("#64748b")         # Slate 500
        self.c_border = colors.HexColor("#e2e8f0")        # Slate 200
        self.c_bg_light = colors.HexColor("#f8fafc")      # Slate 50
        self.c_alert_bg = colors.HexColor("#fef2f2")      # Red 50
        self.c_alert_border = colors.HexColor("#dc2626")  # Red 600
        self.c_alert_text = colors.HexColor("#991b1b")    # Red 800
        self.c_success_bg = colors.HexColor("#f0fdf4")    # Green 50
        self.c_success_border = colors.HexColor("#16a34a")# Green 600
        self.c_warning_bg = colors.HexColor("#fffbeb")    # Amber 50
        self.c_warning_border = colors.HexColor("#d97706")# Amber 600

        # Custom paragraph styles
        self.styles.add(ParagraphStyle(
            name="ReportTitle",
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=19,
            textColor=self.c_dark,
        ))
        self.styles.add(ParagraphStyle(
            name="ReportSubtitle",
            fontName="Helvetica",
            fontSize=9.5,
            leading=12,
            textColor=self.c_primary,
        ))
        self.styles.add(ParagraphStyle(
            name="SectionHeading",
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            textColor=self.c_primary,
            spaceBefore=10,
            spaceAfter=4,
        ))
        self.styles.add(ParagraphStyle(
            name="SubSectionHeading",
            fontName="Helvetica-Bold",
            fontSize=9.5,
            leading=12,
            textColor=self.c_dark,
            spaceBefore=6,
            spaceAfter=3,
        ))
        self.styles.add(ParagraphStyle(
            name="BodyTextCustom",
            fontName="Helvetica",
            fontSize=8.5,
            leading=11.5,
            textColor=self.c_text,
        ))
        self.styles.add(ParagraphStyle(
            name="BodyTextBold",
            fontName="Helvetica-Bold",
            fontSize=8.5,
            leading=11.5,
            textColor=self.c_dark,
        ))
        self.styles.add(ParagraphStyle(
            name="MetaLabel",
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=self.c_muted,
        ))
        self.styles.add(ParagraphStyle(
            name="MetaValue",
            fontName="Helvetica",
            fontSize=8,
            leading=10,
            textColor=self.c_dark,
        ))
        self.styles.add(ParagraphStyle(
            name="TableHead",
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=colors.white,
        ))
        self.styles.add(ParagraphStyle(
            name="TableCell",
            fontName="Helvetica",
            fontSize=8,
            leading=10.5,
            textColor=self.c_text,
        ))
        self.styles.add(ParagraphStyle(
            name="TableCellBold",
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10.5,
            textColor=self.c_dark,
        ))
        self.styles.add(ParagraphStyle(
            name="CaptionText",
            fontName="Helvetica-Oblique",
            fontSize=7.5,
            leading=9.5,
            textColor=self.c_muted,
            alignment=1,  # Center
        ))
        self.styles.add(ParagraphStyle(
            name="AlertTitle",
            fontName="Helvetica-Bold",
            fontSize=10.5,
            leading=13,
            textColor=self.c_alert_text,
        ))
        self.styles.add(ParagraphStyle(
            name="AlertBody",
            fontName="Helvetica",
            fontSize=8.5,
            leading=11.5,
            textColor=self.c_alert_text,
        ))
        self.styles.add(ParagraphStyle(
            name="ResearchBox",
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=self.c_text,
        ))

    def generate_pdf(
        self,
        prediction_result,
        cattle_info=None,
        farmer_info=None,
        original_image_path=None,
        cropped_image_path=None,
        heatmap_image_path=None,
        overlay_image_path=None,
        report_id=None,
        output_path=None,
    ):
        """
        Generate the full PDF document and return bytes or save to output_path.
        """
        prediction_result = prediction_result or {}
        cattle_info = cattle_info or {}
        farmer_info = farmer_info or {}

        if not report_id:
            report_id = f"RPT-MAST-{uuid.uuid4().hex[:8].upper()}"

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer if output_path is None else output_path,
            pagesize=A4,
            leftMargin=36,
            rightMargin=36,
            topMargin=46,
            bottomMargin=50,
        )

        story = []

        # ── 1. COMPANY & REPORT HEADER ───────────────────────────────────────
        story.extend(self._build_header_section(report_id))
        story.append(Spacer(1, 8))

        # ── 2. CASE SUMMARY & CRITICAL VETERINARY ALERT ──────────────────────
        story.extend(self._build_summary_banner(prediction_result, cattle_info, farmer_info))
        story.append(Spacer(1, 8))

        # ── 3. CATTLE & FARMER DETAILS ───────────────────────────────────────
        story.extend(self._build_cattle_and_farmer_details(cattle_info, farmer_info))
        story.append(Spacer(1, 8))

        # ── 4. FARMER CLINICAL QUESTIONNAIRE (Q&A) ───────────────────────────
        story.extend(self._build_qna_section(prediction_result.get("clinical_observations")))
        story.append(Spacer(1, 8))

        # ── 5. NUMERICAL BIOMARKERS & MODEL 2 ANALYSIS ────────────────────────
        story.extend(self._build_numerical_analysis_section(prediction_result))
        story.append(Spacer(1, 8))

        # ── 6. MILK LOG INTEGRATION INFORMATION ──────────────────────────────
        story.extend(self._build_milk_log_section(prediction_result, cattle_info))
        story.append(Spacer(1, 8))

        # ── 7. EXPLAINABLE AI — GRAD-CAM IMAGE ANALYSIS (RESEARCH NOVELTY) ───
        story.extend(self._build_gradcam_section(
            prediction_result,
            original_image_path,
            cropped_image_path,
            heatmap_image_path,
            overlay_image_path
        ))
        story.append(Spacer(1, 8))

        # ── 8. MULTIMODAL HYBRID FUSION ASSESSMENT ────────────────────────────
        story.extend(self._build_hybrid_assessment_section(prediction_result))
        story.append(Spacer(1, 8))

        # ── 9. FARMER IMMEDIATE ACTION GUIDANCE (VETERINARY-SAFE) ────────────
        story.extend(self._build_farmer_guidance_section(prediction_result))
        story.append(Spacer(1, 8))

        # ── 10. VETERINARY REVIEW & CASE HANDOVER (FILLABLE) ─────────────────
        story.extend(self._build_veterinary_handover_section(prediction_result, cattle_info))
        story.append(Spacer(1, 8))

        # ── 11. AI DISCLAIMER & VETERINARY REFERENCES ────────────────────────
        story.extend(self._build_disclaimer_and_references())

        # Build document with NumberedCanvas
        class ConfiguredNumberedCanvas(NumberedCanvas):
            pass
        ConfiguredNumberedCanvas.report_id = report_id

        doc.build(story, canvasmaker=ConfiguredNumberedCanvas)

        if output_path is None:
            pdf_bytes = buffer.getvalue()
            buffer.close()
            return pdf_bytes
        return output_path

    # =========================================================================
    # SECTION BUILDERS
    # =========================================================================

    def _build_header_section(self, report_id):
        """Header with branding, report ID, and assessment timestamp."""
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        title_cell = [
            Paragraph("CattleSense", self.styles["ReportTitle"]),
            Paragraph("ML-Based Early Detection of Cattle Diseases", self.styles["ReportSubtitle"]),
            Paragraph("MASTITIS ASSESSMENT & VETERINARY REVIEW REPORT", self.styles["SubSectionHeading"]),
        ]

        meta_cell = [
            Paragraph(f"<b>Report ID:</b> {report_id}", self.styles["MetaLabel"]),
            Paragraph(f"<b>Generated:</b> {now_str}", self.styles["MetaValue"]),
            Paragraph("<b>Document Type:</b> Clinical Decision Support", self.styles["MetaValue"]),
            Paragraph("<b>Version:</b> 1.0 (Research Release)", self.styles["MetaValue"]),
        ]

        header_table = Table(
            [[title_cell, meta_cell]],
            colWidths=[330, 193],
        )
        header_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
            ("TOPPADDING", (0, 0), (-1, -1), 0),
            ("LEFTPADDING", (0, 0), (-1, -1), 0),
            ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ]))

        return [
            header_table,
            Spacer(1, 4),
            HRFlowable(width="100%", thickness=1.5, color=self.c_primary, spaceBefore=2, spaceAfter=4),
        ]

    def _build_summary_banner(self, result, cattle_info, farmer_info):
        """Top case summary card with prominent critical alert if indicated."""
        elements = []

        cow_name = cattle_info.get("name") or cattle_info.get("tag_id") or "Not recorded"
        farmer_name = farmer_info.get("name") or "Registered Farmer"
        prediction = result.get("prediction", "Unknown")
        confidence = result.get("confidence")
        conf_str = f"{confidence * 100:.1f}%" if isinstance(confidence, (int, float)) else "N/A"
        stage = result.get("stage") or ("Mastitis Detected" if prediction == "Mastitis" else "No Mastitis")
        
        severity_obj = result.get("severity") or {}
        severity_level = (severity_obj.get("severity_level") or "negative").lower()

        # Priority determination
        is_healthy = (
            prediction == "Normal"
            or severity_level in ["negative", "0"]
            or "no mastitis" in str(stage).lower()
            or "healthy" in str(stage).lower()
        )
        is_critical = (
            not is_healthy
            and (severity_level in ["severe", "critical", "3"] or "severe" in str(stage).lower() or "critical" in str(stage).lower())
        )

        if is_critical:
            priority_str = "CRITICAL VETERINARY ATTENTION REQUIRED"
            priority_color = self.c_alert_text
        elif is_healthy:
            priority_str = "Routine Observation / Monitoring"
            priority_color = self.c_primary
        elif severity_level in ["moderate", "2"] or "moderate" in str(stage).lower():
            priority_str = "Veterinary Consultation Recommended"
            priority_color = self.c_secondary
        else:
            priority_str = "Observation & Increased Udder Care"
            priority_color = self.c_secondary

        summary_data = [
            [
                Paragraph("<b>Subject Cow:</b>", self.styles["TableCellBold"]),
                Paragraph(str(cow_name), self.styles["TableCell"]),
                Paragraph("<b>Farmer / Farm:</b>", self.styles["TableCellBold"]),
                Paragraph(str(farmer_name), self.styles["TableCell"]),
            ],
            [
                Paragraph("<b>AI Prediction:</b>", self.styles["TableCellBold"]),
                Paragraph(f"<b>{prediction}</b> ({conf_str})", self.styles["TableCell"]),
                Paragraph("<b>Severity Staging:</b>", self.styles["TableCellBold"]),
                Paragraph(str(stage), self.styles["TableCell"]),
            ],
            [
                Paragraph("<b>Priority:</b>", self.styles["TableCellBold"]),
                Paragraph(f"<font color='{priority_color.hexval()}'><b>{priority_str}</b></font>", self.styles["TableCellBold"]),
                Paragraph("<b>Assessment Mode:</b>", self.styles["TableCellBold"]),
                Paragraph(str(result.get("mode", "Assisted")), self.styles["TableCell"]),
            ],
        ]

        summary_table = Table(summary_data, colWidths=[95, 165, 95, 168])
        summary_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), self.c_bg_light),
            ("BOX", (0, 0), (-1, -1), 1, self.c_border),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, self.c_border),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(summary_table)

        # Critical alert box
        if is_critical:
            elements.append(Spacer(1, 4))
            alert_reasons = []
            obs = result.get("clinical_observations") or {}
            if str(obs.get("udder_swelling", "")).lower() in ["yes", "severe"]:
                alert_reasons.append("Reported udder swelling")
            if str(obs.get("udder_warmth", "")).lower() in ["yes", "severe"]:
                alert_reasons.append("Elevated udder warmth")
            if str(obs.get("udder_pain", "")).lower() in ["yes", "severe"]:
                alert_reasons.append("Visible udder pain / kicking during milking")
            if str(obs.get("milk_appearance", "")).lower() in ["clots", "watery", "blood"]:
                alert_reasons.append("Abnormal milk appearance (clots/discoloration)")

            reason_str = f" Clinical flags: {', '.join(alert_reasons)}." if alert_reasons else ""

            alert_content = [
                Paragraph("⚠️ CRITICAL VETERINARY ATTENTION REQUIRED", self.styles["AlertTitle"]),
                Paragraph(
                    "The CattleSense assessment identified findings associated with a potentially serious mastitis case. "
                    f"Prompt veterinary examination is recommended.{reason_str}",
                    self.styles["AlertBody"],
                ),
            ]
            alert_table = Table([[alert_content]], colWidths=[523])
            alert_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), self.c_alert_bg),
                ("BOX", (0, 0), (-1, -1), 1.5, self.c_alert_border),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ]))
            elements.append(alert_table)

        return elements

    def _build_cattle_and_farmer_details(self, cattle_info, farmer_info):
        """Structured breakdown of registered animal and farmer properties."""
        elements = [
            Paragraph("1. CATTLE & FARMER IDENTIFICATION", self.styles["SectionHeading"]),
        ]

        def fmt(val):
            return str(val) if val not in (None, "", "null") else "Not recorded"

        cattle_data = [
            [
                Paragraph("<b>Tag / Ear ID:</b>", self.styles["TableCellBold"]),
                Paragraph(fmt(cattle_info.get("tag_id")), self.styles["TableCell"]),
                Paragraph("<b>Cow Name:</b>", self.styles["TableCellBold"]),
                Paragraph(fmt(cattle_info.get("name")), self.styles["TableCell"]),
            ],
            [
                Paragraph("<b>Breed:</b>", self.styles["TableCellBold"]),
                Paragraph(fmt(cattle_info.get("breed")), self.styles["TableCell"]),
                Paragraph("<b>Age:</b>", self.styles["TableCellBold"]),
                Paragraph(f"{cattle_info.get('age')} years" if cattle_info.get("age") is not None else "Not recorded", self.styles["TableCell"]),
            ],
            [
                Paragraph("<b>Gender:</b>", self.styles["TableCellBold"]),
                Paragraph(fmt(cattle_info.get("gender", "Female")), self.styles["TableCell"]),
                Paragraph("<b>Lactation No:</b>", self.styles["TableCellBold"]),
                Paragraph(fmt(cattle_info.get("current_lactation") or cattle_info.get("lactation_count")), self.styles["TableCell"]),
            ],
            [
                Paragraph("<b>Farmer Name:</b>", self.styles["TableCellBold"]),
                Paragraph(fmt(farmer_info.get("name")), self.styles["TableCell"]),
                Paragraph("<b>Farm Name:</b>", self.styles["TableCellBold"]),
                Paragraph(fmt(farmer_info.get("farm_name")), self.styles["TableCell"]),
            ],
            [
                Paragraph("<b>Location / District:</b>", self.styles["TableCellBold"]),
                Paragraph(fmt(farmer_info.get("district") or farmer_info.get("province")), self.styles["TableCell"]),
                Paragraph("<b>Contact Phone:</b>", self.styles["TableCellBold"]),
                Paragraph(fmt(farmer_info.get("phone")), self.styles["TableCell"]),
            ],
        ]

        table = Table(cattle_data, colWidths=[100, 160, 100, 163])
        table.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.5, self.c_border),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, self.c_border),
            ("BACKGROUND", (0, 0), (0, -1), self.c_bg_light),
            ("BACKGROUND", (2, 0), (2, -1), self.c_bg_light),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(table)
        return elements

    def _build_qna_section(self, clinical_obs):
        """Farmer clinical questionnaire responses."""
        elements = [
            Paragraph("2. FARMER-REPORTED CLINICAL OBSERVATIONS (Q&A)", self.styles["SectionHeading"]),
            Paragraph(
                "<i>Qualitative clinical observations reported by the farmer during assessment triage. "
                "These inform clinical severity staging and are not inserted into Model 2 numerical inputs.</i>",
                self.styles["BodyTextCustom"],
            ),
            Spacer(1, 3),
        ]

        obs = clinical_obs or {}

        def get_ans(k):
            val = obs.get(k)
            return str(val) if val not in (None, "", "null") else "Not reported"

        qna_data = [
            [
                Paragraph("<b>Observation Question</b>", self.styles["TableHead"]),
                Paragraph("<b>Farmer Response</b>", self.styles["TableHead"]),
                Paragraph("<b>Clinical Signification</b>", self.styles["TableHead"]),
            ],
            [
                Paragraph("Milk Production Change", self.styles["TableCellBold"]),
                Paragraph(get_ans("milk_yield_change"), self.styles["TableCell"]),
                Paragraph("Drop in daily yield often accompanies acute inflammation", self.styles["TableCell"]),
            ],
            [
                Paragraph("Milk Appearance / Texture", self.styles["TableCellBold"]),
                Paragraph(get_ans("milk_appearance"), self.styles["TableCell"]),
                Paragraph("Clots, flakes, or watery milk indicate secretory disruption", self.styles["TableCell"]),
            ],
            [
                Paragraph("Milk Clotting / Flakes", self.styles["TableCellBold"]),
                Paragraph(get_ans("milk_clotting"), self.styles["TableCell"]),
                Paragraph("Visible clots or flakes resulting from casein and protein aggregation", self.styles["TableCell"]),
            ],
            [
                Paragraph("Udder Swelling", self.styles["TableCellBold"]),
                Paragraph(get_ans("udder_swelling"), self.styles["TableCell"]),
                Paragraph("Local quarter edema from bacterial invasion / leukocyte influx", self.styles["TableCell"]),
            ],
            [
                Paragraph("Udder Warmth / Heat", self.styles["TableCellBold"]),
                Paragraph(get_ans("udder_warmth"), self.styles["TableCell"]),
                Paragraph("Increased local vascular perfusion due to inflammatory response", self.styles["TableCell"]),
            ],
            [
                Paragraph("Udder Pain / Tenderness", self.styles["TableCellBold"]),
                Paragraph(get_ans("udder_pain"), self.styles["TableCell"]),
                Paragraph("Discomfort during milking or palpation", self.styles["TableCell"]),
            ],
            [
                Paragraph("Systemic Temperature / Fever", self.styles["TableCellBold"]),
                Paragraph(get_ans("body_temperature"), self.styles["TableCell"]),
                Paragraph("Elevated rectal temperature (>39.2°C) indicates systemic involvement", self.styles["TableCell"]),
            ],
            [
                Paragraph("Appetite / General Condition", self.styles["TableCellBold"]),
                Paragraph(get_ans("appetite"), self.styles["TableCell"]),
                Paragraph("Anorexia / lethargy signals acute toxic or systemic mastitis", self.styles["TableCell"]),
            ],
        ]

        table = Table(qna_data, colWidths=[150, 110, 263])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), self.c_primary),
            ("BOX", (0, 0), (-1, -1), 0.5, self.c_border),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, self.c_border),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, self.c_bg_light]),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(table)
        return elements

    def _build_numerical_analysis_section(self, result):
        """Table of 6 numerical biomarker features with availability and Model 2 routing."""
        elements = [
            Paragraph("3. NUMERICAL BIOMARKERS & MODEL 2 ANALYSIS", self.styles["SectionHeading"]),
        ]

        measurements = result.get("numerical_measurements") or {}
        model_type = result.get("numerical_model_type", "unavailable")
        missing_features = result.get("missing_numerical_features") or []
        num_pred = result.get("numerical_prediction") or {}

        # Status description banner
        if num_pred and result.get("model_2_used", False):
            status_text = (
                "<b>Model 2 Active:</b> Decision Tree Classifier (5 required milk parameters evaluated). "
                f"Model Prediction: <b>{num_pred.get('prediction', 'N/A')}</b> (Conf: {num_pred.get('confidence', 0)*100:.1f}%)."
            )
        else:
            status_text = (
                "<b>Model 2 Status:</b> Not evaluated (Image Analysis mode was utilized)."
            )

        elements.append(Paragraph(status_text, self.styles["BodyTextCustom"]))
        elements.append(Spacer(1, 4))

        # 5 Features Table
        feature_specs = [
            ("Milk_Temperature", "Milk Temperature", "°C", "35.0 – 37.0 °C (Normal fresh milk)"),
            ("Milk_pH", "Milk pH", "", "6.5 – 6.8 (Normal fresh milk)"),
            ("Milk_Conductivity", "Milk Conductivity", "mS/cm", "4.0 – 5.5 mS/cm (Normal)"),
            ("Milk_Yield", "Milk Yield", "L/day", "Daily milk yield in liters"),
            ("Clotting", "Milk Clotting", "", "0 (No clotting) / 1 (Clots or flakes)"),
        ]

        table_rows = [
            [
                Paragraph("<b>Clinical Feature</b>", self.styles["TableHead"]),
                Paragraph("<b>Submitted Value</b>", self.styles["TableHead"]),
                Paragraph("<b>Availability</b>", self.styles["TableHead"]),
                Paragraph("<b>Reference Info</b>", self.styles["TableHead"]),
            ]
        ]

        for key, name, unit, ref in feature_specs:
            val = (
                measurements.get(key)
                if measurements.get(key) is not None
                else (
                    measurements.get(key.lower())
                    if measurements.get(key.lower()) is not None
                    else measurements.get(key.replace(" ", "_").lower())
                )
            )
            if val is not None and val != "":
                if key == "Clotting":
                    val_str = "1 (Clots / Flakes Present)" if str(val) in ("1", "1.0", "True", "true") else "0 (No Clotting)"
                elif key == "Previous_Mastits_status":
                    val_str = "1 (Prior Mastitis)" if str(val) in ("1", "1.0", "True", "true") else "0 (No Prior Mastitis)"
                else:
                    val_str = f"{val} {unit}".strip()
                avail_str = "<font color='#16a34a'><b>Provided</b></font>"
            else:
                val_str = "Not provided"
                avail_str = "<font color='#dc2626'><b>Missing</b></font>"

            table_rows.append([
                Paragraph(name, self.styles["TableCellBold"]),
                Paragraph(val_str, self.styles["TableCell"]),
                Paragraph(avail_str, self.styles["TableCell"]),
                Paragraph(ref, self.styles["TableCell"]),
            ])

        table = Table(table_rows, colWidths=[150, 110, 100, 163])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), self.c_secondary),
            ("BOX", (0, 0), (-1, -1), 0.5, self.c_border),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, self.c_border),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, self.c_bg_light]),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(table)
        return elements

    def _build_milk_log_section(self, result, cattle_info):
        """Information about automatic milk log retrieval."""
        measurements = result.get("numerical_measurements") or {}
        yield_val = measurements.get("milk_yield")

        if yield_val is not None:
            source_desc = "Auto-fetched from latest recorded Milk Log (or confirmed/edited by farmer during assessment)."
        else:
            source_desc = "No Milk Log available or not provided."

        text = f"<b>Milk Yield Record:</b> {yield_val if yield_val is not None else 'Not recorded'} L | <b>Source:</b> {source_desc}"
        return [
            Paragraph(text, self.styles["BodyTextCustom"]),
        ]

    def _build_gradcam_section(
        self,
        result,
        original_img_path,
        cropped_img_path,
        heatmap_img_path,
        overlay_img_path,
    ):
        """Dedicated Explainable AI Grad-CAM section with visual panel and caption."""
        elements = [
            Paragraph("4. EXPLAINABLE AI — GRAD-CAM VISUAL INTERPRETATION", self.styles["SectionHeading"]),
        ]

        # Research novelty explanation box
        novelty_box = [
            Paragraph("<b>Research Novelty — Farmer-Guided ROI & Explainable Image-Based Screening</b>", self.styles["SubSectionHeading"]),
            Paragraph(
                "CattleSense incorporates farmer-guided udder region selection (ROI) combined with Grad-CAM (Gradient-weighted "
                "Class Activation Mapping) into the image-based mastitis screening workflow. Instead of presenting only a black-box "
                "prediction, the system focuses Model 1 analysis on the farmer-delineated udder and teats to minimize background noise, "
                "and produces a visual attention heatmap highlighting the regions that contributed most strongly to the MobileNetV2 "
                "classification. This provides transparent visual evidence for veterinary review alongside clinical and biomarker metrics.",
                self.styles["ResearchBox"],
            ),
        ]
        novelty_table = Table([[novelty_box]], colWidths=[523])
        novelty_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0fdfa")), # Teal 50
            ("BOX", (0, 0), (-1, -1), 1, self.c_primary),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ]))
        elements.append(novelty_table)
        elements.append(Spacer(1, 6))

        # Check which images exist
        has_crop = cropped_img_path and Path(cropped_img_path).exists()
        has_orig = original_img_path and Path(original_img_path).exists()
        has_heat = heatmap_img_path and Path(heatmap_img_path).exists()
        has_over = overlay_img_path and Path(overlay_img_path).exists()

        if has_crop and has_orig:
            # 4-Panel Grid (Original, ROI Crop, Heatmap, Overlay)
            panel_w, panel_h = 125, 95
            p_orig = Image(str(original_img_path), width=panel_w, height=panel_h)
            p_crop = Image(str(cropped_img_path), width=panel_w, height=panel_h)
            p_heat = Image(str(heatmap_img_path), width=panel_w, height=panel_h) if has_heat else Paragraph("<i>Heatmap<br/>N/A</i>", self.styles["CaptionText"])
            p_over = Image(str(overlay_img_path), width=panel_w, height=panel_h) if has_over else Paragraph("<i>Overlay<br/>N/A</i>", self.styles["CaptionText"])

            row_images = [p_orig, p_crop, p_heat, p_over]
            row_labels = [
                Paragraph("<b>Panel A: Original Farmer Photo</b>", self.styles["CaptionText"]),
                Paragraph("<b>Panel B: Selected Udder ROI</b>", self.styles["CaptionText"]),
                Paragraph("<b>Panel C: Grad-CAM Heatmap</b>", self.styles["CaptionText"]),
                Paragraph("<b>Panel D: Heatmap / ROI Overlay</b>", self.styles["CaptionText"]),
            ]

            img_table = Table([row_images, row_labels], colWidths=[130, 130, 130, 133])
            img_table.setStyle(TableStyle([
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ("LEFTPADDING", (0, 0), (-1, -1), 1),
                ("RIGHTPADDING", (0, 0), (-1, -1), 1),
            ]))
            elements.append(img_table)
            elements.append(Spacer(1, 3))
            elements.append(Paragraph(
                "<b>Figure:</b> Multimodal visual evidence. Panel A shows the full farmer photograph; "
                "Panel B shows the farmer-delineated udder ROI; Panels C & D display the Grad-CAM activation heatmap "
                "and overlay produced by the MobileNetV2 classifier on the cropped region.",
                self.styles["CaptionText"],
            ))
        elif has_orig or has_heat or has_over:
            # 3-Panel Fallback (Original, Heatmap, Overlay)
            panel_w, panel_h = 165, 115
            p_orig = Image(str(original_img_path), width=panel_w, height=panel_h) if has_orig else Paragraph("<i>Original Image<br/>N/A</i>", self.styles["CaptionText"])
            p_heat = Image(str(heatmap_img_path), width=panel_w, height=panel_h) if has_heat else Paragraph("<i>Heatmap<br/>N/A</i>", self.styles["CaptionText"])
            p_over = Image(str(overlay_img_path), width=panel_w, height=panel_h) if has_over else Paragraph("<i>Overlay<br/>N/A</i>", self.styles["CaptionText"])

            row_images = [p_orig, p_heat, p_over]
            row_labels = [
                Paragraph("<b>Panel A: Submitted Image</b>", self.styles["CaptionText"]),
                Paragraph("<b>Panel B: Grad-CAM Heatmap</b>", self.styles["CaptionText"]),
                Paragraph("<b>Panel C: Heatmap Overlay</b>", self.styles["CaptionText"]),
            ]

            img_table = Table([row_images, row_labels], colWidths=[174, 174, 175])
            img_table.setStyle(TableStyle([
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ("LEFTPADDING", (0, 0), (-1, -1), 1),
                ("RIGHTPADDING", (0, 0), (-1, -1), 1),
            ]))
            elements.append(img_table)
            elements.append(Spacer(1, 3))
            elements.append(Paragraph(
                "<b>Figure:</b> Grad-CAM visualization of image-model attention associated with the prediction.",
                self.styles["CaptionText"],
            ))
        else:
            elements.append(Paragraph(
                "<i>Grad-CAM visual artifacts unavailable or not saved for this assessment session.</i>",
                self.styles["BodyTextCustom"],
            ))

        elements.append(Spacer(1, 4))

        # Technical Parameters & ROI Processing Note
        img_pred = result.get("image_prediction") or {}
        img_conf = img_pred.get("confidence")
        conf_str = f"{img_conf * 100:.1f}%" if isinstance(img_conf, (int, float)) else "N/A"
        roi_applied = result.get("roi_applied", False) or has_crop

        tech_data = [
            [
                Paragraph("<b>Model Architecture:</b>", self.styles["TableCellBold"]),
                Paragraph("MobileNetV2 (Stage 1, frozen backbone)", self.styles["TableCell"]),
                Paragraph("<b>Target Conv Layer:</b>", self.styles["TableCellBold"]),
                Paragraph("<code>block_13_expand_relu</code> (14×14×576)", self.styles["TableCell"]),
            ],
            [
                Paragraph("<b>Predicted Class:</b>", self.styles["TableCellBold"]),
                Paragraph(str(img_pred.get("prediction", "N/A")), self.styles["TableCell"]),
                Paragraph("<b>Model 1 Confidence:</b>", self.styles["TableCellBold"]),
                Paragraph(conf_str, self.styles["TableCell"]),
            ],
            [
                Paragraph("<b>ROI Processing:</b>", self.styles["TableCellBold"]),
                Paragraph("Farmer-Selected Udder ROI (Cropped & Padded)" if roi_applied else "Full Photograph (No ROI applied)", self.styles["TableCell"]),
                Paragraph("<b>Model Input Dimensions:</b>", self.styles["TableCellBold"]),
                Paragraph("224 × 224 × 3 RGB (Letterbox [-1, 1])", self.styles["TableCell"]),
            ],
        ]
        tech_table = Table(tech_data, colWidths=[110, 150, 110, 153])
        tech_table.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.5, self.c_border),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, self.c_border),
            ("BACKGROUND", (0, 0), (0, -1), self.c_bg_light),
            ("BACKGROUND", (2, 0), (2, -1), self.c_bg_light),
            ("TOPPADDING", (0, 0), (-1, -1), 2.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(tech_table)
        elements.append(Spacer(1, 3))

        # Technical methodology text
        if roi_applied:
            roi_method_text = (
                "<b>Technical Note:</b> The submitted image was processed using a farmer-selected region of interest (ROI) "
                "focusing on the visible udder area. Model 1 and Grad-CAM analysis were performed using the selected ROI to minimize background interference."
            )
        else:
            roi_method_text = (
                "<b>Technical Note:</b> No manual ROI was supplied; the original uploaded image was used directly for image analysis."
            )

        elements.append(Paragraph(roi_method_text, self.styles["BodyTextCustom"]))
        elements.append(Spacer(1, 2))

        elements.append(Paragraph(
            "<b>Interpretability Notice:</b> The visualization indicates that the image model placed greater predictive "
            "emphasis on the highlighted image regions. These regions should be reviewed alongside visible udder/nipple appearance "
            "and clinical signs. Grad-CAM provides model-attention visualization and does not perform anatomical segmentation or lesion localization.",
            self.styles["BodyTextCustom"],
        ))

        return elements

    def _build_hybrid_assessment_section(self, result):
        """Multimodal fusion summary and clinical severity classification."""
        elements = [
            Paragraph("5. MULTIMODAL HYBRID ASSESSMENT & SEVERITY STAGING", self.styles["SectionHeading"]),
        ]

        img_pred = result.get("image_prediction") or {}
        num_pred = result.get("numerical_prediction") or {}
        severity = result.get("severity") or {}

        fusion_data = [
            [
                Paragraph("<b>Analysis Component</b>", self.styles["TableHead"]),
                Paragraph("<b>Model / Methodology</b>", self.styles["TableHead"]),
                Paragraph("<b>Component Output</b>", self.styles["TableHead"]),
                Paragraph("<b>Contribution to Final Output</b>", self.styles["TableHead"]),
            ],
            [
                Paragraph("Image Modality", self.styles["TableCellBold"]),
                Paragraph("MobileNetV2 (Model 1)", self.styles["TableCell"]),
                Paragraph(f"{img_pred.get('prediction', 'N/A')} ({img_pred.get('confidence', 0)*100:.1f}%)" if img_pred.get('confidence') else "Ready", self.styles["TableCell"]),
                Paragraph("50% (Soft-Voting Probability Fusion)", self.styles["TableCell"]),
            ],
            [
                Paragraph("Numerical Modality", self.styles["TableCellBold"]),
                Paragraph(num_pred.get("model", "MLP Model 2"), self.styles["TableCell"]),
                Paragraph(f"{num_pred.get('prediction', 'N/A')}" if num_pred.get("status") == "ready" else "Unavailable (Image-Only Mode)", self.styles["TableCell"]),
                Paragraph("50% when present, 0% when omitted", self.styles["TableCell"]),
            ],
            [
                Paragraph("Clinical Observations", self.styles["TableCellBold"]),
                Paragraph("7-Parameter Farmer Questionnaire", self.styles["TableCell"]),
                Paragraph(f"Severity: {severity.get('severity_label', 'Evaluated')}", self.styles["TableCell"]),
                Paragraph("Guides Clinical Severity & Immediate Protocol", self.styles["TableCell"]),
            ],
            [
                Paragraph("<b>Final Combined Assessment</b>", self.styles["TableCellBold"]),
                Paragraph(f"<b>{result.get('prediction', 'Normal')}</b>", self.styles["TableCellBold"]),
                Paragraph(f"<b>Confidence: {result.get('confidence', 0)*100:.1f}%</b>", self.styles["TableCellBold"]),
                Paragraph(f"<b>Mode: {result.get('mode', 'Assisted')}</b>", self.styles["TableCellBold"]),
            ],
        ]

        table = Table(fusion_data, colWidths=[120, 150, 120, 133])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), self.c_dark),
            ("BOX", (0, 0), (-1, -1), 0.5, self.c_border),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, self.c_border),
            ("BACKGROUND", (0, -1), (-1, -1), self.c_bg_light),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(table)
        return elements

    def _build_farmer_guidance_section(self, result):
        """Conservative, veterinary-safe guidance for the farmer based on authoritative sources."""
        elements = [
            Paragraph("6. WHAT THE FARMER SHOULD DO NOW (IMMEDIATE GUIDANCE)", self.styles["SectionHeading"]),
        ]

        is_mastitis = result.get("prediction") == "Mastitis"

        if is_mastitis:
            steps = [
                "<b>1. Prompt Veterinary Consultation:</b> Contact a qualified veterinary practitioner promptly, especially when systemic symptoms (fever, weakness, loss of appetite) or severe udder swelling are observed.",
                "<b>2. Strict Teat & Milking Hygiene:</b> Ensure meticulous pre- and post-milking teat dipping using approved disinfectant solutions. Always milk suspected cows last to prevent cross-contamination.",
                "<b>3. Milk Isolation:</b> Isolate and discard milk from affected quarters in accordance with farm hygiene and milk marketing regulations.",
                "<b>4. Clean & Dry Housing:</b> Provide clean, dry bedding (sand, sawdust, or clean straw) to minimize environmental bacterial exposure (e.g. <i>E. coli</i>, <i>Streptococcus uberis</i>).",
                "<b>5. Continual Animal Monitoring:</b> Continuously observe the cow's appetite, water intake, rectal temperature, and quarter firmness.",
                "<b>6. Present This Report:</b> Hand this structured case document to the attending veterinarian upon their arrival.",
            ]
        else:
            steps = [
                "<b>1. Continue Routine Health Monitoring:</b> Maintain standard daily observation of milk yield, udder symmetry, and milk appearance.",
                "<b>2. Consistent Teat Disinfection:</b> Apply post-milking teat dip consistently across all quarters to protect the teat canal post-milking.",
                "<b>3. Environmental Sanitation:</b> Ensure clean, dry, well-ventilated housing and bedding to prevent environmental pathogen buildup.",
                "<b>4. Prompt Re-Testing:</b> Re-evaluate immediately if milk flakes, sudden production drops, or udder heat/swelling are detected.",
            ]

        guidance_text = "<br/>".join(steps)
        guidance_box = [
            Paragraph(guidance_text, self.styles["BodyTextCustom"]),
            Spacer(1, 3),
            Paragraph(
                "<b>IMPORTANT SAFETY DIRECTIVE:</b> Do not administer veterinary antibiotics or prescription drugs "
                "based solely on this automated AI screening. All medical and antimicrobial treatment decisions must be made "
                "by a licensed veterinarian following clinical examination and, where appropriate, diagnostic testing (e.g. Milk Culture / CMT).",
                self.styles["AlertBody"],
            ),
        ]

        table = Table([[guidance_box]], colWidths=[523])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), self.c_bg_light),
            ("BOX", (0, 0), (-1, -1), 1, self.c_border),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 7),
            ("RIGHTPADDING", (0, 0), (-1, -1), 7),
        ]))
        elements.append(table)
        return elements

    def _build_veterinary_handover_section(self, result, cattle_info):
        """Dedicated handover section with case summary and fillable fields for veterinarian."""
        elements = [
            Paragraph("7. VETERINARY REVIEW & CLINICAL HANDOVER", self.styles["SectionHeading"]),
            Paragraph(
                "<i>This section summarizes the AI decision-support findings for veterinary review and provides a structured "
                "clinical handover record. The attending veterinarian independently evaluates the animal and completes the fields below.</i>",
                self.styles["BodyTextCustom"],
            ),
            Spacer(1, 4),
        ]

        # Fillable lines for veterinarian
        form_data = [
            [
                Paragraph("<b>Attending Veterinarian:</b>", self.styles["TableCellBold"]),
                Paragraph("____________________________________________________________", self.styles["TableCell"]),
            ],
            [
                Paragraph("<b>License / Registration No:</b>", self.styles["TableCellBold"]),
                Paragraph("____________________________________________________________", self.styles["TableCell"]),
            ],
            [
                Paragraph("<b>Physical Examination Findings:</b>", self.styles["TableCellBold"]),
                Paragraph("____________________________________________________________", self.styles["TableCell"]),
            ],
            [
                Paragraph("<b>Diagnostic Tests Ordered (CMT / Culture):</b>", self.styles["TableCellBold"]),
                Paragraph("____________________________________________________________", self.styles["TableCell"]),
            ],
            [
                Paragraph("<b>Definitive Diagnosis:</b>", self.styles["TableCellBold"]),
                Paragraph("____________________________________________________________", self.styles["TableCell"]),
            ],
            [
                Paragraph("<b>Prescribed Treatment / Management Plan:</b>", self.styles["TableCellBold"]),
                Paragraph("____________________________________________________________", self.styles["TableCell"]),
            ],
            [
                Paragraph("<b>Date & Signature:</b>", self.styles["TableCellBold"]),
                Paragraph("Date: ________________________   Signature: ___________________________", self.styles["TableCell"]),
            ],
        ]

        table = Table(form_data, colWidths=[170, 353])
        table.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.5, self.c_border),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, self.c_border),
            ("BACKGROUND", (0, 0), (0, -1), self.c_bg_light),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(table)
        return elements

    def _build_disclaimer_and_references(self):
        """AI Notice, Explainability Limitations, and Peer-Reviewed Veterinary References."""
        elements = [
            Paragraph("8. AI ASSESSMENT NOTICE & VETERINARY REFERENCES", self.styles["SectionHeading"]),
            Paragraph(
                "<b>IMPORTANT AI ASSESSMENT NOTICE:</b> CattleSense provides an AI-assisted screening and decision-support assessment. "
                "The prediction is generated from image features, numerical biomarkers, and farmer-reported triage inputs. It does NOT "
                "replace physical examination, palpation, somatic cell verification, laboratory culture, or licensed veterinary diagnosis. "
                "Grad-CAM visual heatmaps represent model predictive attention and must not be interpreted as anatomical lesion proof.",
                self.styles["BodyTextCustom"],
            ),
            Spacer(1, 4),
            Paragraph("<b>Authoritative Veterinary References:</b>", self.styles["SubSectionHeading"]),
            Paragraph(
                "1. <b>Merck Veterinary Manual:</b> <i>Mastitis in Cattle</i>. Ken Leslie, DVM, MSc; Christopher S. Peters, DVM. "
                "Available at: <font color='#0369a1'><u>https://www.merckvetmanual.com/reproductive-system/mastitis-in-large-animals/mastitis-in-cattle</u></font><br/>"
                "2. <b>Merck Veterinary Manual:</b> <i>Overview of Mastitis in Large Animals</i>. "
                "Available at: <font color='#0369a1'><u>https://www.merckvetmanual.com/reproductive-system/mastitis-in-large-animals/overview-of-mastitis-in-large-animals</u></font><br/>"
                "3. <b>National Mastitis Council (NMC):</b> <i>Current Concepts of Bovine Mastitis</i> (5th Edition). Laboratory Handbook on Bovine Mastitis.",
                self.styles["BodyTextCustom"],
            ),
        ]
        return elements
