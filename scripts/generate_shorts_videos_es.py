#!/usr/bin/env python3
"""
Generate 3 Ready-to-Upload Spanish (es-US / es-419) 1080x1920 Vertical YouTube Shorts
/ TikTok Videos, 3 Silent-Captions-Only Dubbing Variants (*_nosound.mp4), and 3 Matching
1080x1920 24-bit RGB Cover Thumbnails (*_cover.png) for Conduit Bend Calc.

Brand & Technical Standard:
- Strictly aligned to src/brandPalette.ts: Navy #0F2B46, Safety Yellow #F4C317,
  Crisp White #FFFFFF, Slate Secondary #BED0DF, Mark/Alert Red #EF4444.
- Uses real v1.12.0 pure Spanish screenshots from assets/store-raw/es-US/ and assets/icon.png.
- Strict YouTube Shorts / TikTok safe zone: all essential copy, captions, diagrams,
  and CTAs stay inside x = 56..936 (right 144px clear) and y = 148..1500 (bottom 420px clear).
- Authentic US/MX electrician Spanish: conducto EMT, tubo conduit, offset / desplazamiento,
  encogimiento (shrink), deducción (take-up), silla de 3 puntos, marcas en la cinta.
- Beat-synchronized TTS via macOS /usr/bin/say (Paulina es_MX), loudness-normalized
  with ffmpeg loudnorm to -14 LUFS stereo AAC 44.1kHz, video H.264 yuv420p @ 30fps.
- Zero leftover temporary files; pipes raw RGB24 frames directly into ffmpeg.
"""
from __future__ import annotations

import math
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from PIL import Image, ImageDraw, ImageFont

# ---------------------------------------------------------------------------
# Paths & Output Specs
# ---------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent.parent
ASSETS_DIR = BASE_DIR / "assets"
RAW_SS_DIR = ASSETS_DIR / "store-raw" / "es-US"
ICON_PATH = ASSETS_DIR / "icon.png"
OUT_DIR = BASE_DIR / "marketing" / "shorts" / "es"

W, H = 1080, 1920
FPS = 30

# Strict Shorts / TikTok safe zone
# Right 144px (x=936..1080) clear of Like/Comment/Share buttons
# Bottom 420px (y=1500..1920) clear of description/audio/nav UI
SAFE_L = 56
SAFE_R = 936
SAFE_W = SAFE_R - SAFE_L  # 880px
SAFE_CX = SAFE_L + SAFE_W // 2  # 496px

# Palette strictly aligned with src/brandPalette.ts & src/theme.ts
NAVY_BG = "#0F2B46"
NAVY_DEEP = "#091D30"
NAVY_SURFACE = "#15334F"
NAVY_SURFACE_ALT = "#1A3D5E"
NAVY_GRID_MINOR = "#153554"
NAVY_GRID_MAJOR = "#1D4468"
NAVY_BORDER = "#2B4862"
SAFETY_YELLOW = "#F4C317"
YELLOW_DARK_BG = "#332907"
TEXT_WHITE = "#FFFFFF"
TEXT_MUTED = "#BED0DF"
MARK_RED = "#EF4444"
MARK_RED_DARK = "#DC2626"
MARK_RED_BG = "#3B1520"
SUCCESS_GREEN = "#22C55E"
SUCCESS_BG = "#0D3326"
CONDUIT_LIGHT = "#E2E8F0"
CONDUIT_MID = "#CBD5E1"
CONDUIT_DARK = "#64748B"
BEAM_FILL = "#334155"
BEAM_STROKE = "#94A3B8"

VOICE_NAME = "Paulina"
SPEECH_RATE = 192  # Natural US/MX Spanish rate (185-195 range), tuned for 28-34s total
BEAT_GAP_SEC = 0.16
END_PAD_SEC = 0.40


# ---------------------------------------------------------------------------
# Font Loading (Cached)
# ---------------------------------------------------------------------------
_FONT_CACHE: dict[tuple[int, str], ImageFont.FreeTypeFont] = {}


