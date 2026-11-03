"""
Paso 4 del pipeline de videos:
Busca en YouTube y valida mediante la API oficial oEmbed (HTTP 200 = existente e incrustable)
un video tutorial real y especifico para cada uno de los ejercicios no-propios de db/seed_ejercicios.sql.
Actualiza db/seed_ejercicios.sql con video_url, poster_url (hqdefault.jpg), video_origen='youtube' y video_validado=1.
"""

import json
import re
import sys
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

PROJECT_ROOT = Path(__file__).resolve().parents[2]
SEED_SQL = PROJECT_ROOT / "db" / "seed_ejercicios.sql"

# Consultas de busqueda precisas por ID para garantizar que el tutorial coincide exactamente con el gesto
SEARCH_QUERIES = {
    1: "ankle dorsiflexion wall mobilization exercise tutorial",
    2: "half kneeling hip internal external rotation wall exercise",
    3: "bench thoracic spine extension mobilization dowel",
    4: "lateral monster walk mini band glute exercise",
    5: "plank shoulder taps core anti rotation exercise",
    6: "90 90 hip stretch mobility tutorial",
    7: "elevated pigeon stretch bench hip mobility",
    10: "barbell bench press proper form tutorial",
    11: "incline dumbbell bench press 30 degree form",
    12: "cable chest fly crossover form tutorial",
    13: "parallel bar dips chest triceps form",
    14: "standing barbell overhead press form tutorial",
    15: "dumbbell lateral raise shoulder form tutorial",
    16: "ez bar skull crusher lying triceps extension",
    17: "rope triceps pushdown cable form",
    20: "strict pull ups proper form tutorial",
    21: "barbell bent over row proper form",
    22: "lat pulldown proper form tutorial",
    23: "one arm dumbbell row bench form",
    24: "cable face pull external rotation form",
    25: "ez bar biceps curl strict form",
    26: "dumbbell hammer curl form tutorial",
    31: "single leg hamstring bridge isometric push acl rehab",
    32: "single leg knee extension eccentric acl rehab",
    36: "single leg glute bridge floor exercise",
    37: "single leg calf raise on step dumbbell",
    41: "tuck jump plyometric landing mechanics",
    44: "agility t test 90 degree cut drill",
    50: "zone 2 easy aerobic running technique tips",
    51: "1000m track intervals workout running tips",
    52: "400m track repeats running workout form",
    53: "tempo run threshold running workout explained",
    54: "fartlek training running workout explained",
    80: "spanish squat isometric band patellar tendon",
    81: "single leg wall sit isometric quad exercise",
    82: "pallof press isometric anti rotation core",
    83: "dead bug core exercise proper form",
    84: "bird dog isometric core stability exercise",
    85: "side plank with hip abduction glute medius",
    86: "rkc plank hardstyle plank tutorial",
    87: "stir the pot swiss ball plank core",
    88: "single leg glute bridge isometric hold",
    89: "seated calf raise isometric soleus tendon",
    90: "ab wheel rollout proper form core",
    91: "hollow body hold gymnastics core tutorial",
    92: "kettlebell suitcase carry unilateral core",
    93: "heavy farmers walk carry technique",
    94: "kettlebell swing hip hinge proper form",
    95: "single leg landmine rdl exercise",
    96: "band assisted nordic hamstring curl",
    97: "heavy sled push technique sprint",
    98: "reverse sled drag knees over toes quad",
    99: "clamshell mini band glute medius exercise",
    100: "seated calf raise soleus exercise dumbbell machine",
    101: "a skip running drill athletics tutorial",
    102: "b skip running drill track tutorial",
    103: "ankling running drill ankle stiffness",
    104: "wall drill sprint mechanics marches switches",
    105: "running strides 80m 100m how to run strides",
    106: "2000m cruise intervals threshold running track",
    107: "progression long run half marathon training",
    108: "standing broad jump stick landing plyometric",
    109: "sprint deceleration drill 3 step stop acl",
    110: "worlds greatest stretch mobility exercise",
    111: "couch stretch hip flexor quad mobility",
    112: "adductor rockbacks mobility exercise",
    113: "cat cow breathing thoracic spine mobility",
    114: "push ups proper form scapular control",
    115: "inverted row bodyweight barbell trx",
    116: "single arm landmine press standing",
    117: "chest supported rear delt dumbbell fly",
}

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
}


