"""Genera assets de arte para un caso usando gpt-image-1 (OpenAI).

NOTA (2026-08-17): la generación de arte pasó a manejarse a mano fuera de
este script — el MANIFEST de abajo quedó desactualizado respecto a los
assets reales en assets/cases/case-001-la-ultima-llamada/ (algunos props
ahora vienen pintados en el fondo, otros se reemplazaron por arte generado
aparte). Se deja como referencia de la técnica (prompt + transparencia +
resolución de la API key), no para correrlo tal cual sin revisar el
MANIFEST primero.

Reutiliza la API key ya configurada en el proyecto hermano PressForge Studio
(../ç en el escritorio) en vez de duplicarla en este repo. La key nunca se
imprime ni se guarda en este proyecto.

Requiere el intérprete de Python del venv de PressForge (ya tiene el paquete
`openai` instalado):

    "/Users/gadiedcarrero/Desktop/ç/.venv/bin/python" tools/generate_art.py

Vuelve a correr el mismo comando cuando se agreguen entradas nuevas al
MANIFEST — solo regenera lo que falte, salvo que se pase --force.
"""
from __future__ import annotations

import argparse
import base64
import json
import sys
from pathlib import Path

PRESSFORGE_DIR = Path("/Users/gadiedcarrero/Desktop/ç")
PROJECT_ASSETS_DIR = Path(__file__).resolve().parent.parent / "assets" / "cases" / "case-001-la-ultima-llamada"

STYLE_SUFFIX = (
    ", moody film-noir detective videogame concept art, dramatic chiaroscuro "
    "lighting, deep blue and charcoal palette with warm amber accent lighting, "
    "clean painterly digital illustration, subtle grain, atmospheric, "
    "no text, no watermark, no logos, no signature"
)
OBJECT_SUFFIX = ", single isolated object centered in frame, nothing else in the scene, transparent background"

# (ruta relativa dentro de assets/cases/case-001-la-ultima-llamada/, prompt, modo)
# modo "background" = opaco, apaisado ; modo "object" = fondo transparente, cuadrado
MANIFEST: list[tuple[str, str, str]] = [
    (
        "backgrounds/oficina-noche-lluvia.png",
        "Wide first-person view from behind a private investigator's desk at "
        "night, showing only the empty room shell: a completely bare wooden "
        "desk surface with absolutely nothing on top of it (no phone, no "
        "computer, no lamp, no papers, no cup, no photograph, no envelope — "
        "the desk is empty, all of those props are added later as separate "
        "layers), metal filing cabinets and cardboard boxes against the wall, "
        "an almost-empty cork board, a plain frosted glass office door with "
        "completely blank glass (absolutely no text, letters, numbers or "
        "lettering painted on the glass), three tall windows streaked with "
        "rain and glowing with neon city light outside. Empty desk surface "
        "is critical — do not place any object on it."
        + STYLE_SUFFIX,
        "background",
    ),
    ("layers/telefono.png", "An old black rotary desk telephone" + STYLE_SUFFIX + OBJECT_SUFFIX, "object"),
    (
        "layers/computadora-apagada.png",
        "An old boxy CRT computer monitor and keyboard on a desk, screen turned off and dark"
        + STYLE_SUFFIX
        + OBJECT_SUFFIX,
        "object",
    ),
    (
        "layers/computadora-encendida.png",
        "An old boxy CRT computer monitor and keyboard on a desk, screen glowing "
        "amber with a faint terminal interface" + STYLE_SUFFIX + OBJECT_SUFFIX,
        "object",
    ),
    (
        "layers/fotografia-boca-abajo.png",
        "A single photograph lying face down, blank cardboard back visible"
        + STYLE_SUFFIX
        + OBJECT_SUFFIX,
        "object",
    ),
    (
        "layers/fotografia-unidad-cero.png",
        "An old worn group photograph of five people in tactical gear standing together"
        + STYLE_SUFFIX
        + OBJECT_SUFFIX,
        "object",
    ),
    (
        "layers/sobre-alquiler.png",
        "A plain unopened envelope with a red FINAL NOTICE stamp" + STYLE_SUFFIX + OBJECT_SUFFIX,
        "object",
    ),
    (
        "layers/cajon-cerrado.png",
        "A flat rectangular wooden desk drawer front panel with a small brass "
        "handle and keyhole, viewed straight-on like a texture swatch, no "
        "sides or legs or perspective depth, just the flat front face of the "
        "drawer" + STYLE_SUFFIX + OBJECT_SUFFIX,
        "object",
    ),
    # Nota: cabinets, corkboard, puerta y ventanas ya no son capas separadas —
    # quedan pintadas directamente en el fondo (backgrounds/oficina-noche-lluvia.png)
    # porque son parte fija del cuarto, no objetos interactivos independientes.
    (
        "layers/lampara-cenicero-cafe.png",
        "A vintage desk lamp next to an ashtray and a cold cup of coffee"
        + STYLE_SUFFIX
        + OBJECT_SUFFIX,
        "object",
    ),
    (
        "layers/rueda-silla-parcial.png",
        "The top curved rim and spokes of a wheelchair wheel, partial view as if "
        "cropped at the bottom of frame" + STYLE_SUFFIX + OBJECT_SUFFIX,
        "object",
    ),
]


def resolve_openai_key() -> str:
    secrets_path = PRESSFORGE_DIR / "secrets.json"
    if secrets_path.is_file():
        data = json.loads(secrets_path.read_text(encoding="utf-8"))
        key = (data.get("openai_api_key") or "").strip()
        if key:
            return key
    env_path = PRESSFORGE_DIR / ".env"
    if env_path.is_file():
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if line.startswith("OPENAI_API_KEY="):
                return line.split("=", 1)[1].strip()
    raise RuntimeError(
        "No se encontró OPENAI_API_KEY ni en PressForge (secrets.json/.env) ni "
        "en el entorno. Definila con: export OPENAI_API_KEY=sk-..."
    )


def generate(client, prompt: str, mode: str, out_path: Path) -> None:
    size = "1536x1024" if mode == "background" else "1024x1024"
    kwargs = {"model": "gpt-image-1", "prompt": prompt, "size": size, "quality": "medium", "n": 1}
    if mode == "object":
        kwargs["background"] = "transparent"
        kwargs["output_format"] = "png"
    result = client.images.generate(**kwargs)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_bytes(base64.b64decode(result.data[0].b64_json))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--force", action="store_true", help="Regenerar aunque el archivo ya exista")
    parser.add_argument("--only", help="Generar solo las rutas que contengan este texto")
    args = parser.parse_args()

    try:
        from openai import OpenAI
    except ImportError:
        print("Falta el paquete 'openai'. Corré este script con el intérprete del venv de PressForge.", file=sys.stderr)
        return 1

    client = OpenAI(api_key=resolve_openai_key())

    todo = [
        (rel, prompt, mode)
        for rel, prompt, mode in MANIFEST
        if (not args.only or args.only in rel)
    ]

    ok, failed = 0, []
    for rel, prompt, mode in todo:
        out_path = PROJECT_ASSETS_DIR / rel
        if out_path.exists() and not args.force:
            print(f"  ya existe, salteando: {rel}")
            continue
        print(f"  generando: {rel} ...", end=" ", flush=True)
        try:
            generate(client, prompt, mode, out_path)
            print("ok")
            ok += 1
        except Exception as exc:  # noqa: BLE001
            print(f"FALLÓ: {exc}")
            failed.append(rel)

    print(f"\nListo: {ok} generadas, {len(failed)} fallidas de {len(todo)} pedidas.")
    if failed:
        print("Fallaron:", ", ".join(failed))
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
