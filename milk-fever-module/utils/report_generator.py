"""
Milk Fever (Hypocalcemia) PDF Report Generator for Milk Fever Microservice.
Supports English ('en') and Sinhala ('si') with ReportLab and HarfBuzz typography.
"""
import io
import os
import re
from pathlib import Path
from datetime import datetime

try:
    import uharfbuzz as hb
    _hb_available = True
except ImportError:
    hb = None
    _hb_available = False

try:
    from fontTools.ttLib import TTFont as FontToolsTTFont
except ImportError:
    FontToolsTTFont = None

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph as RLParagraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

BASE_DIR = Path(__file__).resolve().parent.parent
FONTS_DIR = BASE_DIR / "assets" / "fonts"
SINHALA_REGULAR = FONTS_DIR / "NotoSansSinhala-Regular.ttf"
SINHALA_BOLD = FONTS_DIR / "NotoSansSinhala-Bold.ttf"

PUA_BASE = 0xE000
_fonts_registered = False
_hb_font_reg = None
_hb_font_bold = None

CONSONANT_MAP = {
    'k': '\u0D9A', 'kh': '\u0D9B', 'g': '\u0D9C', 'gh': '\u0D9D', 'ng': '\u0D9E', 'nng': '\u0D9F',
    'c': '\u0DA0', 'ch': '\u0DA1', 'j': '\u0DA2', 'jh': '\u0DA3', 'ny': '\u0DA4', 'jny': '\u0DA5', 'nyj': '\u0DA6',
    'tt': '\u0DA7', 'tth': '\u0DA8', 'dd': '\u0DA9', 'ddh': '\u0DAA', 'nn': '\u0DAB', 'nndd': '\u0DAC',
    't': '\u0DAD', 'th': '\u0DAE', 'd': '\u0DAF', 'dh': '\u0DB0', 'n': '\u0DB1', 'nd': '\u0DB3',
    'p': '\u0DB4', 'ph': '\u0DB5', 'b': '\u0DB6', 'bh': '\u0DB7', 'm': '\u0DB8', 'mb': '\u0DB9',
    'y': '\u0DBA', 'r': '\u0DBB', 'l': '\u0DBD', 'v': '\u0DC0',
    'sh': '\u0DC1', 'ss': '\u0DC2', 's': '\u0DC3', 'h': '\u0DC4', 'll': '\u0DC5', 'f': '\u0DC6',
}

PUNCT_MAP = {
    'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
    'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
    'period': '.', 'colon': ':', 'ellipsis': '...', 'exclam': '!',
    'hyphen': '-', 'parenleft': '(', 'parenright': ')', 'percent': '%',
    'comma': ',', 'semicolon': ';', 'question': '?', 'slash': '/',
}


def _build_pua_to_hex(glyph_order, font_bytes):
    tt = FontToolsTTFont(io.BytesIO(font_bytes))
    cmap = tt.getBestCmap()
    g2str = {}
    for cp, name in cmap.items():
        if cp < PUA_BASE:
            g2str[name] = chr(cp)
    for name, val in PUNCT_MAP.items():
        g2str[name] = val
        g2str[f'{name}.sinh'] = val
    for prefix, cons in CONSONANT_MAP.items():
        g2str[f'{prefix}asinh'] = cons
        g2str[f'{prefix}ahalantsinh'] = cons + '\u0DCA'
        g2str[f'{prefix}touchsinh'] = cons
        g2str[f'{prefix}ivowelsinh'] = cons + '\u0DD2'
        g2str[f'{prefix}iivowelsinh'] = cons + '\u0DD3'
        g2str[f'{prefix}uvowelsinh'] = cons + '\u0DD4'
        g2str[f'{prefix}uuvowelsinh'] = cons + '\u0DD6'
        g2str[f'{prefix}rephsinh'] = '\u0DBB\u0DCA\u200D' + cons
        g2str[f'{prefix}aavowelsinh'] = cons + '\u0DCF'
    g2str['anusvarasinh'] = '\u0D82'
    g2str['rakarsinh'] = '\u0DCA\u200D\u0DBB'
    g2str['evowelsignsinh'] = '\u0DD9'
    g2str['eevowelsignsinh'] = '\u0DDA'
    pua_to_hex = {}
    for gid, name in enumerate(glyph_order):
        pua_code = PUA_BASE + gid
        if name in g2str:
            s = g2str[name]
            pua_to_hex[pua_code] = ''.join(f'{ord(c):04X}' for c in s)
        else:
            pua_to_hex[pua_code] = f'{pua_code:04X}'
    return pua_to_hex


