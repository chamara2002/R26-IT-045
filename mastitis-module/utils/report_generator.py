"""
Professional Veterinary Assessment Report Generator for CattleSense Mastitis Module.
Generates comprehensive, multi-page, publication-grade PDF case handover reports
integrating:
- Language selection: English ('en') or Sinhala ('si')
- Case Summary & Critical Veterinary / Statistical Uncertainty Alerts
- Cattle Profile & Farmer metadata (complete field list from Cow model)
- Longitudinal Health History & Trend Trajectory (last 5 assessments, trend badge)
- Farmer Q&A (Clinical observations triage)
- Numerical Biomarkers (Model 2 Decision Tree analysis & physiological ranges)
- Milk Log integration
- Image Analysis & Grad-CAM Explainability (4-panel visual evidence)
- Multimodal Hybrid Fusion Staging & Uncertainty boundaries
- Conservative Farmer Immediate Actions (Merck Veterinary Manual guidance)
- AI Disclaimers & Peer-Reviewed References
"""
import os
import sys
import io
import uuid
import re
import threading
import unicodedata
from datetime import datetime
from pathlib import Path
import numpy as np
import cv2
from PIL import Image as PILImage

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
    Image,
    HRFlowable,
    KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Add parent directory for imports
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BASE_DIR))

from config.config import Config, get_config

# Font paths
FONTS_DIR = BASE_DIR / "assets" / "fonts"
SINHALA_FONT_REGULAR = FONTS_DIR / "NotoSansSinhala-Regular.ttf"
SINHALA_FONT_BOLD = FONTS_DIR / "NotoSansSinhala-Bold.ttf"

_fonts_registered = False
_hb_font_reg = None
_hb_font_bold = None

PUA_BASE = 0xE000

# Sequence tracker for global daily meaningful report IDs
_DAILY_REPORT_SEQUENCES = {}
_DAILY_COW_SEQUENCES = _DAILY_REPORT_SEQUENCES  # Backwards compatibility alias
_seq_lock = threading.Lock()


def generate_meaningful_report_id(cattle_info=None, dt=None):
    """
    Generate simplified, human-readable report ID format:
    RPT-MST-{YYYYMMDD}-{sequence_number}
    e.g., 'RPT-MST-20260825-001', 'RPT-MST-20260825-002'.
    Global daily sequence increments for every report generated that day.
    """
    if dt is None:
        dt = datetime.now()
    date_str = dt.strftime("%Y%m%d")

    with _seq_lock:
        current_seq = _DAILY_REPORT_SEQUENCES.get(date_str, 0) + 1
        _DAILY_REPORT_SEQUENCES[date_str] = current_seq

    seq_str = f"{current_seq:03d}"
    return f"RPT-MST-{date_str}-{seq_str}"


CONSONANT_MAP = {
    'k': '\u0D9A', 'kh': '\u0D9B', 'g': '\u0D9C', 'gh': '\u0D9D', 'ng': '\u0D9E', 'nng': '\u0D9F',
    'c': '\u0DA0', 'ch': '\u0DA1', 'j': '\u0DA2', 'jh': '\u0DA3', 'ny': '\u0DA4', 'jny': '\u0DA5', 'nyj': '\u0DA6',
    'tt': '\u0DA7', 'tth': '\u0DA8', 'dd': '\u0DA9', 'ddh': '\u0DAA', 'nn': '\u0DAB', 'nndd': '\u0DAC',
    't': '\u0DAD', 'th': '\u0DAE', 'd': '\u0DAF', 'dh': '\u0DB0', 'n': '\u0DB1', 'nd': '\u0DB3',
    'p': '\u0DB4', 'ph': '\u0DB5', 'b': '\u0DB6', 'bh': '\u0DB7', 'm': '\u0DB8', 'mb': '\u0DB9',
    'y': '\u0DBA', 'r': '\u0DBB', 'l': '\u0DBD', 'v': '\u0DC0',
    'sh': '\u0DC1', 'ss': '\u0DC2', 's': '\u0DC3', 'h': '\u0DC4', 'll': '\u0DC5', 'f': '\u0DC6',
    'kav': '\u0D9A\u0DCA\u200D\u0DC0', 'kass': '\u0D9A\u0DCA\u200D\u0DC2', 'gadh': '\u0D9C\u0DCA\u200D\u0DB0',
    'nyac': '\u0DA4\u0DCA\u200D\u0DA0', 'ttatth': '\u0DA7\u0DCA\u200D\u0DA8', 'tath': '\u0DAD\u0DCA\u200D\u0DAD',
    'tav': '\u0DAD\u0DCA\u200D\u0DC0', 'dadh': '\u0DAF\u0DCA\u200D\u0DB0', 'dav': '\u0DAF\u0DCA\u200D\u0DC0',
    'nath': '\u0DB1\u0DCA\u200D\u0DAE', 'nad': '\u0DB1\u0DCA\u200D\u0DAF', 'nadh': '\u0DB1\u0DCA\u200D\u0DB0',
    'nav': '\u0DB1\u0DCA\u200D\u0DC0', 'yapost': '\u0DCA\u200D\u0DBA',
}

PUNCT_MAP = {
    'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
    'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
    'period': '.', 'colon': ':', 'ellipsis': '...', 'exclam': '!',
    'asterisk': '*', 'numbersign': '#', 'slash': '/', 'backslash': chr(92),
    'hyphen': '-', 'parenleft': '(', 'parenright': ')', 'braceleft': '{',
    'braceright': '}', 'bracketleft': '[', 'bracketright': ']',
    'quotedblleft': '"', 'quotedblright': '"', 'quoteleft': "'",
    'quoteright': "'", 'quotedbl': '"', 'quotesingle': "'",
    'bar': '|', 'plus': '+', 'multiply': '×', 'divide': '÷',
    'equal': '=', 'greater': '>', 'less': '<', 'percent': '%',
    'comma': ',', 'semicolon': ';', 'question': '?', 'endash': '–',
    'emdash': '—', 'underscore': '_', 'asciitilde': '~', 'asciicircum': '^',
    'minus': '-',
}


def _build_pua_to_hex(glyph_order, font_bytes):
    """Build a mapping from PUA character codes to original UTF-16BE hex strings for ToUnicode CMap."""
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
        g2str[f'{prefix}atouchsinh'] = cons
        g2str[f'{prefix}ivowelsinh'] = cons + '\u0DD2'
        g2str[f'{prefix}iivowelsinh'] = cons + '\u0DD3'
        g2str[f'{prefix}uvowelsinh'] = cons + '\u0DD4'
        g2str[f'{prefix}uuvowelsinh'] = cons + '\u0DD6'
        g2str[f'{prefix}rephsinh'] = '\u0DBB\u0DCA\u200D' + cons
        g2str[f'{prefix}arephsinh'] = '\u0DBB\u0DCA\u200D' + cons
        if prefix != 'anuv':
            g2str[f'{prefix}arasinh'] = '\u0DCA\u200D\u0DBB'
        g2str[f'{prefix}arahalantsinh'] = cons + '\u0DCA\u200D\u0DBB\u0DCA'
        g2str[f'{prefix}arivowelsinh'] = cons + '\u0DCA\u200D\u0DBB\u0DD2'
        g2str[f'{prefix}ariivowelsinh'] = cons + '\u0DCA\u200D\u0DBB\u0DD3'
        g2str[f'{prefix}aavowelsinh'] = cons + '\u0DCF'

    for gid, name in enumerate(glyph_order):
        if name.startswith('u111E') or name.startswith('u111F'):
            try:
                g2str[name] = chr(int(name[1:], 16))
            except Exception:
                pass

    g2str['anusvarasinh'] = '\u0D82'
    g2str['visargasinh'] = '\u0D83'
    g2str['rakarsinh'] = '\u0DCA\u200D\u0DBB'
    g2str['rephsinh'] = '\u0DBB\u0DCA\u200D'
    g2str['yapostsinh'] = '\u0DCA\u200D\u0DBA'
    g2str['yaposthalantsinh'] = '\u0DCA\u200D\u0DBA\u0DCA'
    g2str['evowelsignsinh'] = '\u0DD9'
    g2str['eevowelsignsinh'] = '\u0DDA'
    g2str['aivowelsignsinh'] = '\u0DDB'
    g2str['lvocalicvowelsignsinh'] = '\u0DF3'
    g2str['aevowelsignlowsinh'] = '\u0DD0'
    g2str['aaevowelsignlowsinh'] = '\u0DD1'
    g2str['oovowelsignaltsinh'] = '\u0DD6'
    g2str['llahalantaltsinh'] = '\u0DC5\u0DCA'
    g2str['dayasinh'] = '\u0DAF\u0DCA\u200D\u0DBA'
    g2str['dayahalantsinh'] = '\u0DAF\u0DCA\u200D\u0DBA\u0DCA'
    g2str['dayaavowelsinh'] = '\u0DAF\u0DCA\u200D\u0DBA\u0DCF'
    g2str['dayoovowelsinh'] = '\u0DAF\u0DCA\u200D\u0DBA\u0DDA'
    g2str['raevowelsinh'] = '\u0DBB\u0DD0'
    g2str['raaevowelsinh'] = '\u0DBB\u0DD1'
    g2str['doovowelsignsinh'] = '\u0DAF\u0DD6'
    g2str['darvocalicvowelsinh'] = '\u0DAF\u0DD8'
    g2str['darrvocalicvowelsinh'] = '\u0DAF\u0DF2'

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
    """
    TrueType font subclass for Sinhala complex-script rendering.
    Overrides makeToUnicodeCMap to map Private Use Area (PUA) shaped ligatures
    back to their original Unicode character representations.
    """
    def __init__(self, name, font_bytes_data, pua_map):
        self.pua_map = pua_map
        super().__init__(name, io.BytesIO(font_bytes_data))

    def _makeToUnicodeCMap(self, baseFontName, subset):
        bfchar_lines = []
        for i, code in enumerate(subset):
            hex_target = self.pua_map.get(code, f'{code:04X}')
            bfchar_lines.append(f'<{i:02X}> <{hex_target}>')

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


def _prepare_pua_font(font_path):
    with open(font_path, 'rb') as f:
        font_bytes = f.read()
    tt = FontToolsTTFont(io.BytesIO(font_bytes))
    cmap = tt.getBestCmap()
    glyph_order = tt.getGlyphOrder()
    for gid, name in enumerate(glyph_order):
        cmap[PUA_BASE + gid] = name
    buf = io.BytesIO()
    tt.save(buf)
    buf.seek(0)
    return buf.getvalue(), glyph_order


