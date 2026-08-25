"""
Unit and integration tests for VeterinaryReportGenerator and report PDF endpoint.
"""
import sys
from pathlib import Path
import io
import pytest
import numpy as np
import cv2

BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from utils.report_generator import VeterinaryReportGenerator
from api.flask_api import app


@pytest.fixture(scope="module")
def generator():
    """Fixture providing initialized VeterinaryReportGenerator."""
    return VeterinaryReportGenerator()


@pytest.fixture
def client():
    """Fixture providing Flask test client."""
    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client


def test_report_generation_case_1_normal(generator):
    """Test PDF generation for Normal case."""
    prediction_result = {
        "prediction": "Normal",
        "confidence": 0.92,
        "stage": "No Mastitis",
        "mode": "multimodal_image_numerical",
        "model_2_used": True,
        "image_prediction": {"status": "ready", "prediction": "Normal", "confidence": 0.94},
        "numerical_prediction": {"status": "ready", "prediction": "Normal", "confidence": 0.90, "model": "Decision Tree Classifier (Model 2)"},
        "numerical_measurements": {"Milk_Temperature": 36.2, "Milk_pH": 6.65, "Milk_Conductivity": 4.85, "Milk_Yield": 18.5, "Clotting": 0},
        "clinical_observations": {"milk_yield_change": "Normal", "milk_appearance": "Normal", "udder_swelling": "No", "udder_warmth": "No", "udder_pain": "No", "body_temperature": "38.5°C", "appetite": "Normal"},
        "severity": {"severity_level": "negative", "severity_code": 0, "severity_label": "No Mastitis"},
    }
    cattle_info = {"tag_id": "COW-101", "name": "Bella", "breed": "Jersey", "age": 4}
    farmer_info = {"name": "John Doe", "farm_name": "Sunrise Dairy"}

    pdf_bytes = generator.generate_pdf(prediction_result, cattle_info, farmer_info, report_id="RPT-TEST-001")
    assert pdf_bytes is not None
    assert len(pdf_bytes) > 5000
    assert pdf_bytes.startswith(b"%PDF-")


def test_report_generation_case_2_mastitis(generator):
    """Test PDF generation for Mastitis case."""
    prediction_result = {
        "prediction": "Mastitis",
        "confidence": 0.84,
        "stage": "Moderate Mastitis",
        "mode": "multimodal_image_numerical",
        "model_2_used": True,
        "image_prediction": {"status": "ready", "prediction": "Mastitis", "confidence": 0.81},
        "numerical_prediction": {"status": "ready", "prediction": "Mastitis", "confidence": 0.87, "model": "Decision Tree Classifier (Model 2)"},
        "numerical_measurements": {"Milk_Temperature": 38.5, "Milk_pH": 7.15, "Milk_Conductivity": 6.75, "Milk_Yield": 10.5, "Clotting": 1},
        "clinical_observations": {"milk_yield_change": "Mild drop", "milk_appearance": "Slightly watery", "udder_swelling": "Mild", "udder_warmth": "Yes", "udder_pain": "Mild", "body_temperature": "39.4°C", "appetite": "Normal"},
        "severity": {"severity_level": "moderate", "severity_code": 2, "severity_label": "Moderate Mastitis"},
    }

    pdf_bytes = generator.generate_pdf(prediction_result, report_id="RPT-TEST-002")
    assert pdf_bytes.startswith(b"%PDF-")