def get_font(size: int, style: str = "bold") -> ImageFont.FreeTypeFont:
    key = (size, style)
    if key in _FONT_CACHE:
        return _FONT_CACHE[key]

    candidates: list[tuple[str, int]] = []
    if style == "black":
        candidates = [
            ("/System/Library/Fonts/HelveticaNeue.ttc", 9),  # Condensed Black
            ("/System/Library/Fonts/HelveticaNeue.ttc", 4),  # Condensed Bold
            ("/System/Library/Fonts/HelveticaNeue.ttc", 1),
        ]
    elif style == "condensed":
        candidates = [
            ("/System/Library/Fonts/HelveticaNeue.ttc", 4),  # Condensed Bold
            ("/System/Library/Fonts/Supplemental/DIN Condensed Bold.ttf", 0),
            ("/System/Library/Fonts/HelveticaNeue.ttc", 1),
        ]
    elif style == "bold":
        candidates = [
            ("/System/Library/Fonts/HelveticaNeue.ttc", 1),
            ("/System/Library/Fonts/Avenir Next.ttc", 0),
            ("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 0),
        ]
    elif style == "medium":
        candidates = [
            ("/System/Library/Fonts/HelveticaNeue.ttc", 10),
            ("/System/Library/Fonts/Avenir Next.ttc", 5),
            ("/System/Library/Fonts/HelveticaNeue.ttc", 0),
        ]
    elif style == "mono":
        candidates = [
            ("/System/Library/Fonts/Menlo.ttc", 1),  # Menlo Bold
            ("/System/Library/Fonts/Supplemental/Courier New Bold.ttf", 0),
        ]
    else:
        candidates = [
            ("/System/Library/Fonts/HelveticaNeue.ttc", 0),
            ("/System/Library/Fonts/Supplemental/Arial.ttf", 0),
        ]

    for path_str, idx in candidates:
        if Path(path_str).is_file():
            try:
                font = ImageFont.truetype(path_str, size, index=idx)
                _FONT_CACHE[key] = font
                return font
            except Exception:
                continue
    font = ImageFont.load_default()
    _FONT_CACHE[key] = font
    return font


# ---------------------------------------------------------------------------
# Drawing Primitives & Layout Utilities
# ---------------------------------------------------------------------------
def ease_out_cubic(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return 1.0 - (1.0 - t) ** 3


def ease_in_out(t: float) -> float:
    t = max(0.0, min(1.0, t))
    return t * t * (3.0 - 2.0 * t)


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * max(0.0, min(1.0, t))


def measure_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont) -> tuple[int, int]:
    bb = draw.textbbox((0, 0), text, font=font)
    return bb[2] - bb[0], bb[3] - bb[1]


def draw_text_exact(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: str,
    anchor: str = "lt",
) -> tuple[int, int, int, int]:
    """Draw text cleanly aligned by visual bounding box (lt, ct, rt, lc, cc, rc)."""
    bb = draw.textbbox((0, 0), text, font=font)
    w = bb[2] - bb[0]
    h = bb[3] - bb[1]
    if anchor[0] == "c":
        dx = x - w // 2 - bb[0]
    elif anchor[0] == "r":
        dx = x - w - bb[0]
    else:
        dx = x - bb[0]

    if anchor[1] == "c":
        dy = y - h // 2 - bb[1]
    elif anchor[1] == "b":
        dy = y - h - bb[1]
    else:
        dy = y - bb[1]

    draw.text((dx, dy), text, font=font, fill=fill)
    return (dx + bb[0], dy + bb[1], dx + bb[2], dy + bb[3])


def wrap_lines(
    draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int
) -> list[str]:
    lines: list[str] = []
    for para in text.split("\n"):
        words = para.split()
        if not words:
            lines.append("")
            continue
        cur = words[0]
        for word in words[1:]:
            test = f"{cur} {word}"
            tw, _ = measure_text(draw, test, font)
            if tw <= max_width:
                cur = test
            else:
                lines.append(cur)
                cur = word
        lines.append(cur)
    return lines


def draw_wrapped_text(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    text: str,
    font: ImageFont.FreeTypeFont,
    fill: str,
    max_width: int,
    line_gap: int = 10,
    align: str = "left",
) -> int:
    lines = wrap_lines(draw, text, font, max_width)
    cy = y
    for line in lines:
        w, h = measure_text(draw, line, font)
        if align == "center":
            draw_text_exact(draw, x + max_width // 2, cy, line, font, fill, anchor="ct")
        elif align == "right":
            draw_text_exact(draw, x + max_width, cy, line, font, fill, anchor="rt")
        else:
            draw_text_exact(draw, x, cy, line, font, fill, anchor="lt")
        cy += h + line_gap
    return cy


def draw_pill(
    draw: ImageDraw.ImageDraw,
    x: int,
    y: int,
    text: str,
    font: ImageFont.FreeTypeFont,
    bg: str,
    fg: str,
    border: str | None = None,
    pad_x: int = 22,
    pad_y: int = 11,
    radius: int = 12,
    align: str = "left",
) -> tuple[int, int, int, int]:
    tw, th = measure_text(draw, text, font)
    pw = tw + pad_x * 2
    ph = th + pad_y * 2
    if align == "center":
        x0 = x - pw // 2
    elif align == "right":
        x0 = x - pw
    else:
        x0 = x
    box = (x0, y, x0 + pw, y + ph)
    draw.rounded_rectangle(box, radius=radius, fill=bg, outline=border, width=2 if border else 0)
    draw_text_exact(draw, x0 + pw // 2, y + ph // 2, text, font, fg, anchor="cc")
    return box


def draw_dashed_line(
    draw: ImageDraw.ImageDraw,
    p0: tuple[float, float],
    p1: tuple[float, float],
    fill: str,
    width: int = 3,
    dash: int = 12,
    gap: int = 8,
) -> None:
    dx = p1[0] - p0[0]
    dy = p1[1] - p0[1]
    dist = math.hypot(dx, dy)
    if dist < 1:
        return
    ux, uy = dx / dist, dy / dist
    pos = 0.0
    while pos < dist:
        end = min(pos + dash, dist)
        draw.line(
            [(p0[0] + ux * pos, p0[1] + uy * pos), (p0[0] + ux * end, p0[1] + uy * end)],
            fill=fill,
            width=width,
        )
        pos += dash + gap


def draw_arrow_line(
    draw: ImageDraw.ImageDraw,
    p0: tuple[float, float],
    p1: tuple[float, float],
    fill: str,
    width: int = 4,
    head: int = 13,
    both: bool = False,
) -> None:
    draw.line([p0, p1], fill=fill, width=width)
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    dist = math.hypot(dx, dy)
    if dist < 2:
        return
    ux, uy = dx / dist, dy / dist
    px, py = -uy, ux

    def _head(tip: tuple[float, float], dir_x: float, dir_y: float) -> None:
        base_x = tip[0] - dir_x * head
        base_y = tip[1] - dir_y * head
        pts = [
            tip,
            (base_x + px * (head * 0.55), base_y + py * (head * 0.55)),
            (base_x - px * (head * 0.55), base_y - py * (head * 0.55)),
        ]
        draw.polygon(pts, fill=fill)

    _head(p1, ux, uy)
    if both:
        _head(p0, -ux, -uy)


def draw_conduit_segment(
    draw: ImageDraw.ImageDraw,
    p0: tuple[float, float],
    p1: tuple[float, float],
    thickness: int = 24,
) -> None:
    """Flat two-tone industrial EMT conduit segment (zero blur/gloss)."""
    draw.line([p0, p1], fill=CONDUIT_DARK, width=thickness + 4)
    draw.line([p0, p1], fill=CONDUIT_MID, width=thickness)
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    dist = math.hypot(dx, dy)
    if dist > 1:
        nx, ny = -dy / dist, dx / dist
        off = thickness * 0.22
        draw.line(
            [(p0[0] + nx * off, p0[1] + ny * off), (p1[0] + nx * off, p1[1] + ny * off)],
            fill=CONDUIT_LIGHT,
            width=max(3, thickness // 5),
        )


def draw_conduit_polyline(
    draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], thickness: int = 22
) -> None:
    if len(points) < 2:
        return
    draw.line(points, fill=CONDUIT_DARK, width=thickness + 4, joint="curve")
    r_out = (thickness + 4) // 2
    for pt in points:
        draw.ellipse((pt[0] - r_out, pt[1] - r_out, pt[0] + r_out, pt[1] + r_out), fill=CONDUIT_DARK)
    draw.line(points, fill=CONDUIT_MID, width=thickness, joint="curve")
    r_in = thickness // 2
    for pt in points:
        draw.ellipse((pt[0] - r_in, pt[1] - r_in, pt[0] + r_in, pt[1] + r_in), fill=CONDUIT_MID)


def rounded_image(img: Image.Image, radius: int) -> tuple[Image.Image, Image.Image]:
    mask = Image.new("L", img.size, 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([(0, 0), (img.size[0] - 1, img.size[1] - 1)], radius=radius, fill=255)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img.convert("RGBA"), (0, 0), mask=mask)
    return out, mask


def load_framed_screenshot(raw_path: Path, screen_w: int) -> tuple[Image.Image, int, int]:
    """Pre-resize a real app screenshot cleanly into a flat industrial phone bezel."""
    with Image.open(raw_path) as raw:
        aspect = raw.height / raw.width
        screen_h = int(round(screen_w * aspect))
        resized = raw.convert("RGB").resize((screen_w, screen_h), Image.Resampling.LANCZOS)
    bezel = 10
    fw = screen_w + bezel * 2
    fh = screen_h + bezel * 2
    frame = Image.new("RGBA", (fw, fh), (0, 0, 0, 0))
    fd = ImageDraw.Draw(frame)
    fd.rounded_rectangle(
        [(0, 0), (fw - 1, fh - 1)],
        radius=34,
        fill=NAVY_DEEP,
        outline=NAVY_BORDER,
        width=3,
    )
    rounded_ss, mask = rounded_image(resized, radius=24)
    frame.paste(rounded_ss, (bezel, bezel), mask=mask)
    return frame, fw, fh


# ---------------------------------------------------------------------------
# Base Canvas & Persistent Brand Chrome
# ---------------------------------------------------------------------------
def build_base_canvas(topic_badge: str) -> Image.Image:
    """Create the static industrial blueprint canvas + top brand bar."""
    canvas = Image.new("RGB", (W, H), NAVY_BG)
    draw = ImageDraw.Draw(canvas)

    # Blueprint drafting grid
    for gx in range(0, W, 48):
        col = NAVY_GRID_MAJOR if gx % 240 == 0 else NAVY_GRID_MINOR
        draw.line([(gx, 0), (gx, H)], fill=col, width=1)
    for gy in range(0, H, 48):
        col = NAVY_GRID_MAJOR if gy % 240 == 0 else NAVY_GRID_MINOR
        draw.line([(0, gy), (W, gy)], fill=col, width=1)

    # Top safety-yellow industrial stripe
    draw.rectangle([(0, 0), (W, 10)], fill=SAFETY_YELLOW)

    # Brand header bar inside safe zone (y=146..204, x=56..936)
    icon_size = 46
    with Image.open(ICON_PATH) as ic:
        ic_resized = ic.convert("RGB").resize((icon_size, icon_size), Image.Resampling.LANCZOS)
    ic_round, ic_mask = rounded_image(ic_resized, radius=10)
    canvas.paste(ic_round, (SAFE_L, 148), mask=ic_mask)
    draw.rounded_rectangle(
        [(SAFE_L, 148), (SAFE_L + icon_size, 148 + icon_size)],
        radius=10,
        outline=NAVY_BORDER,
        width=2,
    )

    draw_text_exact(
        draw,
        SAFE_L + icon_size + 14,
        148 + icon_size // 2,
        "CONDUIT BEND CALC",
        get_font(25, "bold"),
        TEXT_WHITE,
        anchor="lc",
    )

    # Topic badge right-aligned at SAFE_R
    draw_pill(
        draw,
        SAFE_R,
        152,
        topic_badge,
        get_font(20, "bold"),
        bg=NAVY_SURFACE,
        fg=SAFETY_YELLOW,
        border=NAVY_BORDER,
        pad_x=16,
        pad_y=9,
        radius=10,
        align="right",
    )

    # Thin structural divider below header
    draw.line([(SAFE_L, 212), (SAFE_R, 212)], fill=NAVY_BORDER, width=2)
    return canvas


def draw_check_icon(draw: ImageDraw.ImageDraw, cx: int, cy: int, size: int, color: str, width: int = 4) -> None:
    """Crisp PIL vector checkmark (zero missing-glyph tofu)."""
    r = size / 2.0
    p0 = (cx - r * 0.65, cy + r * 0.05)
    p1 = (cx - r * 0.12, cy + r * 0.58)
    p2 = (cx + r * 0.72, cy - r * 0.52)
    draw.line([p0, p1, p2], fill=color, width=width, joint="curve")


def draw_x_icon(draw: ImageDraw.ImageDraw, cx: int, cy: int, size: int, color: str, width: int = 4) -> None:
    """Crisp PIL vector X mark."""
    r = size * 0.36
    draw.line([(cx - r, cy - r), (cx + r, cy + r)], fill=color, width=width)
    draw.line([(cx - r, cy + r), (cx + r, cy - r)], fill=color, width=width)


def draw_warn_icon(draw: ImageDraw.ImageDraw, cx: int, cy: int, size: int, stroke: str, bg: str) -> None:
    """Crisp PIL vector warning triangle with exclamation mark."""
    r = size * 0.52
    pts = [(cx, cy - r), (cx - r * 1.05, cy + r * 0.82), (cx + r * 1.05, cy + r * 0.82)]
    draw.polygon(pts, fill=stroke)
    draw.line([(cx, cy - r * 0.42), (cx, cy + r * 0.22)], fill=bg, width=max(3, size // 8))
    dot_r = max(2, size // 12)
    draw.ellipse((cx - dot_r, cy + r * 0.42 - dot_r, cx + dot_r, cy + r * 0.42 + dot_r), fill=bg)


def draw_kinetic_caption_and_progress(
    draw: ImageDraw.ImageDraw,
    caption: str,
    highlight_tokens: list[str],
    progress: float,
    beat_local_t: float,
) -> None:
    """High-contrast safe-zone kinetic caption box (y=1312..1470) + progress bar (y=1484)."""
    box_top = 1312
    box_bot = 1470
    draw.rounded_rectangle(
        [(SAFE_L, box_top), (SAFE_R, box_bot)],
        radius=16,
        fill=NAVY_DEEP,
        outline=NAVY_BORDER,
        width=2,
    )
    draw.rounded_rectangle(
        [(SAFE_L + 10, box_top + 14), (SAFE_L + 20, box_bot - 14)],
        radius=4,
        fill=SAFETY_YELLOW,
    )

    font = get_font(31, "bold")
    max_w = SAFE_W - 64
    lines = wrap_lines(draw, caption, font, max_w)
    # Lock EVERY word to a uniform typographic baseline including Spanish accents & ¿¡
    ref_bb = draw.textbbox((0, 0), "ÁÉÍÓÚÑg¿¡0123456789/\"", font=font)
    line_h = ref_bb[3] - ref_bb[1]
    gap = 10
    total_h = line_h * len(lines) + gap * max(0, len(lines) - 1)
    slide = int((1.0 - ease_out_cubic(beat_local_t / 0.18)) * 10)
    cy = box_top + (box_bot - box_top - total_h) // 2 + slide

    hl_lower = [t.lower() for t in highlight_tokens]
    space_w = int(round(draw.textlength(" ", font=font)))
    for ln in lines:
        words = ln.split(" ")
        cx = float(SAFE_L + 38)
        draw_y = cy - ref_bb[1]
        for wi, w_tok in enumerate(words):
            clean = w_tok.strip(".,!?:;()¿¡").lower()
            is_hl = any(clean == h or (len(h) >= 2 and h in clean) for h in hl_lower if h)
            col = SAFETY_YELLOW if is_hl else TEXT_WHITE
            draw.text((cx, draw_y), w_tok, font=font, fill=col)
            cx += draw.textlength(w_tok, font=font) + (space_w if wi < len(words) - 1 else 0)
        cy += line_h + gap

    # Progress bar safely above y=1500
    bar_y0, bar_y1 = 1484, 1492
    draw.rounded_rectangle([(SAFE_L, bar_y0), (SAFE_R, bar_y1)], radius=4, fill=NAVY_SURFACE)
    fill_w = max(8, int(SAFE_W * max(0.0, min(1.0, progress))))
    draw.rounded_rectangle([(SAFE_L, bar_y0), (SAFE_L + fill_w, bar_y1)], radius=4, fill=SAFETY_YELLOW)


def draw_metric_card(
    draw: ImageDraw.ImageDraw,
    x0: int,
    y0: int,
    x1: int,
    y1: int,
    label: str,
    value: str,
    sub: str,
    active: bool = False,
    accent: str = SAFETY_YELLOW,
    val_size: int = 42,
) -> None:
    border_col = accent if active else NAVY_BORDER
    border_w = 3 if active else 2
    bg = NAVY_SURFACE_ALT if active else NAVY_SURFACE
    draw.rounded_rectangle([(x0, y0), (x1, y1)], radius=16, fill=bg, outline=border_col, width=border_w)
    draw_text_exact(draw, x0 + 20, y0 + 18, label, get_font(20, "bold"), TEXT_MUTED, anchor="lt")
    draw_text_exact(
        draw,
        x0 + 20,
        y0 + 50,
        value,
        get_font(val_size, "mono"),
        accent if active else TEXT_WHITE,
        anchor="lt",
    )
    draw_text_exact(draw, x0 + 20, y1 - 18, sub, get_font(20, "medium"), TEXT_MUTED, anchor="lb")


def draw_step_checklist(
    draw: ImageDraw.ImageDraw,
    y0: int,
    y1: int,
    steps: list[tuple[str, str]],
    active_idx: int,
) -> None:
    """Compact progressive math checklist card."""
    draw.rounded_rectangle(
        [(SAFE_L, y0), (SAFE_R, y1)],
        radius=16,
        fill=NAVY_DEEP,
        outline=NAVY_BORDER,
        width=2,
    )
    n = len(steps)
    row_h = (y1 - y0 - 20) // n
    for i, (lhs, rhs) in enumerate(steps):
        ry = y0 + 10 + i * row_h
        cy = ry + row_h // 2
        if i == active_idx:
            draw.rounded_rectangle(
                [(SAFE_L + 12, ry + 3), (SAFE_R - 12, ry + row_h - 3)],
                radius=10,
                fill=NAVY_SURFACE_ALT,
                outline=SAFETY_YELLOW,
                width=2,
            )
            badge_bg, badge_fg, txt_col, val_col = SAFETY_YELLOW, NAVY_DEEP, TEXT_WHITE, SAFETY_YELLOW
        elif i < active_idx:
            badge_bg, badge_fg, txt_col, val_col = SUCCESS_GREEN, NAVY_DEEP, TEXT_MUTED, TEXT_WHITE
        else:
            badge_bg, badge_fg, txt_col, val_col = NAVY_SURFACE, TEXT_MUTED, "#5B7894", "#5B7894"

        cx = SAFE_L + 42
        draw.ellipse((cx - 15, cy - 15, cx + 15, cy + 15), fill=badge_bg)
        if i < active_idx:
            draw_check_icon(draw, cx, cy, 18, badge_fg, width=3)
        else:
            draw_text_exact(draw, cx, cy, str(i + 1), get_font(20, "bold"), badge_fg, anchor="cc")
        draw_text_exact(draw, SAFE_L + 72, cy, lhs, get_font(23, "medium"), txt_col, anchor="lc")
        draw_text_exact(draw, SAFE_R - 24, cy, rhs, get_font(25, "mono"), val_col, anchor="rc")


def draw_cta_banner(draw: ImageDraw.ImageDraw, y0: int, y1: int, text: str, font_size: int = 26) -> None:
    draw.rounded_rectangle([(SAFE_L, y0), (SAFE_R, y1)], radius=16, fill=SAFETY_YELLOW)
    draw_text_exact(
        draw,
        SAFE_CX,
        (y0 + y1) // 2,
        text,
        get_font(font_size, "bold"),
        NAVY_DEEP,
        anchor="cc",
    )


def draw_tape_ruler(
    draw: ImageDraw.ImageDraw,
    x0: int,
    x1: int,
    y: int,
    min_in: float,
    max_in: float,
    major_step: int = 6,
    minor_step: int = 2,
) -> Callable[[float], float]:
    """Draw a crisp horizontal engineering ruler and return inch->x mapping function."""
    draw.rectangle([(x0, y), (x1, y + 40)], fill=NAVY_DEEP, outline=NAVY_BORDER, width=2)

    def to_x(inch: float) -> float:
        return x0 + 24 + (inch - min_in) / (max_in - min_in) * (x1 - x0 - 48)

    v = int(min_in)
    while v <= int(max_in):
        tx = to_x(float(v))
        if v % major_step == 0:
            draw.line([(tx, y + 2), (tx, y + 18)], fill=SAFETY_YELLOW, width=2)
            draw_text_exact(draw, int(tx), y + 28, f'{v}"', get_font(17, "mono"), TEXT_MUTED, anchor="cc")
        elif v % minor_step == 0:
            draw.line([(tx, y + 2), (tx, y + 11)], fill=NAVY_BORDER, width=2)
        v += 1
    return to_x


# ---------------------------------------------------------------------------
# Beat & Audio Synthesis Engine
# ---------------------------------------------------------------------------
@dataclass
class Beat:
    id: str
    vo_text: str
    caption: str
    highlights: list[str]
    start: float = 0.0
    end: float = 0.0


@dataclass
class VideoSpec:
    slug: str
    topic_badge: str
    beats: list[Beat]


def synthesize_audio_and_timings(
    beats: list[Beat], tmpdir: Path, out_m4a: Path
) -> tuple[float, list[Beat]]:
    """Generate per-beat TTS audio with macOS say (Paulina es_MX), concat & loudnorm."""
    silence_path = tmpdir / "silence.wav"
    end_pad_path = tmpdir / "end_pad.wav"

    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            "anullsrc=r=44100:cl=stereo",
            "-t",
            f"{BEAT_GAP_SEC:.3f}",
            str(silence_path),
        ],
        check=True,
    )
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-v",
            "error",
            "-f",
            "lavfi",
            "-i",
            "anullsrc=r=44100:cl=stereo",
            "-t",
            f"{END_PAD_SEC:.3f}",
            str(end_pad_path),
        ],
        check=True,
    )

    cursor = 0.0
    concat_parts: list[Path] = []
    for idx, beat in enumerate(beats):
        raw_aiff = tmpdir / f"beat_{idx}.aiff"
        wav_path = tmpdir / f"beat_{idx}.wav"
        subprocess.run(
            ["/usr/bin/say", "-v", VOICE_NAME, "-r", str(SPEECH_RATE), "-o", str(raw_aiff), beat.vo_text],
            check=True,
        )
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-v",
                "error",
                "-i",
                str(raw_aiff),
                "-ar",
                "44100",
                "-ac",
                "2",
                "-af",
                "silenceremove=stop_periods=-1:stop_duration=0.18:stop_threshold=-50dB",
                str(wav_path),
            ],
            check=True,
        )
        dur = float(
            subprocess.check_output(
                [
                    "ffprobe",
                    "-v",
                    "error",
                    "-show_entries",
                    "format=duration",
                    "-of",
                    "csv=p=0",
                    str(wav_path),
                ],
                text=True,
            ).strip()
        )
        beat.start = cursor
        beat.end = cursor + dur + (BEAT_GAP_SEC if idx < len(beats) - 1 else END_PAD_SEC)
        cursor = beat.end
        concat_parts.append(wav_path)
        concat_parts.append(silence_path if idx < len(beats) - 1 else end_pad_path)

    concat_list = tmpdir / "concat.txt"
    concat_list.write_text("\n".join(f"file '{p.as_posix()}'" for p in concat_parts), encoding="utf-8")

    # Concat & normalize to -14 LUFS stereo AAC 44.1kHz
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-v",
            "error",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            str(concat_list),
            "-af",
            "loudnorm=I=-14:TP=-1.5:LRA=11",
            "-ar",
            "44100",
            "-ac",
            "2",
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            str(out_m4a),
        ],
        check=True,
    )
    actual_audio_dur = float(
        subprocess.check_output(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "csv=p=0",
                str(out_m4a),
            ],
            text=True,
        ).strip()
    )
    if actual_audio_dur > beats[-1].end:
        beats[-1].end = actual_audio_dur
    return max(cursor, actual_audio_dur), beats


