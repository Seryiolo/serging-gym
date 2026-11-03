"""
Paso 1 del pipeline de videos: indexa los videos de rodilla de los ultimos 2 meses
y genera hojas de contacto (3 fotogramas por video: 20%, 50% y 80% de la duracion)
para poder identificar cada ejercicio.

Salida (fuera del repo): <OUT>/manifest.json y <OUT>/hojas/hoja_XX.jpg
"""
import glob, json, os, re, subprocess, sys
import imageio_ffmpeg
from PIL import Image, ImageDraw

FF = imageio_ffmpeg.get_ffmpeg_exe()
VIDEO_DIR = r"C:\Users\sergi\OneDrive\Fotos\Rodilla ejercicios"
OUT = r"C:\Users\sergi\.gemini\antigravity\brain\b7811124-be11-4d03-bc1c-70093f0e2eba\scratch\videos"
DESDE = "20260903"          # ultimos 2 meses (hoy: 2026-11-03)
POR_HOJA = 10
FW, FH = 190, 338            # tamano de cada fotograma

os.makedirs(os.path.join(OUT, "frames"), exist_ok=True)
os.makedirs(os.path.join(OUT, "hojas"), exist_ok=True)


def duracion(path):
    p = subprocess.run([FF, "-hide_banner", "-i", path], stderr=subprocess.PIPE, text=True, errors="ignore")
    m = re.search(r"Duration:\s*(\d+):(\d+):(\d+\.\d+)", p.stderr)
    if not m:
        return None
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3))


def fotograma(path, t, out):
    if os.path.exists(out):
        return True
    r = subprocess.run(
        [FF, "-hide_banner", "-loglevel", "error", "-y", "-ss", f"{t:.2f}", "-i", path,
         "-frames:v", "1", "-vf", f"scale={FW}:{FH}:force_original_aspect_ratio=decrease", out],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return r.returncode == 0 and os.path.exists(out)


def main():
    vids = sorted(
        f for f in glob.glob(os.path.join(VIDEO_DIR, "*_iOS*.MOV"))
        if os.path.basename(f)[:8] >= DESDE
    )
    # Duplicados exactos (mismo nombre con sufijo " 1" y mismo tamano)
    vistos, unicos = set(), []
    for f in vids:
        clave = (re.sub(r" 1(?=\.MOV$)", "", os.path.basename(f)), os.path.getsize(f))
        if clave in vistos:
            continue
        vistos.add(clave)
        unicos.append(f)
    print(f"Videos desde {DESDE}: {len(vids)} (unicos: {len(unicos)})", flush=True)

    manifest = []
    for i, f in enumerate(unicos):
        base = os.path.splitext(os.path.basename(f))[0].replace(" ", "_")
        d = duracion(f)
        if not d:
            print("sin duracion:", f, flush=True)
            continue
        frames = []
        for k, frac in enumerate((0.2, 0.5, 0.8)):
            out = os.path.join(OUT, "frames", f"{base}_{k}.jpg")
            if fotograma(f, d * frac, out):
                frames.append(out)
        manifest.append({"idx": i, "archivo": f, "base": base, "dur": round(d, 1),
                         "tam_mb": round(os.path.getsize(f) / 1e6, 1), "frames": frames})
        if i % 10 == 0:
            print(f"  indexados {i}/{len(unicos)}", flush=True)

    with open(os.path.join(OUT, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(manifest, fh, indent=1, ensure_ascii=False)

    # Hojas de contacto: 2 columnas x 5 filas, cada fila = 3 fotogramas + etiqueta
    for h in range(0, len(manifest), POR_HOJA):
        grupo = manifest[h:h + POR_HOJA]
        cols = 2
        filas = (len(grupo) + cols - 1) // cols
        celda_w, celda_h = FW * 3 + 4, FH + 18
        hoja = Image.new("RGB", (cols * celda_w, filas * celda_h), (15, 15, 15))
        dib = ImageDraw.Draw(hoja)
        for j, v in enumerate(grupo):
            x0, y0 = (j % cols) * celda_w, (j // cols) * celda_h
            dib.text((x0 + 3, y0 + 2), f"#{v['idx']:03d} {v['base'][:15]} {v['dur']:.0f}s", fill=(255, 215, 0))
            for k, fr in enumerate(v["frames"]):
                try:
                    im = Image.open(fr)
                    hoja.paste(im, (x0 + k * (FW + 2), y0 + 16))
                except Exception:
                    pass
        hoja.save(os.path.join(OUT, "hojas", f"hoja_{h // POR_HOJA:02d}.jpg"), quality=82)
    print(f"LISTO: {len(manifest)} videos, {(len(manifest) + POR_HOJA - 1) // POR_HOJA} hojas", flush=True)


if __name__ == "__main__":
    sys.exit(main())
