#!/usr/bin/env python3
"""
Generate complete Google Play ASO Assets for Conduit Bend Calc (v1.12.0+):
- 4-locale metadata: en-US, en-CA, es-US, es-419 (title, short_description, full_description)
- 6 x 1080x1920 24-bit RGB Store Screenshots for all 4 locales (using real per-locale app captures)
- 1024x500 24-bit RGB Feature Graphic for all 4 locales aligned to src/brandPalette.ts (#0F2B46 / #F4C317)
- Full validation against Google Play character limits, forbidden Spanish terms, image dimensions, color mode, and zero duplicates.
"""
from __future__ import annotations

import hashlib
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

SCREENSHOT_WIDTH = 1080
SCREENSHOT_HEIGHT = 1920
FEATURE_WIDTH = 1024
FEATURE_HEIGHT = 500

# Strictly aligned with src/brandPalette.ts & src/theme.ts
NAVY_BG = "#0F2B46"
NAVY_DEEP = "#091D30"
NAVY_SURFACE = "#15334F"
NAVY_BORDER = "#2B4862"
SAFETY_YELLOW = "#F4C317"
TEXT_WHITE = "#FFFFFF"
TEXT_MUTED = "#BED0DF"

BASE_DIR = Path(__file__).resolve().parent.parent
METADATA_DIR = BASE_DIR / "fastlane" / "metadata" / "android"
RAW_ASSETS_DIR = BASE_DIR / "assets" / "store-raw"