class SinhalaShapedTTFont(TTFont):
    def __init__(self, name, font_bytes_data, pua_map):
        self.pua_map = pua_map
        super().__init__(name, io.BytesIO(font_bytes_data))

    def _makeToUnicodeCMap(self, baseFontName, subset):
        bfchar_lines = [f'<{i:02X}> <{self.pua_map.get(code, f"{code:04X}")}>' for i, code in enumerate(subset)]
        cmap_str = [
            '/CIDInit /ProcSet findresource begin',
            '12 dict begin',
            'begincmap',
            '/CIDSystemInfo',
            '<< /Registry (%s)' % baseFontName,
            '/Ordering (%s)' % baseFontName,
            '/Supplement 0',
            '>> def',
            '/CMapName /%s def' % baseFontName,
            '/CMapType 2 def',
            '1 begincodespacerange',
            '<00> <%02X>' % (len(subset) - 1),
            'endcodespacerange',
            '%d beginbfchar' % len(subset)
        ] + bfchar_lines + [
            'endbfchar',
            'endcmap',
            'CMapName currentdict /CMap defineresource pop',
            'end',
            'end'
        ]
        return '\n'.join(cmap_str)

    def addObjects(self, doc):
        import reportlab.pdfbase.ttfonts as rft
        orig_make = rft.makeToUnicodeCMap
        rft.makeToUnicodeCMap = self._makeToUnicodeCMap
        try:
            super().addObjects(doc)
        finally:
            rft.makeToUnicodeCMap = orig_make


def _register_sinhala_fonts():
    global _fonts_registered, _hb_font_reg, _hb_font_bold
    if not _fonts_registered:
        if SINHALA_REGULAR.exists() and SINHALA_BOLD.exists():
            try:
                if _hb_available and FontToolsTTFont is not None:
                    with open(SINHALA_REGULAR, 'rb') as f:
                        reg_bytes = f.read()
                    with open(SINHALA_BOLD, 'rb') as f:
                        bold_bytes = f.read()

                    tt_reg = FontToolsTTFont(io.BytesIO(reg_bytes))
                    tt_bold = FontToolsTTFont(io.BytesIO(bold_bytes))

                    _hb_font_reg = hb.Font(hb.Face(reg_bytes))
                    _hb_font_bold = hb.Font(hb.Face(bold_bytes))

                    pua_hex_reg = _build_pua_to_hex(tt_reg.getGlyphOrder(), reg_bytes)
                    pua_hex_bold = _build_pua_to_hex(tt_bold.getGlyphOrder(), bold_bytes)

                    pdfmetrics.registerFont(SinhalaShapedTTFont("NotoSansSinhala", reg_bytes, pua_hex_reg))
                    pdfmetrics.registerFont(SinhalaShapedTTFont("NotoSansSinhala-Bold", bold_bytes, pua_hex_bold))
                else:
                    pdfmetrics.registerFont(TTFont("NotoSansSinhala", str(SINHALA_REGULAR)))
                    pdfmetrics.registerFont(TTFont("NotoSansSinhala-Bold", str(SINHALA_BOLD)))
                _fonts_registered = True
            except Exception as e:
                print(f"[MF Report] Warning registering Sinhala fonts: {e}")
    return _fonts_registered


_register_sinhala_fonts()


def shape_sinhala_str(text, is_bold=False):
    if not text or not isinstance(text, str):
        return text
    if not _hb_available or not any(0x0D80 <= ord(c) <= 0x0DFF or c == '\u200D' for c in text):
        return text
    _register_sinhala_fonts()
    font = _hb_font_bold if is_bold else _hb_font_reg
    if font is None:
        return text
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf)
    return ''.join(chr(PUA_BASE + info.codepoint) for info in buf.glyph_infos)


