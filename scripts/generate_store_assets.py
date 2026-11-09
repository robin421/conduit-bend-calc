#!/usr/bin/env python3
"""
Generate complete Google Play ASO Assets for Conduit Bend Calc:
- en-US & es-US metadata (title, short_description, full_description)
- 6 x 1080x1920 24-bit RGB Store Screenshots for en-US & es-US
- 1024x500 Feature Graphic for en-US & es-US
- Full validation against Google Play character limits and asset constraints.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps

SCREENSHOT_WIDTH = 1080
SCREENSHOT_HEIGHT = 1920
FEATURE_WIDTH = 1024
FEATURE_HEIGHT = 500

BASE_DIR = Path("/Volumes/T7 Shield/MyDocument/conduit-bend-calc")
METADATA_DIR = BASE_DIR / "fastlane" / "metadata" / "android"

LISTINGS = {
    "en-US": {
        "title": "Conduit Bender & EMT Pipe Calc",
        "shortDescription": "Zero scrap pipe. Real 1/16\" tape marks for EMT, IMC & Rigid on the ladder.",
        "fullDescription": """Stop wasting pipe on trial-and-error bends. Conduit Bender & EMT Pipe Calc is the fast, offline-first bending calculator built for commercial electricians, industrial electricians, and electrical apprentices.

Calculate exact mark-to-mark distances, shrink allowances, and cut marks in seconds. Read every result in real-world tape-measure fractions down to 1/16"—no mental decimal conversions while standing on a ladder.

----------------------------------------
CALIBRATED FOR YOUR BENDER
----------------------------------------
Bender shoes vary between manufacturers. The app includes precision presets compatible with major hand benders:
• Calibrated for Ideal® iron and aluminum benders
• Compatible with Klein Tools® cast aluminum and steel series
• Pre-configured for Greenlee® Site-Rite® series
• Compatible with Milwaukee® and Gardner Bender models
• Custom Bender Profiles (Pro): Dial in exact take-up, gain, and deduction values for worn shoes or hydraulic benders.

----------------------------------------
CORE BENDING CALCULATORS
----------------------------------------
• 90° Stub-Up: Enter desired stub height; automatically applies take-up deduction for the exact first mark. Single-thumb presets for 1/2", 3/4", and 1" EMT.
• Offset Bends: Enter obstruction height and bend angle (10°, 15°, 22.5°, 30°, 45°, 60°). Calculates multiplier spacing and total pipe shrink instantly.
• 3-Point Saddle: Clear round obstacles. Enter diameter/height and bend angle (45° center with 22.5° sides, or 60°/30°).
• 4-Point Saddle: Clear rectangular ducts and wide obstructions with dual offset calculations.
• Kicked 90° Bends: Combine a 90° bend with an offset kick in a single stick of pipe.
• Rolling Offset: Calculate compound offsets across both rise and roll dimensions.

----------------------------------------
NEW: NEC CONDUIT FILL & WIRE SIZING
----------------------------------------
• NEC Annex C Conduit Fill: Instant maximum conductor capacity for EMT, IMC, and Rigid conduits (Table C.1).
• 40% Fill Rule Compliance: Verify multi-wire raceway fill instantly to avoid NEC code violations.
• Wire Ampacity & Sizing: Copper and aluminum conductor sizing based on NEC 2023 ratings.
• Voltage Drop Calculator: Accurate single-phase and three-phase run calculations.

----------------------------------------
FIELD-READY FEATURES
----------------------------------------
• Tape Measure Fractions: True fractional inches (e.g. 14 3/8", 22 5/16") with 1/16" precision. Metric mode (mm/cm) supported.
• Multi-Conduit Support: Handles EMT, IMC, and Rigid heavy-wall steel in 1/2", 3/4", 1", and 1-1/4" trade sizes.
• Trade Reference Tables: Quick access to multipliers, shrink tables, and NEC reference charts.
• Visual Bend Diagrams: Graphical guides showing bender hook and arrow orientation.
• Recent Bends History: Reopen recent runs on the job site with one tap.

