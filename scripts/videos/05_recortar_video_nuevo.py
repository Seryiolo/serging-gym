"""
Paso 5 del pipeline de videos:
Recorta los 22 ejercicios del nuevo video de rehabilitacion/readaptacion ACL-R 3.0
(WhatsApp Video 2026-11-09 at 18.00.03.mp4)
hacia:
  public/videos/rodilla/<slug>.mp4 (640x360 H.264 CRF 22, faststart, sin audio)
  public/videos/posters/<slug>.jpg (miniatura nitida en el punto culminante de la repeticion)

Cada ejercicio tiene coordenadas de recorte exactas calibradas para eliminar
marcos de la interfaz de la aplicacion movil, asegurando repeticiones limpias.
"""

import os
import subprocess
from pathlib import Path
import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

PROJECT_ROOT = Path(__file__).resolve().parents[2]
VIDEOS_OUT = PROJECT_ROOT / "public" / "videos" / "rodilla"
POSTERS_OUT = PROJECT_ROOT / "public" / "videos" / "posters"

VIDEOS_OUT.mkdir(parents=True, exist_ok=True)
POSTERS_OUT.mkdir(parents=True, exist_ok=True)

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
SOURCE_VIDEO = r"C:\Users\sergi\OneDrive\Sergio Caution\Apps del movil\Aplicacion de entrenamiento\WhatsApp Video 2026-11-09 at 18.00.03.mp4"

# Lista completa de los 22 ejercicios confirmados
# (indice, slug, t_inicio, t_fin, t_poster, y_crop, loop_count)
# loop_count: si > 1, duplica el loop para que ejercicios muy cortos duren 7-8s
CLIPS_CONFIG = [
    (1,  "worlds-greatest-stretch-dinamico",       8.5,  19.5, 14.0, 247, 1),
    (2,  "pallof-press-puente-gluteo",            21.5,  27.5, 25.0, 408, 1),
    (3,  "iso-split-vestibular",                  32.5,  50.5, 41.0, 287, 1),
    (4,  "iso-split-side-bounce",                 54.5,  63.5, 59.0, 287, 1),
    (5,  "hurdle-hop-double-bounce",              65.5,  71.5, 68.5, 247, 1),
    (6,  "continuous-lateral-jump-to-box",        73.5,  77.5, 75.5, 247, 2),
    (7,  "jump-shrug-potencia",                   83.0,  89.5, 85.5, 207, 1),
    (8,  "floating-heel-raises",                  95.0, 107.5, 100.0, 247, 1),
    (9,  "walking-leg-cradles",                  114.5, 119.5, 117.0, 247, 2),
    (10, "drop-step-sprint",                     124.5, 131.5, 128.0, 207, 1),
    (11, "crossover-step-sprint",                133.5, 137.5, 135.5, 247, 2),
    (12, "cone-drill-acceleration-deceleration", 140.5, 147.5, 144.0, 287, 1),
    (13, "running-storks-fitball",               155.5, 167.5, 161.0, 247, 1),
    (14, "bound-toma-decisiones",                171.5, 185.5, 178.5, 247, 1),
    (15, "bound-box-hop",                        188.5, 198.5, 193.5, 207, 1),
    (16, "broad-jump-horizontal",                202.0, 207.5, 204.5, 207, 1),
    (17, "step-up-jump-cajon",                   212.0, 218.5, 214.5, 207, 1),
    (18, "single-leg-explosive-hip-thrust",      220.5, 225.5, 223.0, 287, 2),
    (19, "split-kneeling-box-rotation",          233.5, 241.5, 237.5, 287, 1),
    (20, "lateral-box-hop",                      246.0, 249.5, 247.5, 207, 2),
    (21, "turn-box-jump",                        252.0, 256.0, 254.0, 207, 2),
    (22, "ankle-iso-push-tobillo",               258.8, 261.8, 260.2, 207, 2),
]