def shape_sinhala_html(text, is_bold=False):
    if not text or not isinstance(text, str):
        return text
    parts = re.split(r'(<[^>]+>)', str(text))
    out = []
    current_bold = is_bold
    for part in parts:
        if part.startswith('<') and part.endswith('>'):
            out.append(part)
            if part.lower() in ('<b>', '<strong>'):
                current_bold = True
            elif part.lower() in ('</b>', '</strong>'):
                current_bold = is_bold
        else:
            out.append(shape_sinhala_str(part, is_bold=current_bold))
    return ''.join(out)


class Paragraph(RLParagraph):
    def __init__(self, text, style, *args, **kwargs):
        font_name = getattr(style, 'fontName', '')
        if font_name.startswith('NotoSansSinhala') and text:
            is_bold = 'Bold' in font_name
            text = shape_sinhala_html(text, is_bold=is_bold)
        super().__init__(text, style, *args, **kwargs)


class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []
        self.report_id = "RPT-MF"
        self.language = "en"

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
        is_si = (self.language == "si" and _fonts_registered)
        fn_bold = "NotoSansSinhala-Bold" if is_si else "Helvetica-Bold"
        fn_reg = "NotoSansSinhala" if is_si else "Helvetica"

        if self._pageNumber > 1:
            h_title = "CattleSense — ක්ෂීර උණ සායනික වාර්තාව" if is_si else "CattleSense — Milk Fever Clinical Report"
            if is_si:
                h_title = shape_sinhala_html(h_title, is_bold=True)
            self.setFont(fn_bold, 8)
            self.setFillColor(colors.HexColor("#334155"))
            self.drawString(36, 808, h_title)
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(36, 802, 559, 802)

        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(36, 42, 559, 42)

        self.setFont(fn_reg, 7.5)
        self.setFillColor(colors.HexColor("#64748b"))
        f_left = "CattleSense — AI සහායක පශු වෛද්‍ය තීරණ සහාය" if is_si else "CattleSense — AI-Assisted Veterinary Decision-Support"
        f_right = f"වාර්තා අංකය: {self.report_id}" if is_si else f"Report ID: {self.report_id}"
        if is_si:
            f_left = shape_sinhala_html(f_left, is_bold=False)
            f_right = shape_sinhala_html(f_right, is_bold=False)

        self.drawString(36, 28, f_left)
        self.drawRightString(559, 28, f_right)

        self.setFont(fn_reg, 7.0)
        self.setFillColor(colors.HexColor("#94a3b8"))
        f_p = f"පිටුව {self._pageNumber} / {page_count}" if is_si else f"Page {self._pageNumber} of {page_count}"
        if is_si:
            f_p = shape_sinhala_html(f_p, is_bold=False)
        self.drawRightString(559, 18, f_p)
        self.restoreState()


