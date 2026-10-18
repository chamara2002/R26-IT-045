"""
Sinhala Complex-Script Typography and Font Shaping Engine for CattleSense PDF Reports.
Provides OpenType HarfBuzz shaping, Private Use Area (PUA) glyph mapping,
and ReportLab integration with Noto Sans Sinhala fonts.
"""
import io
import os
import re
import unicodedata
from pathlib import Path

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

from reportlab.platypus import Paragraph as RLParagraph
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib import colors

# Base directory for fonts
FONTS_DIR = Path(__file__).resolve().parent.parent.parent / "assets" / "fonts"
SINHALA_FONT_REGULAR = FONTS_DIR / "NotoSansSinhala-Regular.ttf"
SINHALA_FONT_BOLD = FONTS_DIR / "NotoSansSinhala-Bold.ttf"

_fonts_registered = False
_hb_font_reg = None
_hb_font_bold = None

PUA_BASE = 0xE000

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
    """Subclass of ReportLab TTFont for Sinhala Unicode PUA mapping."""
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


def register_sinhala_fonts():
    """Register Noto Sans Sinhala TrueType fonts with HarfBuzz shaping."""
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
                print(f"[SinhalaShaper] Warning: Could not register Sinhala fonts: {e}")
    return _fonts_registered


register_sinhala_fonts()


def shape_sinhala_str(text, is_bold=False):
    """Shape a plain Sinhala string via HarfBuzz and return PUA glyph characters."""
    if not text or not isinstance(text, str):
        return text
    if not _hb_available or not any(0x0D80 <= ord(c) <= 0x0DFF or c == '\u200D' for c in text):
        return text
    register_sinhala_fonts()
    font = _hb_font_bold if is_bold else _hb_font_reg
    if font is None:
        return text
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf)
    return ''.join(chr(PUA_BASE + info.codepoint) for info in buffer_glyph_infos(buf))


def buffer_glyph_infos(buf):
    return buf.glyph_infos


def shape_sinhala_html(text, is_bold=False):
    """Shape HTML/XML-formatted Sinhala text by shaping non-tag segments."""
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
    """Auto-shaping Paragraph wrapper for ReportLab Platypus."""
    def __init__(self, text, style, *args, **kwargs):
        font_name = getattr(style, 'fontName', '')
        if font_name.startswith('NotoSansSinhala') and text:
            is_bold = 'Bold' in font_name
            text = shape_sinhala_html(text, is_bold=is_bold)
        super().__init__(text, style, *args, **kwargs)


class NumberedCanvas(canvas.Canvas):
    """Two-pass canvas for precise page numbers and custom header/footer."""
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []
        self.report_id = "RPT"
        self.language = "en"
        self.brand_title = "CattleSense"
        self.brand_title_si = "CattleSense — මැෂින් ලර්නින් පාදක ගව රෝග හඳුනාගැනීම"
        self.brand_subtitle = "CLINICAL DIAGNOSTIC REPORT"
        self.brand_subtitle_si = "සායනික රෝග විනිශ්චය සහ පශු වෛද්‍ය සමාලෝචන වාර්තාව"

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
            register_sinhala_fonts()
        is_si = (self.language == "si" and _fonts_registered)
        fn_bold = "NotoSansSinhala-Bold" if is_si else "Helvetica-Bold"
        fn_reg = "NotoSansSinhala" if is_si else "Helvetica"

        # Top Running Header (Pages > 1)
        if self._pageNumber > 1:
            header_title = self.brand_title_si if is_si else self.brand_title
            header_sub = self.brand_subtitle_si if is_si else self.brand_subtitle
            if is_si:
                header_title = shape_sinhala_html(header_title, is_bold=True)
                header_sub = shape_sinhala_html(header_sub, is_bold=False)

            self.setFont(fn_bold, 8)
            self.setFillColor(colors.HexColor("#334155"))
            self.drawString(36, 808, header_title)
            self.setFont(fn_reg, 8)
            self.setFillColor(colors.HexColor("#64748b"))
            self.drawRightString(559, 808, header_sub)
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(36, 802, 559, 802)

        # Footer Separator line at y = 42 pt
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(36, 42, 559, 42)

        # Footer Line 1: Branding & Report ID (y = 28 pt)
        self.setFont(fn_reg, 7.5)
        self.setFillColor(colors.HexColor("#64748b"))
        line1_left = (
            "CattleSense — AI සහායක පශු වෛද්‍ය තීරණ සහාය"
            if is_si
            else "CattleSense — AI-Assisted Veterinary Decision-Support System"
        )
        if is_si:
            line1_left = shape_sinhala_html(line1_left, is_bold=False)

        line1_right = f"වාර්තා අංකය: {self.report_id}" if is_si else f"Report ID: {self.report_id}"
        if is_si:
            line1_right = shape_sinhala_html(line1_right, is_bold=False)

        self.drawString(36, 28, line1_left)
        self.drawRightString(559, 28, line1_right)

        # Footer Line 2: Confidentiality & Page Number (y = 18 pt)
        self.setFont(fn_reg, 7.0)
        self.setFillColor(colors.HexColor("#94a3b8"))
        line2_left = (
            "රහස්‍යයි — ගොවි සහ පශු වෛද්‍ය භාවිතය සඳහා පමණි"
            if is_si
            else "Confidential — For Registered Farmer & Veterinary Clinical Use Only"
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

        self.drawString(36, 18, line2_left)
        self.drawRightString(559, 18, line2_right)
        self.restoreState()