# ---------------------------------------------------------------------------
# VIDEO 1: Offset de 6" en EMT de 3/4" a 30° (Encogimiento / Shrink)
# ---------------------------------------------------------------------------
VIDEO1_SPEC = VideoSpec(
    slug="01_offset_6in_30deg_es",
    topic_badge='3/4" EMT · OFFSET 30°',
    beats=[
        Beat(
            id="hook",
            vo_text="¿Offset de 6 pulgadas en EMT siempre una y media corto? No culpes tu cinta.",
            caption='¿Offset de 6" en EMT siempre 1-1/2" corto? No culpes tu cinta.',
            highlights=['6"', '1-1/2"', 'corto'],
        ),
        Beat(
            id="mult",
            vo_text="A 30 grados, multiplicador 2. 6 por 2: 12 pulgadas entre marcas.",
            caption='Multiplicador 30° = 2.0: 6" × 2.0 = 12" entre marcas.',
            highlights=['30°', '2.0', '12"'],
        ),
        Beat(
            id="shrink",
            vo_text="Encogimiento: un cuarto por pulgada. 6 por un cuarto: una y media.",
            caption='Encogimiento (shrink) = 1/4"/in: 6" × 1/4" = 1-1/2" total.',
            highlights=['1/4"/in', '1-1/2"'],
        ),
        Beat(
            id="mark1",
            vo_text="¿Obstáculo a 36? Suma una y media: Marca 1 en 37 y media.",
            caption='Obstáculo a 36" + 1-1/2" encogimiento: Marca 1 = 37-1/2".',
            highlights=['36"', '1-1/2"', '37-1/2"'],
        ),
        Beat(
            id="mark2",
            vo_text="Resta 12: Marca 2 en 25 y media. Dobla 30, gira 180 y regresa.",
            caption='37-1/2" − 12" = Marca 2 en 25-1/2". Dobla 30°, gira 180°, regresa.',
            highlights=['12"', '25-1/2"', '30°'],
        ),
        Beat(
            id="app",
            vo_text="Verifica cada marca en Conduit Bend Calc. Calculadora gratis en el comentario fijado.",
            caption='Calculadora de Offset gratis en Comentario Fijado · App Offline.',
            highlights=['gratis', 'Comentario', 'Fijado', 'Offline'],
        ),
    ],
)