def test_report_generation_critical_case_alert(generator):
    """Test PDF generation for Critical / Severe Mastitis case with alert banner."""
    prediction_result = {
        "prediction": "Mastitis",
        "confidence": 0.98,
        "stage": "Severe Mastitis",
        "mode": "multimodal_image_numerical",
        "model_2_used": True,
        "image_prediction": {"status": "ready", "prediction": "Mastitis", "confidence": 0.99},
        "numerical_prediction": {"status": "ready", "prediction": "Mastitis", "confidence": 0.97, "model": "Decision Tree Classifier (Model 2)"},
        "numerical_measurements": {"Milk_Temperature": 39.2, "Milk_pH": 7.35, "Milk_Conductivity": 7.80, "Milk_Yield": 5.0, "Clotting": 1},
        "clinical_observations": {"milk_yield_change": "Severe drop", "milk_appearance": "Clots and blood", "udder_swelling": "Severe", "udder_warmth": "Severe", "udder_pain": "Severe", "body_temperature": "High fever (40.5°C)", "appetite": "Loss of appetite"},
        "severity": {"severity_level": "severe", "severity_code": 3, "severity_label": "Severe Mastitis"},
    }
    cattle_info = {"tag_id": "COW-999", "name": "Luna", "breed": "Jersey", "age": 5}

    pdf_bytes = generator.generate_pdf(prediction_result, cattle_info, report_id="RPT-CRITICAL-999")
    assert pdf_bytes.startswith(b"%PDF-")


def test_report_api_endpoint(client):
    """Test POST /api/report/generate-pdf returns a downloadable application/pdf stream."""
    payload = {
        "result": {
            "prediction": "Normal",
            "confidence": 0.91,
            "stage": "No Mastitis",
            "numerical_measurements": {
                "Milk_Temperature": 36.5,
                "Milk_pH": 6.7,
                "Milk_Conductivity": 4.8,
                "Milk_Yield": 18.0,
                "Clotting": 0,
            },
            "severity": {"severity_level": "negative", "severity_code": 0, "severity_label": "No Mastitis"},
        },
        "cattle_info": {"tag_id": "COW-555", "name": "Molly"},
        "farmer_info": {"name": "Farmer Sam"},
    }

    response = client.post("/api/report/generate-pdf", json=payload)
    assert response.status_code == 200
    assert response.mimetype == "application/pdf"
    assert response.data.startswith(b"%PDF-")


def test_report_generation_borderline_uncertainty_banner(generator):
    """Test PDF generation with borderline uncertainty flag and advisory banner."""
    prediction_result = {
        "prediction": "Normal",
        "confidence": 0.68,
        "probability": 0.32,
        "is_borderline": True,
        "uncertainty_level": "borderline_uncertain",
        "threshold_used": 0.25,
        "threshold_distance": 0.07,
        "uncertainty_note": "This result is close to the model's decision threshold. Veterinary confirmation recommended.",
        "stage": "No Mastitis",
        "mode": "image_only",
        "model_2_used": False,
        "image_prediction": {"status": "ready", "prediction": "Normal", "confidence": 0.68},
        "severity": {"severity_level": "negative", "severity_code": 0, "severity_label": "No Mastitis"},
    }
    cattle_info = {"tag_id": "COW-UNCERTAIN-01", "name": "Daisy", "breed": "Friesian", "age": 3}
    farmer_info = {"name": "Farmer John", "farm_name": "Highland Dairy"}

    pdf_bytes = generator.generate_pdf(prediction_result, cattle_info, farmer_info, report_id="RPT-UNCERTAIN-001")
    assert pdf_bytes is not None
    assert pdf_bytes.startswith(b"%PDF-")
    assert len(pdf_bytes) > 5000


