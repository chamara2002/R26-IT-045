"""
Unified PDF Report Generation Dispatcher for CattleSense Backend.
Routes PDF generation requests for all modules (mastitis, lumpy/lsd, fmd, milk-fever)
with complete bilingual support for English ('en') and Sinhala ('si').
"""
from services.pdf_reports.lsd_report_builder import generate_lsd_pdf
from services.pdf_reports.fmd_report_builder import generate_fmd_pdf
from services.pdf_reports.milk_fever_report_builder import generate_milk_fever_pdf
from services.pdf_reports.mastitis_report_builder import generate_mastitis_pdf

def generate_module_pdf(module_name: str, payload: dict, language: str = "en") -> bytes:
    """Generate a high-fidelity PDF report for the given module in English or Sinhala."""
    mod = (module_name or "").lower().strip()
    lang = "si" if language == "si" else "en"

    if mod in ("lumpy", "lsd", "lumpy-skin-disease"):
        return generate_lsd_pdf(payload, language=lang)
    elif mod in ("fmd", "foot-and-mouth"):
        return generate_fmd_pdf(payload, language=lang)
    elif mod in ("milk-fever", "milk_fever", "hypocalcemia"):
        return generate_milk_fever_pdf(payload, language=lang)
    elif mod in ("mastitis", "bovine-mastitis"):
        return generate_mastitis_pdf(payload, language=lang)
    else:
        raise ValueError(f"Unknown module name: {module_name}")