def make_video1_renderer(base: Image.Image) -> Callable[[float, Beat, float], Image.Image]:
    phone_img, pw, ph = load_framed_screenshot(RAW_SS_DIR / "01_offset.png", screen_w=390)

    def render(t: float, beat: Beat, total_dur: float) -> Image.Image:
        img = base.copy()
        draw = ImageDraw.Draw(img)
        bt = max(0.0, t - beat.start)

        if beat.id == "hook":
            draw_pill(
                draw,
                SAFE_L,
                238,
                "ERROR COMÚN EN OBRA",
                get_font(23, "bold"),
                bg=MARK_RED_BG,
                fg=MARK_RED,
                border=MARK_RED,
                pad_x=20,
                pad_y=10,
            )
            draw_text_exact(draw, SAFE_L, 310, '¿OFFSET DE 6" EN EMT', get_font(74, "black"), TEXT_WHITE, "lt")
            draw_text_exact(draw, SAFE_L, 398, 'SIEMPRE 1-1/2"', get_font(84, "black"), SAFETY_YELLOW, "lt")
            draw_text_exact(draw, SAFE_L, 494, "MÁS CORTO?", get_font(82, "black"), TEXT_WHITE, "lt")

            # Error diagram card (y=608..1276)
            card_y0, card_y1 = 608, 1276
            draw.rounded_rectangle(
                [(SAFE_L, card_y0), (SAFE_R, card_y1)],
                radius=20,
                fill=NAVY_SURFACE,
                outline=MARK_RED,
                width=3,
            )
            draw_text_exact(
                draw,
                SAFE_L + 28,
                card_y0 + 26,
                'SIN ENCOGIMIENTO (MARCAS 36" Y 24")',
                get_font(24, "bold"),
                TEXT_MUTED,
                "lt",
            )

            floor_y = 1090
            beam_x = 690
            beam_top = 920
            draw.line([(SAFE_L + 24, floor_y), (SAFE_R - 24, floor_y)], fill=NAVY_BORDER, width=4)
            draw.rectangle([(beam_x, beam_top), (beam_x + 170, floor_y)], fill=BEAM_FILL, outline=BEAM_STROKE, width=3)
            draw.rectangle([(beam_x - 10, beam_top), (beam_x + 180, beam_top + 22)], fill=BEAM_STROKE)
            draw.rectangle([(beam_x - 10, floor_y - 22), (beam_x + 180, floor_y)], fill=BEAM_STROKE)
            draw_text_exact(draw, beam_x + 85, (beam_top + floor_y) // 2 - 14, "VIGA", get_font(26, "bold"), TEXT_WHITE, "cc")
            draw_text_exact(draw, beam_x + 85, (beam_top + floor_y) // 2 + 20, 'A 36"', get_font(26, "mono"), SAFETY_YELLOW, "cc")

            draw_dashed_line(draw, (beam_x, 710), (beam_x, beam_top - 8), fill=SAFETY_YELLOW, width=3)

            anim = ease_out_cubic(min(1.0, bt / 0.65))
            c_pts = [
                (SAFE_L + 36, floor_y - 28),
                (355, floor_y - 28),
                (575, beam_top - 30),
                (lerp(575, beam_x + 150, anim), beam_top - 30),
            ]
            draw_conduit_polyline(draw, c_pts, thickness=24)

            draw_dashed_line(draw, (575, 710), (575, beam_top - 52), fill=MARK_RED, width=3)
            draw_arrow_line(draw, (578, 760), (beam_x - 4, 760), fill=MARK_RED, width=5, both=True)
            draw_pill(
                draw,
                (575 + beam_x) // 2,
                694,
                '-1-1/2"',
                get_font(30, "mono"),
                bg=MARK_RED,
                fg=TEXT_WHITE,
                pad_x=18,
                pad_y=8,
                align="center",
            )

            pulse = 1 if int(bt * 4) % 2 == 0 else 0
            pill_box = draw_pill(
                draw,
                SAFE_CX,
                1148,
                '     TOPA 1-1/2" ANTES — FALTÓ SHRINK',
                get_font(26, "bold"),
                bg=MARK_RED if pulse else MARK_RED_BG,
                fg=TEXT_WHITE if pulse else MARK_RED,
                border=MARK_RED,
                pad_x=26,
                pad_y=18,
                radius=14,
                align="center",
            )
            draw_x_icon(
                draw,
                pill_box[0] + 38,
                (pill_box[1] + pill_box[3]) // 2,
                22,
                TEXT_WHITE if pulse else MARK_RED,
                width=4,
            )

        elif beat.id in ("mult", "shrink", "mark1", "mark2"):
            step_idx = {"mult": 0, "shrink": 1, "mark1": 2, "mark2": 3}[beat.id]

            draw_text_exact(
                draw, SAFE_L, 232, 'MARCAS OFFSET 30° · SUBIDA DE 6"', get_font(31, "bold"), TEXT_WHITE, "lt"
            )

            mid_gap = 20
            cw = (SAFE_W - mid_gap) // 2
            draw_metric_card(
                draw,
                SAFE_L,
                282,
                SAFE_L + cw,
                424,
                "MULTIPLICADOR 30° = 2.0",
                '12" SEP.',
                '6" × 2.0 = 12" entre marcas',
                active=(step_idx in (0, 3)),
            )
            draw_metric_card(
                draw,
                SAFE_L + cw + mid_gap,
                282,
                SAFE_R,
                424,
                'ENCOGIMIENTO = 1/4"/in',
                '1-1/2"',
                '6" × 1/4" = 1-1/2" total',
                active=(step_idx in (1, 2)),
            )

            # Main Blueprint Ruler & Conduit Canvas (y=446..1046)
            bp_y0, bp_y1 = 446, 1046
            draw.rounded_rectangle(
                [(SAFE_L, bp_y0), (SAFE_R, bp_y1)],
                radius=20,
                fill=NAVY_SURFACE,
                outline=NAVY_BORDER,
                width=2,
            )

            to_x = draw_tape_ruler(draw, SAFE_L + 22, SAFE_R - 22, bp_y0 + 24, 0, 44, major_step=6, minor_step=2)

            pipe_y = bp_y0 + 186
            x_start = to_x(0)
            x_end = to_x(43)
            x_obs = to_x(36)
            x_m1 = to_x(37.5)
            x_m2 = to_x(25.5)

            draw.rectangle(
                [(x_start - 14, pipe_y - 24), (x_start + 8, pipe_y + 24)],
                fill=BEAM_FILL,
                outline=BEAM_STROKE,
                width=2,
            )
            draw_text_exact(draw, int(x_start + 14), pipe_y - 44, 'CAJA 0"', get_font(20, "mono"), TEXT_MUTED, "lt")

            draw_conduit_segment(draw, (x_start + 8, pipe_y), (x_end, pipe_y), thickness=26)

            draw_dashed_line(draw, (x_obs, bp_y0 + 68), (x_obs, pipe_y + 115), fill=TEXT_MUTED, width=2)
            draw_pill(
                draw,
                int(x_obs),
                pipe_y + 118,
                'OBSTÁCULO A 36"',
                get_font(19, "bold"),
                bg=NAVY_DEEP,
                fg=TEXT_MUTED,
                border=NAVY_BORDER,
                pad_x=12,
                pad_y=6,
                align="center",
            )

            if step_idx == 0:
                prog = ease_out_cubic(min(1.0, bt / 0.8))
                sx0, sx1 = to_x(18), lerp(to_x(18), to_x(30), prog)
                draw_arrow_line(draw, (sx0, pipe_y - 54), (sx1, pipe_y - 54), fill=SAFETY_YELLOW, width=5, both=True)
                draw_pill(
                    draw,
                    int((sx0 + sx1) / 2),
                    pipe_y - 102,
                    '12" ENTRE MARCAS (6" × 2.0)',
                    get_font(22, "mono"),
                    bg=SAFETY_YELLOW,
                    fg=NAVY_DEEP,
                    pad_x=16,
                    pad_y=7,
                    align="center",
                )

            if step_idx >= 1:
                s_prog = ease_out_cubic(min(1.0, bt / 0.7)) if step_idx == 1 else 1.0
                shift_x = lerp(x_obs, x_m1, s_prog)
                draw.rectangle([(x_obs, pipe_y - 15), (shift_x, pipe_y + 15)], fill=SAFETY_YELLOW)
                if step_idx in (1, 2):
                    draw_arrow_line(
                        draw,
                        (x_obs, pipe_y - 54),
                        (max(x_obs + 24, shift_x + 14), pipe_y - 54),
                        fill=SAFETY_YELLOW,
                        width=5,
                    )
                    draw_pill(
                        draw,
                        int(x_obs + 4),
                        pipe_y - 106,
                        '+1-1/2" SHRINK',
                        get_font(23, "mono"),
                        bg=SAFETY_YELLOW,
                        fg=NAVY_DEEP,
                        pad_x=16,
                        pad_y=7,
                        align="center",
                    )

            if step_idx >= 2:
                m1_prog = ease_out_cubic(min(1.0, bt / 0.5)) if step_idx == 2 else 1.0
                ring_h = int(28 * m1_prog)
                draw.line([(x_m1, pipe_y - ring_h), (x_m1, pipe_y + ring_h)], fill=MARK_RED, width=7)
                draw_pill(
                    draw,
                    int(x_m1),
                    pipe_y + 42,
                    'M1: 37-1/2"',
                    get_font(24, "mono"),
                    bg=MARK_RED,
                    fg=TEXT_WHITE,
                    pad_x=14,
                    pad_y=7,
                    align="center",
                )

            if step_idx >= 3:
                m2_prog = ease_out_cubic(min(1.0, bt / 0.55))
                cur_x = lerp(x_m1, x_m2, m2_prog)
                draw_arrow_line(draw, (x_m1 - 4, pipe_y - 52), (cur_x + 4, pipe_y - 52), fill=SAFETY_YELLOW, width=5, both=True)
                draw_pill(
                    draw,
                    int((x_m1 + cur_x) / 2),
                    pipe_y - 102,
                    '−12" ATRÁS',
                    get_font(23, "mono"),
                    bg=NAVY_DEEP,
                    fg=SAFETY_YELLOW,
                    border=SAFETY_YELLOW,
                    pad_x=14,
                    pad_y=6,
                    align="center",
                )
                if m2_prog > 0.7:
                    draw.line([(x_m2, pipe_y - 28), (x_m2, pipe_y + 28)], fill=MARK_RED, width=7)
                    draw_pill(
                        draw,
                        int(x_m2),
                        pipe_y + 42,
                        'M2: 25-1/2"',
                        get_font(24, "mono"),
                        bg=MARK_RED,
                        fg=TEXT_WHITE,
                        pad_x=14,
                        pad_y=7,
                        align="center",
                    )

            prev_y0 = bp_y0 + 360
            draw.line([(SAFE_L + 24, prev_y0 - 12), (SAFE_R - 24, prev_y0 - 12)], fill=NAVY_BORDER, width=2)
            if step_idx < 3:
                draw_text_exact(
                    draw,
                    SAFE_L + 28,
                    prev_y0 + 10,
                    'REGLA EN LA CINTA: MIDE DESDE LA CAJA FIJA (0")',
                    get_font(22, "bold"),
                    TEXT_MUTED,
                    "lt",
                )
                notes = [
                    "• Usa 30° en doblador manual (cálculo rápido y fácil cableado)",
                    "• Marca 360° alrededor del conducto EMT antes de girar 180°",
                    "• Flecha en ambas marcas con el gancho hacia el mismo lado",
                ]
                ny = prev_y0 + 52
                for n_txt in notes:
                    draw_text_exact(draw, SAFE_L + 30, ny, n_txt, get_font(22, "medium"), TEXT_WHITE, "lt")
                    ny += 42
            else:
                bend_p = ease_out_cubic(min(1.0, max(0.0, (bt - 0.5) / 0.9)))
                base_y = bp_y1 - 44
                rise_px = 92 * bend_p
                draw.rectangle([(x_obs, base_y - 76), (SAFE_R - 36, base_y + 12)], fill=BEAM_FILL, outline=BEAM_STROKE, width=2)
                draw_text_exact(
                    draw, int((x_obs + SAFE_R - 36) / 2), base_y - 32, 'VIGA A 36"', get_font(22, "bold"), TEXT_WHITE, "cc"
                )
                pts = [
                    (x_start + 8, base_y - 12),
                    (x_m2, base_y - 12),
                    (x_obs, base_y - 12 - rise_px),
                    (SAFE_R - 36, base_y - 12 - rise_px),
                ]
                draw_conduit_polyline(draw, pts, thickness=20)
                draw_text_exact(draw, int(x_m2), base_y - 44, "30°", get_font(22, "mono"), SAFETY_YELLOW, "cc")
                draw_text_exact(
                    draw, int(x_obs - 24), int(base_y - 12 - rise_px - 26), "30°", get_font(22, "mono"), SAFETY_YELLOW, "cc"
                )
                ok_box = draw_pill(
                    draw,
                    SAFE_L + 30,
                    prev_y0 + 12,
                    '     SUBIDA 6" · LIBRA VIGA A 36" EXACTO',
                    get_font(23, "bold"),
                    bg=SUCCESS_BG,
                    fg=SUCCESS_GREEN,
                    border=SUCCESS_GREEN,
                    pad_x=18,
                    pad_y=9,
                )
                draw_check_icon(draw, ok_box[0] + 28, (ok_box[1] + ok_box[3]) // 2, 18, SUCCESS_GREEN, width=3)

            draw_step_checklist(
                draw,
                1068,
                1294,
                [
                    ('Separación (6" × 2.0)', '12"'),
                    ('Encogimiento (6" × 1/4")', '1-1/2"'),
                    ('Marca 1 (36" + 1-1/2")', '37-1/2"'),
                    ('Marca 2 (37-1/2" − 12")', '25-1/2"'),
                ],
                active_idx=step_idx,
            )

        else:
            # Act 3: Real Spanish App Reveal (01_offset.png) + Feature Callouts + CTA
            draw_text_exact(draw, SAFE_L, 232, "VERIFICA CUALQUIER OFFSET EN 3 SEG", get_font(35, "bold"), TEXT_WHITE, "lt")
            draw_text_exact(
                draw,
                SAFE_L,
                282,
                'Fracciones exactas en 1/16" + diagrama de doblez en vivo',
                get_font(23, "medium"),
                TEXT_MUTED,
                "lt",
            )

            slide_y = int((1.0 - ease_out_cubic(min(1.0, bt / 0.45))) * 36)
            px = SAFE_L + 4
            py = 328 + slide_y
            img.paste(phone_img, (px, py), mask=phone_img)

            rx0 = px + pw + 24
            rx1 = SAFE_R
            cards = [
                ("ENTRE MARCAS", "1' (12\")", 'Cálculo auto para 6" a 30°', SAFETY_YELLOW, True, 40),
                ("ENCOGIMIENTO", '1-1/2"', "Nunca vuelvas a quedar corto", SAFETY_YELLOW, True, 42),
                ("DIAGRAMA SVG", "M1 + M2", "Trazado visual de doblez 30°", TEXT_WHITE, False, 40),
                ("100% OFFLINE", "SIN ANUNCIOS", "Funciona en sótanos y obra", SUCCESS_GREEN, False, 34),
            ]
            cy = 342
            for idx, (lbl, val, sub, acc, active, vsz) in enumerate(cards):
                c_prog = ease_out_cubic(min(1.0, max(0.0, (bt - idx * 0.14) / 0.35)))
                dx = int((1.0 - c_prog) * 28)
                draw_metric_card(
                    draw, rx0 + dx, cy, rx1 + dx, cy + 186, lbl, val, sub, active=active, accent=acc, val_size=vsz
                )
                cy += 206

            draw_cta_banner(draw, 1210, 1292, "Calculadora Gratis en Comentario Fijado · App Offline", font_size=25)

        draw_kinetic_caption_and_progress(draw, beat.caption, beat.highlights, t / total_dur, bt)
        return img

    return render


# ---------------------------------------------------------------------------
# VIDEO 2: Doblez de 90° en EMT de 1/2" (Prueba de 60 Segundos / Deducción)
# ---------------------------------------------------------------------------
VIDEO2_SPEC = VideoSpec(
    slug="02_stub_up_takeup_fix_es",
    topic_badge='1/2" EMT · DOBLEZ 90°',
    beats=[
        Beat(
            id="hook",
            vo_text="¿La deducción de 5 en EMT de media te falla? Mira esto.",
            caption='¿Tu deducción de 5" en 1/2" EMT te falla? Mira por qué.',
            highlights=['5"', 'deducción', '1/2"'],
        ),
        Beat(
            id="drift",
            vo_text="Ideal usa 4 y 5 dieciseisavos, Klein 4 y 5 octavos, y zapatas gastadas varían.",
            caption='Ideal (4-5/16" R) vs Klein (4-5/8" R) y zapatas gastadas varían.',
            highlights=['4-5/16"', '4-5/8"', 'zapatas'],
        ),
        Beat(
            id="scrap1",
            vo_text="Prueba en sobrante: marca 12, flecha en 12, dobla a 90 a nivel.",
            caption='Prueba 60 seg en sobrante: Marca 12" · Flecha en 12" · Dobla a 90°.',
            highlights=['60', '12"', '90°'],
        ),
        Beat(
            id="scrap2",
            vo_text="Midió 17 y tres octavos al piso. Menos 12: deducción real, 5 y tres octavos.",
            caption='Mide 17-3/8" del piso al tope: Deducción real = 17-3/8" − 12" = 5-3/8".',
            highlights=['17-3/8"', '5-3/8"'],
        ),
        Beat(
            id="realmark",
            vo_text="14 y tres octavos menos 5 y tres octavos: marca en 9 exactas.",
            caption='Para doblez de 14-3/8": 14-3/8" − 5-3/8" = Marca en 9" exactas.',
            highlights=['5-3/8"', '9"', 'exactas'],
        ),
        Beat(
            id="app",
            vo_text="Calibra tu doblador en Conduit Bend Calc. Link gratis en el comentario fijado.",
            caption='Calibra tu Doblador · Calculadora de 90° gratis en Comentario Fijado.',
            highlights=['Calibra', 'gratis', 'Comentario', 'Fijado'],
        ),
    ],
)


def make_video2_renderer(base: Image.Image) -> Callable[[float, Beat, float], Image.Image]:
    ss_stub, sw, sh = load_framed_screenshot(RAW_SS_DIR / "02_stub.png", screen_w=368)
    ss_bender, bw, bh = load_framed_screenshot(RAW_SS_DIR / "05_bender_expanded.png", screen_w=368)

    def render(t: float, beat: Beat, total_dur: float) -> Image.Image:
        img = base.copy()
        draw = ImageDraw.Draw(img)
        bt = max(0.0, t - beat.start)

        if beat.id == "hook":
            draw_pill(
                draw,
                SAFE_L,
                238,
                'DEDUCCIÓN (TAKE-UP) EN 1/2" EMT',
                get_font(22, "bold"),
                bg=MARK_RED_BG,
                fg=MARK_RED,
                border=MARK_RED,
                pad_x=20,
                pad_y=10,
            )
            draw_text_exact(draw, SAFE_L, 308, "¿TU DEDUCCIÓN", get_font(78, "black"), TEXT_WHITE, "lt")
            draw_text_exact(draw, SAFE_L, 398, 'DE 5" TE ESTÁ', get_font(82, "black"), TEXT_WHITE, "lt")
            draw_text_exact(draw, SAFE_L, 492, "MINTIENDO?", get_font(84, "black"), SAFETY_YELLOW, "lt")

            card_y0, card_y1 = 606, 1276
            draw.rounded_rectangle(
                [(SAFE_L, card_y0), (SAFE_R, card_y1)],
                radius=20,
                fill=NAVY_SURFACE,
                outline=MARK_RED,
                width=3,
            )
            draw_text_exact(
                draw,
                SAFE_L + 28,
                card_y0 + 26,
                'DEDUCCIÓN 5": 14-3/8" − 5" = MARCA EN 9-3/8"',
                get_font(23, "bold"),
                TEXT_MUTED,
                "lt",
            )

            slab_y = 1130
            draw.line([(SAFE_L + 36, slab_y), (SAFE_R - 36, slab_y)], fill=BEAM_STROKE, width=5)
            draw_text_exact(draw, SAFE_R - 42, slab_y + 18, "LOSA DE CONCRETO", get_font(20, "bold"), TEXT_MUTED, "rt")

            bend_x = 340
            top_target_y = 780
            top_actual_y = 720
            pts = [
                (SAFE_L + 56, slab_y - 16),
                (bend_x - 70, slab_y - 16),
                (bend_x - 22, slab_y - 34),
                (bend_x, slab_y - 84),
                (bend_x, top_actual_y),
            ]
            draw_conduit_polyline(draw, pts, thickness=26)

            draw_dashed_line(draw, (bend_x + 28, top_target_y), (SAFE_R - 50, top_target_y), fill=SAFETY_YELLOW, width=3)
            draw_text_exact(draw, SAFE_R - 50, top_target_y + 12, 'OBJETIVO: 14-3/8"', get_font(24, "mono"), SAFETY_YELLOW, "rt")

            draw_dashed_line(draw, (bend_x + 28, top_actual_y), (SAFE_R - 50, top_actual_y), fill=MARK_RED, width=3)
            draw_text_exact(draw, SAFE_R - 50, top_actual_y - 34, 'REAL: 14-3/4"', get_font(26, "mono"), MARK_RED, "rt")

            draw_arrow_line(draw, (460, slab_y - 6), (460, top_actual_y + 4), fill=TEXT_WHITE, width=4, both=True)
            draw_pill(
                draw,
                676,
                910,
                '¡SE PASÓ 3/8"!',
                get_font(35, "mono"),
                bg=MARK_RED,
                fg=TEXT_WHITE,
                pad_x=22,
                pad_y=14,
                align="center",
            )
            draw_text_exact(draw, 676, 995, "Zapata gastada o distinto radio", get_font(23, "medium"), TEXT_MUTED, "cc")

        elif beat.id == "drift":
            draw_text_exact(
                draw, SAFE_L, 232, "POR QUÉ VARÍAN LOS DOBLADORES EN 90°", get_font(30, "bold"), TEXT_WHITE, "lt"
            )

            draw.rounded_rectangle(
                [(SAFE_L, 286), (SAFE_R, 396)],
                radius=16,
                fill=NAVY_DEEP,
                outline=NAVY_BORDER,
                width=2,
            )
            draw_text_exact(draw, SAFE_L + 26, 314, "FÓRMULA ESTÁNDAR (TAKE-UP)", get_font(20, "bold"), TEXT_MUTED, "lt")
            draw_text_exact(
                draw, SAFE_L + 26, 352, '14-3/8" Doblez − 5" Deducción = 9-3/8"', get_font(28, "mono"), SAFETY_YELLOW, "lt"
            )

            rows = [
                ("IDEAL 74-026", 'Doblador manual 1/2" EMT', 'R = 4-5/16"', '5" Flecha', NAVY_BORDER, TEXT_WHITE),
                ("KLEIN 51603", '1/2" EMT (+5/16" más de radio)', 'R = 4-5/8"', '5" Flecha', SAFETY_YELLOW, SAFETY_YELLOW),
                ("ZAPATA GASTADA", "Golpes en obra · Desviación real", "Desviación", '¡5-3/8" Real!', MARK_RED, MARK_RED),
            ]
            ry = 424
            for i, (brand, desc, rad, takeup, bcol, vcol) in enumerate(rows):
                p = ease_out_cubic(min(1.0, max(0.0, (bt - i * 0.35) / 0.45)))
                dx = int((1.0 - p) * 32)
                draw.rounded_rectangle(
                    [(SAFE_L + dx, ry), (SAFE_R + dx, ry + 186)],
                    radius=18,
                    fill=NAVY_SURFACE,
                    outline=bcol,
                    width=3 if i > 0 else 2,
                )
                draw_text_exact(draw, SAFE_L + 28 + dx, ry + 26, brand, get_font(30, "bold"), vcol, "lt")
                draw_text_exact(draw, SAFE_L + 28 + dx, ry + 70, desc, get_font(23, "medium"), TEXT_MUTED, "lt")
                draw_pill(
                    draw,
                    SAFE_L + 28 + dx,
                    ry + 114,
                    rad,
                    get_font(25, "mono"),
                    bg=NAVY_DEEP,
                    fg=TEXT_WHITE,
                    border=NAVY_BORDER,
                    pad_x=18,
                    pad_y=9,
                )
                draw_pill(
                    draw,
                    SAFE_R - 28 + dx,
                    ry + 114,
                    takeup,
                    get_font(25, "mono"),
                    bg=MARK_RED_BG if i == 2 else NAVY_DEEP,
                    fg=vcol,
                    border=bcol,
                    pad_x=18,
                    pad_y=9,
                    align="right",
                )
                ry += 206

            draw.rounded_rectangle(
                [(SAFE_L, 1068), (SAFE_R, 1286)],
                radius=16,
                fill=YELLOW_DARK_BG,
                outline=SAFETY_YELLOW,
                width=3,
            )
            draw_text_exact(
                draw, SAFE_L + 28, 1096, "ADEMÁS: DOBLADORES MECÁNICOS CAMBIAN REFERENCIA", get_font(22, "bold"), SAFETY_YELLOW, "lt"
            )
            draw_wrapped_text(
                draw,
                SAFE_L + 28,
                1138,
                'Greenlee 555 (7" deducción) y 1800 (5-1/2") miden desde el BORDE DEL GANCHO — no desde la flecha.',
                get_font(24, "medium"),
                TEXT_WHITE,
                SAFE_W - 56,
                line_gap=10,
            )

        elif beat.id in ("scrap1", "scrap2", "realmark"):
            step_idx = {"scrap1": 0, "scrap2": 1, "realmark": 2}[beat.id]

            p_box = draw_pill(
                draw,
                SAFE_L,
                232,
                "PRUEBA DE 60 SEG",
                get_font(23, "bold"),
                bg=SAFETY_YELLOW,
                fg=NAVY_DEEP,
                pad_x=18,
                pad_y=9,
            )
            draw_text_exact(draw, p_box[2] + 18, (p_box[1] + p_box[3]) // 2, "CALIBRA TU DOBLADOR", get_font(27, "bold"), TEXT_WHITE, "lc")

            bp_y0, bp_y1 = 302, 1030
            draw.rounded_rectangle(
                [(SAFE_L, bp_y0), (SAFE_R, bp_y1)],
                radius=20,
                fill=NAVY_SURFACE,
                outline=NAVY_BORDER,
                width=2,
            )

            slab_y = bp_y1 - 82
            draw.line([(SAFE_L + 36, slab_y), (SAFE_R - 36, slab_y)], fill=BEAM_STROKE, width=5)
            draw_text_exact(draw, SAFE_R - 42, slab_y + 18, "PISO PLANO DE CONCRETO", get_font(20, "bold"), TEXT_MUTED, "rt")

            if step_idx == 0:
                draw_text_exact(
                    draw,
                    SAFE_L + 28,
                    bp_y0 + 26,
                    'PASO 1: MARCA 12" EN SOBRANTE · DOBLA 90° A NIVEL',
                    get_font(23, "bold"),
                    SAFETY_YELLOW,
                    "lt",
                )
                to_x = draw_tape_ruler(draw, SAFE_L + 28, SAFE_R - 28, bp_y0 + 76, 0, 24, major_step=4, minor_step=1)
                p_y = bp_y0 + 188
                draw_conduit_segment(draw, (to_x(0), p_y), (to_x(24), p_y), thickness=24)
                x12 = to_x(12)
                draw.line([(x12, p_y - 28), (x12, p_y + 28)], fill=MARK_RED, width=7)
                draw_pill(
                    draw,
                    int(x12),
                    p_y + 38,
                    'MARCA 12" (FLECHA)',
                    get_font(22, "mono"),
                    bg=MARK_RED,
                    fg=TEXT_WHITE,
                    pad_x=16,
                    pad_y=7,
                    align="center",
                )

                bend_prog = ease_in_out(min(1.0, max(0.0, (bt - 0.5) / 1.4)))
                angle_rad = math.radians(90 * bend_prog)
                piv_x, piv_y = 430, slab_y - 18
                leg_len = 310
                tip_x = piv_x + math.cos(angle_rad) * leg_len
                tip_y = piv_y - math.sin(angle_rad) * leg_len
                draw_conduit_polyline(draw, [(SAFE_L + 60, piv_y), (piv_x, piv_y), (tip_x, tip_y)], thickness=24)
                draw_pill(
                    draw,
                    SAFE_R - 42,
                    slab_y - 210,
                    f"{int(round(90 * bend_prog))}°",
                    get_font(46, "mono"),
                    bg=NAVY_DEEP,
                    fg=SAFETY_YELLOW if bend_prog > 0.9 else TEXT_WHITE,
                    border=SAFETY_YELLOW if bend_prog > 0.9 else NAVY_BORDER,
                    pad_x=24,
                    pad_y=12,
                    align="right",
                )
                if bend_prog > 0.85:
                    lv_box = draw_pill(
                        draw,
                        SAFE_R - 42,
                        slab_y - 122,
                        "     NIVEL TORPEDO 90°",
                        get_font(22, "bold"),
                        bg=SUCCESS_BG,
                        fg=SUCCESS_GREEN,
                        border=SUCCESS_GREEN,
                        pad_x=16,
                        pad_y=8,
                        align="right",
                    )
                    draw_check_icon(draw, lv_box[0] + 24, (lv_box[1] + lv_box[3]) // 2, 16, SUCCESS_GREEN, width=3)

            else:
                is_final = step_idx == 2
                hdr = (
                    'PASO 3: APLICA TU DEDUCCIÓN REAL DE 5-3/8"'
                    if is_final
                    else "PASO 2: MIDE DEL PISO AL TOPE DEL CONDUCTO"
                )
                draw_text_exact(
                    draw,
                    SAFE_L + 28,
                    bp_y0 + 26,
                    hdr,
                    get_font(23, "bold"),
                    SUCCESS_GREEN if is_final else SAFETY_YELLOW,
                    "lt",
                )

                bend_x = 310
                top_y = bp_y0 + (178 if is_final else 132)
                pts = [
                    (SAFE_L + 60, slab_y - 16),
                    (bend_x - 65, slab_y - 16),
                    (bend_x - 20, slab_y - 34),
                    (bend_x, slab_y - 84),
                    (bend_x, top_y),
                ]
                draw_conduit_polyline(draw, pts, thickness=26)

                dim_p = ease_out_cubic(min(1.0, bt / 0.65))
                cur_top = lerp(slab_y - 10, top_y, dim_p)
                draw_arrow_line(
                    draw,
                    (bend_x + 76, slab_y - 4),
                    (bend_x + 76, cur_top),
                    fill=SUCCESS_GREEN if is_final else SAFETY_YELLOW,
                    width=5,
                    both=True,
                )
                draw_dashed_line(draw, (bend_x + 16, top_y), (bend_x + 110, top_y), fill=TEXT_MUTED, width=2)

                rx0, rx1 = 446, SAFE_R - 26
                if not is_final:
                    draw_metric_card(
                        draw,
                        rx0,
                        bp_y0 + 120,
                        rx1,
                        bp_y0 + 290,
                        "ALTURA MEDIDA",
                        '17-3/8"',
                        "Del piso al tope del conducto",
                        active=True,
                        accent=TEXT_WHITE,
                    )
                    draw_metric_card(
                        draw,
                        rx0,
                        bp_y0 + 314,
                        rx1,
                        bp_y0 + 496,
                        "DEDUCCIÓN REAL",
                        '5-3/8"',
                        '17-3/8" − 12" de marca',
                        active=True,
                        accent=SAFETY_YELLOW,
                    )
                    draw_pill(
                        draw,
                        (rx0 + rx1) // 2,
                        bp_y0 + 526,
                        '¡NO SON 5" ESTAMPADAS!',
                        get_font(23, "bold"),
                        bg=MARK_RED_BG,
                        fg=MARK_RED,
                        border=MARK_RED,
                        pad_x=18,
                        pad_y=10,
                        align="center",
                    )
                else:
                    draw_metric_card(
                        draw,
                        rx0,
                        bp_y0 + 120,
                        rx1,
                        bp_y0 + 290,
                        "MARCA REAL EN CINTA",
                        '9" EXACTAS',
                        '14-3/8" − 5-3/8" deducción',
                        active=True,
                        accent=SAFETY_YELLOW,
                        val_size=38,
                    )
                    draw_metric_card(
                        draw,
                        rx0,
                        bp_y0 + 314,
                        rx1,
                        bp_y0 + 496,
                        "DOBLEZ TERMINADO",
                        '14-3/8"',
                        "Cero retrabajo · Cero merma",
                        active=True,
                        accent=SUCCESS_GREEN,
                    )
                    ok2_box = draw_pill(
                        draw,
                        (rx0 + rx1) // 2,
                        bp_y0 + 526,
                        "     MEDIDA EXACTA",
                        get_font(25, "bold"),
                        bg=SUCCESS_BG,
                        fg=SUCCESS_GREEN,
                        border=SUCCESS_GREEN,
                        pad_x=20,
                        pad_y=10,
                        align="center",
                    )
                    draw_check_icon(draw, ok2_box[0] + 28, (ok2_box[1] + ok2_box[3]) // 2, 18, SUCCESS_GREEN, width=3)

            draw_step_checklist(
                draw,
                1054,
                1294,
                [
                    ('Marca 12" en sobrante, dobla a 90°', '12" a 90°'),
                    ('Mide piso al tope (17-3/8" − 12")', '5-3/8" Ded.'),
                    ('14-3/8" − 5-3/8" deducción real', 'Marca 9"'),
                ],
                active_idx=step_idx,
            )

        else:
            # Act 3: Dual Real Spanish App Showcase (02_stub.png + 05_bender_expanded.png)
            draw_text_exact(draw, SAFE_L, 230, "CALIBRA TU DOBLADOR EXACTO", get_font(36, "bold"), TEXT_WHITE, "lt")
            draw_text_exact(
                draw,
                SAFE_L,
                278,
                "Presets Ideal, Klein y Greenlee + calibración personalizada",
                get_font(23, "medium"),
                TEXT_MUTED,
                "lt",
            )

            gap = 36
            total_w = sw + gap + bw
            x_left = SAFE_L + (SAFE_W - total_w) // 2
            x_right = x_left + sw + gap

            slide1 = int((1.0 - ease_out_cubic(min(1.0, bt / 0.4))) * 34)
            slide2 = int((1.0 - ease_out_cubic(min(1.0, max(0.0, (bt - 0.2) / 0.4)))) * 34)

            draw_pill(
                draw,
                x_left + sw // 2,
                316,
                "CALC. SUBIDA 90°",
                get_font(20, "bold"),
                bg=NAVY_SURFACE,
                fg=SAFETY_YELLOW,
                border=NAVY_BORDER,
                pad_x=16,
                pad_y=6,
                align="center",
            )
            draw_pill(
                draw,
                x_right + bw // 2,
                316,
                "AJUSTE DE DOBLADOR",
                get_font(20, "bold"),
                bg=NAVY_SURFACE,
                fg=SAFETY_YELLOW,
                border=NAVY_BORDER,
                pad_x=16,
                pad_y=6,
                align="center",
            )

            img.paste(ss_stub, (x_left, 358 + slide1), mask=ss_stub)
            img.paste(ss_bender, (x_right, 358 + slide2), mask=ss_bender)

            draw_cta_banner(draw, 1212, 1294, "Calibra tu Doblador · Calc. 90° Gratis en Comentario", font_size=25)

        draw_kinetic_caption_and_progress(draw, beat.caption, beat.highlights, t / total_dur, bt)
        return img

    return render


# ---------------------------------------------------------------------------
# VIDEO 3: Silla de 3 Puntos (Solo 2 Números: 2.5 y 3/16")
# ---------------------------------------------------------------------------
VIDEO3_SPEC = VideoSpec(
    slug="03_3point_saddle_3in_es",
    topic_badge="SILLA 3 PTS · 45°/22.5°",
    beats=[
        Beat(
            id="hook",
            vo_text="¿Silla de 3 puntos? Solo dos números: 2 punto 5 y 3 dieciseisavos.",
            caption='Silla de 3 Puntos: Solo 2 números que recordar: 2.5 y 3/16".',
            highlights=['2.5', '3/16"'],
        ),
        Beat(
            id="center",
            vo_text="¿Obstáculo de 3 a 36? Encogimiento 9 dieciseisavos: centro en 36 y 9 dieciseisavos en la muesca, 45 grados.",
            caption='Encogimiento 9/16": Centro = 36-9/16" (Muesca del borde, 45°).',
            highlights=['9/16"', '36-9/16"', '45°'],
        ),
        Beat(
            id="sides",
            vo_text="Lados a 7 y media: 29 y un dieciseisavo y 44 y un dieciseisavo en flecha, 22 punto 5.",
            caption='Lados ±7-1/2": 29-1/16" y 44-1/16" (Flecha, 22.5°).',
            highlights=['±7-1/2"', '29-1/16"', '44-1/16"', '22.5°'],
        ),
        Beat(
            id="protip",
            vo_text="Consejo pro: conducto de 3 mide 3 y media exterior. ¡Mide antes!",
            caption='CONSEJO PRO: Conducto nominal de 3" mide 3-1/2" exterior (OD). ¡Mide antes!',
            highlights=['CONSEJO', 'PRO', '3-1/2"', 'OD'],
        ),
        Beat(
            id="app",
            vo_text="Revisa tus marcas en Conduit Bend Calc. Link gratis en el comentario fijado.",
            caption='Calculadora Silla de 3 Puntos gratis en Comentario Fijado · App Offline.',
            highlights=['gratis', 'Comentario', 'Fijado', 'Offline'],
        ),
    ],
)


def make_video3_renderer(base: Image.Image) -> Callable[[float, Beat, float], Image.Image]:
    phone_img, pw, ph = load_framed_screenshot(RAW_SS_DIR / "03_saddle.png", screen_w=390)

    def render(t: float, beat: Beat, total_dur: float) -> Image.Image:
        img = base.copy()
        draw = ImageDraw.Draw(img)
        bt = max(0.0, t - beat.start)

        if beat.id == "hook":
            draw_pill(
                draw,
                SAFE_L,
                238,
                "TRUCO RÁPIDO EN OBRA",
                get_font(23, "bold"),
                bg=NAVY_SURFACE,
                fg=SAFETY_YELLOW,
                border=SAFETY_YELLOW,
                pad_x=20,
                pad_y=10,
            )
            draw_text_exact(draw, SAFE_L, 308, "SILLA DE 3 PUNTOS:", get_font(74, "black"), TEXT_WHITE, "lt")
            draw_text_exact(draw, SAFE_L, 398, "SOLO 2 NÚMEROS", get_font(82, "black"), SAFETY_YELLOW, "lt")

            gap = 24
            cw = (SAFE_W - gap) // 2
            p1 = ease_out_cubic(min(1.0, bt / 0.45))
            p2 = ease_out_cubic(min(1.0, max(0.0, (bt - 0.25) / 0.45)))

            for idx, (num, title, sub, prog) in enumerate(
                [
                    ("2.5", "SEPARACIÓN LADOS", "Multiplicador (Altura × 2.5)", p1),
                    ('3/16"', "ENCOGIMIENTO", "Por pulgada de obstáculo", p2),
                ]
            ):
                x0 = SAFE_L + idx * (cw + gap)
                x1 = x0 + cw
                dy = int((1.0 - prog) * 28)
                draw.rounded_rectangle(
                    [(x0, 516 + dy), (x1, 764 + dy)],
                    radius=20,
                    fill=NAVY_SURFACE,
                    outline=SAFETY_YELLOW,
                    width=3,
                )
                draw_text_exact(draw, (x0 + x1) // 2, 548 + dy, title, get_font(23, "bold"), TEXT_MUTED, "ct")
                draw_text_exact(draw, (x0 + x1) // 2, 646 + dy, num, get_font(82, "mono"), SAFETY_YELLOW, "cc")
                draw_text_exact(draw, (x0 + x1) // 2, 736 + dy, sub, get_font(20, "medium"), TEXT_WHITE, "cb")

            cy0, cy1 = 794, 1276
            draw.rounded_rectangle(
                [(SAFE_L, cy0), (SAFE_R, cy1)],
                radius=20,
                fill=NAVY_SURFACE,
                outline=NAVY_BORDER,
                width=2,
            )
            base_y = 1140
            peak_y = 955
            cx = SAFE_CX
            obs_r = 68
            draw.ellipse(
                (cx - obs_r, base_y - obs_r * 2 + 12, cx + obs_r, base_y + 12),
                fill=BEAM_FILL,
                outline=BEAM_STROKE,
                width=4,
            )
            draw_text_exact(draw, cx, base_y - obs_r + 12, 'OBS 3"', get_font(24, "bold"), TEXT_WHITE, "cc")

            s_pts = [
                (SAFE_L + 44, base_y),
                (cx - 230, base_y),
                (cx, peak_y),
                (cx + 230, base_y),
                (SAFE_R - 44, base_y),
            ]
            draw_conduit_polyline(draw, s_pts, thickness=24)
            draw_pill(
                draw,
                cx,
                peak_y - 76,
                "CENTRO 45° (MUESCA)",
                get_font(23, "bold"),
                bg=SAFETY_YELLOW,
                fg=NAVY_DEEP,
                pad_x=18,
                pad_y=8,
                align="center",
            )
            draw_pill(
                draw,
                cx - 230,
                base_y + 30,
                "22.5° FLECHA",
                get_font(22, "bold"),
                bg=NAVY_DEEP,
                fg=TEXT_WHITE,
                border=NAVY_BORDER,
                pad_x=14,
                pad_y=7,
                align="center",
            )
            draw_pill(
                draw,
                cx + 230,
                base_y + 30,
                "22.5° FLECHA",
                get_font(22, "bold"),
                bg=NAVY_DEEP,
                fg=TEXT_WHITE,
                border=NAVY_BORDER,
                pad_x=14,
                pad_y=7,
                align="center",
            )

        elif beat.id in ("center", "sides", "protip"):
            step_idx = {"center": 0, "sides": 1, "protip": 2}[beat.id]

            draw_text_exact(
                draw, SAFE_L, 232, 'SILLA 3 PUNTOS · OBSTÁCULO 3" A 36"', get_font(30, "bold"), TEXT_WHITE, "lt"
            )

            gap = 20
            cw = (SAFE_W - gap) // 2
            draw_metric_card(
                draw,
                SAFE_L,
                282,
                SAFE_L + cw,
                424,
                'ENCOGIMIENTO = 3" × 3/16"',
                '9/16"',
                'Centro = 36" + 9/16" = 36-9/16"',
                active=(step_idx == 0),
            )
            draw_metric_card(
                draw,
                SAFE_L + cw + gap,
                282,
                SAFE_R,
                424,
                'SEPARACIÓN = 3" × 2.5',
                '7-1/2"',
                'Largo total = 15" (ambos lados)',
                active=(step_idx == 1),
            )

            bp_y0, bp_y1 = 446, 1046
            draw.rounded_rectangle(
                [(SAFE_L, bp_y0), (SAFE_R, bp_y1)],
                radius=20,
                fill=NAVY_SURFACE,
                outline=NAVY_BORDER,
                width=2,
            )

            to_x = draw_tape_ruler(draw, SAFE_L + 22, SAFE_R - 22, bp_y0 + 24, 24, 48, major_step=4, minor_step=1)
            pipe_y = bp_y0 + 186
            x_36 = to_x(36.0)
            x_c = to_x(36.5625)
            x_m1 = to_x(29.0625)
            x_m3 = to_x(44.0625)

            draw_conduit_segment(draw, (to_x(24.3), pipe_y), (to_x(47.7), pipe_y), thickness=26)
            draw_dashed_line(draw, (x_36, bp_y0 + 68), (x_36, pipe_y + 64), fill=TEXT_MUTED, width=2)

            c_prog = ease_out_cubic(min(1.0, bt / 0.55)) if step_idx == 0 else 1.0
            draw.line([(x_c, pipe_y - int(30 * c_prog)), (x_c, pipe_y + int(30 * c_prog))], fill=MARK_RED, width=7)
            draw_pill(
                draw,
                int(x_c),
                pipe_y - 98,
                'C: 36-9/16" (MUESCA · 45°)',
                get_font(22, "mono"),
                bg=MARK_RED,
                fg=TEXT_WHITE,
                pad_x=14,
                pad_y=7,
                align="center",
            )

            if step_idx >= 1:
                sp = ease_out_cubic(min(1.0, bt / 0.65)) if step_idx == 1 else 1.0
                lx = lerp(x_c, x_m1, sp)
                rx = lerp(x_c, x_m3, sp)
                draw_arrow_line(draw, (x_c - 6, pipe_y + 52), (lx + 6, pipe_y + 52), fill=SAFETY_YELLOW, width=4, both=True)
                draw_arrow_line(draw, (x_c + 6, pipe_y + 52), (rx - 6, pipe_y + 52), fill=SAFETY_YELLOW, width=4, both=True)
                draw_text_exact(draw, int((x_c + lx) / 2), pipe_y + 74, '−7-1/2"', get_font(21, "mono"), SAFETY_YELLOW, "cc")
                draw_text_exact(draw, int((x_c + rx) / 2), pipe_y + 74, '+7-1/2"', get_font(21, "mono"), SAFETY_YELLOW, "cc")

                if sp > 0.65:
                    draw.line([(x_m1, pipe_y - 28), (x_m1, pipe_y + 28)], fill=SAFETY_YELLOW, width=7)
                    draw.line([(x_m3, pipe_y - 28), (x_m3, pipe_y + 28)], fill=SAFETY_YELLOW, width=7)
                    draw_pill(
                        draw,
                        int(x_m1) + 12,
                        pipe_y + 96,
                        'M1: 29-1/16"',
                        get_font(21, "mono"),
                        bg=NAVY_DEEP,
                        fg=SAFETY_YELLOW,
                        border=SAFETY_YELLOW,
                        pad_x=12,
                        pad_y=6,
                        align="center",
                    )
                    draw_pill(
                        draw,
                        int(x_m3) - 12,
                        pipe_y + 96,
                        'M3: 44-1/16"',
                        get_font(21, "mono"),
                        bg=NAVY_DEEP,
                        fg=SAFETY_YELLOW,
                        border=SAFETY_YELLOW,
                        pad_x=12,
                        pad_y=6,
                        align="center",
                    )

            draw.line([(SAFE_L + 24, bp_y0 + 344), (SAFE_R - 24, bp_y0 + 344)], fill=NAVY_BORDER, width=2)
            saddle_base_y = bp_y1 - 56
            saddle_rise = 128 if step_idx >= 1 else int(128 * ease_out_cubic(min(1.0, bt / 0.8)))
            obs_r = 54
            draw.ellipse(
                (x_36 - obs_r, saddle_base_y - obs_r * 2 + 12, x_36 + obs_r, saddle_base_y + 12),
                fill=BEAM_FILL,
                outline=BEAM_STROKE,
                width=3,
            )
            draw_text_exact(draw, int(x_36), saddle_base_y - obs_r + 12, '3"', get_font(24, "bold"), TEXT_WHITE, "cc")
            s_pts = [
                (to_x(24.5), saddle_base_y),
                (x_m1, saddle_base_y),
                (x_36, saddle_base_y - saddle_rise),
                (x_m3, saddle_base_y),
                (to_x(47.5), saddle_base_y),
            ]
            draw_conduit_polyline(draw, s_pts, thickness=20)
            draw_text_exact(draw, int(x_36), saddle_base_y - saddle_rise - 28, "45° MUESCA", get_font(20, "bold"), SAFETY_YELLOW, "cc")
            draw_text_exact(draw, int(x_m1), saddle_base_y + 26, "22.5° FLECHA", get_font(19, "bold"), TEXT_MUTED, "cc")
            draw_text_exact(draw, int(x_m3), saddle_base_y + 26, "22.5° FLECHA", get_font(19, "bold"), TEXT_MUTED, "cc")

            if step_idx < 2:
                draw_step_checklist(
                    draw,
                    1068,
                    1294,
                    [
                        ('Centro (3" × 3/16") · Muesca 45°', '36-9/16"'),
                        ('Lados (±7-1/2") · Flecha 22.5°', '29-1/16" y 44-1/16"'),
                        ('Consejo pro: ¡Mide el OD real!', '3" = 3-1/2" OD'),
                    ],
                    active_idx=step_idx,
                )
            else:
                pop = ease_out_cubic(min(1.0, bt / 0.35))
                dy = int((1.0 - pop) * 18)
                draw.rounded_rectangle(
                    [(SAFE_L, 1068 + dy), (SAFE_R, 1294 + dy)],
                    radius=18,
                    fill=SAFETY_YELLOW,
                    outline=TEXT_WHITE,
                    width=3,
                )
                w_box = draw_pill(
                    draw,
                    SAFE_L + 24,
                    1088 + dy,
                    "     CONSEJO PRO EN OBRA",
                    get_font(23, "bold"),
                    bg=NAVY_DEEP,
                    fg=SAFETY_YELLOW,
                    pad_x=16,
                    pad_y=7,
                )
                draw_warn_icon(draw, w_box[0] + 28, (w_box[1] + w_box[3]) // 2, 20, SAFETY_YELLOW, NAVY_DEEP)
                draw_text_exact(
                    draw,
                    SAFE_L + 24,
                    1148 + dy,
                    '¡CONDUCTO DE 3" MIDE 3-1/2" OD!',
                    get_font(36, "black"),
                    NAVY_DEEP,
                    "lt",
                )
                draw_text_exact(
                    draw,
                    SAFE_L + 24,
                    1208 + dy,
                    'Mide siempre el OD real: a 3-1/2", usa 8-3/4" y ~5/8" encog.',
                    get_font(22, "bold"),
                    NAVY_DEEP,
                    "lt",
                )
                draw_text_exact(
                    draw,
                    SAFE_L + 24,
                    1246 + dy,
                    "¡Nunca marques por medida nominal sin poner tu cinta!",
                    get_font(21, "medium"),
                    NAVY_BG,
                    "lt",
                )

        else:
            # Act 3: Real Spanish App Reveal (03_saddle.png) + Feature Cards + CTA
            draw_text_exact(draw, SAFE_L, 232, "MARCAS DE SILLA EN 3 SEGUNDOS", get_font(36, "bold"), TEXT_WHITE, "lt")
            draw_text_exact(
                draw,
                SAFE_L,
                282,
                'Diagrama de Silla de 3 Puntos + fracciones de 1/16"',
                get_font(23, "medium"),
                TEXT_MUTED,
                "lt",
            )

            slide_y = int((1.0 - ease_out_cubic(min(1.0, bt / 0.45))) * 36)
            px = SAFE_L + 4
            py = 328 + slide_y
            img.paste(phone_img, (px, py), mask=phone_img)

            rx0 = px + pw + 24
            rx1 = SAFE_R
            cards = [
                ("SEPARACIÓN", '7-1/2"', '3" × 2.5 por cada lado', SAFETY_YELLOW, True, 42),
                ("ENCOGIMIENTO", '9/16"', '3" × 3/16" ajuste central', SAFETY_YELLOW, True, 42),
                ("LARGO TOTAL", '15"', "Trazado Marca 1 a Marca 3", TEXT_WHITE, False, 42),
                ("100% OFFLINE", "GUÍA SVG", "Ángulos M1, M2 y M3 en obra", SUCCESS_GREEN, False, 38),
            ]
            cy = 342
            for idx, (lbl, val, sub, acc, active, vsz) in enumerate(cards):
                c_prog = ease_out_cubic(min(1.0, max(0.0, (bt - idx * 0.14) / 0.35)))
                dx = int((1.0 - c_prog) * 28)
                draw_metric_card(
                    draw, rx0 + dx, cy, rx1 + dx, cy + 186, lbl, val, sub, active=active, accent=acc, val_size=vsz
                )
                cy += 206

            draw_cta_banner(draw, 1210, 1292, "Calc. Silla 3 Puntos Gratis en Comentario · App Offline", font_size=24)

        draw_kinetic_caption_and_progress(draw, beat.caption, beat.highlights, t / total_dur, bt)
        return img

    return render


# ---------------------------------------------------------------------------
# Dedicated High-CTR 1080x1920 24-bit RGB Spanish Cover Thumbnails
# ---------------------------------------------------------------------------
def generate_cover_1(out_path: Path) -> None:
    img = build_base_canvas('3/4" EMT · OFFSET 30°')
    draw = ImageDraw.Draw(img)

    draw_pill(
        draw,
        SAFE_L,
        240,
        "NO VUELVAS A QUEDAR CORTO",
        get_font(24, "bold"),
        bg=MARK_RED_BG,
        fg=MARK_RED,
        border=MARK_RED,
        pad_x=22,
        pad_y=10,
    )
    draw_text_exact(draw, SAFE_L, 314, '¿OFFSET DE 6" EN EMT', get_font(76, "black"), TEXT_WHITE, "lt")
    draw_text_exact(draw, SAFE_L, 408, 'SIEMPRE 1-1/2"', get_font(88, "black"), SAFETY_YELLOW, "lt")
    draw_text_exact(draw, SAFE_L, 510, "MÁS CORTO?", get_font(86, "black"), TEXT_WHITE, "lt")

    draw.rounded_rectangle([(SAFE_L, 638), (SAFE_R, 1120)], radius=22, fill=NAVY_SURFACE, outline=SAFETY_YELLOW, width=3)
    draw_text_exact(draw, SAFE_L + 28, 666, 'MARCAS EXACTAS A 30° (VIGA A 36")', get_font(24, "bold"), SAFETY_YELLOW, "lt")

    base_y = 970
    rise_y = 815
    draw.rectangle([(640, 845), (SAFE_R - 36, base_y + 24)], fill=BEAM_FILL, outline=BEAM_STROKE, width=3)
    draw_text_exact(draw, 770, 920, 'VIGA A 36"', get_font(25, "bold"), TEXT_WHITE, "cc")
    draw_conduit_polyline(draw, [(SAFE_L + 36, base_y), (340, base_y), (640, rise_y), (SAFE_R - 36, rise_y)], thickness=26)

    draw_pill(draw, 340, base_y + 34, 'M2: 25-1/2"', get_font(26, "mono"), bg=MARK_RED, fg=TEXT_WHITE, pad_x=16, pad_y=8, align="center")
    draw_pill(draw, 640, rise_y - 78, 'M1: 37-1/2"', get_font(26, "mono"), bg=MARK_RED, fg=TEXT_WHITE, pad_x=16, pad_y=8, align="center")
    draw_pill(
        draw,
        246,
        745,
        '12" ENTRE MARCAS',
        get_font(24, "mono"),
        bg=NAVY_DEEP,
        fg=SAFETY_YELLOW,
        border=SAFETY_YELLOW,
        pad_x=16,
        pad_y=10,
        align="center",
    )
    draw_pill(draw, 246, 822, '+1-1/2" SHRINK', get_font(25, "mono"), bg=SAFETY_YELLOW, fg=NAVY_DEEP, pad_x=18, pad_y=10, align="center")

    draw_metric_card(draw, SAFE_L, 1150, SAFE_L + 428, 1340, "MULTIPLICADOR 30°", "2.0", '6" × 2.0 = 12" entre marcas', active=True)
    draw_metric_card(draw, SAFE_L + 452, 1150, SAFE_R, 1340, "ENCOGIMIENTO 30°", '1/4"/in', '6" × 1/4" = 1-1/2" total', active=True)
    draw_cta_banner(draw, 1372, 1464, "GUÍA EN 30 SEG · CONDUIT BEND CALC", font_size=28)

    img.convert("RGB").save(out_path, format="PNG", optimize=True)


def generate_cover_2(out_path: Path) -> None:
    img = build_base_canvas('1/2" EMT · DOBLEZ 90°')
    draw = ImageDraw.Draw(img)

    draw_pill(
        draw,
        SAFE_L,
        240,
        "PRUEBA EN SOBRANTE DE 60 SEG",
        get_font(24, "bold"),
        bg=MARK_RED_BG,
        fg=MARK_RED,
        border=MARK_RED,
        pad_x=22,
        pad_y=10,
    )
    draw_text_exact(draw, SAFE_L, 314, "¿TU DEDUCCIÓN", get_font(82, "black"), TEXT_WHITE, "lt")
    draw_text_exact(draw, SAFE_L, 410, 'DE 5" TE ESTÁ', get_font(86, "black"), TEXT_WHITE, "lt")
    draw_text_exact(draw, SAFE_L, 510, "MINTIENDO?", get_font(88, "black"), SAFETY_YELLOW, "lt")

    draw.rounded_rectangle([(SAFE_L, 638), (SAFE_R, 1120)], radius=22, fill=NAVY_SURFACE, outline=SAFETY_YELLOW, width=3)
    draw_text_exact(draw, SAFE_L + 28, 666, "IDEAL vs. KLEIN vs. ZAPATA GASTADA EN OBRA", get_font(23, "bold"), SAFETY_YELLOW, "lt")

    slab_y = 1068
    draw.line([(SAFE_L + 36, slab_y), (SAFE_R - 36, slab_y)], fill=BEAM_STROKE, width=5)
    bend_x = 300
    draw_conduit_polyline(
        draw,
        [(SAFE_L + 56, slab_y - 16), (bend_x - 60, slab_y - 16), (bend_x - 18, slab_y - 34), (bend_x, slab_y - 80), (bend_x, 750)],
        thickness=26,
    )
    draw_arrow_line(draw, (bend_x + 70, slab_y - 6), (bend_x + 70, 754), fill=SAFETY_YELLOW, width=5, both=True)

    draw_metric_card(
        draw,
        430,
        730,
        SAFE_R - 28,
        892,
        'PRUEBA EN 12"',
        '17-3/8"',
        'Menos 12" = 5-3/8" deducción real',
        active=True,
        accent=SAFETY_YELLOW,
    )
    draw_metric_card(
        draw,
        430,
        912,
        SAFE_R - 28,
        1052,
        'MARCA PARA 14-3/8"',
        '9" EXACTAS',
        "Cero retrabajo · Cero merma",
        active=True,
        accent=SUCCESS_GREEN,
        val_size=38,
    )

    draw_metric_card(draw, SAFE_L, 1150, SAFE_L + 428, 1340, "IDEAL 74-026", '4-5/16" R', '1/2" EMT · Flecha 5"', active=False)
    draw_metric_card(draw, SAFE_L + 452, 1150, SAFE_R, 1340, "KLEIN 51603", '4-5/8" R', '¡Radio 5/16" más grande!', active=True)
    draw_cta_banner(draw, 1372, 1464, "CALIBRA TU DOBLADOR · CONDUIT BEND CALC", font_size=27)

    img.convert("RGB").save(out_path, format="PNG", optimize=True)


def generate_cover_3(out_path: Path) -> None:
    img = build_base_canvas("SILLA 3 PTS · 45°/22.5°")
    draw = ImageDraw.Draw(img)

    draw_pill(
        draw,
        SAFE_L,
        240,
        "TRUCO RÁPIDO EN OBRA",
        get_font(25, "bold"),
        bg=NAVY_SURFACE,
        fg=SAFETY_YELLOW,
        border=SAFETY_YELLOW,
        pad_x=22,
        pad_y=10,
    )
    draw_text_exact(draw, SAFE_L, 314, "SILLA DE 3 PUNTOS:", get_font(76, "black"), TEXT_WHITE, "lt")
    draw_text_exact(draw, SAFE_L, 410, "SOLO 2 NÚMEROS", get_font(86, "black"), SAFETY_YELLOW, "lt")

    gap = 24
    cw = (SAFE_W - gap) // 2
    for idx, (num, title, sub) in enumerate(
        [
            ("2.5", "SEPARACIÓN LADOS", '3" × 2.5 = 7-1/2"'),
            ('3/16"', "ENCOGIMIENTO", '3" × 3/16" = 9/16"'),
        ]
    ):
        x0 = SAFE_L + idx * (cw + gap)
        x1 = x0 + cw
        draw.rounded_rectangle([(x0, 536), (x1, 776)], radius=20, fill=NAVY_SURFACE, outline=SAFETY_YELLOW, width=3)
        draw_text_exact(draw, (x0 + x1) // 2, 566, title, get_font(23, "bold"), TEXT_MUTED, "ct")
        draw_text_exact(draw, (x0 + x1) // 2, 658, num, get_font(84, "mono"), SAFETY_YELLOW, "cc")
        draw_text_exact(draw, (x0 + x1) // 2, 748, sub, get_font(22, "mono"), TEXT_WHITE, "cb")

    draw.rounded_rectangle([(SAFE_L, 806), (SAFE_R, 1210)], radius=22, fill=NAVY_SURFACE, outline=NAVY_BORDER, width=2)
    base_y = 1106
    peak_y = 930
    cx = SAFE_CX
    obs_r = 62
    draw.ellipse((cx - obs_r, base_y - obs_r * 2 + 12, cx + obs_r, base_y + 12), fill=BEAM_FILL, outline=BEAM_STROKE, width=4)
    draw_text_exact(draw, cx, base_y - obs_r + 12, '3"', get_font(28, "bold"), TEXT_WHITE, "cc")
    draw_conduit_polyline(
        draw, [(SAFE_L + 42, base_y), (cx - 220, base_y), (cx, peak_y), (cx + 220, base_y), (SAFE_R - 42, base_y)], thickness=24
    )
    draw_pill(draw, cx, peak_y - 78, 'C: 36-9/16" (MUESCA 45°)', get_font(24, "mono"), bg=MARK_RED, fg=TEXT_WHITE, pad_x=18, pad_y=8, align="center")
    draw_pill(
        draw,
        cx - 220,
        base_y + 28,
        '29-1/16" (22.5°)',
        get_font(21, "mono"),
        bg=NAVY_DEEP,
        fg=SAFETY_YELLOW,
        border=SAFETY_YELLOW,
        pad_x=12,
        pad_y=6,
        align="center",
    )
    draw_pill(
        draw,
        cx + 220,
        base_y + 28,
        '44-1/16" (22.5°)',
        get_font(21, "mono"),
        bg=NAVY_DEEP,
        fg=SAFETY_YELLOW,
        border=SAFETY_YELLOW,
        pad_x=12,
        pad_y=6,
        align="center",
    )

    draw.rounded_rectangle([(SAFE_L, 1238), (SAFE_R, 1344)], radius=16, fill=YELLOW_DARK_BG, outline=SAFETY_YELLOW, width=3)
    draw_warn_icon(draw, SAFE_L + 84, 1272, 24, SAFETY_YELLOW, YELLOW_DARK_BG)
    draw_text_exact(draw, SAFE_CX + 16, 1272, 'PRO: ¡CONDUCTO DE 3" MIDE 3-1/2" OD!', get_font(28, "bold"), SAFETY_YELLOW, "cc")
    draw_text_exact(draw, SAFE_CX, 1314, 'Mide el OD real antes de marcar (8-3/4" separación)', get_font(22, "medium"), TEXT_WHITE, "cc")
    draw_cta_banner(draw, 1372, 1464, "GUÍA SILLA 30 SEG · CONDUIT BEND CALC", font_size=28)

    img.convert("RGB").save(out_path, format="PNG", optimize=True)


# ---------------------------------------------------------------------------
# Video Pipeline Execution
# ---------------------------------------------------------------------------
def build_video(
    spec: VideoSpec,
    renderer_factory: Callable[[Image.Image], Callable[[float, Beat, float], Image.Image]],
    cover_fn: Callable[[Path], None],
) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    voiced_mp4 = OUT_DIR / f"{spec.slug}.mp4"
    nosound_mp4 = OUT_DIR / f"{spec.slug}_nosound.mp4"
    cover_png = OUT_DIR / f"{spec.slug}_cover.png"

    print(f"\n=== Building {spec.slug} ===")
    cover_fn(cover_png)
    print(f"  [cover] {cover_png.relative_to(BASE_DIR)}")

    with tempfile.TemporaryDirectory(prefix=f"shorts_{spec.slug}_") as tmp_str:
        tmpdir = Path(tmp_str)
        audio_m4a = tmpdir / "voiceover.m4a"
        total_dur, beats = synthesize_audio_and_timings(spec.beats, tmpdir, audio_m4a)
        total_frames = int(math.ceil(total_dur * FPS))
        print(f"  [audio] duration={total_dur:.2f}s ({total_frames} frames @ {FPS}fps)")
        for b in beats:
            print(f"          beat '{b.id}': {b.start:.2f}s -> {b.end:.2f}s")

        base_canvas = build_base_canvas(spec.topic_badge)
        render_frame = renderer_factory(base_canvas)

        ffmpeg_cmd = [
            "ffmpeg",
            "-y",
            "-v",
            "error",
            "-f",
            "rawvideo",
            "-pix_fmt",
            "rgb24",
            "-s",
            f"{W}x{H}",
            "-r",
            str(FPS),
            "-i",
            "-",
            "-i",
            str(audio_m4a),
            "-map",
            "0:v:0",
            "-map",
            "1:a:0",
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "21",
            "-pix_fmt",
            "yuv420p",
            "-movflags",
            "+faststart",
            "-c:a",
            "copy",
            "-shortest",
            str(voiced_mp4),
        ]
        proc = subprocess.Popen(ffmpeg_cmd, stdin=subprocess.PIPE)
        assert proc.stdin is not None
        try:
            for fidx in range(total_frames):
                t = fidx / FPS
                active_beat = beats[-1]
                for b in beats:
                    if b.start <= t < b.end:
                        active_beat = b
                        break
                frame_img = render_frame(t, active_beat, total_dur)
                proc.stdin.write(frame_img.tobytes())
        finally:
            proc.stdin.close()
        ret = proc.wait()
        if ret != 0:
            raise RuntimeError(f"ffmpeg failed for {spec.slug} with exit code {ret}")

        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-v",
                "error",
                "-i",
                str(voiced_mp4),
                "-an",
                "-c:v",
                "copy",
                "-movflags",
                "+faststart",
                str(nosound_mp4),
            ],
            check=True,
        )
        print(
            f"  [done]  {voiced_mp4.name} ({voiced_mp4.stat().st_size / 1_048_576:.2f} MB) | "
            f"{nosound_mp4.name} ({nosound_mp4.stat().st_size / 1_048_576:.2f} MB)"
        )


def main() -> None:
    jobs = [
        (VIDEO1_SPEC, make_video1_renderer, generate_cover_1),
        (VIDEO2_SPEC, make_video2_renderer, generate_cover_2),
        (VIDEO3_SPEC, make_video3_renderer, generate_cover_3),
    ]
    for spec, factory, cover_fn in jobs:
        build_video(spec, factory, cover_fn)
    print("\nAll 3 Spanish vertical Shorts, 3 silent variants, and 3 covers generated successfully.")


if __name__ == "__main__":
    main()