def build_milk_fever_report(payload: dict, language: str = "en") -> bytes:
    """Build Milk Fever diagnostic PDF report in English or Sinhala."""
    _register_sinhala_fonts()
    is_si = (language == "si")
    fn_reg = "NotoSansSinhala" if (is_si and _fonts_registered) else "Helvetica"
    fn_bold = "NotoSansSinhala-Bold" if (is_si and _fonts_registered) else "Helvetica-Bold"

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="MFTitle", fontName=fn_bold, fontSize=15, leading=19, textColor=colors.HexColor("#0f172a")))
    styles.add(ParagraphStyle(name="MFSub", fontName=fn_reg, fontSize=9.5, leading=13, textColor=colors.HexColor("#64748b")))
    styles.add(ParagraphStyle(name="MFSec", fontName=fn_bold, fontSize=10.5, leading=14, textColor=colors.HexColor("#0f766e"), spaceBefore=8, spaceAfter=4))
    styles.add(ParagraphStyle(name="MFBody", fontName=fn_reg, fontSize=8.5, leading=12, textColor=colors.HexColor("#334155")))
    styles.add(ParagraphStyle(name="MFBodyBold", fontName=fn_bold, fontSize=8.5, leading=12, textColor=colors.HexColor("#0f172a")))
    styles.add(ParagraphStyle(name="MFTableHead", fontName=fn_bold, fontSize=8, leading=10, textColor=colors.white))
    styles.add(ParagraphStyle(name="MFDisc", fontName=fn_reg, fontSize=7.5, leading=10, textColor=colors.HexColor("#64748b")))

    result = payload.get("result") or payload
    cattle_info = payload.get("cattle_info") or payload.get("cow") or {}
    farmer_info = payload.get("farmer_info") or {}

    stage = str(result.get("stage") or result.get("prediction") or "Mild").capitalize()
    stage_key = "Subclinical" if "Sub" in stage else "Moderate" if "Mod" in stage else "Critical" if ("Crit" in stage or "Sev" in stage) else "Mild"

    stage_si_map = {
        "Subclinical": "උපසායනික (Subclinical - අඩු කැල්සියම්)",
        "Mild": "මෘදු (Stage 1 - සිටගෙන සිටින මුල් අවධිය)",
        "Moderate": "මධ්‍යස්ථ (Stage 2 - බිම වැතිරී සිටින අවධිය)",
        "Critical": "අසාධ්‍ය (Stage 3 - සිහිසුන් වූ හදිසි අවධිය)",
    }

    stage_colors = {
        "Subclinical": {"bg": colors.HexColor("#eff6ff"), "border": colors.HexColor("#3b82f6"), "text": colors.HexColor("#1d4ed8")},
        "Mild": {"bg": colors.HexColor("#fffbeb"), "border": colors.HexColor("#d97706"), "text": colors.HexColor("#b45309")},
        "Moderate": {"bg": colors.HexColor("#fff7ed"), "border": colors.HexColor("#ea580c"), "text": colors.HexColor("#c2410c")},
        "Critical": {"bg": colors.HexColor("#fef2f2"), "border": colors.HexColor("#dc2626"), "text": colors.HexColor("#b91c1c")},
    }
    cur_style = stage_colors.get(stage_key, stage_colors["Mild"])

    conf_val = result.get("confidence") or result.get("confidence_score") or 0.88
    try:
        conf_float = float(str(conf_val).replace("%", "").strip())
        if conf_float > 1.0:
            conf_float = conf_float / 100.0
    except Exception:
        conf_float = 0.88

    risk_score = result.get("risk_score") or int(conf_float * 100)
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
    report_id = f"RPT-MF-{datetime.now().strftime('%Y%m%d')}-{abs(hash(str(result))) % 1000:03d}"

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, leftMargin=36, rightMargin=36, topMargin=36, bottomMargin=46)
    story = []

    # Title
    t_text = "ක්ෂීර උණ (හයිපොකැල්සීමියාව) සායනික ඇගයීම් සහ රෝග විනිශ්චය වාර්තාව" if is_si else "Milk Fever (Hypocalcemia) Clinical Assessment & Diagnostic Report"
    s_text = "CattleSense AI — මැෂින් ලර්නින් පාදක ක්ෂීර උණ අවධි වර්ගීකරණය සහ ජෛව දර්ශක ඇගයීම" if is_si else "CattleSense AI — Machine Learning Parturient Paresis Staging & Biomarker Triage"

    header_table = Table([
        [
            Paragraph(f"<b>{t_text}</b>", styles["MFTitle"]),
            Paragraph(f"<font size=7 color='#64748b'>{'දිනය' if is_si else 'Date'}:</font> {now_str}<br/><font size=7 color='#64748b'>{'වාර්තා අංකය' if is_si else 'Report ID'}:</font> <b>{report_id}</b>", styles["MFBody"])
        ],
        [Paragraph(s_text, styles["MFSub"]), ""]
    ], colWidths=[380, 143])
    header_table.setStyle(TableStyle([('VALIGN', (0, 0), (-1, -1), 'TOP')]))
    story.append(header_table)
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0f766e"), spaceBefore=2, spaceAfter=10))

    # Cow Profile
    cow_name = cattle_info.get("name") or ("ගවයා" if is_si else "Cow")
    cow_tag = cattle_info.get("tag_id") or ("සටහන් කර නැත" if is_si else "Not recorded")
    cow_breed = cattle_info.get("breed") or ("කිරි ගව / දේශීය" if is_si else "Dairy Cattle")
    cow_age = f"{cattle_info.get('age', 'N/A')} {'වසර' if is_si else 'yrs'}"
    farmer_name = farmer_info.get("name") or ("ලියාපදිංචි ගොවිපළ" if is_si else "Registered Herd Manager")

    meta_table = Table([
        [
            Paragraph(f"<b>{'සත්වයාගේ නම' if is_si else 'Animal Name'}:</b> {cow_name}", styles["MFBody"]),
            Paragraph(f"<b>{'කරපටි / ටැග් අංකය' if is_si else 'Tag ID'}:</b> {cow_tag}", styles["MFBody"]),
            Paragraph(f"<b>{'හිමිකරු' if is_si else 'Owner'}:</b> {farmer_name}", styles["MFBody"]),
        ],
        [
            Paragraph(f"<b>{'ප්‍රභේදය' if is_si else 'Breed'}:</b> {cow_breed}", styles["MFBody"]),
            Paragraph(f"<b>{'වයස' if is_si else 'Age'}:</b> {cow_age}", styles["MFBody"]),
            Paragraph(f"<b>{'මොඩියුලය' if is_si else 'Module'}:</b> Milk Fever", styles["MFBody"]),
        ]
    ], colWidths=[174, 174, 175])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 7), ('RIGHTPADDING', (0, 0), (-1, -1), 7),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # Stage Box
    stage_disp = stage_si_map.get(stage_key, stage_key) if is_si else f"Stage: {stage_key} Hypocalcemia"
    diag_table = Table([[
        Paragraph(f"<font size=8 color='#64748b'>{'සායනික අවධිය' if is_si else 'CLINICAL STAGE'}</font><br/><font size=11 color='{cur_style['text'].hexval()}'><b>{stage_disp}</b></font>", styles["MFBody"]),
        Paragraph(f"<font size=8 color='#64748b'>{'අවදානම් ලකුණු' if is_si else 'RISK SCORE'}</font><br/><font size=12 color='{cur_style['text'].hexval()}'><b>{risk_score}/100</b></font>", styles["MFBody"]),
        Paragraph(f"<font size=8 color='#64748b'>{'විශ්වාසනීයත්වය' if is_si else 'CONFIDENCE'}</font><br/><font size=12 color='#0f172a'><b>{conf_float*100:.1f}%</b></font>", styles["MFBody"]),
    ]], colWidths=[270, 130, 123])
    diag_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), cur_style['bg']),
        ('BOX', (0, 0), (-1, -1), 1.0, cur_style['border']),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ('TOPPADDING', (0, 0), (-1, -1), 8), ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 8), ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(diag_table)
    story.append(Spacer(1, 10))

    # Recommendations
    story.append(Paragraph(f"<b>{'ක්ෂණික ප්‍රතිකාර සහ කළමනාකරණ උපදෙස් (Merck Manual)' if is_si else 'Clinical Management & Intervention Guidance'}</b>", styles["MFSec"]))
    if stage_key == "Critical":
        points = [
            "<b>1. හදිසි පශු වෛද්‍ය කැඳවීම:</b> සත්වයා අසාධ්‍ය තත්ත්වයේ සිටින බැවින් මිනිත්තු කිහිපයක් ඇතුළත පශු වෛද්‍යවරයෙකු අමතන්න (+94 11 2 888 888)." if is_si else "<b>1. EMERGENCY VET CALL:</b> Call veterinarian immediately (+94 11 2 888 888). Minutes count.",
            "<b>2. කිසිදු දියරයක් මුඛයෙන් නොදෙන්න:</b> ගිලීමේ හැකියාව නැති බැවින් මුඛයෙන් දියර පෙවීම මරණයට හේතු විය හැක." if is_si else "<b>2. DO NOT DRENCH:</b> Cow cannot swallow; oral drenching causes fatal aspiration pneumonia.",
            "<b>3. පපුව මත රඳවන්න:</b> ආමාශය පිපීම වැළැක්වීමට සත්වයා පපුව මත කෙළින් තබා පිදුරු මිටිවලින් රඳවන්න." if is_si else "<b>3. Sternal Position:</b> Prop cow upright on chest with straw bales to prevent ruminal bloat.",
            "<b>4. නහරගත කැල්සියම්:</b> පශු වෛද්‍යවරයා විසින් 23% කැල්සියම් බොරෝග්ලූකොනේට් නහරගතව ලබාදිය යුතුය." if is_si else "<b>4. IV Calcium:</b> Slow intravenous infusion of 400ml 23% Calcium Borogluconate under vet supervision.",
        ]
    elif stage_key == "Moderate":
        points = [
            "<b>1. පශු වෛද්‍යවරයා අමතන්න:</b> බිම වැටී නැගිටීමට නොහැකි බැවින් නහරගත කැල්සියම් ලබාදීමට පශු වෛද්‍යවරයා කැඳවන්න." if is_si else "<b>1. Veterinary Attention Required:</b> Call veterinary surgeon for IV or SC Calcium Borogluconate.",
            "<b>2. මුඛයෙන් දියර පෙවීමෙන් වළකින්න:</b> ගිලීමේ අපහසුතා ඇති බැවින් මුඛයෙන් ඖෂධ නොදෙන්න." if is_si else "<b>2. Avoid Oral Liquids:</b> Swallowing reflex impaired; oral drenching poses aspiration risk.",
            "<b>3. පිදුරු ඇතිරිලි:</b> ලිස්සා නොයන වියළි පිදුරු ඇතිරිල්ලක් මත සත්වයා රඳවා කකුල් පිරිමදින්න." if is_si else "<b>3. Bedding & Positioning:</b> Non-slip bedding, prop upright, massage limbs to stimulate blood flow.",
            "<b>4. සම්පූර්ණයෙන්ම කිරි නොදොවන්න:</b> මුල් පැය 48 තුළ සම්පූර්ණයෙන් කිරි දෙවීමෙන් වළකින්න." if is_si else "<b>4. Avoid Complete Milking:</b> Avoid complete udder evacuation in the first 24-48 hours.",
        ]
    else:
        points = [
            "<b>1. මුඛ කැල්සියම් බෝලස්:</b> මුඛයෙන් ලබාදෙන කැල්සියම් බෝලස් 1-2ක් වහාම ලබාදෙන්න." if is_si else "<b>1. Oral Calcium Supplementation:</b> Administer 1-2 oral calcium boluses (50g Ca) immediately.",
            "<b>2. මැග්නීසියම් සහ මොලැසස්:</b> උණුසුම් වතුර සමඟ මොලැසස් සහ මැග්නීසියම් මිශ්‍ර කර පානයට දෙන්න." if is_si else "<b>2. Electrolytes & Molasses:</b> Provide warm water supplemented with electrolytes and molasses.",
            "<b>3. නිරීක්ෂණය:</b> මාංශ පේශි වෙව්ලීම පිළිබඳව දිනකට දෙවරක් පරීක්ෂා කරන්න." if is_si else "<b>3. Monitor Progression:</b> Check cow twice daily for muscle tremors and ear temperature.",
            "<b>4. පශු වෛද්‍ය සහාය:</b> පැය 2-4ක් ඇතුළත සුව නොවන්නේ නම් පශු වෛද්‍යවරයා අමතන්න." if is_si else "<b>4. Veterinary Attention:</b> If condition deteriorates within 2-4 hours, summon veterinarian immediately.",
        ]

    guidance_table = Table([[Paragraph(p, styles["MFBody"])] for p in points], colWidths=[523])
    guidance_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f0fdfa")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#99f6e4")),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#ccfbf1")),
        ('TOPPADDING', (0, 0), (-1, -1), 4), ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 8), ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(guidance_table)
    story.append(Spacer(1, 10))

    # Disclaimer
    disc_text = (
        "<b>වගකීම් සීමාව:</b> මෙම වාර්තාව CattleSense AI මගින් ගවයාගේ කැල්සියම් තත්ත්වය ඇගයීමට සකස් කරන ලද්දකි. මෙය වෛද්‍ය ප්‍රතිකාරයක් නොවන අතර පශු වෛද්‍යවරයෙකුගේ උපදෙස් ලබාගත යුතුය."
        if is_si
        else "<b>CLINICAL DISCLAIMER:</b> This assessment is generated by CattleSense AI to assist in hypocalcemia triage. Intravenous therapeutics must only be administered by a qualified veterinarian."
    )
    disc_table = Table([[Paragraph(disc_text, styles["MFDisc"])]], colWidths=[523])
    disc_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ('BOX', (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
        ('TOPPADDING', (0, 0), (-1, -1), 5), ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8), ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(disc_table)

    canvas_maker = NumberedCanvas
    canvas_maker.report_id = report_id
    canvas_maker.language = language
    doc.build(story, canvasmaker=canvas_maker)
    return buffer.getvalue()