----------------------------------------
100% OFFLINE & PRIVACY-FIRST
----------------------------------------
• No login or account required.
• Works 100% offline in electrical rooms, utility basements, and high-rise sites with zero signal.
• No ads. Clean interface designed for rapid one-handed use with work gloves.

Bend with confidence. Save scrap pipe. Master the conduit trade with Conduit Bender & EMT Pipe Calc.

----------------------------------------
TRADEMARK DISCLAIMER
----------------------------------------
Independent calculator tool; not affiliated with or endorsed by Ideal Industries, Klein Tools, Greenlee, or Milwaukee Electric Tool Corp. All brand names belong to their respective owners."""
    },
    "es-US": {
        "title": "Doblador de Tubos EMT Conduit",
        "shortDescription": "Cero tubos desperdiciados. Marcas en fracciones de 1/16\" para EMT, IMC y Rigid.",
        "fullDescription": """Deja de desperdiciar tubería con curvas a prueba y error. Doblador de Tubos EMT Conduit es la calculadora rápida y 100% offline diseñada para electricistas comerciales, industriales y aprendices de electricidad.

Calcula distancias exactas entre marcas, encogimiento (shrink) y medidas de corte en segundos. Lee cada resultado en fracciones reales de cinta métrica de hasta 1/16"—sin conversiones decimales mentales arriba de la escalera.

----------------------------------------
CALIBRADO PARA TU DOBLADOR
----------------------------------------
Las zapatas de doblado varían según el fabricante. La app incluye ajustes compatibles con los principales dobladores manuales:
• Calibrado para dobladores de hierro y aluminio Ideal®
• Compatible con series Klein Tools® de aluminio fundido y acero
• Preconfigurado para series Greenlee® Site-Rite®
• Compatible con modelos Milwaukee® y Gardner Bender
• Perfiles Personalizados (Pro): Ajusta valores exactos de take-up, ganancia y deducción para dobladores desgastados o hidráulicos.

----------------------------------------
CALCULADORAS PRINCIPALES DE DOBLADO
----------------------------------------
• Curva de 90° (Stub-Up): Ingresa la altura deseada del stub; aplica la deducción de take-up para darte la primera marca exacta. Botones rápidos para EMT de 1/2", 3/4" y 1".
• Curvas Offset (Desviaciones): Ingresa altura del obstáculo y ángulo (10°, 15°, 22.5°, 30°, 45°, 60°). Calcula separación entre marcas y shrink al instante.
• Saddle de 3 Puntos: Libra obstáculos redondos (tuberías, canalizaciones). Ingresa diámetro/altura y ángulo (centro de 45° con lados de 22.5°, o 60°/30°).
• Saddle de 4 Puntos: Libra ductos rectangulares y obstáculos anchos con cálculo de doble offset.
• Curvas Kicked 90°: Combina una curva de 90° con un kick en un solo tramo de tubo.
• Rolling Offset: Calcula offsets compuestos en dimensiones verticales y horizontales simultáneas.

----------------------------------------
NUEVO: LLENADO DE TUBOS NEC Y CALIBRE
----------------------------------------
• Llenado de Tubos NEC Anexo C: Capacidad máxima de conductores para tubería EMT, IMC y Rigid (Tabla C.1).
• Regla de Llenado del 40%: Verifica el porcentaje de ocupación al instante para cumplir el código NEC.
• Calibre y Ampacidad de Cable: Selección de conductores de cobre y aluminio según NEC 2023.
• Calculadora de Caída de Tensión: Cálculos precisos monofásicos y trifásicos.

----------------------------------------
DISEÑADO PARA TRABAJO EN CAMPO
----------------------------------------
• Fracciones de Cinta Métrica: Formatea longitudes como fracciones reales en pulgadas (ej. 14 3/8", 22 5/16") con precisión de 1/16". Soporta modo métrico (mm/cm).
• Soporte Multimaterial: EMT, IMC y Rigid en diámetros de 1/2", 3/4", 1" y 1-1/4".
• Tablas de Referencia: Acceso directo a multiplicadores, tablas de shrink y código NEC.
• Diagramas Visuales: Guía gráfica paso a paso de orientación de gancho y flecha.
• Historial de Curvas: Recupera tus cálculos en la obra con un solo toque.