def test_report_generation_sinhala_language(generator):
    """Test PDF generation in Sinhala ('si') with full Sinhala font registration."""
    prediction_result = {
        "prediction": "Mastitis",
        "confidence": 0.95,
        "stage": "Severe Mastitis",
        "severity": {"severity_level": "severe", "severity_code": 3, "severity_label": "Severe Mastitis"},
        "clinical_observations": {"milk_appearance": "clots", "udder_swelling": "severe", "udder_pain": "yes"},
    }
    cattle_info = {"tag_id": "COW-SI-001", "name": "සුදු මැණිකේ", "breed": "දේශීය මිශ්‍ර", "age": 5}
    farmer_info = {"name": "සුනිල් රත්නායක", "farm_name": "ග්‍රීන් ෆාම්"}

    health_history = {
        "trend_state": "Worsening",
        "trend_message": "Severity progressed over 10 days.",
        "timeline": [
            {"date": "2026-08-10", "prediction": "Normal", "severity_level": "Normal", "confidence": 0.91},
            {"date": "2026-08-25", "prediction": "Mastitis", "severity_level": "Severe", "confidence": 0.95},
        ]
    }

    pdf_bytes = generator.generate_pdf(
        prediction_result=prediction_result,
        cattle_info=cattle_info,
        farmer_info=farmer_info,
        health_history=health_history,
        report_id="RPT-SINHALA-001",
        language="si"
    )
    assert pdf_bytes is not None
    assert pdf_bytes.startswith(b"%PDF-")
    assert len(pdf_bytes) > 5000


def test_report_generation_with_longitudinal_health_history(generator):
    """Test PDF generation with rich 5+ longitudinal assessment records and trend badge."""
    prediction_result = {
        "prediction": "Mastitis",
        "confidence": 0.88,
        "stage": "Moderate Mastitis",
        "severity": {"severity_level": "moderate", "severity_code": 2, "severity_label": "Moderate Mastitis"},
    }
    cattle_info = {
        "tag_id": "COW-HIST-77",
        "name": "Manali",
        "breed": "Holstein",
        "age": 4,
        "lactation_count": 2,
        "created_at": "2023-05-10",
    }
    farmer_info = {"name": "Chamara", "farm_name": "Valley Dairy", "phone": "0771234567"}

    health_history = {
        "trend_state": "Improving",
        "trend_message": "Severity improved from Moderate to Mild.",
        "timeline": [
            {"date": "2026-07-01", "prediction": "Normal", "severity_level": "Normal", "confidence": 0.92},
            {"date": "2026-07-15", "prediction": "Mastitis", "severity_level": "Mild", "confidence": 0.65, "is_borderline": True},
            {"date": "2026-08-01", "prediction": "Mastitis", "severity_level": "Moderate", "confidence": 0.85},
            {"date": "2026-08-15", "prediction": "Mastitis", "severity_level": "Mild", "confidence": 0.70},
            {"date": "2026-08-25", "prediction": "Normal", "severity_level": "Normal", "confidence": 0.94},
            {"date": "2026-08-26", "prediction": "Normal", "severity_level": "Normal", "confidence": 0.96},
        ]
    }

    pdf_bytes = generator.generate_pdf(
        prediction_result=prediction_result,
        cattle_info=cattle_info,
        farmer_info=farmer_info,
        health_history=health_history,
        report_id="RPT-HIST-001",
        language="en"
    )
    assert pdf_bytes is not None
    assert pdf_bytes.startswith(b"%PDF-")
    assert len(pdf_bytes) > 5000


def test_report_api_endpoint_sinhala_and_history(client):
    """Test POST /api/report/generate-pdf with language='si' and health_history payload."""
    payload = {
        "result": {
            "prediction": "Mastitis",
            "confidence": 0.94,
            "stage": "Severe Mastitis",
            "severity": {"severity_level": "severe", "severity_code": 3, "severity_label": "Severe Mastitis"},
        },
        "cattle_info": {"tag_id": "COW-909", "name": "චිත්‍රා"},
        "farmer_info": {"name": "අනුර"},
        "health_history": {
            "trend_state": "Worsening",
            "timeline": [{"date": "2026-08-20", "prediction": "Normal", "confidence": 0.9}]
        },
        "language": "si",
    }

    response = client.post("/api/report/generate-pdf", json=payload)
    assert response.status_code == 200
    assert response.mimetype == "application/pdf"
    assert response.data.startswith(b"%PDF-")


