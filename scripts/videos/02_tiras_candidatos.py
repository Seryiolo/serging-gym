"""
Paso 2 del pipeline de videos personales:
Extrae tiras horizontales de fotogramas cada 4 segundos (con marca exacta t=XXs)
para los videos candidatos preseleccionados de manifest.json (sin tocar otros archivos
de OneDrive fuera del manifest). Agrupa 5-6 candidatos por imagen de contacto en
scratch/videos/tiras/ para inspeccion visual fina.
"""

import json
import math
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

MANIFEST_PATH = Path(
    r"C:\Users\sergi\.gemini\antigravity\brain\b7811124-be11-4d03-bc1c-70093f0e2eba\scratch\videos\manifest.json"
)
OUT_DIR = MANIFEST_PATH.parent / "tiras"
FRAMES_CACHE = OUT_DIR / "frames_4s"

# Indices candidatos dentro de manifest.json (todos locales)
CANDIDATE_IDXS = [
    4,   # Puente de isquios sobre mancuerna/rodillo
    5,   # Snap-down / salto vertical con recepcion unipodal
    9,   # Zancada atras con impulso de rodilla (plano general)
    10,  # Zancada atras goblet con impulso de rodilla
    15,  # Bisagra / remo con barra (verificar)
    17,  # Split squat con pase/rotacion lateral de kettlebell
    18,  # Skater hop lateral unipodal
    19,  # Box jump bilateral
    20,  # Elevacion de gemelos con barra en deficit
    23,  # Step-down anterior desde cajon
    24,  # Zancada atras con impulso de rodilla (plano medio)
    25,  # Skater squat unipodal con contrapeso
    26,  # Peso muerto rumano unilateral con mancuerna
    27,  # Step-up / descenso en banco con mancuernas
    75,  # Split squat con banda RNT anti-valgo
    76,  # Saltos reactivos unipodales
    77,  # Drop landing desde cajon alto
    78,  # Goblet squat profunda
    82,  # Drills de carrera / bounding exterior
    83,  # Cambio de direccion 45-90 exterior
    85,  # Sentadilla lateral con kettlebell
    86,  # Peso muerto convencional con barra
    87,  # Desaceleracion / corte exterior (comparar)
    88,  # Aceleracion y frenada lineal exterior
    90,  # Plancha Copenhague en banco
    91,  # Salto unilateral al cajon
    92,  # Hip thrust con barra
    93,  # Sentadilla bulgara con barra
    94,  # Split squat con pie delantero elevado y mancuernas
    95,  # Pogo jumps reactivos
    96,  # Elevacion de talon en zancada con barra (soleo)
    97,  # Sentadilla Cossack con kettlebell
    98,  # Peso muerto rumano con barra
]

STEP_S = 4
THUMB_W = 148
THUMB_H = 262
MAX_COLS = 14
GROUP_SIZE = 6


def load_font(size: int):
    for name in ("arialbd.ttf", "segoeui.ttf", "consolab.ttf", "arial.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def extract_frame(ffmpeg_exe: str, src: str, t_sec: int, dst: Path) -> bool:
    if dst.exists() and dst.stat().st_size > 500:
        return True
    cmd = [
        ffmpeg_exe,
        "-y",
        "-ss",
        str(t_sec),
        "-i",
        src,
        "-frames:v",
        "1",
        "-vf",
        f"scale={THUMB_W * 2}:-2",
        "-q:v",
        "4",
        str(dst),
    ]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    return res.returncode == 0 and dst.exists() and dst.stat().st_size > 500


def process_candidate(ffmpeg_exe: str, item: dict) -> list[tuple[int, Path]]:
    dur = float(item["dur"])
    base = item["base"]
    src = item["archivo"]
    timestamps = list(range(0, max(1, int(math.floor(dur - 0.3))) + 1, STEP_S))
    results = []
    for t in timestamps:
        dst = FRAMES_CACHE / f"{base}_t{t:03d}.jpg"
        ok = extract_frame(ffmpeg_exe, src, t, dst)
        if ok:
            results.append((t, dst))
    return results


def build_contact_sheets(candidates: list[dict], extracted: dict[int, list[tuple[int, Path]]]):
    font_header = load_font(20)
    font_time = load_font(16)

    for sheet_idx in range(0, len(candidates), GROUP_SIZE):
        chunk = candidates[sheet_idx : sheet_idx + GROUP_SIZE]
        sheet_w = MAX_COLS * (THUMB_W + 4) + 16
        # Calculate total height
        total_h = 16
        for item in chunk:
            frames = extracted[item["idx"]]
            rows = max(1, math.ceil(len(frames) / MAX_COLS))
            total_h += 34 + rows * (THUMB_H + 6) + 14

        canvas = Image.new("RGB", (sheet_w, total_h), (18, 18, 22))
        draw = ImageDraw.Draw(canvas)

        y = 12
        for item in chunk:
            idx = item["idx"]
            frames = extracted[idx]
            header = f"#{idx:03d}  {item['base']}   (dur={item['dur']:.1f}s, {len(frames)} frames @ {STEP_S}s)"
            draw.rectangle([8, y, sheet_w - 8, y + 28], fill=(38, 40, 52))
            draw.text((14, y + 4), header, fill=(255, 230, 90), font=font_header)
            y += 32

            rows = max(1, math.ceil(len(frames) / MAX_COLS))
            for f_i, (t_sec, f_path) in enumerate(frames):
                r = f_i // MAX_COLS
                c = f_i % MAX_COLS
                x = 10 + c * (THUMB_W + 4)
                fy = y + r * (THUMB_H + 6)
                try:
                    im = Image.open(f_path).convert("RGB")
                    im.thumbnail((THUMB_W, THUMB_H), Image.Resampling.LANCZOS)
                    bg = Image.new("RGB", (THUMB_W, THUMB_H), (0, 0, 0))
                    ox = (THUMB_W - im.width) // 2
                    oy = (THUMB_H - im.height) // 2
                    bg.paste(im, (ox, oy))
                    canvas.paste(bg, (x, fy))
                except Exception:
                    draw.rectangle([x, fy, x + THUMB_W, fy + THUMB_H], fill=(60, 20, 20))

                # Timestamp badge
                draw.rectangle([x, fy, x + 68, fy + 22], fill=(0, 0, 0))
                draw.text((x + 4, fy + 2), f"t={t_sec:02d}s", fill=(120, 255, 140), font=font_time)

            y += rows * (THUMB_H + 6) + 14

        out_file = OUT_DIR / f"tira_{sheet_idx // GROUP_SIZE:02d}.jpg"
        canvas.save(out_file, quality=88)
        print(f"Guardada {out_file} ({canvas.width}x{canvas.height})")


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    FRAMES_CACHE.mkdir(parents=True, exist_ok=True)
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()

    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    by_idx = {m["idx"]: m for m in manifest}

    candidates = [by_idx[i] for i in CANDIDATE_IDXS if i in by_idx]
    print(f"Procesando {len(candidates)} videos candidatos...")

    extracted: dict[int, list[tuple[int, Path]]] = {}
    with ThreadPoolExecutor(max_workers=6) as pool:
        futs = {pool.submit(process_candidate, ffmpeg_exe, item): item["idx"] for item in candidates}
        for fut, idx in futs.items():
            extracted[idx] = fut.result()
            print(f"  #{idx:03d}: {len(extracted[idx])} fotogramas")

    build_contact_sheets(candidates, extracted)
    print("Listo.")


if __name__ == "__main__":
    main()
