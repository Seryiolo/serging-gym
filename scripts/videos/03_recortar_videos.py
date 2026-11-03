"""
Paso 3 del pipeline de videos personales:
Recorta los fragmentos limpios (8-12s de repeticiones puras, sin paseos ni suelo vacio)
hacia public/videos/rodilla/<slug>.mp4 (720p vertical, H.264 CRF 28, faststart, sin audio)
y extrae los posters nitidos hacia public/videos/posters/<slug>.jpg.
Verifica duracion real de cada MP4, peso total (<30 MB) y genera la hoja de contacto
scratch/videos/verificacion_posters.jpg mostrando cada poster + primer y ultimo fotograma
del MP4 recortado.
"""

import json
import math
import re
import subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import imageio_ffmpeg
from PIL import Image, ImageDraw, ImageFont

PROJECT_ROOT = Path(__file__).resolve().parents[2]
VIDEOS_OUT = PROJECT_ROOT / "public" / "videos" / "rodilla"
POSTERS_OUT = PROJECT_ROOT / "public" / "videos" / "posters"

SCRATCH_VIDEOS = Path(
    r"C:\Users\sergi\.gemini\antigravity\brain\b7811124-be11-4d03-bc1c-70093f0e2eba\scratch\videos"
)
MANIFEST_PATH = SCRATCH_VIDEOS / "manifest.json"
CHECK_FRAMES_DIR = SCRATCH_VIDEOS / "check_ends"

FINALISTS = [
    (4,  "puente-isquios-mancuerna",          "Puente isquios sobre mancuerna",       14.0, 25.0, 20.0),
    (5,  "aterrizaje-unipodal-stick",         "Impulso vertical + stick unipodal",    15.0, 26.0, 20.0),
    (9,  "zancada-atras-impulso-rodilla",     "Zancada atras + impulso rodilla",      26.0, 37.0, 32.0),
    (15, "sentadilla-zercher-barra",          "Sentadilla Zercher desde suelo",       22.0, 33.0, 24.0),
    (17, "split-squat-rotacion-kb",           "Split squat pase lateral KB",          22.0, 33.0, 24.0),
    (18, "skater-hop-unipodal",               "Skater hop lateral unipodal",          10.0, 21.0, 12.0),
    (19, "box-jump-bilateral",                "Box jump con absorcion controlada",    35.0, 46.0, 40.0),
    (20, "gemelo-barra-deficit",              "Gemelo con barra en deficit",          20.0, 31.0, 24.0),
    (23, "step-down-anterior-cajon",          "Step-down anterior desde cajon",       52.0, 63.0, 56.0),
    (25, "skater-squat-contrapeso",           "Skater squat unipodal contrapeso",     42.0, 53.0, 44.0),
    (26, "rdl-unilateral-mancuerna",          "RDL unilateral con mancuerna",         26.0, 37.0, 28.0),
    (27, "step-up-banco-mancuernas",          "Step-up en banco con mancuernas",      12.0, 23.0, 20.0),
    (75, "split-squat-rnt-antivalgo",         "Split squat banda RNT anti-valgo",      8.0, 19.0, 12.0),
    (76, "saltos-reactivos-unipodales",       "Saltos reactivos unipodales",           8.0, 19.0, 12.0),
    (77, "drop-landing-cajon",                "Drop landing desde cajon alto",        10.0, 21.0, 12.0),
    (78, "sentadilla-goblet-profunda",        "Sentadilla Goblet profunda",           16.0, 27.0, 24.0),
    (82, "tecnica-carrera-skipping",          "Tecnica carrera: skipping/bounds",     17.0, 26.0, 22.0),
    (83, "cambio-direccion-45-exterior",      "Cambio direccion 45 exterior",         35.0, 44.0, 40.0),
    (85, "sentadilla-lateral-goblet",         "Sentadilla lateral Goblet KB",         20.0, 31.0, 24.0),
    (86, "rdl-zercher-barra",                 "Bisagra Zercher RDL con barra",        60.0, 71.0, 64.0),
    (88, "aceleracion-frenada-lineal",        "Aceleracion y frenada lineal",         28.0, 38.0, 33.0),
    (90, "plancha-copenhague-banco",          "Plancha Copenhague en banco",          19.0, 30.0, 24.0),
    (91, "salto-unilateral-cajon",            "Salto unilateral a cajon 20 cm",       46.0, 57.0, 52.0),
    (92, "hip-thrust-barra",                  "Hip thrust con barra en banco",        36.0, 47.0, 40.0),
    (93, "sentadilla-bulgara-barra",          "Sentadilla bulgara con barra",         50.0, 61.0, 52.0),
    (94, "split-squat-pie-delantero-elevado", "Split squat pie delantero elevado",     8.0, 18.0, 16.0),
    (95, "pogo-jumps-reactivos",              "Pogo jumps reactivos",                  9.0, 20.0, 12.0),
    (96, "split-squat-isometrico-barra",      "Split squat isometrico con barra",     39.0, 50.0, 44.0),
    (97, "sentadilla-cossack-kettlebell",     "Sentadilla Cossack con kettlebell",    24.0, 35.0, 28.0),
    (98, "peso-muerto-rumano-barra",          "Peso muerto rumano con barra (RDL)",   46.0, 57.0, 52.0),
]