LISTINGS = {
    "en-US": {
        "title": "Conduit Bender & EMT Pipe Calc",
        "shortDescription": 'Fast conduit offsets, 90° stubs, saddles & NEC fill. 1/16" marks, 100% offline.',
        "fullDescription": """Stop wasting pipe on trial-and-error bends. Conduit Bender & EMT Pipe Calc is the fast, 100% offline conduit bending and NEC electrical calculator built for commercial electricians, industrial electricians, and apprentices.

Calculate exact mark-to-mark spacing, shrink allowances, and stub-up marks in seconds. Read every measurement in real tape-measure fractions down to 1/16"—no mental decimal conversions while standing on a ladder.

----------------------------------------
CORE CONDUIT BENDING CALCULATORS
----------------------------------------
• Offset Bends: Enter obstacle height and angle (10°, 15°, 22.5°, 30°, 45°, 60°). Calculates exact mark spacing and pipe shrink instantly with a live bend diagram.
• 90° Stub-Up: Enter target stub height and let the app apply take-up deduction for your exact first mark. Single-thumb presets for 1/2", 3/4", and 1" EMT.
• 3-Point Saddle: Clear round pipes and narrow obstacles with exact center mark, side mark spacing, and center shrink.
• 4-Point Saddle: Clear rectangular ducts and wide obstructions with dual-offset flat-top calculations.
• Rolling Offset: Solve compound offsets across both rise and roll dimensions.
• Kicked 90° Bends: Combine a 90° stub with an offset kick in one stick of conduit.

----------------------------------------
NEC 2023 CONDUIT FILL & ELECTRICAL TOOLS
----------------------------------------
• NEC Conduit Fill: Instant maximum conductor capacity and % fill check for EMT, IMC, Rigid (RMC), and PVC Schedule 40 from 1/2" to 4" trade sizes (14 AWG to 500 kcmil THHN/THWN-2).
• 40% Fill Rule Compliance: Verify NEC 2023 Chapter 9 Tables 1, 4, and 5 (53% / 31% / 40% fill limits) right on the jobsite.
• Wire Sizing & Ampacity: Copper and aluminum conductor sizing based on NEC 2023 ratings.
• Voltage Drop Calculator: Fast single-phase and three-phase circuit calculations.

----------------------------------------
CALIBRATED FOR YOUR BENDER
----------------------------------------
Bender shoes vary by brand and model. Built-in shoe profiles include:
• Ideal® hand benders (74-026 1/2" EMT, 74-027 3/4" EMT)
• Klein Tools® hand benders (51603, 51604, 51605 EMT)
• Greenlee® benders (1800 Rigid 1/2"–1", 555 EMT 1/2"–2")
• Custom Bender Profiles & Guided Calibration (Pro): Dial in exact centerline radius, take-up, and gain for worn shoes or any other bender.

----------------------------------------
BUILT FOR THE JOBSITE
----------------------------------------
• Real 1/16" Tape Fractions: Switch effortlessly between Fraction (1/16"), Decimal inches, and Metric (mm).
• Live SVG Bend Diagrams: Clear visual guides showing mark locations (M1, M2, M3), angles, and shrink.
• Saved Calculation History: Review, export, or reopen recent bends with one tap.
• Trade Reference Tables: Quick lookup for offset multipliers, shrink per inch, and take-up values.
• Bilingual Interface: Instant English & Spanish (EN / ES) switcher built in.

----------------------------------------
100% OFFLINE & PRIVACY-FIRST
----------------------------------------
• Works 100% offline in electrical rooms, basements, and high-rise sites with zero signal.
• No account or sign-in required.
• Zero ads. High-contrast interface designed for fast one-handed use with work gloves.

Bend with confidence and cut scrap pipe with Conduit Bender & EMT Pipe Calc.

----------------------------------------
TRADEMARK DISCLAIMER
----------------------------------------
Independent calculator tool; not affiliated with or endorsed by Ideal Industries, Klein Tools, or Greenlee. All brand names and trademarks belong to their respective owners."""
    },
    "en-CA": {
        "title": "Conduit Bender & EMT Pipe Calc",
        "shortDescription": 'EMT, IMC & Rigid offsets, 90° stubs & fill. Metric mm/cm & 1/16" marks, offline.',
        "fullDescription": """Stop wasting pipe on trial-and-error bends. Conduit Bender & EMT Pipe Calc is the fast, 100% offline conduit bending and electrical calculator built for Canadian commercial electricians, industrial electricians, and apprentices.

Switch seamlessly between Metric (mm/cm), real 1/16" tape-measure fractions, and decimal inches in one tap. Calculate exact mark-to-mark spacing, shrink allowances, and 90° stub-up marks for EMT, IMC, and Rigid conduit in seconds—no mental conversions while working off a ladder.

----------------------------------------
CORE CONDUIT BENDING CALCULATORS
----------------------------------------
• Offset Bends: Enter obstacle height and bend angle (10°, 15°, 22.5°, 30°, 45°, 60°). Get exact mark-to-mark spacing and shrink instantly with a live bend diagram.
• 90° Stub-Up: Enter target stub height and apply take-up deduction automatically for your exact first mark. Quick presets for 1/2", 3/4", and 1" EMT plus Rigid / IMC support.
• 3-Point Saddle: Clear round pipes and narrow obstacles with exact centre mark, side spacing, and centre shrink.
• 4-Point Saddle: Clear rectangular ducts and wide obstructions with dual-offset flat-top mark layouts.
• Rolling Offset: Solve compound offsets across both rise and roll dimensions.
• Kicked 90° Bends: Combine a 90° stub-up with an offset kick in one stick of conduit.

----------------------------------------
METRIC (mm/cm) & 1/16" TAPE FRACTIONS
----------------------------------------
• Instant Unit Switching: Work in Metric (mm/cm), Fraction (1/16" tape-measure marks), or Decimal inches on every calculator.
• EMT, IMC, Rigid & PVC Support: Built for everyday Canadian commercial and industrial conduit runs.
• Live SVG Bend Diagrams: Visual guides showing mark locations (M1, M2, M3), angles, and shrink at a glance.

----------------------------------------
CONDUIT FILL & ELECTRICAL CALCULATORS
----------------------------------------
• NEC 2023 Conduit Fill: Instant maximum conductor capacity and % fill check for EMT, IMC, Rigid (RMC), and PVC Schedule 40 from 1/2" to 4" trade sizes (14 AWG to 500 kcmil THHN/THWN-2, Chapter 9 Tables 1, 4 & 5 — 53% / 31% / 40% fill limits).
• Wire Sizing & Ampacity: Copper and aluminum conductor sizing reference based on NEC 2023 ratings.
• Voltage Drop Calculator: Fast single-phase and three-phase circuit voltage drop calculations.

----------------------------------------
CALIBRATED FOR YOUR BENDER
----------------------------------------
Bender shoes vary by brand and wear. Built-in shoe profiles include:
• Ideal® hand benders (74-026 1/2" EMT, 74-027 3/4" EMT)
• Klein Tools® hand benders (51603, 51604, 51605 EMT)
• Greenlee® benders (1800 Rigid 1/2"–1", 555 EMT 1/2"–2")
• Custom Bender Profiles & Guided Calibration (Pro): Measure and dial in exact centreline radius, take-up, and gain for worn shoes or any other bender.

----------------------------------------
100% OFFLINE & JOBSITE-READY
----------------------------------------
• Works 100% offline in electrical rooms, mechanical shafts, basements, and high-rise sites with zero signal.
• Saved Calculation History & Trade Reference Tables (multipliers, shrink, take-up).
• Zero ads. No sign-in required. High-contrast layout built for one-handed use with work gloves.

Bend accurately in Metric (mm/cm) or 1/16" fractions and cut scrap conduit with Conduit Bender & EMT Pipe Calc.

----------------------------------------
TRADEMARK DISCLAIMER
----------------------------------------
Independent calculator tool; not affiliated with or endorsed by Ideal Industries, Klein Tools, or Greenlee. All brand names and trademarks belong to their respective owners."""
    },
    "es-US": {
        "title": "Doblador de Tubos EMT Conduit",
        "shortDescription": 'Offsets, curvas 90°, sillas y llenado NEC para tubo conduit. 1/16" y offline.',
        "fullDescription": """Deja de desperdiciar tubo conduit con dobleces a prueba y error. Doblador de Tubos EMT Conduit es la calculadora rápida y 100% offline diseñada para electricistas comerciales, industriales y aprendices.

Calcula separación exacta entre marcas, contracción (shrink) y marcas de subida en segundos. Lee cada medida en fracciones reales de cinta métrica de hasta 1/16"—sin conversiones decimales mentales arriba de la escalera.

----------------------------------------
CALCULADORAS DE DOBLADO DE CONDUCTO
----------------------------------------
• Desplazamiento (Offset): Ingresa la altura del obstáculo y el ángulo (10°, 15°, 22.5°, 30°, 45°, 60°). Calcula distancia entre marcas y contracción al instante con diagrama de doblez.
• Subida de 90° (Stub-Up): Ingresa la altura objetivo; aplica la deducción de take-up para darte la primera marca exacta. Preajustes rápidos para 1/2", 3/4" y 1" EMT.
• Silla de 3 Puntos (3-Point Saddle): Libra conductos redondos y obstáculos angostos con marca central, marcas laterales y contracción.
• Silla de 4 Puntos (4-Point Saddle): Libra ductos rectangulares y obstáculos anchos con parte superior plana.
• Desplazamiento Compuesto (Rolling Offset): Calcula offsets combinados en altura y desplazamiento lateral.
• Curva de 90° con Kick (Kicked 90°): Combina una subida de 90° con un desplazamiento en el mismo tubo conduit.

----------------------------------------
LLENADO NEC 2023 Y CALCULADORAS ELÉCTRICAS
----------------------------------------
• Llenado de Conducto NEC: Capacidad máxima de cables y porcentaje de llenado para EMT, IMC, Rigid (RMC) y PVC Cédula 40 de 1/2" a 4" (calibres 14 AWG a 500 kcmil THHN/THWN-2).
• Regla del 40% NEC: Verifica las Tablas 1, 4 y 5 del Capítulo 9 del NEC 2023 (límites de 53%, 31% y 40%) directo en la obra.
• Calibre de Cable y Ampacidad: Selección de conductores de cobre y aluminio según NEC 2023.
• Caída de Tensión: Cálculos rápidos para circuitos monofásicos y trifásicos.

----------------------------------------
CALIBRADO PARA TU DOBLADOR
----------------------------------------
Las zapatas cambian según marca y modelo. Incluye ajustes preconfigurados para:
• Dobladores manuales Ideal® (74-026 1/2" EMT, 74-027 3/4" EMT)
• Dobladores manuales Klein Tools® (51603, 51604, 51605 EMT)
• Dobladores Greenlee® (1800 Rigid 1/2"–1", 555 EMT 1/2"–2")
• Perfiles Personalizados y Calibración Guiada (Pro): Ajusta radio, take-up y ganancia exactos para zapatas desgastadas o cualquier otro doblador.

----------------------------------------
DISEÑADO PARA LA OBRA
----------------------------------------
• Fracciones de 1/16": Cambia en un toque entre Fracción (1/16"), Pulgadas decimales y Métrico (mm).
• Diagramas Visuales de Doblez: Guías claras con marcas (M1, M2, M3), ángulos y contracción.
• Historial Guardado: Consulta, exporta o vuelve a cargar tus cálculos recientes con un toque.
• Tablas de Referencia: Consulta rápida de multiplicadores, contracción por pulgada y take-up.
• Interfaz Bilingüe: Cambio instantáneo entre Español e Inglés (ES / EN).

----------------------------------------
100% OFFLINE Y PRIVACIDAD TOTAL
----------------------------------------
• Funciona 100% sin internet en cuartos eléctricos, sótanos y obras sin señal celular.
• Sin registro ni cuentas.
• Cero anuncios. Interfaz de alto contraste pensada para usarse con una mano y guantes de trabajo.

Dobla con precisión y ahorra tubo conduit con Doblador de Tubos EMT Conduit.

----------------------------------------
AVISO DE MARCAS REGISTRADAS
----------------------------------------
Herramienta independiente; no afiliada ni respaldada por Ideal Industries, Klein Tools o Greenlee. Todas las marcas registradas pertenecen a sus respectivos propietarios."""
    },
    "es-419": {
        "title": "Doblador de Tubos EMT Conduit",
        "shortDescription": 'Offsets, curvas 90° y llenado NEC en EMT/IMC/Rigid. 1/16" y mm/cm, offline.',
        "fullDescription": """Deja de desperdiciar tubo conduit con dobleces a prueba y error. Doblador de Tubos EMT Conduit es la calculadora rápida y 100% offline creada para electricistas comerciales, industriales y aprendices en México y Latinoamérica.

Calcula separación exacta entre marcas, contracción (shrink) y marcas de subida de 90° en segundos. Cambia con un toque entre fracciones reales de cinta métrica (1/16"), pulgadas decimales y milímetros (mm/cm)—sin hacer conversiones mentales arriba de la escalera.

----------------------------------------
CALCULADORAS DE DOBLADO DE CONDUIT
----------------------------------------
• Desplazamiento (Offset): Ingresa la altura del obstáculo y el ángulo (10°, 15°, 22.5°, 30°, 45°, 60°). Obtén la distancia entre marcas y la contracción al instante con diagrama visual de doblez.
• Subida de 90° (Stub-Up): Ingresa la altura final y aplica automáticamente la recogida (take-up) para darte la primera marca exacta. Preajustes rápidos para 1/2", 3/4" y 1" EMT, además de soporte para IMC y Rigid.
• Silla de 3 Puntos (3-Point Saddle): Libra obstáculos angostos y conductos redondos con marca central, marcas laterales y contracción exacta.
• Silla de 4 Puntos (4-Point Saddle): Libra ductos rectangulares y obstáculos anchos con doble desplazamiento y parte superior plana.
• Desplazamiento Compuesto (Rolling Offset): Resuelve desplazamientos combinados en altura y recorrido lateral.
• Curva de 90° con Patada (Kicked 90°): Combina una subida de 90° con un desplazamiento en el mismo tramo de tubo conduit.

----------------------------------------
LLENADO NEC 2023 Y HERRAMIENTAS ELÉCTRICAS
----------------------------------------
• Llenado de Conducto NEC: Capacidad máxima de cables y porcentaje de llenado para tubo EMT, IMC, Rigid (RMC) y PVC Cédula 40 desde 1/2" hasta 4" (calibres 14 AWG a 500 kcmil THHN/THWN-2).
• Regla del 40% NEC: Verifica las Tablas 1, 4 y 5 del Capítulo 9 del NEC 2023 (límites de 53%, 31% y 40%) directo en la obra.
• Calibre de Cable y Ampacidad: Selección de conductores de cobre y aluminio con referencia NEC 2023.
• Caída de Voltaje: Cálculo rápido para circuitos monofásicos y trifásicos.

----------------------------------------
CALIBRADO PARA TU DOBLADOR
----------------------------------------
Cada zapata varía según marca y desgaste. Incluye perfiles preconfigurados para:
• Dobladores manuales Ideal® (74-026 1/2" EMT, 74-027 3/4" EMT)
• Dobladores manuales Klein Tools® (51603, 51604, 51605 EMT)
• Dobladores Greenlee® (1800 Rigid 1/2"–1", 555 EMT 1/2"–2")
• Perfiles Propios y Calibración Guiada (Pro): Mide tu doblador gratis y guarda radio, recogida (take-up) y ganancia exactos para zapatas desgastadas o cualquier otro doblador.

----------------------------------------
FRACCIONES 1/16" Y MILÍMETROS (mm/cm) EN OBRA
----------------------------------------
• Cambio Rápido de Unidades: Trabaja en Fracciones de 1/16", Pulgadas decimales o Métrico (mm/cm) en todas las calculadoras.
• Diagramas Visuales de Doblez: Guías claras con marcas (M1, M2, M3), ángulos y contracción.
• Historial y Tablas de Referencia: Guarda tus cálculos recientes y consulta multiplicadores, contracción y recogida en un toque.
• Interfaz en Español e Inglés: Cambia entre ES y EN al instante.

----------------------------------------
100% OFFLINE Y SIN ANUNCIOS
----------------------------------------
• Funciona 100% sin internet en cuartos eléctricos, sótanos, plantas industriales y obras sin señal.
• Sin registro, sin cuentas y cero anuncios.
• Pantalla de alto contraste diseñada para usarse con una sola mano y guantes de trabajo.

Dobla con precisión en 1/16" o milímetros y ahorra material con Doblador de Tubos EMT Conduit.

----------------------------------------
AVISO DE MARCAS REGISTRADAS
----------------------------------------
Herramienta independiente; no afiliada ni respaldada por Ideal Industries, Klein Tools o Greenlee. Todas las marcas registradas pertenecen a sus respectivos propietarios."""
    },
}