def _register_sinhala_fonts():
    """Register Noto Sans Sinhala TrueType fonts with HarfBuzz complex-script shaping and custom ToUnicode CMaps."""
    global _fonts_registered, _hb_font_reg, _hb_font_bold
    if not _fonts_registered:
        if SINHALA_FONT_REGULAR.exists() and SINHALA_FONT_BOLD.exists():
            try:
                if _hb_available and FontToolsTTFont is not None:
                    reg_bytes, reg_glyphs = _prepare_pua_font(SINHALA_FONT_REGULAR)
                    bold_bytes, bold_glyphs = _prepare_pua_font(SINHALA_FONT_BOLD)

                    _hb_font_reg = hb.Font(hb.Face(reg_bytes))
                    _hb_font_bold = hb.Font(hb.Face(bold_bytes))

                    pua_hex_reg = _build_pua_to_hex(reg_glyphs, reg_bytes)
                    pua_hex_bold = _build_pua_to_hex(bold_glyphs, bold_bytes)

                    pdfmetrics.registerFont(SinhalaShapedTTFont("NotoSansSinhala", reg_bytes, pua_hex_reg))
                    pdfmetrics.registerFont(SinhalaShapedTTFont("NotoSansSinhala-Bold", bold_bytes, pua_hex_bold))
                else:
                    pdfmetrics.registerFont(TTFont("NotoSansSinhala", str(SINHALA_FONT_REGULAR)))
                    pdfmetrics.registerFont(TTFont("NotoSansSinhala-Bold", str(SINHALA_FONT_BOLD)))
                _fonts_registered = True
            except Exception as e:
                print(f"[ReportGenerator] Warning: Could not register Sinhala fonts: {e}")


# Register fonts on module load
_register_sinhala_fonts()


def shape_sinhala_str(text, is_bold=False):
    """Shape a plain Sinhala string via HarfBuzz and return PUA-mapped ligature glyph characters."""
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
    """Shape HTML/XML-formatted Sinhala text by shaping only non-tag text chunks."""
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


def normalize_sinhala_text(text):
    """
    Canonicalize extracted Sinhala text by composing vowels and resolving visual-order Kombuva.
    Ensures 100% fidelity when validating or extracting Sinhala PDF text layers.
    """
    if not text:
        return text
    # Fix pypdf space-replacement of ZWJ in conjuncts (e.g. ් + space + ර/ය -> ් + ZWJ + ර/ය)
    text = re.sub('[\u0DCA][ \u200C\u200D]+([\u0DBB\u0DBA\u0DC2\u0DC0\u0DB0\u0DAF\u0DAD\u0DA8])', lambda m: '\u0DCA\u200D' + m.group(1), text)
    # 1. ෙ + Consonant + ෟ -> Consonant + ෞ
    text = re.sub('\u0DD9([\u0D9A-\u0DC6])\u0DF3', lambda m: m.group(1) + '\u0DDE', text)
    # 2. ෙ + Consonant + ා -> Consonant + ො
    text = re.sub('\u0DD9([\u0D9A-\u0DC6])\u0DCF', lambda m: m.group(1) + '\u0DDC', text)
    # 3. ෙ + Consonant + ් -> Consonant + ේ
    text = re.sub('\u0DD9([\u0D9A-\u0DC6])\u0DCA', lambda m: m.group(1) + '\u0DDA', text)
    # 4. ෙ + Consonant -> Consonant + ෙ
    text = re.sub('\u0DD9([\u0D9A-\u0DC6])', lambda m: m.group(1) + '\u0DD9', text)
    # 5. ෛ + Consonant -> Consonant + ෛ
    text = re.sub('\u0DDB([\u0D9A-\u0DC6])', lambda m: m.group(1) + '\u0DDB', text)
    # 6. කි්‍ර -> ක්‍රි
    text = re.sub('([\u0D9A-\u0DC6])\u0DD2\u0DCA\u200D\u0DBB', lambda m: m.group(1) + '\u0DCA\u200D\u0DBB\u0DD2', text)
    return unicodedata.normalize('NFC', text)


class Paragraph(RLParagraph):
    """Auto-shaping Paragraph wrapper for ReportLab Platypus."""
    def __init__(self, text, style, *args, **kwargs):
        font_name = getattr(style, 'fontName', '')
        if font_name.startswith('NotoSansSinhala') and text:
            is_bold = 'Bold' in font_name
            text = shape_sinhala_html(text, is_bold=is_bold)
        super().__init__(text, style, *args, **kwargs)


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas for precise page count computation and standard headers/footers.
    Supports English ('en') and Sinhala ('si') typography.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []
        self.report_id = getattr(self, "report_id", "RPT-MST")
        self.language = getattr(self, "language", "en")

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
        if self.language == "si":
            _register_sinhala_fonts()
        is_si = (self.language == "si" and _fonts_registered)
        fn_bold = "NotoSansSinhala-Bold" if is_si else "Helvetica-Bold"
        fn_reg = "NotoSansSinhala" if is_si else "Helvetica"

        self.setFont(fn_bold, 8)
        self.setFillColor(colors.HexColor("#0f766e"))

        # Top Running Header (Pages > 1)
        if self._pageNumber > 1:
            header_title = "CattleSense — මැෂින් ලර්නින් පාදක ගව රෝග හඳුනාගැනීම" if is_si else "CattleSense — ML-Based Early Detection of Cattle Diseases"
            header_sub = "මැස්ටයිටිස් පරීක්ෂණ සහ පශු වෛද්‍ය සමාලෝචන වාර්තාව" if is_si else "MASTITIS ASSESSMENT & VETERINARY REVIEW REPORT"

            if is_si:
                header_title = shape_sinhala_html(header_title, is_bold=True)
                header_sub = shape_sinhala_html(header_sub, is_bold=False)

            self.drawString(36, 808, header_title)
            self.setFont(fn_reg, 8)
            self.setFillColor(colors.HexColor("#64748b"))
            self.drawRightString(559, 808, header_sub)
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(36, 802, 559, 802)

        # Bottom Running Footer (All Pages)
        # Separator line at y = 42 pt (above the 50pt bottom margin content boundary)
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(36, 42, 559, 42)

        # Line 1: Branding & Report ID (y = 28 pt)
        self.setFont(fn_reg, 7.5)
        self.setFillColor(colors.HexColor("#64748b"))
        line1_left = (
            "CattleSense — AI සහායක පශු වෛද්‍ය තීරණ සහාය"
            if is_si
            else "CattleSense — AI-Assisted Veterinary Decision-Support"
        )
        if is_si:
            line1_left = shape_sinhala_html(line1_left, is_bold=False)

        report_id_str = getattr(self, "report_id", "RPT-MST")
        line1_right = (
            f"වාර්තා අංකය: {report_id_str}"
            if is_si
            else f"Report ID: {report_id_str}"
        )
        if is_si:
            line1_right = shape_sinhala_html(line1_right, is_bold=False)

        # Dynamic clearance check: calculate exact string widths
        w_l1 = pdfmetrics.stringWidth(line1_left, fn_reg, 7.5)
        w_r1 = pdfmetrics.stringWidth(line1_right, fn_reg, 7.5)
        avail_width = 523.0  # 559 - 36 printable width

        if w_l1 + w_r1 + 16 > avail_width:
            scale = (avail_width - 16) / (w_l1 + w_r1)
            adj_size = max(5.5, 7.5 * scale)
            self.setFont(fn_reg, adj_size)

        self.drawString(36, 28, line1_left)
        self.drawRightString(559, 28, line1_right)

        # Line 2: Confidentiality Notice & Page Numbers (y = 18 pt)
        self.setFont(fn_reg, 7.0)
        self.setFillColor(colors.HexColor("#94a3b8"))
        line2_left = (
            "රහස්‍යයි — ගොවි සහ පශු වෛද්‍ය භාවිතය සඳහා පමණි"
            if is_si
            else "Confidential — For Farmer & Veterinary Clinical Use"
        )
        if is_si:
            line2_left = shape_sinhala_html(line2_left, is_bold=False)

        line2_right = (
            f"පිටුව {self._pageNumber} / {page_count}"
            if is_si
            else f"Page {self._pageNumber} of {page_count}"
        )
        if is_si:
            line2_right = shape_sinhala_html(line2_right, is_bold=False)

        w_l2 = pdfmetrics.stringWidth(line2_left, fn_reg, 7.0)
        w_r2 = pdfmetrics.stringWidth(line2_right, fn_reg, 7.0)
        if w_l2 + w_r2 + 16 > avail_width:
            scale = (avail_width - 16) / (w_l2 + w_r2)
            adj_size = max(5.0, 7.0 * scale)
            self.setFont(fn_reg, adj_size)

        self.drawString(36, 18, line2_left)
        self.drawRightString(559, 18, line2_right)
        self.restoreState()