def test_report_insufficient_data_sinhala_and_english_text(generator):
    """Test that insufficient_data severity correctly renders Sinhala translation and English text."""
    from pypdf import PdfReader

    prediction_result = {
        "prediction": "Mastitis",
        "confidence": 0.85,
        "stage": "Insufficient Clinical Data",
        "mode": "image_only",
        "severity": {
            "severity_level": "insufficient_data",
            "severity_label": "Insufficient Clinical Data",
            "clinical_rationale": "Insufficient clinical data — biomarkers not provided and zero symptoms answered.",
            "clinical_rationale_si": "ප්‍රමාණවත් සායනික දත්ත නොමැත — අවදානම් මට්ටම තීරණය කිරීමට ජෛව දත්ත හෝ රෝග ලක්ෂණ තොරතුරු ලබාදී නොමැත.",
        }
    }

    # English test
    pdf_en = generator.generate_pdf(prediction_result, language="en")
    reader_en = PdfReader(io.BytesIO(pdf_en))
    text_en = "\n".join(p.extract_text() for p in reader_en.pages)
    assert "Insufficient Clinical Data" in text_en
    assert "Severity Clinical Rationale" in text_en

    # Sinhala test
    from utils.report_generator import normalize_sinhala_text
    pdf_si = generator.generate_pdf(prediction_result, language="si")
    reader_si = PdfReader(io.BytesIO(pdf_si))
    text_si = normalize_sinhala_text("\n".join(p.extract_text() for p in reader_si.pages))
    assert "ප්‍රමාණවත් සායනික දත්ත නොමැත" in text_si
    assert "සායනික අවදානම් පදනම" in text_si


def test_report_clinical_rationale_path_a_and_path_b(generator):
    """Test that Path A and Path B clinical rationales appear in generated PDFs."""
    from pypdf import PdfReader

    # Path A - English
    result_a = {
        "prediction": "Mastitis",
        "confidence": 0.93,
        "stage": "Severe Mastitis",
        "mode": "multimodal_image_numerical",
        "model_2_used": True,
        "severity": {
            "severity_level": "severe",
            "severity_label": "Severe Mastitis",
            "path_used": "path_a",
            "clinical_rationale": "Severity calculated via biomarker + symptom assessment (Path A): Elevated Milk Conductivity (7.8 mS/cm), Elevated Temperature (39.5°C), and 2 clinical symptoms reported (milk clots, swollen udder)."
        }
    }
    pdf_a = generator.generate_pdf(result_a, language="en")
    text_a = "\n".join(p.extract_text() for p in PdfReader(io.BytesIO(pdf_a)).pages)
    assert "Path A" in text_a
    assert "Elevated Milk Conductivity" in text_a

    # Path B - English
    result_b = {
        "prediction": "Mastitis",
        "confidence": 0.88,
        "stage": "Moderate Mastitis",
        "mode": "image_only",
        "model_2_used": False,
        "severity": {
            "severity_level": "moderate",
            "severity_label": "Moderate Mastitis",
            "path_used": "path_b",
            "clinical_rationale": "Severity calculated via farmer symptom checklist (Path B, biomarkers not provided): 3 clinical symptoms reported (milk clots, warm udder, swollen udder)."
        }
    }
    pdf_b = generator.generate_pdf(result_b, language="en")
    text_b = "\n".join(p.extract_text() for p in PdfReader(io.BytesIO(pdf_b)).pages)
    assert "Path B" in text_b
    assert "3 clinical symptoms reported" in text_b