STORYBOARD = [
    {
        "filename": "01_offset.png",
        "raw_name": "01_offset.png",
        "en-US": {
            "eyebrow": "OFFSET BEND CALCULATOR",
            "headline": "Fast Offset Marks\n& Shrink in Seconds",
            "subtitle": '1/16" tape fractions + live bend diagram',
        },
        "en-CA": {
            "eyebrow": "OFFSET BEND CALCULATOR",
            "headline": "Fast Offset Marks\n& Shrink in Seconds",
            "subtitle": '1/16" fractions & Metric mm/cm + live diagram',
        },
        "es-US": {
            "eyebrow": "CALCULADORA DE OFFSET",
            "headline": "Offsets y Contracción\nen Segundos",
            "subtitle": 'Fracciones de 1/16" + diagrama de doblez',
        },
        "es-419": {
            "eyebrow": "CALCULADORA DE OFFSET",
            "headline": "Offsets y Contracción\nen Segundos",
            "subtitle": 'Fracciones 1/16" y mm/cm + diagrama visual',
        },
    },
    {
        "filename": "02_stub.png",
        "raw_name": "02_stub.png",
        "en": {
            "eyebrow": "90° STUB-UP CALCULATOR",
            "headline": "Instant 90° Stub Marks\nwith EMT Presets",
            "subtitle": 'Auto take-up for 1/2", 3/4" & 1" EMT',
        },
        "es": {
            "eyebrow": "SUBIDA DE 90° (STUB-UP)",
            "headline": "Marcas de 90° al Instante\ncon Preajustes EMT",
            "subtitle": 'Recogida automática en 1/2", 3/4" y 1" EMT',
        },
    },
    {
        "filename": "03_saddle.png",
        "raw_name": "03_saddle.png",
        "en": {
            "eyebrow": "3-POINT & 4-POINT SADDLES",
            "headline": "Clear Any Obstacle\nwith Exact Saddle Marks",
            "subtitle": "Center, side spacing & shrink at a glance",
        },
        "es": {
            "eyebrow": "SILLAS DE 3 Y 4 PUNTOS",
            "headline": "Libra Cada Obstáculo\ncon Marcas Exactas",
            "subtitle": "Centro, lados y contracción al instante",
        },
    },
    {
        "filename": "04_conduit_fill.png",
        "raw_name": "04_conduit_fill.png",
        "en": {
            "eyebrow": "NEC 2023 CONDUIT FILL",
            "headline": "Instant Wire Capacity\n& 40% Fill Rule Check",
            "subtitle": "EMT, IMC, Rigid & PVC • 14 AWG–500 kcmil",
        },
        "es": {
            "eyebrow": "LLENADO DE CONDUCTO NEC 2023",
            "headline": "Capacidad de Cables\ny Regla del 40% NEC",
            "subtitle": "EMT, IMC, Rigid y PVC • 14 AWG a 500 kcmil",
        },
    },
    {
        "filename": "05_history_calibration.png",
        "raw_name": "05_bender_expanded.png",
        "en": {
            "eyebrow": "BENDER CALIBRATION & HISTORY",
            "headline": "Calibrated for Your\nIdeal, Klein & Greenlee",
            "subtitle": "Built-in shoe presets, custom bender & history",
        },
        "es": {
            "eyebrow": "CALIBRACIÓN E HISTORIAL",
            "headline": "Calibrado para tu\nIdeal, Klein y Greenlee",
            "subtitle": "Zapatas de fábrica, perfil propio e historial",
        },
    },
    {
        "filename": "06_offline_field.png",
        "raw_name": "06_offline_field.png",
        "en-US": {
            "eyebrow": "100% OFFLINE • ZERO ADS",
            "headline": "Built for the Jobsite\nWorks Without Signal",
            "subtitle": "Full bending & NEC suite in English & Spanish",
        },
        "en-CA": {
            "eyebrow": "100% OFFLINE • ZERO ADS",
            "headline": "Built for the Jobsite\nWorks Without Signal",
            "subtitle": 'EMT, IMC & Rigid • Metric mm/cm & 1/16" marks',
        },
        "es": {
            "eyebrow": "100% SIN INTERNET • SIN ANUNCIOS",
            "headline": "Hecho para la Obra\nFunciona Sin Señal",
            "subtitle": "Suite de doblado y NEC en español e inglés",
        },
    },
]