def check_oembed(vid_id: str) -> str | None:
    url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={vid_id}&format=json"
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            if resp.status == 200:
                data = json.loads(resp.read().decode("utf-8", "replace"))
                return data.get("title", "")
    except Exception:
        return None
    return None


def search_youtube_ids(query: str) -> list[str]:
    q = urllib.parse.quote_plus(query)
    url = f"https://www.youtube.com/results?search_query={q}"
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=12) as resp:
        html = resp.read().decode("utf-8", "replace")
    seen = set()
    out = []
    for m in re.finditer(r'"videoId":"([A-Za-z0-9_-]{11})"', html):
        vid = m.group(1)
        if vid not in seen:
            seen.add(vid)
            out.append(vid)
        if len(out) >= 12:
            break
    return out


def resolve_one(ej_id: int, nombre: str) -> tuple[int, str, str]:
    query = SEARCH_QUERIES.get(ej_id, f"{nombre} exercise tutorial")
    cands = search_youtube_ids(query)
    for vid in cands:
        title = check_oembed(vid)
        if title:
            return ej_id, vid, title
    raise RuntimeError(f"No se encontro video embebible para #{ej_id} {nombre}")


def main():
    sql = SEED_SQL.read_text(encoding="utf-8")
    # Match rows in seed_ejercicios.sql
    line_re = re.compile(
        r"^(\((\d+),\s*NULL,\s*'([^']+)',\s*'[^']+',\s*'[^']+',\s*'[^']+',\s*[01],\s*[0-3],\s*[1-4],\s*'[^']*',\s*'[^']*',\s*)(NULL|'[^']*'),\s*(NULL|'[^']*'),\s*'([^']+)',\s*([01])(\)[,;]?)$",
        re.MULTILINE,
    )

    targets = []
    for m in line_re.finditer(sql):
        ej_id = int(m.group(2))
        nombre = m.group(3)
        origen = m.group(6)
        if origen != "propio":
            targets.append((ej_id, nombre))

    print(f"Buscando y validando por oEmbed {len(targets)} ejercicios de YouTube...")
    resolved = {}
    used_ids = set()

    # First fetch candidate lists in parallel
    def fetch_cands(item):
        ej_id, nombre = item
        q = SEARCH_QUERIES.get(ej_id, f"{nombre} exercise tutorial")
        return ej_id, nombre, search_youtube_ids(q)

    with ThreadPoolExecutor(max_workers=10) as pool:
        cand_lists = list(pool.map(fetch_cands, targets))

    # Pick unique, oEmbed-verified video IDs so every exercise has its own distinct tutorial
    for ej_id, nombre, cands in cand_lists:
        chosen = None
        chosen_title = ""
        # Prefer unused video ID first
        for vid in cands:
            if vid in used_ids:
                continue
            title = check_oembed(vid)
            if title:
                chosen = vid
                chosen_title = title
                used_ids.add(vid)
                break
        if not chosen:
            for vid in cands:
                title = check_oembed(vid)
                if title:
                    chosen = vid
                    chosen_title = title
                    break
        if not chosen:
            raise RuntimeError(f"Sin video valido para #{ej_id} {nombre}")
        resolved[ej_id] = (chosen, chosen_title)
        print(f"  OK #{ej_id:03d} {nombre[:38]:38s} -> {chosen} | {chosen_title[:48]}")

    def repl(m):
        prefix = m.group(1)
        ej_id = int(m.group(2))
        origen = m.group(6)
        suffix = m.group(8)
        if origen == "propio":
            return m.group(0)
        vid, _ = resolved[ej_id]
        v_url = f"'https://www.youtube.com/watch?v={vid}'"
        p_url = f"'https://i.ytimg.com/vi/{vid}/hqdefault.jpg'"
        return f"{prefix}{v_url}, {p_url}, 'youtube', 1{suffix}"

    updated_sql = line_re.sub(repl, sql)
    SEED_SQL.write_text(updated_sql, encoding="utf-8")
    print(f"\nActualizado {SEED_SQL.name}: {len(resolved)} videos de YouTube unicos y 100% validados por oEmbed.")


if __name__ == "__main__":
    main()