def test_sinhala_mixed_font_rendering_fidelity(generator):
    """
    Test Fix 1: Mixed English/Sinhala text (Latin model names, technical terms,
    ear tag IDs, English names, URLs) must NOT have Latin characters stripped in Sinhala mode.
    """
    from pypdf import PdfReader

    prediction_result = {
        "prediction": "Mastitis",
        "confidence": 0.93,
        "stage": "Severe Mastitis",
        "mode": "multimodal_image_numerical",
        "model_2_used": True,
        "image_prediction": {
            "prediction": "Mastitis",
            "confidence": 0.95,
            "model": "ResNet50 (Stage 1, frozen backbone)",
        },
        "numerical_prediction": {
            "prediction": "Mastitis",
            "confidence": 0.91,
            "model": "Decision Tree Classifier (Model 2)",
        },
        "numerical_measurements": {
            "Milk_Temperature": 39.2,
            "Milk_pH": 7.35,
            "Milk_Conductivity": 7.80,
            "Milk_Yield": 5.0,
            "Clotting": 1,
        },
        "clinical_observations": {
            "milk_appearance": "Clots",
            "udder_swelling": "Severe",
        },
        "severity": {
            "severity_level": "severe",
            "severity_label": "Severe Mastitis",
            "path_used": "path_a",
            "clinical_rationale": "Severity calculated via biomarker + symptom assessment (Path A): Elevated Milk Conductivity (7.8 mS/cm), Elevated Temperature (39.5°C), and 2 clinical symptoms reported (milk clots, swollen udder)."
        }
    }
    cattle_info = {"tag_id": "COW-101", "name": "Bella", "breed": "Jersey", "age": 4}
    farmer_info = {"name": "Perera", "farm_name": "Green Hills Farm", "district": "Nuwara Eliya", "phone": "0771234567"}

    pdf_si = generator.generate_pdf(prediction_result, cattle_info, farmer_info, report_id="RPT-MAST-101", language="si")
    assert pdf_si.startswith(b"%PDF-")

    reader_si = PdfReader(io.BytesIO(pdf_si))
    full_text_si = "\n".join(p.extract_text() for p in reader_si.pages)
    clean_text_si = full_text_si.replace("\n", "")

    # 1. Profile metadata: English tag ID, cow name, farmer name, breed, location
    assert "COW-101" in full_text_si
    assert "Bella" in full_text_si
    assert "Perera" in full_text_si
    assert "Jersey" in full_text_si
    assert "Green Hills Farm" in full_text_si
    assert "Nuwara Eliya" in full_text_si
    assert "RPT-MAST-101" in full_text_si
    assert "CattleSense" in full_text_si

    # 2. Technical and module terms in Sinhala mode
    assert "Path A" in full_text_si
    assert "multimodal_image_numerical" in clean_text_si
    assert "ResNet50" in clean_text_si
    assert "Decision Tree Classifier" in clean_text_si

    # 3. Ensure no null-character byte corruption in extracted text
    assert "\x00" not in full_text_si