LOCALES = ["en-US", "en-CA", "es-US", "es-419"]

FEATURE_GRAPHICS = {
    "en-US": (
        '1/16" TAPE MARKS • 100% OFFLINE',
        "CONDUIT BENDER\n& EMT PIPE CALC",
        "Offsets • 90° Stubs • Saddles • NEC Fill",
    ),
    "en-CA": (
        '1/16" & METRIC mm • 100% OFFLINE',
        "CONDUIT BENDER\n& EMT PIPE CALC",
        "EMT, IMC, Rigid • Offsets, 90° & Fill",
    ),
    "es-US": (
        'FRACCIONES 1/16" • 100% OFFLINE',
        "DOBLADOR DE TUBOS\nEMT Y CONDUIT",
        "Offsets • Curvas 90° • Sillas • Llenado NEC",
    ),
    "es-419": (
        '1/16" Y MILÍMETROS • 100% OFFLINE',
        "DOBLADOR DE TUBOS\nEMT Y CONDUIT",
        "Offsets • Curvas 90° • Sillas • Llenado NEC",
    ),
}


def get_font(size: int, weight: str = "bold") -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    """Load crisp Helvetica Neue / Avenir Next / Arial system fonts with full Spanish glyph support."""
    candidates: list[tuple[str, int]] = []
    if weight == "bold":
        candidates = [
            ("/System/Library/Fonts/HelveticaNeue.ttc", 1),
            ("/System/Library/Fonts/Avenir Next.ttc", 0),
            ("/System/Library/Fonts/Supplemental/Arial Bold.ttf", 0),
        ]
    elif weight == "medium":
        candidates = [
            ("/System/Library/Fonts/HelveticaNeue.ttc", 10),
            ("/System/Library/Fonts/Avenir Next.ttc", 5),
            ("/System/Library/Fonts/Supplemental/Arial.ttf", 0),
        ]
    else:
        candidates = [
            ("/System/Library/Fonts/HelveticaNeue.ttc", 0),
            ("/System/Library/Fonts/Supplemental/Arial.ttf", 0),
        ]
    for path_str, index in candidates:
        if Path(path_str).is_file():
            try:
                return ImageFont.truetype(path_str, size, index=index)
            except Exception:
                continue
    return ImageFont.load_default()