class VeterinaryReportGenerator:
    """
    Generates structured, professional Veterinary Case Handover PDFs for Mastitis.
    Supports English and Sinhala languages with complete longitudinal health history.
    """

    def __init__(self):
        self.config = get_config()
        _register_sinhala_fonts()

    def _get_font_names(self, language="en"):
        """Select appropriate font family based on language and font availability."""
        if language == "si":
            _register_sinhala_fonts()
            if _fonts_registered:
                return "NotoSansSinhala", "NotoSansSinhala-Bold", "NotoSansSinhala"
        return "Helvetica", "Helvetica-Bold", "Helvetica-Oblique"

    def _init_styles(self, language="en"):
        """Initialize harmonious typography and color palettes for the selected language."""
        styles = getSampleStyleSheet()
        fn_reg, fn_bold, fn_oblique = self._get_font_names(language)

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
        self.c_warning_text = colors.HexColor("#92400e")  # Amber 800

        # Custom paragraph styles
        styles.add(ParagraphStyle(
            name="ReportTitle",
            fontName=fn_bold,
            fontSize=15,
            leading=18,
            textColor=self.c_dark,
        ))
        styles.add(ParagraphStyle(
            name="ReportSubtitle",
            fontName=fn_reg,
            fontSize=9.5,
            leading=12,
            textColor=self.c_primary,
        ))
        styles.add(ParagraphStyle(
            name="SectionHeading",
            fontName=fn_bold,
            fontSize=10.5,
            leading=13.5,
            textColor=self.c_primary,
            spaceBefore=8,
            spaceAfter=3,
        ))
        styles.add(ParagraphStyle(
            name="SubSectionHeading",
            fontName=fn_bold,
            fontSize=9,
            leading=11.5,
            textColor=self.c_dark,
            spaceBefore=5,
            spaceAfter=2,
        ))
        styles.add(ParagraphStyle(
            name="BodyTextCustom",
            fontName=fn_reg,
            fontSize=8,
            leading=11,
            textColor=self.c_text,
        ))
        styles.add(ParagraphStyle(
            name="BodyTextBold",
            fontName=fn_bold,
            fontSize=8,
            leading=11,
            textColor=self.c_dark,
        ))
        styles.add(ParagraphStyle(
            name="MetaLabel",
            fontName=fn_bold,
            fontSize=7.5,
            leading=9.5,
            textColor=self.c_muted,
        ))
        styles.add(ParagraphStyle(
            name="MetaValue",
            fontName=fn_reg,
            fontSize=7.5,
            leading=9.5,
            textColor=self.c_dark,
        ))
        styles.add(ParagraphStyle(
            name="TableHead",
            fontName=fn_bold,
            fontSize=7.5,
            leading=9.5,
            textColor=colors.white,
        ))
        styles.add(ParagraphStyle(
            name="TableCell",
            fontName=fn_reg,
            fontSize=7.5,
            leading=10,
            textColor=self.c_text,
        ))
        styles.add(ParagraphStyle(
            name="TableCellBold",
            fontName=fn_bold,
            fontSize=7.5,
            leading=10,
            textColor=self.c_dark,
        ))
        styles.add(ParagraphStyle(
            name="CaptionText",
            fontName=fn_oblique,
            fontSize=7,
            leading=9,
            textColor=self.c_muted,
            alignment=1,  # Center
        ))
        styles.add(ParagraphStyle(
            name="AlertTitle",
            fontName=fn_bold,
            fontSize=9.5,
            leading=12,
            textColor=self.c_alert_text,
        ))
        styles.add(ParagraphStyle(
            name="AlertBody",
            fontName=fn_reg,
            fontSize=8,
            leading=10.5,
            textColor=self.c_alert_text,
        ))
        styles.add(ParagraphStyle(
            name="WarningTitle",
            fontName=fn_bold,
            fontSize=9,
            leading=11.5,
            textColor=self.c_warning_text,
        ))
        styles.add(ParagraphStyle(
            name="WarningBody",
            fontName=fn_reg,
            fontSize=8,
            leading=10.5,
            textColor=self.c_warning_text,
        ))
        styles.add(ParagraphStyle(
            name="ResearchBox",
            fontName=fn_reg,
            fontSize=7.5,
            leading=10.5,
            textColor=self.c_text,
        ))

        self.styles = styles

    def generate_pdf(
        self,
        prediction_result,
        cattle_info=None,
        farmer_info=None,
        health_history=None,
        original_image_path=None,
        cropped_image_path=None,
        heatmap_image_path=None,
        overlay_image_path=None,
        report_id=None,
        output_path=None,
        language="en",
    ):
        """
        Generate the full PDF document and return bytes or save to output_path.
        
        Args:
            prediction_result (dict): prediction outcome, probabilities, severity, clinical triage
            cattle_info (dict): full registered cow profile properties
            farmer_info (dict): farmer/farm identification metadata
            health_history (dict): longitudinal trend data (timeline, trend_state, follow_ups)
            original_image_path (str): path to original photo (Panel A)
            cropped_image_path (str): path to farmer-cropped ROI (Panel B)
            heatmap_image_path (str): path to raw heatmap (Panel C)
            overlay_image_path (str): path to heatmap overlay (Panel D)
            report_id (str): unique identifier string for report
            output_path (str): optional file path to save PDF directly
            language (str): 'en' for English (default) or 'si' for Sinhala
        """
        # Validate language
        if language not in ("en", "si"):
            language = "en"

        self._init_styles(language=language)

        prediction_result = prediction_result or {}
        cattle_info = cattle_info or {}
        farmer_info = farmer_info or {}
        health_history = health_history or {}

        if not report_id:
            report_id = generate_meaningful_report_id(cattle_info)

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
        story.extend(self._build_header_section(report_id, language))
        story.append(Spacer(1, 6))

        # ── 2. CASE SUMMARY & CRITICAL VETERINARY ALERT ──────────────────────
        story.extend(self._build_summary_banner(prediction_result, cattle_info, farmer_info, language))
        story.append(Spacer(1, 6))

        # ── 3. COW PROFILE & LONGITUDINAL HEALTH HISTORY (NEW SECTION) ───────
        story.extend(self._build_cow_profile_and_history_section(cattle_info, farmer_info, health_history, language))
        story.append(Spacer(1, 6))

        # ── 4. FARMER CLINICAL QUESTIONNAIRE (Q&A) ───────────────────────────
        story.extend(self._build_qna_section(prediction_result.get("clinical_observations"), language))
        story.append(Spacer(1, 6))

        # ── 5. NUMERICAL BIOMARKERS & MODEL 2 ANALYSIS ────────────────────────
        story.extend(self._build_numerical_analysis_section(prediction_result, language))
        story.append(Spacer(1, 6))

        # ── 6. MILK LOG INTEGRATION INFORMATION ──────────────────────────────
        story.extend(self._build_milk_log_section(prediction_result, cattle_info, language))
        story.append(Spacer(1, 6))

        # ── 7. EXPLAINABLE AI — GRAD-CAM IMAGE ANALYSIS (RESEARCH NOVELTY) ───
        story.extend(self._build_gradcam_section(
            prediction_result,
            original_image_path,
            cropped_image_path,
            heatmap_image_path,
            overlay_image_path,
            language
        ))
        story.append(Spacer(1, 6))

        # ── 8. MULTIMODAL HYBRID FUSION ASSESSMENT ────────────────────────────
        story.extend(self._build_hybrid_assessment_section(prediction_result, language))
        story.append(Spacer(1, 6))

        # ── 9. FARMER IMMEDIATE ACTION GUIDANCE (VETERINARY-SAFE) ────────────
        story.extend(self._build_farmer_guidance_section(prediction_result, language))
        story.append(Spacer(1, 6))

        # ── 10. AI DISCLAIMER & CLINICAL NOTICE ─────────────────────────────
        story.extend(self._build_disclaimer_section(language))

        # Build document with NumberedCanvas
        class ConfiguredNumberedCanvas(NumberedCanvas):
            pass
        ConfiguredNumberedCanvas.report_id = report_id
        ConfiguredNumberedCanvas.language = language

        doc.build(story, canvasmaker=ConfiguredNumberedCanvas)

        if output_path is None:
            pdf_bytes = buffer.getvalue()
            buffer.close()
            return pdf_bytes
        return output_path

    # =========================================================================
    # SECTION BUILDERS
    # =========================================================================

    def _build_header_section(self, report_id, lang):
        """Header with branding, report ID, and assessment timestamp."""
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        is_si = (lang == "si")

        title_text = "CattleSense"
        subtitle_text = "මැෂින් ලර්නින් පාදක ගව රෝග හඳුනාගැනීම" if is_si else "ML-Based Early Detection of Cattle Diseases"
        subheading_text = "මැස්ටයිටිස් පරීක්ෂණ සහ පශු වෛද්‍ය සමාලෝචන වාර්තාව" if is_si else "MASTITIS ASSESSMENT & VETERINARY REVIEW REPORT"

        lbl_report_id = "වාර්තා අංකය:" if is_si else "Report ID:"
        lbl_generated = "ජනනය කළ දිනය:" if is_si else "Generated:"
        lbl_doc_type = "ලේඛන වර්ගය:" if is_si else "Document Type:"
        val_doc_type = "සායනික තීරණ සහායක වාර්තාව" if is_si else "Clinical Decision Support"
        lbl_version = "අනුවාදය:" if is_si else "Version:"
        val_version = "1.0 (පර්යේෂණ නිකුතුව)" if is_si else "1.0 (Research Release)"

        title_cell = [
            Paragraph(title_text, self.styles["ReportTitle"]),
            Paragraph(subtitle_text, self.styles["ReportSubtitle"]),
            Paragraph(subheading_text, self.styles["SubSectionHeading"]),
        ]

        meta_cell = [
            Paragraph(f"<b>{lbl_report_id}</b> {report_id}", self.styles["MetaLabel"]),
            Paragraph(f"<b>{lbl_generated}</b> {now_str}", self.styles["MetaValue"]),
            Paragraph(f"<b>{lbl_doc_type}</b> {val_doc_type}", self.styles["MetaValue"]),
            Paragraph(f"<b>{lbl_version}</b> {val_version}", self.styles["MetaValue"]),
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
            Spacer(1, 3),
            HRFlowable(width="100%", thickness=1.5, color=self.c_primary, spaceBefore=2, spaceAfter=4),
        ]

    def _build_summary_banner(self, result, cattle_info, farmer_info, lang):
        """Top case summary card with prominent critical alert if indicated."""
        elements = []
        is_si = (lang == "si")

        not_rec = "සටහන් කර නැත" if is_si else "Not recorded"
        reg_farmer = "ලියාපදිංචි ගොවියා" if is_si else "Registered Farmer"

        cow_name = cattle_info.get("name") or cattle_info.get("tag_id") or not_rec
        farmer_name = farmer_info.get("name") or reg_farmer
        prediction = result.get("prediction", "Unknown")
        pred_display = ("මැස්ටයිටිස් (ආසාදිත)" if prediction == "Mastitis" else "සාමාන්‍ය (නිරෝගී)") if is_si else prediction

        confidence = result.get("confidence")
        conf_str = f"{confidence * 100:.1f}%" if isinstance(confidence, (int, float)) else "N/A"
        
        severity_obj = result.get("severity") or {}
        severity_level = (severity_obj.get("severity_level") or "negative").lower()

        stage = result.get("stage") or ("Mastitis Detected" if prediction == "Mastitis" else "No Mastitis")
        if is_si:
            stage_lower = str(stage).lower()
            if "insufficient" in stage_lower or severity_level == "insufficient_data":
                stage_display = "ප්‍රමාණවත් සායනික දත්ත නොමැත (ඉතිරි විස්තර අවශ්‍යයි)"
            elif "severe" in stage_lower or "critical" in stage_lower or severity_level in ["severe", "critical", "3"]:
                stage_display = "දරුණු මැස්ටයිටිස් (Severe / Critical)"
            elif "moderate" in stage_lower or severity_level in ["moderate", "2"]:
                stage_display = "මධ්‍යස්ථ මැස්ටයිටිස් (Moderate)"
            elif "mild" in stage_lower or severity_level in ["mild", "1"]:
                stage_display = "සුළු මැස්ටයිටිස් (Mild)"
            elif prediction == "Normal" or severity_level in ["negative", "0"] or "no mastitis" in stage_lower or "healthy" in stage_lower:
                stage_display = "නිරෝගී / මැස්ටයිටිස් නොමැත (Normal)"
            else:
                stage_display = "ප්‍රමාණවත් සායනික දත්ත නොමැත (ඉතිරි විස්තර අවශ්‍යයි)"
        else:
            stage_display = str(stage)

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
            priority_str = "හදිසි පශු වෛද්‍ය අවධානය අවශ්‍යයි" if is_si else "CRITICAL VETERINARY ATTENTION REQUIRED"
            priority_color = self.c_alert_text
        elif is_healthy:
            priority_str = "සාමාන්‍ය නිරීක්ෂණය සහ අධීක්ෂණය" if is_si else "Routine Observation / Monitoring"
            priority_color = self.c_primary
        elif severity_level in ["moderate", "2"] or "moderate" in str(stage).lower():
            priority_str = "පශු වෛද්‍ය උපදෙස් ලබාගැනීම නිර්දේශ කෙරේ" if is_si else "Veterinary Consultation Recommended"
            priority_color = self.c_secondary
        else:
            priority_str = "නිරීක්ෂණය සහ වැඩිදුර බුරුළු රැකවරණය" if is_si else "Observation & Increased Udder Care"
            priority_color = self.c_secondary

        is_borderline = bool(
            result.get("is_borderline")
            or result.get("uncertainty_level") == "borderline_uncertain"
        )
        borderline_label = "[සීමාකාරී]" if is_si else "[Borderline]"
        borderline_badge = f" <font color='#b45309'><b>{borderline_label}</b></font>" if is_borderline else ""

        mode_val = result.get("mode", "Assisted")
        if is_si:
            if mode_val in ["Assisted", "multimodal_image_numerical"]:
                mode_display = f"සම්මිශ්‍රිත විශ්ලේෂණය ({mode_val})"
            elif mode_val == "image_only":
                mode_display = "ඡායාරූප විශ්ලේෂණය (image_only)"
            else:
                mode_display = f"ජෛව දත්ත විශ්ලේෂණය ({mode_val})"
        else:
            mode_display = str(mode_val)

        summary_data = [
            [
                Paragraph("<b>අදාළ ගවයා:</b>" if is_si else "<b>Subject Cow:</b>", self.styles["TableCellBold"]),
                Paragraph(str(cow_name), self.styles["TableCell"]),
                Paragraph("<b>ගොවියා / ගොවිපළ:</b>" if is_si else "<b>Farmer / Farm:</b>", self.styles["TableCellBold"]),
                Paragraph(str(farmer_name), self.styles["TableCell"]),
            ],
            [
                Paragraph("<b>AI අනාවැකිය:</b>" if is_si else "<b>AI Prediction:</b>", self.styles["TableCellBold"]),
                Paragraph(f"<b>{pred_display}</b> ({conf_str}){borderline_badge}", self.styles["TableCell"]),
                Paragraph("<b>අවදානම් මට්ටම:</b>" if is_si else "<b>Severity Staging:</b>", self.styles["TableCellBold"]),
                Paragraph(stage_display, self.styles["TableCell"]),
            ],
            [
                Paragraph("<b>ප්‍රමුඛතාවය:</b>" if is_si else "<b>Priority:</b>", self.styles["TableCellBold"]),
                Paragraph(f"<font color='{priority_color.hexval()}'><b>{priority_str}</b></font>", self.styles["TableCellBold"]),
                Paragraph("<b>පරීක්ෂණ ආකාරය:</b>" if is_si else "<b>Assessment Mode:</b>", self.styles["TableCellBold"]),
                Paragraph(mode_display, self.styles["TableCell"]),
            ],
        ]

        summary_table = Table(summary_data, colWidths=[95, 165, 95, 168])
        summary_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), self.c_bg_light),
            ("BOX", (0, 0), (-1, -1), 1, self.c_border),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, self.c_border),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(summary_table)

        # Critical alert box
        if is_critical:
            elements.append(Spacer(1, 4))
            alert_reasons = []
            obs = result.get("clinical_observations") or {}
            if str(obs.get("udder_swelling", "")).lower() in ["yes", "severe"]:
                alert_reasons.append("වාර්තා වූ බුරුළු ඉදිමීම" if is_si else "Reported udder swelling")
            if str(obs.get("udder_warmth", "")).lower() in ["yes", "severe"]:
                alert_reasons.append("බුරුල්ලේ අධික උෂ්ණත්වය" if is_si else "Elevated udder warmth")
            if str(obs.get("udder_pain", "")).lower() in ["yes", "severe"]:
                alert_reasons.append("දොවන විට වේදනාව / පයින් ගැසීම" if is_si else "Visible udder pain / kicking during milking")
            if str(obs.get("milk_appearance", "")).lower() in ["clots", "watery", "blood"]:
                alert_reasons.append("කිරි වල අසාමාන්‍යතා (කැටි/වෙනස් වීම්)" if is_si else "Abnormal milk appearance (clots/discoloration)")

            reason_str = (f" සායනික ලක්ෂණ: {', '.join(alert_reasons)}." if is_si else f" Clinical flags: {', '.join(alert_reasons)}.") if alert_reasons else ""

            alert_title = "[!] හදිසි පශු වෛද්‍ය අවධානය අවශ්‍යයි" if is_si else "[!] CRITICAL VETERINARY ATTENTION REQUIRED"
            alert_body = (
                "CattleSense පරීක්ෂාව මඟින් උග්‍ර මැස්ටයිටිස් තත්ත්වයකට අදාළ ලක්ෂණ හඳුනාගෙන ඇත. "
                f"කඩිනම් පශු වෛද්‍ය පරීක්ෂාවක් සිදුකිරීම අත්‍යවශ්‍ය වේ.{reason_str}"
                if is_si
                else "The CattleSense assessment identified findings associated with a potentially serious mastitis case. "
                f"Prompt veterinary examination is recommended.{reason_str}"
            )

            alert_content = [
                Paragraph(alert_title, self.styles["AlertTitle"]),
                Paragraph(alert_body, self.styles["AlertBody"]),
            ]
            alert_table = Table([[alert_content]], colWidths=[523])
            alert_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), self.c_alert_bg),
                ("BOX", (0, 0), (-1, -1), 1.5, self.c_alert_border),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
            ]))
            elements.append(alert_table)

        # Statistical Uncertainty / Borderline Advisory Box
        if is_borderline:
            elements.append(Spacer(1, 4))
            uncertainty_note_text = result.get("uncertainty_note") or (
                "මෙම ප්‍රතිඵලය තීරණාත්මක සීමාවට ආසන්න සීමාකාරී කලාපයේ (Borderline) පවතී. ක්ෂේත්‍ර පරීක්ෂාවක් (CMT) හෝ පශු වෛද්‍යවරයකු ලවා තහවුරු කරගැනීම සුදුසුය."
                if is_si
                else "This result is close to the model's active decision threshold (statistical borderline zone). "
                "Veterinary confirmation and on-field clinical testing (e.g., CMT) are recommended."
            )
            dist = result.get("threshold_distance")
            dist_str = (f" [තීරණ පරතරය: {dist * 100:.1f}%]" if is_si else f" [Decision Margin: {dist * 100:.1f}%]") if isinstance(dist, (int, float)) else ""

            warn_title = f"[!] සංඛ්‍යානමය අවිනිශ්චිතතාවය: සීමාකාරී රෝග විනිශ්චය{dist_str}" if is_si else f"[!] STATISTICAL UNCERTAINTY: BORDERLINE PREDICTION{dist_str}"
            warn_body = (
                f"<b>සායනික උපදේශය:</b> {uncertainty_note_text} "
                "සංඛ්‍යානමය විශ්වාසනීයත්වය තීරණ සීමාවේ පවතින බැවින්, ස්වාධීන සායනික පරීක්ෂණයකින් තොරව මෙම ප්‍රතිඵලය අවසන් නිගමනයක් ලෙස නොසලකන්න."
                if is_si
                else f"<b>Clinical Advisory:</b> {uncertainty_note_text} "
                "The statistical confidence falls within the borderline band around the decision boundary; "
                "therefore, this result must not be treated as definitive without independent clinical confirmation."
            )

            warning_content = [
                Paragraph(warn_title, self.styles["WarningTitle"]),
                Paragraph(warn_body, self.styles["WarningBody"]),
            ]
            warning_table = Table([[warning_content]], colWidths=[523])
            warning_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), self.c_warning_bg),
                ("BOX", (0, 0), (-1, -1), 1.2, self.c_warning_border),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
            ]))
            elements.append(warning_table)

        return elements

    def _build_cow_profile_and_history_section(self, cattle_info, farmer_info, health_history, lang):
        """Complete cow profile metadata and longitudinal assessment history timeline."""
        is_si = (lang == "si")
        elements = [
            Paragraph("1. ගව පැතිකඩ සහ දීර්ඝකාලීන සෞඛ්‍ය ඉතිහාසය" if is_si else "1. COW PROFILE & LONGITUDINAL HEALTH HISTORY", self.styles["SectionHeading"]),
        ]

        def fmt(val):
            return str(val) if val not in (None, "", "null") else ("සටහන් කර නැත" if is_si else "Not recorded")

        # ── A. Full Cow Profile Table ──
        cow_dob = cattle_info.get("date_of_birth")
        cow_reg = cattle_info.get("created_at")
        age_str = f"{cattle_info.get('age')} " + ("වසර" if is_si else "years") if cattle_info.get("age") is not None else fmt(None)
        lactation_val = cattle_info.get("current_lactation") or cattle_info.get("lactation_count")

        profile_data = [
            [
                Paragraph("<b>කන් ටැග් අංකය:</b>" if is_si else "<b>Ear Tag / ID:</b>", self.styles["TableCellBold"]),
                Paragraph(fmt(cattle_info.get("tag_id")), self.styles["TableCell"]),
                Paragraph("<b>ගවයාගේ නම:</b>" if is_si else "<b>Cow Name:</b>", self.styles["TableCellBold"]),
                Paragraph(fmt(cattle_info.get("name")), self.styles["TableCell"]),
            ],
            [
                Paragraph("<b>ප්‍රභේදය:</b>" if is_si else "<b>Breed:</b>", self.styles["TableCellBold"]),
                Paragraph(fmt(cattle_info.get("breed")), self.styles["TableCell"]),
                Paragraph("<b>වයස / ස්ත්‍රී-පුරුෂ භාවය:</b>" if is_si else "<b>Age / Gender:</b>", self.styles["TableCellBold"]),
                Paragraph(f"{age_str} / {fmt(cattle_info.get('gender', 'Female'))}", self.styles["TableCell"]),
            ],
            [
                Paragraph("<b>කිරි මුර ගණන:</b>" if is_si else "<b>Lactation Count:</b>", self.styles["TableCellBold"]),
                Paragraph(fmt(lactation_val), self.styles["TableCell"]),
                Paragraph("<b>ලියාපදිංචි කළ දිනය:</b>" if is_si else "<b>Registration Date:</b>", self.styles["TableCellBold"]),
                Paragraph(fmt(cow_reg), self.styles["TableCell"]),
            ],
            [
                Paragraph("<b>ගොවියාගේ නම:</b>" if is_si else "<b>Farmer Name:</b>", self.styles["TableCellBold"]),
                Paragraph(fmt(farmer_info.get("name")), self.styles["TableCell"]),
                Paragraph("<b>ගොවිපළේ නම:</b>" if is_si else "<b>Farm Name:</b>", self.styles["TableCellBold"]),
                Paragraph(fmt(farmer_info.get("farm_name")), self.styles["TableCell"]),
            ],
            [
                Paragraph("<b>දිස්ත්‍රික්කය / ස්ථානය:</b>" if is_si else "<b>District / Location:</b>", self.styles["TableCellBold"]),
                Paragraph(fmt(farmer_info.get("district") or farmer_info.get("province")), self.styles["TableCell"]),
                Paragraph("<b>දුරකථන අංකය:</b>" if is_si else "<b>Contact Phone:</b>", self.styles["TableCellBold"]),
                Paragraph(fmt(farmer_info.get("phone")), self.styles["TableCell"]),
            ],
        ]

        profile_table = Table(profile_data, colWidths=[105, 155, 105, 158])
        profile_table.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.5, self.c_border),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, self.c_border),
            ("BACKGROUND", (0, 0), (0, -1), self.c_bg_light),
            ("BACKGROUND", (2, 0), (2, -1), self.c_bg_light),
            ("TOPPADDING", (0, 0), (-1, -1), 2.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(profile_table)
        elements.append(Spacer(1, 4))

        # ── B. Longitudinal Trend Trajectory & Past Assessments ──
        timeline = health_history.get("timeline") or []
        trend_state = health_history.get("trend_state", "Insufficient Data")
        trend_msg = health_history.get("trend_message", "")

        # Translate trend state
        if is_si:
            trend_map = {
                "Improving": "සුවපත් වෙමින් පවතී (Improving)",
                "Stable": "ස්ථාවරයි (Stable)",
                "Worsening": "උග්‍ර වෙමින් පවතී (Worsening)",
                "Rapidly Worsening": "වේගයෙන් උග්‍ර වේ (Rapidly Worsening)",
                "Persistent Issue": "නොනැසී පවතින ගැටලුවකි (Persistent)",
                "Fluctuating / Relapsing": "වෙනස් වන සුළුයි (Fluctuating)",
                "Insufficient Data": "ප්‍රමාණවත් දත්ත නොමැත (Insufficient Data)",
            }
            trend_display = trend_map.get(trend_state, trend_state)
        else:
            trend_display = trend_state

        if "improving" in trend_state.lower():
            badge_color = self.c_success_border
            badge_bg = self.c_success_bg
        elif "worsen" in trend_state.lower():
            badge_color = self.c_alert_border
            badge_bg = self.c_alert_bg
        elif "stable" in trend_state.lower():
            badge_color = self.c_primary
            badge_bg = colors.HexColor("#f0fdfa")
        else:
            badge_color = self.c_muted
            badge_bg = self.c_bg_light

        trend_box = [
            Paragraph(
                f"<b>{'සෞඛ්‍ය ප්‍රවණතාවය' if is_si else 'Longitudinal Health Trend'}:</b> "
                f"<font color='{badge_color.hexval()}'><b>{trend_display}</b></font>"
                + (f" — <i>{trend_msg}</i>" if trend_msg else ""),
                self.styles["TableCell"],
            )
        ]
        trend_table = Table([[trend_box]], colWidths=[523])
        trend_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), badge_bg),
            ("BOX", (0, 0), (-1, -1), 1, badge_color),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(trend_table)
        elements.append(Spacer(1, 4))

        # ── C. Last 5 Assessments Table ──
        if timeline:
            # Sort descending to get latest first, take up to 5
            sorted_recent = list(reversed(timeline))[:5]
            total_history = len(timeline)

            history_rows = [
                [
                    Paragraph("<b>දිනය</b>" if is_si else "<b>Date</b>", self.styles["TableHead"]),
                    Paragraph("<b>AI අනාවැකිය</b>" if is_si else "<b>Prediction</b>", self.styles["TableHead"]),
                    Paragraph("<b>අවදානම් මට්ටම</b>" if is_si else "<b>Severity Staging</b>", self.styles["TableHead"]),
                    Paragraph("<b>විශ්වාසනීයත්වය</b>" if is_si else "<b>Confidence</b>", self.styles["TableHead"]),
                    Paragraph("<b>සීමාකාරී තත්ත්වය</b>" if is_si else "<b>Decision Margin</b>", self.styles["TableHead"]),
                ]
            ]

            for a in sorted_recent:
                a_date = a.get("display_date") or a.get("date") or "N/A"
                a_pred = a.get("prediction", "N/A")
                if is_si:
                    a_pred_str = "මැස්ටයිටිස්" if a_pred == "Mastitis" else ("සාමාන්‍ය" if a_pred == "Normal" else a_pred)
                else:
                    a_pred_str = a_pred

                a_stage = a.get("raw_stage") or a.get("severity_level") or "N/A"
                if is_si:
                    st_low = str(a_stage).lower()
                    if "severe" in st_low:
                        a_stage_str = "දරුණු (Severe)"
                    elif "moderate" in st_low:
                        a_stage_str = "මධ්‍යස්ථ (Moderate)"
                    elif "mild" in st_low:
                        a_stage_str = "සුළු (Mild)"
                    else:
                        a_stage_str = "නිරෝගී (Normal)"
                else:
                    a_stage_str = str(a_stage)

                conf_val = a.get("confidence")
                a_conf_str = f"{conf_val * 100:.1f}%" if isinstance(conf_val, (int, float)) else "N/A"
                a_borderline = bool(a.get("is_borderline", False))
                a_status_str = ("<font color='#b45309'><b>සීමාකාරී</b></font>" if is_si else "<font color='#b45309'><b>Borderline</b></font>") if a_borderline else ("සාමාන්‍ය" if is_si else "Confident")

                history_rows.append([
                    Paragraph(str(a_date), self.styles["TableCellBold"]),
                    Paragraph(a_pred_str, self.styles["TableCell"]),
                    Paragraph(a_stage_str, self.styles["TableCell"]),
                    Paragraph(a_conf_str, self.styles["TableCell"]),
                    Paragraph(a_status_str, self.styles["TableCell"]),
                ])

            hist_table = Table(history_rows, colWidths=[95, 105, 140, 95, 88])
            hist_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), self.c_secondary),
                ("BOX", (0, 0), (-1, -1), 0.5, self.c_border),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, self.c_border),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, self.c_bg_light]),
                ("TOPPADDING", (0, 0), (-1, -1), 2.5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
                ("LEFTPADDING", (0, 0), (-1, -1), 4),
                ("RIGHTPADDING", (0, 0), (-1, -1), 4),
            ]))
            elements.append(hist_table)

            if total_history > 5:
                extra_count = total_history - 5
                note_more = (
                    f"<i>* CattleSense යෙදුම තුළ මෙම ගවයා සඳහා තවත් පෙර වාර්තා {extra_count} ක් ඇත.</i>"
                    if is_si
                    else f"<i>* {extra_count} earlier assessment record{'s' if extra_count > 1 else ''} available in the CattleSense app.</i>"
                )
                elements.append(Spacer(1, 2))
                elements.append(Paragraph(note_more, self.styles["CaptionText"]))
        else:
            no_hist_text = (
                "<i>පෙර ඉතිහාසයක් නොමැත — මෙය මෙම ගවයා සඳහා පද්ධතියේ සටහන් වූ ප්‍රථම පරීක්ෂාවයි.</i>"
                if is_si
                else "<i>No prior history — this is the first recorded assessment for this cow in the system.</i>"
            )
            elements.append(Paragraph(no_hist_text, self.styles["BodyTextCustom"]))

        return elements

    def _build_qna_section(self, clinical_obs, lang):
        """Farmer clinical questionnaire responses."""
        is_si = (lang == "si")
        elements = [
            Paragraph("2. ගොවියා වාර්තා කළ සායනික නිරීක්ෂණ (ප්‍රශ්නාවලිය)" if is_si else "2. FARMER-REPORTED CLINICAL OBSERVATIONS (Q&A)", self.styles["SectionHeading"]),
            Paragraph(
                "<i>ගොවියා විසින් පරීක්ෂාව අතරතුර වාර්තා කරන ලද සායනික නිරීක්ෂණ. මේවා සායනික අවදානම් මට්ටම තීරණය කිරීමට සහාය වේ.</i>"
                if is_si
                else "<i>Qualitative clinical observations reported by the farmer during assessment triage. "
                "These inform clinical severity staging and are not inserted into Model 2 numerical inputs.</i>",
                self.styles["BodyTextCustom"],
            ),
            Spacer(1, 3),
        ]

        obs = clinical_obs or {}

        def get_ans(k):
            val = obs.get(k)
            if val in (None, "", "null"):
                aliases = {
                    "milk_yield_change": ["milk_yield_dropped"],
                    "milk_appearance": ["milk_color_changed"],
                    "milk_clotting": ["milk_has_clots", "clotting"],
                    "udder_swelling": ["udder_swollen", "swollen_udder"],
                    "udder_warmth": ["udder_feels_warm", "warm_or_painful_udder"],
                    "udder_pain": ["cow_uneasy_during_milking", "kicking_during_milking"],
                }
                for alt in aliases.get(k, []):
                    if obs.get(alt) not in (None, "", "null"):
                        val = obs.get(alt)
                        break

            if val in (None, "", "null"):
                return "සටහන් කර නැත" if is_si else "Not reported"
            v_str = str(val).lower()
            if is_si:
                if v_str in ["yes", "true", "1"]: return "ඔව් (Yes)"
                if v_str in ["no", "false", "0"]: return "නැත (No)"
                if v_str == "clots": return "කැටි සහිතයි (Clots)"
                if v_str == "watery": return "දියාරුයි (Watery)"
                if v_str == "normal": return "සාමාන්‍යයි (Normal)"
                if v_str == "severe": return "දරුණුයි (Severe)"
                if v_str == "decreased": return "අඩු වී ඇත (Decreased)"
            else:
                if v_str in ["true", "1"]: return "Yes"
                if v_str in ["false", "0"]: return "No"
            return str(val)

        qna_data = [
            [
                Paragraph("<b>නිරීක්ෂණ ප්‍රශ්නය</b>" if is_si else "<b>Observation Question</b>", self.styles["TableHead"]),
                Paragraph("<b>ගොවියාගේ පිළිතුර</b>" if is_si else "<b>Farmer Response</b>", self.styles["TableHead"]),
                Paragraph("<b>සායනික වැදගත්කම</b>" if is_si else "<b>Clinical Signification</b>", self.styles["TableHead"]),
            ],
            [
                Paragraph("කිරි අස්වැන්නේ වෙනස" if is_si else "Milk Production Change", self.styles["TableCellBold"]),
                Paragraph(get_ans("milk_yield_change"), self.styles["TableCell"]),
                Paragraph("කිරි අස්වැන්න හදිසියේ පහත වැටීම උග්‍ර ආසාදන ලක්ෂණයකි" if is_si else "Drop in daily yield often accompanies acute inflammation", self.styles["TableCell"]),
            ],
            [
                Paragraph("කිරි වල ස්වභාවය" if is_si else "Milk Appearance / Texture", self.styles["TableCellBold"]),
                Paragraph(get_ans("milk_appearance"), self.styles["TableCell"]),
                Paragraph("කිරි දියාරු වීම හෝ පැහැය වෙනස් වීම බුරුළු පටක හානිය පෙන්නුම් කරයි" if is_si else "Clots, flakes, or watery milk indicate secretory disruption", self.styles["TableCell"]),
            ],
            [
                Paragraph("කිරි කැටි හෝ පෙති ගැසීම" if is_si else "Milk Clotting / Flakes", self.styles["TableCellBold"]),
                Paragraph(get_ans("milk_clotting"), self.styles["TableCell"]),
                Paragraph("කේසීන් සහ ප්‍රෝටීන් කැටි ගැසීම නිසා කිරි වල පෙති හටගනී" if is_si else "Visible clots or flakes resulting from casein and protein aggregation", self.styles["TableCell"]),
            ],
            [
                Paragraph("බුරුල්ල ඉදිමීම" if is_si else "Udder Swelling", self.styles["TableCellBold"]),
                Paragraph(get_ans("udder_swelling"), self.styles["TableCell"]),
                Paragraph("බැක්ටීරියා ආසාදනය නිසා ඇතිවන පටක ඉදිමුම" if is_si else "Local quarter edema from bacterial invasion / leukocyte influx", self.styles["TableCell"]),
            ],
            [
                Paragraph("බුරුල්ලේ උෂ්ණත්වය / රස්නය" if is_si else "Udder Warmth / Heat", self.styles["TableCellBold"]),
                Paragraph(get_ans("udder_warmth"), self.styles["TableCell"]),
                Paragraph("ප්‍රදාහය නිසා බුරුල්ලට රුධිර ගමනාගමනය වැඩි වීම" if is_si else "Increased local vascular perfusion due to inflammatory response", self.styles["TableCell"]),
            ],
            [
                Paragraph("බුරුල්ලේ වේදනාව / පයින් ගැසීම" if is_si else "Udder Pain / Tenderness", self.styles["TableCellBold"]),
                Paragraph(get_ans("udder_pain"), self.styles["TableCell"]),
                Paragraph("දොවන විට හෝ අත තබන විට අපහසුතාවය සහ වේදනාව" if is_si else "Discomfort during milking or palpation", self.styles["TableCell"]),
            ],
            [
                Paragraph("ශරීර උෂ්ණත්වය / උණ" if is_si else "Systemic Temperature / Fever", self.styles["TableCellBold"]),
                Paragraph(get_ans("body_temperature"), self.styles["TableCell"]),
                Paragraph("උෂ්ණත්වය >39.2°C වීම ශරීරය පුරා ආසාදනය පැතිරීම පෙන්නුම් කරයි" if is_si else "Elevated rectal temperature (>39.2°C) indicates systemic involvement", self.styles["TableCell"]),
            ],
            [
                Paragraph("ආහාර රුචිය / සාමාන්‍ය තත්ත්වය" if is_si else "Appetite / General Condition", self.styles["TableCellBold"]),
                Paragraph(get_ans("appetite"), self.styles["TableCell"]),
                Paragraph("කෑම අරුචිය සහ අලස බව උග්‍ර විෂ සහිත මැස්ටයිටිස් ලක්ෂණයකි" if is_si else "Anorexia / lethargy signals acute toxic or systemic mastitis", self.styles["TableCell"]),
            ],
        ]

        table = Table(qna_data, colWidths=[140, 115, 268])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), self.c_primary),
            ("BOX", (0, 0), (-1, -1), 0.5, self.c_border),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, self.c_border),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, self.c_bg_light]),
            ("TOPPADDING", (0, 0), (-1, -1), 2.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(table)
        return elements

    def _build_numerical_analysis_section(self, result, lang):
        """Table of numerical biomarker features with availability and screening status."""
        is_si = (lang == "si")
        elements = [
            Paragraph("3. කිරි රසායනාගාර ජෛව දත්ත විශ්ලේෂණය" if is_si else "3. LABORATORY MILK BIOMARKER ANALYSIS", self.styles["SectionHeading"]),
        ]

        measurements = result.get("numerical_measurements") or {}
        num_pred = result.get("numerical_prediction") or {}

        if num_pred and result.get("model_2_used", False):
            p_str = num_pred.get("prediction", "N/A")
            c_val = num_pred.get("confidence", 0) * 100
            status_text = (
                f"<b>ජෛව දත්ත පරීක්ෂාව:</b> සම්පූර්ණයි (කිරි පරාමිතීන් 5ක් විශ්ලේෂණය විය). "
                f"අනාවැකිය: <b>{p_str}</b> (විශ්වාසනීයත්වය: {c_val:.1f}%)."
                if is_si
                else f"<b>Biomarker Screening:</b> Complete (5 required milk parameters evaluated). "
                f"Biomarker Prediction: <b>{p_str}</b> (Conf: {c_val:.1f}%)."
            )
        else:
            status_text = (
                "<b>ජෛව දත්ත තත්ත්වය:</b> ක්‍රියාත්මක නොවිණි (ඡායාරූප පරීක්ෂණ ආකාරය භාවිතා විය)."
                if is_si
                else "<b>Biomarker Status:</b> Not evaluated (Image screening mode was utilized)."
            )

        elements.append(Paragraph(status_text, self.styles["BodyTextCustom"]))
        elements.append(Spacer(1, 3))

        feature_specs = [
            ("Milk_Temperature", "කිරි වල උෂ්ණත්වය" if is_si else "Milk Temperature", "°C", "35.0 – 37.0 °C (සාමාන්‍ය)" if is_si else "35.0 – 37.0 °C (Normal fresh milk)"),
            ("Milk_pH", "කිරි වල pH අගය" if is_si else "Milk pH", "", "6.5 – 6.8 (සාමාන්‍ය)" if is_si else "6.5 – 6.8 (Normal fresh milk)"),
            ("Milk_Conductivity", "විද්‍යුත් සන්නායකතාව" if is_si else "Milk Conductivity", "mS/cm", "4.0 – 5.5 mS/cm (සාමාන්‍ය)" if is_si else "4.0 – 5.5 mS/cm (Normal)"),
            ("Milk_Yield", "දෛනික කිරි අස්වැන්න" if is_si else "Milk Yield", "L/day", "දිනක මුළු කිරි ලීටර" if is_si else "Daily milk yield in liters"),
            ("Clotting", "කිරි කැටි ගැසීම" if is_si else "Milk Clotting", "", "0 (කැටි නැත) / 1 (කැටි ඇත)" if is_si else "0 (No clotting) / 1 (Clots/flakes)"),
        ]

        table_rows = [
            [
                Paragraph("<b>සායනික මිණුම</b>" if is_si else "<b>Clinical Feature</b>", self.styles["TableHead"]),
                Paragraph("<b>ඇතුළත් කළ අගය</b>" if is_si else "<b>Submitted Value</b>", self.styles["TableHead"]),
                Paragraph("<b>ලබාදී ඇති බව</b>" if is_si else "<b>Availability</b>", self.styles["TableHead"]),
                Paragraph("<b>සම්මත පරාසය</b>" if is_si else "<b>Reference Info</b>", self.styles["TableHead"]),
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
                    val_str = ("1 (කැටි/පෙති ඇත)" if is_si else "1 (Clots Present)") if str(val) in ("1", "1.0", "True", "true") else ("0 (කැටි නැත)" if is_si else "0 (No Clots)")
                else:
                    val_str = f"{val} {unit}".strip()
                avail_str = f"<font color='#16a34a'><b>{'ලබාදී ඇත' if is_si else 'Provided'}</b></font>"
            else:
                val_str = "ඇතුළත් කර නැත" if is_si else "Not provided"
                avail_str = f"<font color='#dc2626'><b>{'නැත' if is_si else 'Missing'}</b></font>"

            table_rows.append([
                Paragraph(name, self.styles["TableCellBold"]),
                Paragraph(val_str, self.styles["TableCell"]),
                Paragraph(avail_str, self.styles["TableCell"]),
                Paragraph(ref, self.styles["TableCell"]),
            ])

        table = Table(table_rows, colWidths=[140, 115, 95, 173])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), self.c_secondary),
            ("BOX", (0, 0), (-1, -1), 0.5, self.c_border),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, self.c_border),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, self.c_bg_light]),
            ("TOPPADDING", (0, 0), (-1, -1), 2.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(table)
        return elements

    def _build_milk_log_section(self, result, cattle_info, lang):
        """Information about automatic milk log retrieval."""
        is_si = (lang == "si")
        measurements = result.get("numerical_measurements") or {}
        yield_val = measurements.get("milk_yield")

        if yield_val is not None:
            source_desc = "දෛනික කිරි සටහනෙන් ස්වයංක්‍රීයව ලබාගන්නා ලදී." if is_si else "Auto-fetched from latest recorded Milk Log."
        else:
            source_desc = "කිරි සටහන් නොමැත හෝ ලබාදී නැත." if is_si else "No Milk Log available or not provided."

        lbl_yield = "දෛනික කිරි අස්වැන්න:" if is_si else "Milk Yield Record:"
        lbl_src = "මූලාශ්‍රය:" if is_si else "Source:"
        val_str = f"{yield_val} L" if yield_val is not None else ("සටහන් කර නැත" if is_si else "Not recorded")

        text = f"<b>{lbl_yield}</b> {val_str} | <b>{lbl_src}</b> {source_desc}"
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
        lang,
    ):
        """Dedicated udder image and AI visual attention section."""
        is_si = (lang == "si")
        elements = [
            Paragraph("4. බුරුළු ඡායාරූපය සහ දෘශ්‍ය විශ්ලේෂණය" if is_si else "4. UDDER PHOTOGRAPH & VISUAL ATTENTION ANALYSIS", self.styles["SectionHeading"]),
        ]

        help_desc = (
            "කෘත්‍රිම බුද්ධි දෘශ්‍ය සිතියම මඟින් බුරුළු ඡායාරූපයේ වැඩි අවධානයක් යොමු වූ ප්‍රදේශ උණුසුම් වර්ණවලින් පෙන්වයි. "
            "මෙය පශු වෛද්‍ය පරීක්ෂාව සඳහා සහායක දෘශ්‍ය සාක්ෂියක් ලෙස ඉදිරිපත් කෙරේ."
            if is_si
            else "The visual attention heatmap highlights udder areas that contributed most strongly to the image screening prediction. "
            "This provides visual supporting evidence alongside clinical symptoms and biomarker metrics."
        )
        elements.append(Paragraph(help_desc, self.styles["BodyTextCustom"]))
        elements.append(Spacer(1, 4))

        # Check which images exist
        has_crop = cropped_img_path and Path(cropped_img_path).exists()
        has_orig = original_img_path and Path(original_img_path).exists()
        has_heat = heatmap_img_path and Path(heatmap_img_path).exists()
        has_over = overlay_img_path and Path(overlay_img_path).exists()

        if has_crop and has_orig:
            # 4-Panel Grid (Original, Focus Area, Heatmap, Overlay)
            panel_w, panel_h = 125, 95
            p_orig = Image(str(original_img_path), width=panel_w, height=panel_h)
            p_crop = Image(str(cropped_img_path), width=panel_w, height=panel_h)
            p_heat = Image(str(heatmap_img_path), width=panel_w, height=panel_h) if has_heat else Paragraph("<i>Heatmap<br/>N/A</i>", self.styles["CaptionText"])
            p_over = Image(str(overlay_img_path), width=panel_w, height=panel_h) if has_over else Paragraph("<i>Overlay<br/>N/A</i>", self.styles["CaptionText"])

            row_images = [p_orig, p_crop, p_heat, p_over]
            row_labels = [
                Paragraph("<b>Panel A: මුල් ඡායාරූපය</b>" if is_si else "<b>Panel A: Original Photo</b>", self.styles["CaptionText"]),
                Paragraph("<b>Panel B: තෝරාගත් බුරුළු පෙදෙස</b>" if is_si else "<b>Panel B: Focused Udder Region</b>", self.styles["CaptionText"]),
                Paragraph("<b>Panel C: දෘශ්‍ය අවධානය (Heatmap)</b>" if is_si else "<b>Panel C: AI Visual Heatmap</b>", self.styles["CaptionText"]),
                Paragraph("<b>Panel D: බුරුල්ල මත ආවරණය</b>" if is_si else "<b>Panel D: Heatmap Overlay</b>", self.styles["CaptionText"]),
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
            elements.append(Spacer(1, 2))
            caption_text = (
                "<b>රූප සටහන:</b> දෘශ්‍ය සාක්ෂි. Panel A: මුල් ඡායාරූපය; Panel B: බුරුළු කලාපය; Panels C සහ D: රෝග ලක්ෂණ කෙරෙහි අවධානය යොමු වූ ප්‍රදේශ පෙන්වන දෘශ්‍ය සිතියම සහ ආවරණය."
                if is_si
                else "<b>Figure:</b> Visual evidence. Panel A: Original photo; Panel B: Focused udder region; Panels C & D: AI visual attention heatmap and overlay highlighting regions of interest."
            )
            elements.append(Paragraph(caption_text, self.styles["CaptionText"]))
        elif has_orig or has_heat or has_over:
            # 3-Panel Fallback
            panel_w, panel_h = 165, 115
            p_orig = Image(str(original_img_path), width=panel_w, height=panel_h) if has_orig else Paragraph("<i>Original Image<br/>N/A</i>", self.styles["CaptionText"])
            p_heat = Image(str(heatmap_img_path), width=panel_w, height=panel_h) if has_heat else Paragraph("<i>Heatmap<br/>N/A</i>", self.styles["CaptionText"])
            p_over = Image(str(overlay_img_path), width=panel_w, height=panel_h) if has_over else Paragraph("<i>Overlay<br/>N/A</i>", self.styles["CaptionText"])

            row_images = [p_orig, p_heat, p_over]
            row_labels = [
                Paragraph("<b>Panel A: මුල් ඡායාරූපය</b>" if is_si else "<b>Panel A: Submitted Image</b>", self.styles["CaptionText"]),
                Paragraph("<b>Panel B: දෘශ්‍ය අවධානය (Heatmap)</b>" if is_si else "<b>Panel B: AI Visual Heatmap</b>", self.styles["CaptionText"]),
                Paragraph("<b>Panel C: සිතියම් ආවරණය</b>" if is_si else "<b>Panel C: Heatmap Overlay</b>", self.styles["CaptionText"]),
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
            elements.append(Spacer(1, 2))
        else:
            elements.append(Paragraph(
                "<i>දෘශ්‍ය සිතියම් සාක්ෂි මෙම පරීක්ෂණ සැසිය සඳහා ලබාදී නොමැත.</i>" if is_si else "<i>Visual heatmap artifacts unavailable for this assessment session.</i>",
                self.styles["BodyTextCustom"],
            ))

        elements.append(Spacer(1, 3))

        # Technical Parameters Table
        img_pred = result.get("image_prediction") or {}
        img_conf = img_pred.get("confidence")
        conf_str = f"{img_conf * 100:.1f}%" if isinstance(img_conf, (int, float)) else "N/A"
        roi_applied = result.get("roi_applied", False) or has_crop

        img_model_name = img_pred.get("model") or "AI Deep Learning Vision Classifier"
        tech_data = [
            [
                Paragraph("<b>විශ්ලේෂණ ආකාරය:</b>" if is_si else "<b>Screening Engine:</b>", self.styles["TableCellBold"]),
                Paragraph(img_model_name, self.styles["TableCell"]),
                Paragraph("<b>දෘශ්‍ය අවධානය:</b>" if is_si else "<b>Visual Attention:</b>", self.styles["TableCellBold"]),
                Paragraph("High Resolution Heatmap Overlay", self.styles["TableCell"]),
            ],
            [
                Paragraph("<b>අනාවැකි පන්තිය:</b>" if is_si else "<b>Predicted Class:</b>", self.styles["TableCellBold"]),
                Paragraph(str(img_pred.get("prediction", "N/A")), self.styles["TableCell"]),
                Paragraph("<b>ඡායාරූප විශ්වාසනීයත්වය:</b>" if is_si else "<b>Image Confidence:</b>", self.styles["TableCellBold"]),
                Paragraph(conf_str, self.styles["TableCell"]),
            ],
            [
                Paragraph("<b>ඡායාරූප අවධානය:</b>" if is_si else "<b>Image Focus:</b>", self.styles["TableCellBold"]),
                Paragraph(("තෝරාගත් බුරුළු කලාපය" if is_si else "Focused Udder Area") if roi_applied else ("සම්පූර්ණ ඡායාරූපය" if is_si else "Full Photograph"), self.styles["TableCell"]),
                Paragraph("<b>සැකසුම් විභේදනය:</b>" if is_si else "<b>Standard Resolution:</b>", self.styles["TableCellBold"]),
                Paragraph("Standard Diagnostic View", self.styles["TableCell"]),
            ],
        ]
        tech_table = Table(tech_data, colWidths=[110, 150, 110, 153])
        tech_table.setStyle(TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.5, self.c_border),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, self.c_border),
            ("BACKGROUND", (0, 0), (0, -1), self.c_bg_light),
            ("BACKGROUND", (2, 0), (2, -1), self.c_bg_light),
            ("TOPPADDING", (0, 0), (-1, -1), 2),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(tech_table)
        return elements

    def _build_hybrid_assessment_section(self, result, lang):
        """Multimodal fusion summary and clinical severity classification."""
        is_si = (lang == "si")
        elements = [
            Paragraph("5. බහු-ආකාර සම්මිශ්‍රිත ඇගයීම සහ අවදානම් මට්ටම" if is_si else "5. MULTIMODAL HYBRID ASSESSMENT & SEVERITY STAGING", self.styles["SectionHeading"]),
        ]

        img_pred = result.get("image_prediction") or {}
        num_pred = result.get("numerical_prediction") or {}
        severity = result.get("severity") or {}

        fusion_data = [
            [
                Paragraph("<b>විශ්ලේෂණ අංශය</b>" if is_si else "<b>Analysis Component</b>", self.styles["TableHead"]),
                Paragraph("<b>ක්‍රමවේදය</b>" if is_si else "<b>Methodology</b>", self.styles["TableHead"]),
                Paragraph("<b>අංශයේ ප්‍රතිදානය</b>" if is_si else "<b>Component Output</b>", self.styles["TableHead"]),
                Paragraph("<b>අවසන් තීරණයට දායකත්වය</b>" if is_si else "<b>Contribution to Final Output</b>", self.styles["TableHead"]),
            ],
            [
                Paragraph("ඡායාරූප අංශය" if is_si else "Image Modality", self.styles["TableCellBold"]),
                Paragraph(img_pred.get("model") or "Udder Image Screening", self.styles["TableCell"]),
                Paragraph(f"{img_pred.get('prediction', 'N/A')} ({img_pred.get('confidence', 0)*100:.1f}%)" if img_pred.get('confidence') else "Ready", self.styles["TableCell"]),
                Paragraph("50% (Soft-Voting Probability Fusion)", self.styles["TableCell"]),
            ],
            [
                Paragraph("ජෛව දත්ත අංශය" if is_si else "Numerical Modality", self.styles["TableCellBold"]),
                Paragraph(num_pred.get("model") or "Laboratory Biomarkers", self.styles["TableCell"]),
                Paragraph(f"{num_pred.get('prediction', 'N/A')}" if num_pred.get("status") == "ready" else ("ලබාදී නැත (ඡායාරූප ආකාරය)" if is_si else "Unavailable (Image-Only Mode)"), self.styles["TableCell"]),
                Paragraph("ඇතුළත් කළ විට 50%, නැතිවිට 0%" if is_si else "50% when present, 0% when omitted", self.styles["TableCell"]),
            ],
            [
                Paragraph("සායනික නිරීක්ෂණ" if is_si else "Clinical Observations", self.styles["TableCellBold"]),
                Paragraph("Farmer Symptom Checklist", self.styles["TableCell"]),
                Paragraph(f"මට්ටම: {severity.get('severity_label', 'Evaluated')}" if is_si else f"Severity: {severity.get('severity_label', 'Evaluated')}", self.styles["TableCell"]),
                Paragraph("සායනික අවදානම් මට්ටම සහ ප්‍රතිකාර මඟපෙන්වීම" if is_si else "Guides Clinical Severity & Immediate Protocol", self.styles["TableCell"]),
            ],
            [
                Paragraph("<b>අවසන් සම්මිශ්‍රිත නිගමනය</b>" if is_si else "<b>Final Combined Assessment</b>", self.styles["TableCellBold"]),
                Paragraph(f"<b>{result.get('prediction', 'Normal')}</b>", self.styles["TableCellBold"]),
                Paragraph(f"<b>විශ්වාසනීයත්වය: {result.get('confidence', 0)*100:.1f}%</b>" if is_si else f"<b>Confidence: {result.get('confidence', 0)*100:.1f}%</b>", self.styles["TableCellBold"]),
                Paragraph(f"<b>ආකාරය: {result.get('mode', 'Assisted')}</b>" if is_si else f"<b>Mode: {result.get('mode', 'Assisted')}</b>", self.styles["TableCellBold"]),
            ],
        ]

        table = Table(fusion_data, colWidths=[120, 150, 120, 133])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), self.c_dark),
            ("BOX", (0, 0), (-1, -1), 0.5, self.c_border),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, self.c_border),
            ("BACKGROUND", (0, -2), (-1, -1), self.c_bg_light),
            ("TOPPADDING", (0, 0), (-1, -1), 2.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 4),
            ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ]))
        elements.append(table)

        # ── Severity Clinical Rationale Callout ──
        clinical_rationale = (
            severity.get("clinical_rationale_si" if is_si else "clinical_rationale")
            or result.get("clinical_rationale_si" if is_si else "clinical_rationale")
        )
        if not clinical_rationale:
            # Fallback derivation if missing from payload
            path_used = severity.get("path_used") or ("path_a" if result.get("model_2_used") else "path_b")
            s_reported = severity.get("symptoms_reported") or []
            if path_used == "path_a":
                cond = result.get("numerical_measurements", {}).get("Milk_Conductivity") or ""
                temp = result.get("numerical_measurements", {}).get("Milk_Temperature") or ""
                clinical_rationale = (
                    f"ජෛව දත්ත සහ රෝග ලක්ෂණ ඇගයීම මඟින් අවදානම තීරණය විය (Path A): කිරි සන්නායකතාව {cond} mS/cm, උෂ්ණත්වය {temp}°C සහ රෝග ලක්ෂණ {len(s_reported)} ක්."
                    if is_si else
                    f"Severity calculated via biomarker + symptom assessment (Path A): Milk Conductivity ({cond} mS/cm), Temperature ({temp}°C), and {len(s_reported)} clinical symptoms reported."
                )
            elif severity.get("severity_level") == "insufficient_data":
                clinical_rationale = (
                    "ප්‍රමාණවත් සායනික දත්ත නොමැත — අවදානම් මට්ටම තීරණය කිරීමට ජෛව දත්ත හෝ රෝග ලක්ෂණ තොරතුරු ලබාදී නොමැත."
                    if is_si else
                    "Insufficient clinical data — neither complete biomarkers nor symptom answers were available to determine severity tier."
                )
            else:
                clinical_rationale = (
                    f"ගොවි රෝග ලක්ෂණ ප්‍රශ්නාවලිය මඟින් අවදානම තීරණය විය (Path B, ජෛව දත්ත ලබාදී නැත): වාර්තා වූ රෝග ලක්ෂණ {len(s_reported)} ක්."
                    if is_si else
                    f"Severity calculated via farmer symptom assessment (Path B, biomarkers not provided): {len(s_reported)} clinical symptoms reported."
                )

        rationale_label = "<b>සායනික අවදානම් පදනම:</b>" if is_si else "<b>Severity Clinical Rationale:</b>"
        elements.append(Spacer(1, 3))
        rationale_table = Table(
            [[
                Paragraph(f"{rationale_label} {clinical_rationale}", self.styles["TableCell"])
            ]],
            colWidths=[523]
        )
        rationale_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), self.c_bg_light),
            ("BOX", (0, 0), (-1, -1), 0.5, self.c_border),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(rationale_table)

        return elements

    def _build_farmer_guidance_section(self, result, lang):
        """Conservative, veterinary-safe guidance for the farmer based on authoritative sources."""
        is_si = (lang == "si")
        elements = [
            Paragraph("6. ගොවියා විසින් වහාම කළ යුතු දේ (ක්ෂණික මඟපෙන්වීම)" if is_si else "6. WHAT THE FARMER SHOULD DO NOW (IMMEDIATE GUIDANCE)", self.styles["SectionHeading"]),
        ]

        is_mastitis = result.get("prediction") == "Mastitis"

        if is_mastitis:
            if is_si:
                steps = [
                    "<b>1. කඩිනම් පශු වෛද්‍ය උපදෙස්:</b> විශේෂයෙන් උණ, කෑම අරුචිය හෝ දරුණු බුරුළු ඉදිමීමක් ඇත්නම් වහාම සුදුසුකම්ලත් පශු වෛද්‍යවරයකු අමතන්න.",
                    "<b>2. දොවන සනීපාරක්ෂාව:</b> දොවීමට පෙර සහ පසු අනුමත විෂබීජ නාශක දියරයක තන පුඩු ගිල්වන්න (Teat Dip). ආසාදනය පැතිරීම වැළැක්වීමට ආසාදිත ගවයා සැමවිටම අන්තිමට දොවන්න.",
                    "<b>3. ආසාදිත කිරි වෙන්කිරීම:</b> ආසාදිත බුරුළු කාර්තුවලින් ලබාගන්නා කිරි වෙනම ඉවත් කර විනාශ කරන්න. සාමාන්‍ය කිරි සමඟ මිශ්‍ර නොකරන්න.",
                    "<b>4. පිරිසිදු සහ වියළි ලැගුම්හල:</b> පරිසර බැක්ටීරියා (E. coli, Strep. uberis) බෝවීම වැළැක්වීම සඳහා ගාලේ පොළොව වියළිව සහ පිරිසිදුව තබාගන්න.",
                    "<b>5. සත්ත්වයා නිරන්තරයෙන් නිරීක්ෂණය කරන්න:</b> ගවයාගේ කෑම රුචිය, ජලය බීම, උණ සහ බුරුල්ලේ තද බව දිනපතා නිරීක්ෂණය කරන්න.",
                    "<b>6. මෙම වාර්තාව පශු වෛද්‍යවරයාට භාරදෙන්න:</b> පැමිණෙන පශු වෛද්‍යවරයා වෙත මෙම සම්පූර්ණ වාර්තාව ලබාදෙන්න.",
                ]
            else:
                steps = [
                    "<b>1. Prompt Veterinary Consultation:</b> Contact a qualified veterinary practitioner promptly, especially when systemic symptoms (fever, weakness, loss of appetite) or severe udder swelling are observed.",
                    "<b>2. Strict Teat & Milking Hygiene:</b> Ensure meticulous pre- and post-milking teat dipping using approved disinfectant solutions. Always milk suspected cows last to prevent cross-contamination.",
                    "<b>3. Milk Isolation:</b> Isolate and discard milk from affected quarters in accordance with farm hygiene and milk marketing regulations.",
                    "<b>4. Clean & Dry Housing:</b> Provide clean, dry bedding (sand, sawdust, or clean straw) to minimize environmental bacterial exposure (e.g. <i>E. coli</i>, <i>Streptococcus uberis</i>).",
                    "<b>5. Continual Animal Monitoring:</b> Continuously observe the cow's appetite, water intake, rectal temperature, and quarter firmness.",
                    "<b>6. Present This Report:</b> Hand this structured case document to the attending veterinarian upon their arrival.",
                ]
        else:
            if is_si:
                steps = [
                    "<b>1. දෛනික සෞඛ්‍ය අධීක්ෂණය:</b> දෛනික කිරි අස්වැන්න, බුරුල්ලේ සමමිතික බව සහ කිරි වල ස්වභාවය නිරන්තරයෙන් නිරීක්ෂණය කරන්න.",
                    "<b>2. තන පුඩු විෂබීජ නාශනය:</b> කිරි දොවා අවසන් වූ වහාම සෑම තන පුඩුවකටම පසු-දොවීමේ ඖෂධීය දියර (Teat dip) යොදන්න.",
                    "<b>3. පරිසර සනීපාරක්ෂාව:</b> ගාලේ ලැගුම්හල පිරිසිදුව, වියළිව සහ හොඳින් වාතාශ්‍රය ලැබෙන සේ පවත්වා ගන්න.",
                    "<b>4. ක්ෂණික නැවත පරීක්ෂාව:</b> කිරි කැටි, නිෂ්පාදනයේ හදිසි පහත වැටීමක් හෝ බුරුල්ලේ රස්නයක් දුටු වහාම නැවත පරීක්ෂාවක් සිදුකරන්න.",
                ]
            else:
                steps = [
                    "<b>1. Continue Routine Health Monitoring:</b> Maintain standard daily observation of milk yield, udder symmetry, and milk appearance.",
                    "<b>2. Consistent Teat Disinfection:</b> Apply post-milking teat dip consistently across all quarters to protect the teat canal post-milking.",
                    "<b>3. Environmental Sanitation:</b> Ensure clean, dry, well-ventilated housing and bedding to prevent environmental pathogen buildup.",
                    "<b>4. Prompt Re-Testing:</b> Re-evaluate immediately if milk flakes, sudden production drops, or udder heat/swelling are detected.",
                ]

        guidance_text = "<br/>".join(steps)
        safety_directive = (
            "<b>වැදගත් ආරක්ෂක උපදේශය:</b> මෙම ස්වයංක්‍රීය AI පරීක්ෂාව මත පමණක් පදනම්ව ගවයාට ප්‍රතිජීවක (Antibiotics) හෝ ඖෂධ ලබානොදෙන්න. "
            "සියලුම වෛද්‍ය සහ ඖෂධීය ප්‍රතිකාර තීරණ බලපත්‍රලාභී පශු වෛද්‍යවරයකු විසින් සායනික පරීක්ෂාවකින් සහ රසායනාගාර පරීක්ෂාවකින් (CMT / Milk Culture) පසු තීරණය කළ යුතුය."
            if is_si
            else "<b>IMPORTANT SAFETY DIRECTIVE:</b> Do not administer veterinary antibiotics or prescription drugs "
            "based solely on this automated AI screening. All medical and antimicrobial treatment decisions must be made "
            "by a licensed veterinarian following clinical examination and, where appropriate, diagnostic testing (e.g. Milk Culture / CMT)."
        )

        guidance_box = [
            Paragraph(guidance_text, self.styles["BodyTextCustom"]),
            Spacer(1, 3),
            Paragraph(safety_directive, self.styles["AlertBody"]),
        ]

        table = Table([[guidance_box]], colWidths=[523])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), self.c_bg_light),
            ("BOX", (0, 0), (-1, -1), 1, self.c_border),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
            ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ]))
        elements.append(table)
        return elements

    def _build_disclaimer_section(self, lang):
        """AI Notice and Clinical Disclaimer."""
        is_si = (lang == "si")
        elements = [
            Paragraph("7. AI නිවේදනය සහ සායනික වගකීම් ප්‍රකාශය" if is_si else "7. AI ASSESSMENT & CLINICAL NOTICE", self.styles["SectionHeading"]),
            Paragraph(
                "<b>වැදගත් AI ඇගයීම් නිවේදනය:</b> CattleSense පද්ධතිය AI සහායක පූර්ව අනතුරු ඇඟවීමේ තීරණ සහායක් සපයයි. "
                "මෙම අනාවැකිය ඡායාරූප, ජෛව දත්ත සහ ගොවි නිරීක්ෂණ මත ගොඩනගා ඇත. එය බලපත්‍රලාභී පශු වෛද්‍යවරයකුගේ ශාරීරික පරීක්ෂාව, "
                "ස්පර්ශ පරීක්ෂාව හෝ රසායනාගාර සංස්කෘතික පරීක්ෂාව (Culture) සඳහා ආදේශකයක් නොවේ. AI දෘශ්‍ය උණුසුම් සිතියම් මඟින් ආකෘතියේ අවධානය නිරූපණය කරන අතර, එය ව්‍යුහ විද්‍යාත්මක තුවාල ප්‍රදේශයක් ලෙස සෘජුව නොසැලකිය යුතුය."
                if is_si
                else "<b>IMPORTANT AI ASSESSMENT NOTICE:</b> CattleSense provides an AI-assisted screening and decision-support assessment. "
                "The prediction is generated from image features, numerical biomarkers, and farmer-reported triage inputs. It does NOT "
                "replace physical examination, palpation, somatic cell verification, laboratory culture, or licensed veterinary diagnosis. "
                "AI visual attention heatmaps represent model attention and must not be interpreted as anatomical lesion proof.",
                self.styles["BodyTextCustom"],
            ),
        ]
        return elements

    def _build_disclaimer_and_references(self, lang):
        """Backward-compatibility alias for _build_disclaimer_section."""
        return self._build_disclaimer_section(lang)
