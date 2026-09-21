import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
data_file = ROOT / "data" / "siis_responses.json"
out_file = ROOT / "frontend" / "src" / "data" / "presets.ts"
out_file.parent.mkdir(parents=True, exist_ok=True)

with open(data_file, "r", encoding="utf-8") as f:
    d = json.load(f)

presets = []
for r in d.get("responses", []):
    title = r["siis_response"]["title"]
    cat = "Display"
    if "Email" in title:
        cat = "Connectivity"
    elif "Transfer" in title or "Switch" in title:
        cat = "Data & Backup"
    elif "Camera" in title:
        cat = "Camera"
    elif "TV" in title or "mirroring" in title:
        cat = "Connections"
    elif "Touchscreen" in title or "rotate" in title:
        cat = "Hardware & Touch"

    presets.append({
        "id": r["id"],
        "label": f"{r['id']}: {title[:36]}...",
        "category": cat,
        "query": r["original_query"],
        "siis_response": r["siis_response"]
    })

ts_code = 'import { PresetCase } from "../types";\n\nexport const OFFICIAL_PRESETS: PresetCase[] = ' + json.dumps(presets, indent=2) + ';\n'
with open(out_file, "w", encoding="utf-8") as out:
    out.write(ts_code)

print(f"Generated {len(presets)} official presets to {out_file}")