DUR_RE = re.compile(r"Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)")


def load_font(size: int):
    for name in ("arialbd.ttf", "segoeui.ttf", "arial.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default()


def probe_duration(ffmpeg_exe: str, mp4_path: Path) -> float:
    res = subprocess.run(
        [ffmpeg_exe, "-i", str(mp4_path)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    m = DUR_RE.search(res.stderr)
    if not m:
        return 0.0
    h, mi, s = int(m.group(1)), int(m.group(2)), float(m.group(3))
    return h * 3600 + mi * 60 + s


def process_clip(ffmpeg_exe: str, src: str, entry: tuple) -> dict:
    idx, slug, title, t_ini, t_fin, t_pos = entry
    mp4_dst = VIDEOS_OUT / f"{slug}.mp4"
    jpg_dst = POSTERS_OUT / f"{slug}.jpg"

    dur_target = t_fin - t_ini
    cmd_vid = [
        ffmpeg_exe,
        "-y",
        "-ss",
        f"{t_ini:.2f}",
        "-i",
        src,
        "-t",
        f"{dur_target:.2f}",
        "-vf",
        "scale=-2:720",
        "-c:v",
        "libx264",
        "-preset",
        "fast",
        "-crf",
        "28",
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "+faststart",
        "-an",
        str(mp4_dst),
    ]
    r_vid = subprocess.run(cmd_vid, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if r_vid.returncode != 0:
        raise RuntimeError(f"Error recortando {slug}: {r_vid.stderr.decode('utf-8', 'replace')[-300:]}")

    cmd_pos = [
        ffmpeg_exe,
        "-y",
        "-ss",
        f"{t_pos:.2f}",
        "-i",
        src,
        "-frames:v",
        "1",
        "-vf",
        "scale=-2:720",
        "-q:v",
        "3",
        str(jpg_dst),
    ]
    r_pos = subprocess.run(cmd_pos, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if r_pos.returncode != 0:
        raise RuntimeError(f"Error poster {slug}: {r_pos.stderr.decode('utf-8', 'replace')[-300:]}")

    dur = probe_duration(ffmpeg_exe, mp4_dst)
    size_kb = mp4_dst.stat().st_size / 1024.0
    poster_kb = jpg_dst.stat().st_size / 1024.0

    # Extract start (0.2s) and end (dur - 0.3s) from the trimmed MP4 for verification
    f_start = CHECK_FRAMES_DIR / f"{slug}_ini.jpg"
    f_end = CHECK_FRAMES_DIR / f"{slug}_fin.jpg"
    subprocess.run(
        [ffmpeg_exe, "-y", "-ss", "0.2", "-i", str(mp4_dst), "-frames:v", "1", "-q:v", "4", str(f_start)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    end_t = max(0.5, dur - 0.35)
    subprocess.run(
        [ffmpeg_exe, "-y", "-ss", f"{end_t:.2f}", "-i", str(mp4_dst), "-frames:v", "1", "-q:v", "4", str(f_end)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    return {
        "idx": idx,
        "slug": slug,
        "titulo": title,
        "t_inicio": t_ini,
        "t_fin": t_fin,
        "t_poster": t_pos,
        "dur_s": round(dur, 2),
        "mp4_kb": round(size_kb, 1),
        "poster_kb": round(poster_kb, 1),
        "video_url": f"/videos/rodilla/{slug}.mp4",
        "poster_url": f"/videos/posters/{slug}.jpg",
        "poster_file": str(jpg_dst),
        "ini_file": str(f_start),
        "fin_file": str(f_end),
    }


def build_verification_sheet(results: list[dict], out_path: Path):
    cols = 5
    rows = math.ceil(len(results) / cols)
    # Card layout: Poster on left (200x355), Start & End stacked on right (100x175 each) + header
    card_w = 316
    card_h = 415
    pad = 12

    sheet_w = pad + cols * (card_w + pad)
    sheet_h = 56 + rows * (card_h + pad)
    canvas = Image.new("RGB", (sheet_w, sheet_h), (18, 20, 26))
    draw = ImageDraw.Draw(canvas)

    f_title = load_font(22)
    f_card = load_font(14)
    f_small = load_font(12)

    total_mb = sum(r["mp4_kb"] + r["poster_kb"] for r in results) / 1024.0
    draw.text(
        (pad, 14),
        f"VERIFICACION DE {len(results)} CLIPS Y POSTERS (Total public/videos = {total_mb:.2f} MB)  |  Izq: Poster  |  Der arriba: Inicio MP4  |  Der abajo: Fin MP4",
        fill=(255, 232, 95),
        font=f_title,
    )

    for i, r in enumerate(results):
        row, col = divmod(i, cols)
        x = pad + col * (card_w + pad)
        y = 54 + row * (card_h + pad)

        draw.rectangle([x, y, x + card_w, y + card_h], fill=(32, 35, 46), outline=(70, 75, 95))
        draw.text((x + 6, y + 5), f"#{r['idx']:03d} {r['titulo'][:28]}", fill=(255, 255, 255), font=f_card)
        draw.text(
            (x + 6, y + 23),
            f"{r['slug'][:26]} | {r['dur_s']:.1f}s | {r['mp4_kb']:.0f}KB",
            fill=(130, 240, 160),
            font=f_small,
        )

        py = y + 44
        # Poster (200 x 360)
        p_path = Path(r["poster_file"])
        if p_path.exists():
            im = Image.open(p_path).convert("RGB")
            im.thumbnail((200, 360), Image.Resampling.LANCZOS)
            canvas.paste(im, (x + 6, py))
            draw.rectangle([x + 6, py, x + 74, py + 18], fill=(0, 0, 0))
            draw.text((x + 9, py + 2), f"POST t={int(r['t_poster'])}s", fill=(255, 220, 80), font=f_small)

        # Start & End mini-frames (98 x 174 each)
        for j, (lbl, fkey, t_val) in enumerate(
            [("INI", "ini_file", r["t_inicio"]), ("FIN", "fin_file", r["t_fin"])]
        ):
            fp = Path(r[fkey])
            mx = x + 212
            my = py + j * 184
            if fp.exists():
                im2 = Image.open(fp).convert("RGB")
                im2.thumbnail((98, 174), Image.Resampling.LANCZOS)
                canvas.paste(im2, (mx, my))
            draw.rectangle([mx, my, mx + 72, my + 16], fill=(0, 0, 0))
            draw.text((mx + 3, my + 1), f"{lbl} {int(t_val)}s", fill=(140, 230, 255), font=f_small)

    canvas.save(out_path, quality=90)
    print(f"Hoja de verificacion guardada en {out_path} ({canvas.width}x{canvas.height})")


def main():
    VIDEOS_OUT.mkdir(parents=True, exist_ok=True)
    POSTERS_OUT.mkdir(parents=True, exist_ok=True)
    CHECK_FRAMES_DIR.mkdir(parents=True, exist_ok=True)

    # Clean any stale files not in FINALISTS
    valid_slugs = {e[1] for e in FINALISTS}
    for p in VIDEOS_OUT.glob("*.mp4"):
        if p.stem not in valid_slugs:
            p.unlink()
    for p in POSTERS_OUT.glob("*.jpg"):
        if p.stem not in valid_slugs:
            p.unlink()

    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    manifest = {m["idx"]: m for m in json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))}

    print(f"Recortando {len(FINALISTS)} videos personales...")
    results_by_slug = {}
    with ThreadPoolExecutor(max_workers=4) as pool:
        futs = {
            pool.submit(process_clip, ffmpeg_exe, manifest[e[0]]["archivo"], e): e[1]
            for e in FINALISTS
        }
        for fut, slug in futs.items():
            info = fut.result()
            results_by_slug[slug] = info
            print(f"  OK {slug:36s} dur={info['dur_s']:4.1f}s  mp4={info['mp4_kb']:6.1f}KB  jpg={info['poster_kb']:4.1f}KB")

    ordered = [results_by_slug[e[1]] for e in FINALISTS]
    total_bytes = sum(p.stat().st_size for p in (PROJECT_ROOT / "public" / "videos").rglob("*") if p.is_file())
    total_mb = total_bytes / (1024 * 1024)
    print(f"\nTamano total public/videos/: {total_mb:.2f} MB ({len(ordered)} MP4 + {len(ordered)} JPG)")
    assert total_mb < 30.0, f"Excede 30 MB: {total_mb:.2f} MB"
    for r in ordered:
        assert 7.5 <= r["dur_s"] <= 12.5, f"Duracion fuera de rango en {r['slug']}: {r['dur_s']}s"

    meta_out = SCRATCH_VIDEOS / "recortes_metadata.json"
    meta_out.write_text(json.dumps(ordered, indent=2, ensure_ascii=False), encoding="utf-8")

    verif_jpg = SCRATCH_VIDEOS / "verificacion_posters.jpg"
    build_verification_sheet(ordered, verif_jpg)


if __name__ == "__main__":
    main()