def procesar_clip(item):
    idx, slug, t_start, t_end, t_pos, y_crop, loop_count = item
    dur = t_end - t_start
    mp4_out = VIDEOS_OUT / f"{slug}.mp4"
    poster_out = POSTERS_OUT / f"{slug}.jpg"

    print(f"[{idx:02d}/22] Procesando {slug} ({dur:.1f}s, y={y_crop}, loop={loop_count})...")

    # 1. Extraer poster nitido en t_pos
    cmd_poster = [
        FFMPEG, "-y",
        "-ss", str(t_pos),
        "-i", SOURCE_VIDEO,
        "-vf", f"crop=384:216:0:{y_crop},scale=640:360:flags=lanczos",
        "-vframes", "1",
        "-q:v", "3",
        str(poster_out)
    ]
    subprocess.run(cmd_poster, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

    # 2. Extraer y codificar clip MP4
    # Si loop_count == 1, recorte simple
    # Si loop_count > 1, usamos stream_loop o concat de filtros para que el usuario tenga un loop fluido de 7-9s
    if loop_count == 1:
        cmd_video = [
            FFMPEG, "-y",
            "-ss", str(t_start),
            "-to", str(t_end),
            "-i", SOURCE_VIDEO,
            "-vf", f"crop=384:216:0:{y_crop},scale=640:360:flags=lanczos",
            "-c:v", "libx264",
            "-profile:v", "high",
            "-level:v", "4.0",
            "-crf", "22",
            "-preset", "slow",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            "-an",
            str(mp4_out)
        ]
    else:
        # Loop con stream_loop
        cmd_video = [
            FFMPEG, "-y",
            "-ss", str(t_start),
            "-to", str(t_end),
            "-stream_loop", str(loop_count - 1),
            "-i", SOURCE_VIDEO,
            "-vf", f"crop=384:216:0:{y_crop},scale=640:360:flags=lanczos",
            "-c:v", "libx264",
            "-profile:v", "high",
            "-level:v", "4.0",
            "-crf", "22",
            "-preset", "slow",
            "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            "-an",
            str(mp4_out)
        ]

    subprocess.run(cmd_video, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)

    size_kb = mp4_out.stat().st_size / 1024
    poster_kb = poster_out.stat().st_size / 1024
    print(f"      -> MP4: {size_kb:.1f} KB | Poster: {poster_kb:.1f} KB")

def generar_hoja_resumen():
    """Genera una hoja de contacto con los 22 posters para verificacion visual."""
    scratch_dir = Path(r"C:\Users\sergi\.gemini\antigravity\brain\b7811124-be11-4d03-bc1c-70093f0e2eba\scratch\video_nuevo")
    scratch_dir.mkdir(parents=True, exist_ok=True)
    out_img = scratch_dir / "verificacion_22_posters.jpg"

    cols = 4
    rows = (len(CLIPS_CONFIG) + cols - 1) // cols
    card_w, card_h = 320, 180

    montage = Image.new("RGB", (cols * card_w + (cols + 1) * 8, rows * (card_h + 36) + 8), (18, 22, 30))
    draw = ImageDraw.Draw(montage)

    for i, item in enumerate(CLIPS_CONFIG):
        idx, slug, _, _, _, _, _ = item
        poster_file = POSTERS_OUT / f"{slug}.jpg"
        if not poster_file.exists():
            continue

        c = i % cols
        r = i // cols
        x = 8 + c * (card_w + 8)
        y = 8 + r * (card_h + 36)

        im = Image.open(poster_file)
        im_res = im.resize((card_w, card_h), Image.Resampling.LANCZOS)
        montage.paste(im_res, (x, y + 26))

        draw.text((x + 6, y + 6), f"#{idx:02d} {slug}", fill=(255, 180, 50))

    montage.save(out_img, quality=88)
    print(f"\nHoja de contacto guardada en: {out_img}")

if __name__ == "__main__":
    print(f"Iniciando recorte de 22 ejercicios desde: {SOURCE_VIDEO}")
    for item in CLIPS_CONFIG:
        procesar_clip(item)
    generar_hoja_resumen()
    print("Recorte y extraccion completados exitosamente!")