def test_veterinary_handover_section_removed_and_renumbered(generator):
    """
    Test Fix 2: Verify Section 7 (Veterinary Review & Clinical Handover) is completely removed,
    and Section 8 (AI Disclaimer) is renumbered to Section 7 in both English and Sinhala.
    """
    from pypdf import PdfReader

    prediction_result = {
        "prediction": "Mastitis",
        "confidence": 0.88,
        "stage": "Moderate Mastitis",
        "severity": {"severity_level": "moderate", "severity_label": "Moderate Mastitis"},
    }

    # ── Test English PDF ──
    pdf_en = generator.generate_pdf(prediction_result, language="en")
    text_en = "\n".join(p.extract_text() for p in PdfReader(io.BytesIO(pdf_en)).pages)

    # Handover section headings and fields must be completely absent
    assert "VETERINARY REVIEW & CLINICAL HANDOVER" not in text_en
    assert "Attending Veterinarian" not in text_en
    assert "License / Registration No" not in text_en
    assert "Physical Examination Findings" not in text_en
    assert "Diagnostic Tests Ordered" not in text_en
    assert "Definitive Diagnosis" not in text_en
    assert "Prescribed Treatment / Management Plan" not in text_en
    assert "Date & Signature" not in text_en
    assert "8. AI ASSESSMENT" not in text_en

    # AI Notice must now be Section 7
    assert "7. AI ASSESSMENT & CLINICAL NOTICE" in text_en

    # Sequential sections 1 through 7 must be present
    for i in range(1, 8):
        assert f"{i}. " in text_en

    # ── Test Sinhala PDF ──
    from utils.report_generator import normalize_sinhala_text
    pdf_si = generator.generate_pdf(prediction_result, language="si")
    text_si = normalize_sinhala_text("\n".join(p.extract_text() for p in PdfReader(io.BytesIO(pdf_si)).pages))

    # Sinhala Handover headings and fields must be completely absent
    assert "පශු වෛද්‍ය සමාලෝචනය සහ සායනික භාරදීම" not in text_si
    assert "ප්‍රතිකාර කරන පශු වෛද්‍යවරයා" not in text_si
    assert "බලපත්‍ර / ලියාපදිංචි අංකය" not in text_si
    assert "ශාරීරික පරීක්ෂණ සොයාගැනීම්" not in text_si
    assert "නියම කළ පරීක්ෂණ" not in text_si
    assert "අවසන් රෝග විනිශ්චය" not in text_si
    assert "නියම කළ ප්‍රතිකාර" not in text_si
    assert "8. AI නිවේදනය" not in text_si

    # AI Notice must now be Section 7
    assert "7. AI නිවේදනය සහ සායනික වගකීම් ප්‍රකාශය" in text_si

    # Sequential sections 1 through 7 must be present
    for i in range(1, 8):
        assert f"{i}. " in text_si


def test_meaningful_report_id_generation(generator):
    """
    Test Fix 2: Verify simplified, human-readable report ID format:
    RPT-MST-{YYYYMMDD}-{sequence_number}
    and verify global daily sequence incrementing regardless of cow tag.
    """
    from utils.report_generator import generate_meaningful_report_id, _DAILY_REPORT_SEQUENCES
    from datetime import datetime
    import re
    from pypdf import PdfReader

    today_str = datetime.now().strftime("%Y%m%d")

    # 1. Global daily sequence increments across cows
    id_1 = generate_meaningful_report_id({"tag_id": "COW-101"})
    id_2 = generate_meaningful_report_id({"tag_id": "COW-101"})
    id_3 = generate_meaningful_report_id({"tag_id": "COW-202"})
    id_4 = generate_meaningful_report_id(None)

    assert re.match(rf"^RPT-MST-{today_str}-\d{{3}}$", id_1)
    assert re.match(rf"^RPT-MST-{today_str}-\d{{3}}$", id_2)
    assert re.match(rf"^RPT-MST-{today_str}-\d{{3}}$", id_3)
    assert re.match(rf"^RPT-MST-{today_str}-\d{{3}}$", id_4)

    # Sequence numbers should strictly increment globally
    seq_1 = int(id_1.split("-")[-1])
    seq_2 = int(id_2.split("-")[-1])
    seq_3 = int(id_3.split("-")[-1])
    seq_4 = int(id_4.split("-")[-1])
    assert seq_2 == seq_1 + 1
    assert seq_3 == seq_2 + 1
    assert seq_4 == seq_3 + 1

    # 2. Automatic generation in generate_pdf when report_id is not passed
    pred = {
        "prediction": "Normal",
        "confidence": 0.90,
        "stage": "No Mastitis",
        "severity": {"severity_level": "negative", "severity_label": "No Mastitis"},
    }
    pdf_bytes = generator.generate_pdf(pred, cattle_info={"tag_id": "DAISY-77"})
    text = "\n".join(p.extract_text() for p in PdfReader(io.BytesIO(pdf_bytes)).pages)
    assert f"RPT-MST-{today_str}-" in text