----------------------------------------
100% OFFLINE Y PRIVACIDAD TOTAL
----------------------------------------
• Sin inicio de sesión ni registro requerido.
• Funciona 100% sin internet en sótanos, cuartos de máquinas y obras sin señal celular.
• Sin anuncios molestos. Diseñado para operar con guantes de trabajo.

Dobla con confianza, ahorra material y domina el oficio con Doblador de Tubos EMT Conduit.

----------------------------------------
AVISO DE MARCAS REGISTRADAS
----------------------------------------
Herramienta independiente; no afiliada ni respaldada por Ideal Industries, Klein Tools, Greenlee o Milwaukee Electric Tool Corp. Todas las marcas registradas pertenecen a sus respectivos propietarios."""
    }
}

STORYBOARD = [
    {
        "filename": "01_hero.png",
        "raw_img": Path("/tmp/bendcalc_stub_result.png"),
        "en": {
            "headline": "Zero Scrap Pipe\nInstant 1/16\" Tape Marks",
            "subtitle": "Calibrated bender marks for EMT, IMC & Rigid"
        },
        "es": {
            "headline": "Cero Tubos Desperdiciados\nMarcas en Fracciones de 1/16\"",
            "subtitle": "Medidas exactas para tubos EMT, IMC y Rigid"
        }
    },
    {
        "filename": "02_stub.png",
        "raw_img": Path("/tmp/bendcalc_stub_result.png"),
        "en": {
            "headline": "90° Stub in Seconds\nSingle-Thumb Presets",
            "subtitle": "True tape-measure fractions down to 1/16\""
        },
        "es": {
            "headline": "Curvas de 90° al Instante\nBotones de Acceso Rápido",
            "subtitle": "Fracciones reales de cinta métrica sin conversiones"
        }
    },
    {
        "filename": "03_offset.png",
        "raw_img": Path("/tmp/bendcalc_offset_result.png"),
        "en": {
            "headline": "Clear Every Obstacle\nSmart Offset & Shrink",
            "subtitle": "Instant multiplier spacing & cut-back calculations"
        },
        "es": {
            "headline": "Esquiva Cada Obstáculo\nOffsets y Shrink Precisos",
            "subtitle": "Multiplicadores y encogimiento calculados al segundo"
        }
    },
    {
        "filename": "04_saddle.png",
        "raw_img": Path("/tmp/bendcalc_saddle_result.png"),
        "en": {
            "headline": "3 & 4-Point Saddles\nObstacle Clearances",
            "subtitle": "Exact center, side marks and cut additions"
        },
        "es": {
            "headline": "Saddle de 3 y 4 Puntos\nLibranza de Obstáculos",
            "subtitle": "Marcas centrales, laterales y longitud adicional"
        }
    },
    {
        "filename": "05_shrink.png",
        "raw_img": Path("/tmp/bendcalc_shrink_raw.png"),
        "en": {
            "headline": "Conduit Shrink Tables\nAngles from 10° to 60°",
            "subtitle": "Accurate cut-back additions for parallel runs"
        },
        "es": {
            "headline": "Tablas de Encogimiento\nÁngulos de 10° a 60°",
            "subtitle": "Cálculo de adición de tubo para tuberías paralelas"
        }
    },
    {
        "filename": "06_field_offline.png",
        "raw_img": Path("/tmp/bendcalc_mobile_home.png"),
        "en": {
            "headline": "100% Offline on Site\nZero Ads • No Login",
            "subtitle": "Built for commercial electricians in electrical rooms"
        },
        "es": {
            "headline": "100% Sin Conexión\nSin Anuncios • Sin Cuenta",
            "subtitle": "Diseñado para electricistas en salas eléctricas"
        }
    }
]


def get_font(size: int, bold: bool = True):
    font_paths = [
        "/System/Library/Fonts/SFPro-Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/PingFang.ttc",
    ]
    for p in font_paths:
        if Path(p).is_file():
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()


def add_rounded_corners(img: Image.Image, radius: int = 40):
    mask = Image.new("L", img.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), img.size], radius=radius, fill=255)
    rounded = Image.new("RGBA", img.size)
    rounded.paste(img.convert("RGBA"), (0, 0), mask=mask)
    return rounded, mask


def compose_screenshot(raw_path: Path, headline: str, subtitle: str, output_path: Path):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas = Image.new("RGB", (SCREENSHOT_WIDTH, SCREENSHOT_HEIGHT), "#12161F")
    draw = ImageDraw.Draw(canvas)

    h_font = get_font(52, bold=True)
    s_font = get_font(28, bold=False)

    y_cursor = 100
    for line in headline.splitlines():
        bbox = draw.textbbox((0, 0), line, font=h_font)
        w = bbox[2] - bbox[0]
        x = (SCREENSHOT_WIDTH - w) // 2
        draw.text((x + 2, y_cursor + 2), line, font=h_font, fill="#000000")
        draw.text((x, y_cursor), line, font=h_font, fill="#FFFFFF")
        y_cursor += (bbox[3] - bbox[1]) + 14

    if subtitle:
        y_cursor += 6
        for line in subtitle.splitlines():
            bbox = draw.textbbox((0, 0), line, font=s_font)
            w = bbox[2] - bbox[0]
            x = (SCREENSHOT_WIDTH - w) // 2
            draw.text((x, y_cursor), line, font=s_font, fill="#FF9100")
            y_cursor += (bbox[3] - bbox[1]) + 10

    # Device Mockup Frame
    with Image.open(raw_path) as ss_img:
        target_w = 820
        aspect = ss_img.height / ss_img.width
        target_h = int(target_w * aspect)
        ss_resized = ss_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
        rounded_ss, mask = add_rounded_corners(ss_resized, radius=44)

        shadow_padding = 40
        card_w = target_w + shadow_padding * 2
        card_h = target_h + shadow_padding * 2
        shadow_canvas = Image.new("RGBA", (card_w, card_h), (0, 0, 0, 0))

        shadow_draw = ImageDraw.Draw(shadow_canvas)
        shadow_draw.rounded_rectangle(
            [(shadow_padding - 8, shadow_padding - 8), (shadow_padding + target_w + 8, shadow_padding + target_h + 8)],
            radius=48,
            fill=(0, 0, 0, 160)
        )
        shadow_canvas = shadow_canvas.filter(ImageFilter.GaussianBlur(24))
        shadow_canvas.paste(rounded_ss, (shadow_padding, shadow_padding), mask=mask)

        dest_x = (SCREENSHOT_WIDTH - card_w) // 2
        dest_y = max(y_cursor + 35, SCREENSHOT_HEIGHT - target_h + 90)
        canvas.paste(shadow_canvas, (dest_x, dest_y), mask=shadow_canvas)

    final_img = canvas.convert("RGB")
    final_img.save(output_path, "PNG", quality=95)
    print(f"[OK] Generated: {output_path} ({final_img.size})")


def compose_feature_graphic(output_path: Path, headline: str, subtitle: str, icon_path: Path):
    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas = Image.new("RGB", (FEATURE_WIDTH, FEATURE_HEIGHT), "#12161F")
    draw = ImageDraw.Draw(canvas)

    # Accent top border
    draw.rectangle([(0, 0), (FEATURE_WIDTH, 6)], fill="#FF9100")

    h_font = get_font(52, bold=True)
    s_font = get_font(24, bold=False)

    x_offset = 70
    y_cursor = 135

    for line in headline.splitlines():
        bbox = draw.textbbox((0, 0), line, font=h_font)
        draw.text((x_offset + 2, y_cursor + 2), line, font=h_font, fill="#000000")
        draw.text((x_offset, y_cursor), line, font=h_font, fill="#FFFFFF")
        y_cursor += (bbox[3] - bbox[1]) + 12

    y_cursor += 12
    for line in subtitle.splitlines():
        bbox = draw.textbbox((0, 0), line, font=s_font)
        draw.text((x_offset, y_cursor), line, font=s_font, fill="#FF9100")
        y_cursor += (bbox[3] - bbox[1]) + 8

    # Place app icon on the right
    if icon_path.is_file():
        with Image.open(icon_path) as icon_img:
            icon_size = 320
            icon_resized = icon_img.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
            rounded_icon, icon_mask = add_rounded_corners(icon_resized, radius=64)

            # Icon Drop Shadow
            s_pad = 20
            icon_shadow = Image.new("RGBA", (icon_size + s_pad*2, icon_size + s_pad*2), (0,0,0,0))
            s_draw = ImageDraw.Draw(icon_shadow)
            s_draw.rounded_rectangle([(s_pad, s_pad), (icon_size + s_pad, icon_size + s_pad)], radius=64, fill=(0,0,0,180))
            icon_shadow = icon_shadow.filter(ImageFilter.GaussianBlur(16))
            icon_shadow.paste(rounded_icon, (s_pad, s_pad), mask=icon_mask)

            dest_x = FEATURE_WIDTH - icon_size - s_pad - 60
            dest_y = (FEATURE_HEIGHT - icon_size) // 2 - s_pad
            canvas.paste(icon_shadow, (dest_x, dest_y), mask=icon_shadow)

    final_img = canvas.convert("RGB")
    final_img.save(output_path, "PNG", quality=95)
    print(f"[OK] Generated Feature Graphic: {output_path} ({final_img.size})")


def write_metadata_text():
    for locale, data in LISTINGS.items():
        loc_dir = METADATA_DIR / locale
        loc_dir.mkdir(parents=True, exist_ok=True)

        # Title
        title_path = loc_dir / "title.txt"
        title_path.write_text(data["title"], encoding="utf-8")
        assert len(data["title"]) <= 30, f"{locale} title exceeds 30 chars: {len(data['title'])}"

        # Short Description
        short_path = loc_dir / "short_description.txt"
        short_path.write_text(data["shortDescription"], encoding="utf-8")
        assert len(data["shortDescription"]) <= 80, f"{locale} short desc exceeds 80 chars: {len(data['shortDescription'])}"

        # Full Description
        full_path = loc_dir / "full_description.txt"
        full_path.write_text(data["fullDescription"], encoding="utf-8")
        assert len(data["fullDescription"]) <= 4000, f"{locale} full desc exceeds 4000 chars: {len(data['fullDescription'])}"

        print(f"[OK] Metadata text written for {locale} (Title: {len(data['title'])}c, Short: {len(data['shortDescription'])}c, Full: {len(data['fullDescription'])}c)")


def main():
    print("=== Step 1: Writing Fastlane Metadata Texts ===")
    write_metadata_text()

    icon_path = BASE_DIR / "assets" / "icon.png"

    for locale in ["en-US", "es-US"]:
        print(f"\n=== Step 2: Generating Screenshots for {locale} ===")
        lang_key = "en" if locale == "en-US" else "es"
        screenshots_dir = METADATA_DIR / locale / "images" / "phoneScreenshots"

        for item in STORYBOARD:
            out_file = screenshots_dir / item["filename"]
            raw_img = item["raw_img"]
            headline = item[lang_key]["headline"]
            subtitle = item[lang_key]["subtitle"]
            compose_screenshot(raw_img, headline, subtitle, out_file)

        print(f"\n=== Step 3: Generating Feature Graphic for {locale} ===")
        feature_out = METADATA_DIR / locale / "images" / "featureGraphic.png"
        if locale == "en-US":
            f_head = "CONDUIT BENDER\n& EMT PIPE CALC"
            f_sub = "Zero Scrap Pipe • 1/16\" Marks • 100% Offline"
        else:
            f_head = "DOBLADOR DE TUBOS\nEMT & CONDUIT"
            f_sub = "Cero Desperdicio • Fracciones 1/16\" • 100% Offline"
        compose_feature_graphic(feature_out, f_head, f_sub, icon_path)

    print("\n[SUCCESS] All Google Play Store Assets Generated & Validated!")

if __name__ == "__main__":
    main()