def add_rounded_corners(img: Image.Image, radius: int) -> tuple[Image.Image, Image.Image]:
    mask = Image.new("L", img.size, 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle([(0, 0), (img.size[0] - 1, img.size[1] - 1)], radius=radius, fill=255)
    rounded = Image.new("RGBA", img.size)
    rounded.paste(img.convert("RGBA"), (0, 0), mask=mask)
    return rounded, mask


def draw_centered_text(
    draw: ImageDraw.ImageDraw,
    text: str,
    y: int,
    font: ImageFont.FreeTypeFont | ImageFont.ImageFont,
    fill: str,
    canvas_width: int,
    line_gap: int = 12,
) -> int:
    cursor = y
    for line in text.splitlines():
        bbox = draw.textbbox((0, 0), line, font=font)
        w = bbox[2] - bbox[0]
        h = bbox[3] - bbox[1]
        x = (canvas_width - w) // 2 - bbox[0]
        draw.text((x, cursor - bbox[1]), line, font=font, fill=fill)
        cursor += h + line_gap
    return cursor


def compose_screenshot(
    raw_path: Path,
    eyebrow: str,
    headline: str,
    subtitle: str,
    output_path: Path,
) -> None:
    if not raw_path.is_file():
        raise FileNotFoundError(f"Missing raw screenshot: {raw_path}")

    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas = Image.new("RGB", (SCREENSHOT_WIDTH, SCREENSHOT_HEIGHT), NAVY_BG)
    draw = ImageDraw.Draw(canvas)

    # Top safety-yellow industrial accent stripe (exact brandPalette.yellow)
    draw.rectangle([(0, 0), (SCREENSHOT_WIDTH, 10)], fill=SAFETY_YELLOW)

    eyebrow_font = get_font(23, weight="bold")
    headline_font = get_font(54, weight="bold")
    subtitle_font = get_font(27, weight="medium")

    y_cursor = 58
    y_cursor = draw_centered_text(
        draw, eyebrow, y_cursor, eyebrow_font, SAFETY_YELLOW, SCREENSHOT_WIDTH, line_gap=8
    )
    y_cursor += 10
    y_cursor = draw_centered_text(
        draw, headline, y_cursor, headline_font, TEXT_WHITE, SCREENSHOT_WIDTH, line_gap=12
    )
    y_cursor += 8
    y_cursor = draw_centered_text(
        draw, subtitle, y_cursor, subtitle_font, TEXT_MUTED, SCREENSHOT_WIDTH, line_gap=8
    )

    # Crisp flat industrial device bezel — shows 100% of the app screen cleanly
    with Image.open(raw_path) as ss_img:
        screen_w = 720
        aspect = ss_img.height / ss_img.width
        screen_h = int(round(screen_w * aspect))
        ss_resized = ss_img.convert("RGB").resize((screen_w, screen_h), Image.Resampling.LANCZOS)
        rounded_ss, mask = add_rounded_corners(ss_resized, radius=36)

        bezel = 14
        frame_w = screen_w + bezel * 2
        frame_h = screen_h + bezel * 2
        frame_x = (SCREENSHOT_WIDTH - frame_w) // 2
        # Anchor cleanly below header with comfortable breathing room above bottom edge
        available_top = y_cursor + 24
        bottom_margin = 20
        frame_y = max(available_top, SCREENSHOT_HEIGHT - frame_h - bottom_margin)

        # Flat industrial phone frame (deep navy bezel + crisp 2px border, zero blur clutter)
        draw.rounded_rectangle(
            [(frame_x, frame_y), (frame_x + frame_w, frame_y + frame_h)],
            radius=48,
            fill=NAVY_DEEP,
            outline=NAVY_BORDER,
            width=3,
        )
        canvas.paste(rounded_ss, (frame_x + bezel, frame_y + bezel), mask=mask)

    final_img = canvas.convert("RGB")
    assert final_img.size == (SCREENSHOT_WIDTH, SCREENSHOT_HEIGHT)
    assert final_img.mode == "RGB"
    final_img.save(output_path, "PNG", optimize=True)
    print(f"[OK] Generated: {output_path.relative_to(BASE_DIR)} ({final_img.size}, {final_img.mode})")


def compose_feature_graphic(
    output_path: Path,
    eyebrow: str,
    headline: str,
    subtitle: str,
    icon_path: Path,
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    canvas = Image.new("RGB", (FEATURE_WIDTH, FEATURE_HEIGHT), NAVY_BG)
    draw = ImageDraw.Draw(canvas)

    # Safety-yellow top accent bar & subtle steel bottom rule
    draw.rectangle([(0, 0), (FEATURE_WIDTH, 10)], fill=SAFETY_YELLOW)
    draw.rectangle([(0, FEATURE_HEIGHT - 4), (FEATURE_WIDTH, FEATURE_HEIGHT)], fill=NAVY_BORDER)

    eyebrow_font = get_font(21, weight="bold")
    headline_font = get_font(48, weight="bold")
    subtitle_font = get_font(23, weight="medium")

    x_offset = 56
    icon_size = 296
    dest_x = FEATURE_WIDTH - icon_size - 56
    dest_y = (FEATURE_HEIGHT - icon_size) // 2 + 4
    pad = 6
    max_text_right = dest_x - pad - 36

    y_cursor = 122

    e_bbox = draw.textbbox((0, 0), eyebrow, font=eyebrow_font)
    assert x_offset + (e_bbox[2] - e_bbox[0]) <= max_text_right, f"Feature eyebrow overflows: {eyebrow}"
    draw.text((x_offset, y_cursor - e_bbox[1]), eyebrow, font=eyebrow_font, fill=SAFETY_YELLOW)
    y_cursor += (e_bbox[3] - e_bbox[1]) + 22

    for line in headline.splitlines():
        bbox = draw.textbbox((0, 0), line, font=headline_font)
        assert x_offset + (bbox[2] - bbox[0]) <= max_text_right, (
            f"Feature headline collides with icon ({x_offset + bbox[2] - bbox[0]} > {max_text_right}): {line}"
        )
        draw.text((x_offset, y_cursor - bbox[1]), line, font=headline_font, fill=TEXT_WHITE)
        y_cursor += (bbox[3] - bbox[1]) + 14

    y_cursor += 12
    for line in subtitle.splitlines():
        bbox = draw.textbbox((0, 0), line, font=subtitle_font)
        assert x_offset + (bbox[2] - bbox[0]) <= max_text_right, f"Feature subtitle collides with icon: {line}"
        draw.text((x_offset, y_cursor - bbox[1]), line, font=subtitle_font, fill=TEXT_MUTED)
        y_cursor += (bbox[3] - bbox[1]) + 8

    # Place crisp app icon on the right inside a clean bordered container
    if not icon_path.is_file():
        raise FileNotFoundError(f"Missing app icon: {icon_path}")

    with Image.open(icon_path) as icon_img:
        icon_resized = icon_img.convert("RGB").resize((icon_size, icon_size), Image.Resampling.LANCZOS)
        rounded_icon, icon_mask = add_rounded_corners(icon_resized, radius=58)

        # Subtle flat industrial frame around icon so navy-on-navy edge stays sharp
        draw.rounded_rectangle(
            [(dest_x - pad, dest_y - pad), (dest_x + icon_size + pad, dest_y + icon_size + pad)],
            radius=62,
            fill=NAVY_DEEP,
            outline=NAVY_BORDER,
            width=3,
        )
        canvas.paste(rounded_icon, (dest_x, dest_y), mask=icon_mask)

    final_img = canvas.convert("RGB")
    assert final_img.size == (FEATURE_WIDTH, FEATURE_HEIGHT)
    assert final_img.mode == "RGB"
    final_img.save(output_path, "PNG", optimize=True)
    print(f"[OK] Generated Feature Graphic: {output_path.relative_to(BASE_DIR)} ({final_img.size}, {final_img.mode})")


def write_metadata_text() -> None:
    for locale, data in LISTINGS.items():
        loc_dir = METADATA_DIR / locale
        loc_dir.mkdir(parents=True, exist_ok=True)

        title = data["title"]
        short_desc = data["shortDescription"]
        full_desc = data["fullDescription"]

        assert len(title) <= 30, f"{locale} title exceeds 30 chars: {len(title)}"
        assert len(short_desc) <= 80, f"{locale} short desc exceeds 80 chars: {len(short_desc)}"
        assert len(full_desc) <= 4000, f"{locale} full desc exceeds 4000 chars: {len(full_desc)}"

        if locale.startswith("es-"):
            combined = f"{title}\n{short_desc}\n{full_desc}".lower()
            assert "tubería" not in combined and "tuberia" not in combined, (
                f"{locale} metadata contains forbidden term 'tubería'/'tuberia'"
            )

        (loc_dir / "title.txt").write_text(title, encoding="utf-8")
        (loc_dir / "short_description.txt").write_text(short_desc, encoding="utf-8")
        (loc_dir / "full_description.txt").write_text(full_desc, encoding="utf-8")

        print(
            f"[OK] Metadata text written for {locale} "
            f"(Title: {len(title)}/30, Short: {len(short_desc)}/80, Full: {len(full_desc)}/4000)"
        )


def clean_stale_screenshots(screenshots_dir: Path, expected_names: set[str]) -> None:
    if not screenshots_dir.is_dir():
        return
    for existing in screenshots_dir.glob("*.png"):
        if existing.name.startswith("._"):
            continue
        if existing.name not in expected_names:
            existing.unlink(missing_ok=True)
            print(f"[CLEAN] Removed stale screenshot: {existing.relative_to(BASE_DIR)}")


def main() -> None:
    print("=== Step 1: Writing Fastlane Metadata Texts ===")
    write_metadata_text()

    icon_path = BASE_DIR / "assets" / "icon.png"
    expected_filenames = {item["filename"] for item in STORYBOARD}

    for locale in LOCALES:
        print(f"\n=== Step 2: Generating Screenshots for {locale} ===")
        lang_key = "en" if locale.startswith("en-") else "es"
        raw_locale = "en-US" if locale.startswith("en-") else "es-US"
        screenshots_dir = METADATA_DIR / locale / "images" / "phoneScreenshots"
        clean_stale_screenshots(screenshots_dir, expected_filenames)

        hashes: dict[str, str] = {}
        for item in STORYBOARD:
            out_file = screenshots_dir / item["filename"]
            raw_img = RAW_ASSETS_DIR / raw_locale / item["raw_name"]
            copy = item.get(locale) or item[lang_key]
            compose_screenshot(
                raw_path=raw_img,
                eyebrow=copy["eyebrow"],
                headline=copy["headline"],
                subtitle=copy["subtitle"],
                output_path=out_file,
            )
            digest = hashlib.sha256(out_file.read_bytes()).hexdigest()
            assert digest not in hashes, f"Duplicate screenshot detected in {locale}: {item['filename']} == {hashes[digest]}"
            hashes[digest] = item["filename"]

        actual_files = sorted(
            p.name for p in screenshots_dir.glob("*.png") if not p.name.startswith("._")
        )
        assert len(actual_files) == 6, f"Expected 6 screenshots in {locale}, found {len(actual_files)}: {actual_files}"

        print(f"\n=== Step 3: Generating Feature Graphic for {locale} ===")
        feature_out = METADATA_DIR / locale / "images" / "featureGraphic.png"
        f_eye, f_head, f_sub = FEATURE_GRAPHICS[locale]
        compose_feature_graphic(feature_out, f_eye, f_head, f_sub, icon_path)

    print("\n[SUCCESS] All Google Play Store Assets Generated & Validated!")


if __name__ == "__main__":
    main()