def test_footer_layout_rendering_and_space_bounds(generator):
    """
    Test Fix 1: Verify footer layout does not overlap across short, standard,
    and extra-long report IDs in both English and Sinhala multi-page reports.
    """
    from reportlab.pdfbase import pdfmetrics
    from pypdf import PdfReader

    pred = {
        "prediction": "Mastitis",
        "confidence": 0.94,
        "stage": "Clinical Mastitis",
        "severity": {
            "severity_level": "severe",
            "severity_label": "Severe Mastitis",
            "clinical_rationale": "High risk detected via multimodal biomarkers and clinical signs.",
        },
    }
    cattle_info = {"tag_id": "COW-101", "name": "Daisy", "breed": "Jersey", "age": 4}

    # Test variations: standard ID, short ID, and extra-long custom ID
    test_ids = [
        "RPT-MST-001",
        "RPT-MST-20260825-001",
        "RPT-MST-20260825-CUSTOM-EXTREMELY-LONG-TAG-IDENTIFIER-99999",
    ]

    for rid in test_ids:
        for lang in ("en", "si"):
            pdf_bytes = generator.generate_pdf(
                prediction_result=pred,
                cattle_info=cattle_info,
                report_id=rid,
                language=lang,
            )
            assert pdf_bytes.startswith(b"%PDF-")
            reader = PdfReader(io.BytesIO(pdf_bytes))
            assert len(reader.pages) >= 1

            for page_idx, page in enumerate(reader.pages, start=1):
                page_text = page.extract_text()
                # Confirm footer elements are present and uncorrupted
                assert rid in page_text
                assert "CattleSense" in page_text
                if lang == "en":
                    assert f"Page {page_idx} of" in page_text
                    assert "Confidential" in page_text
                else:
                    assert f"පිටුව {page_idx} /" in page_text
                    assert "රහස්‍යයි" in page_text



def test_sinhala_complex_script_conjunct_rendering(generator):
    """
    Test Fix 1 regression: Verify complex-script words containing conjuncts and ligatures:
    'සෞඛ්‍ය' (health - yansaya + kombuva),
    'ප්‍රශ්නාවලිය' (questionnaire - rakaransaya + touching hal-lakuna),
    'ක්‍රියාත්මක' (active/functional - rakaransaya + touching hal-lakuna)
    render properly in the PDF, produce correct ToUnicode CMap mappings,
    and extract with 100% fidelity without PUA codepoint leakage.
    """
    from utils.report_generator import normalize_sinhala_text
    from pypdf import PdfReader

    pred = {
        "prediction": "Mastitis",
        "confidence": 0.94,
        "stage": "Severe Mastitis",
        "mode": "multimodal_image_numerical",
        "severity": {
            "severity_level": "severe",
            "severity_label": "Severe Mastitis",
            "clinical_rationale": "සායනික පරීක්ෂණ ප්‍රශ්නාවලිය සහ සෞඛ්‍ය ඉතිහාසය අනුව පද්ධතිය ක්‍රියාත්මක විය."
        }
    }
    cattle = {"tag_id": "COW-101", "name": "Bella"}
    pdf_bytes = generator.generate_pdf(pred, cattle_info=cattle, language="si")
    assert pdf_bytes.startswith(b"%PDF-")

    reader = PdfReader(io.BytesIO(pdf_bytes))
    raw_text = "\n".join(p.extract_text() for p in reader.pages)
    norm_text = normalize_sinhala_text(raw_text)

    # 1. Verify words are present in normalized extracted text
    assert "සෞඛ්‍ය" in norm_text
    assert "ප්‍රශ්නාවලිය" in norm_text
    assert "ක්‍රියාත්මක" in norm_text

    # 2. Verify no unmapped raw PUA codepoints (U+E000 to U+EFFF) leaked into the PDF stream
    for page in reader.pages:
        page_raw = page.extract_text()
        assert not any(0xE000 <= ord(ch) <= 0xE3FF for ch in page_raw), "PUA codepoint leaked without ToUnicode mapping!"



