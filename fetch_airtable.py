import requests
import json
import os
import time
import re
import unicodedata
from datetime import datetime

AIRTABLE_TOKEN = os.environ.get("AIRTABLE_PAT")
BASE_ID = "appjWF7WnC8DRWaXM"
TABLE_NAME = "Changing Diapers"
HEADERS = {"Authorization": f"Bearer {AIRTABLE_TOKEN}"}

def to_list(v):
    if v is None:
        return []
    return v if isinstance(v, list) else [v]

def stars_from_score10(score):
    if score is None:
        return None
    try:
        s = float(score) / 2.0
    except (TypeError, ValueError):
        return None
    s = max(0.0, min(5.0, s))
    return round(s * 2) / 2

def parse_dt(value):
    if not value:
        return None
    try:
        s = str(value).strip()
        if s.endswith("Z"):
            s = s[:-1] + "+00:00"
        return datetime.fromisoformat(s)
    except Exception:
        return None

def pick_photo_thumbs(photo_field):
    if not isinstance(photo_field, list) or len(photo_field) == 0:
        return (None, None)

    first = photo_field[0] or {}
    thumbs = first.get("thumbnails") or {}

    small = None
    large = None

    if isinstance(thumbs, dict):
        sm = thumbs.get("small")
        lg = thumbs.get("large")
        if isinstance(sm, dict):
            small = sm.get("url")
        if isinstance(lg, dict):
            large = lg.get("url")

    original = first.get("url")
    if not small and original:
        small = original
    if not large and original:
        large = original

    return (small, large)

def normalize_neighborhood_hyphen(s):
    if not s:
        return ""
    s = str(s).strip()
    return re.sub(r"\s*-\s*", "-", s)

def norm_text(s: str) -> str:
    if not s:
        return ""
    s = str(s).strip().lower()
    s = unicodedata.normalize("NFKD", s)
    s = "".join(ch for ch in s if not unicodedata.combining(ch))
    s = s.replace("ß", "ss")
    s = s.replace("str.", "strasse")
    s = s.replace("straße", "strasse")
    s = re.sub(r"[^\w\s]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def extract_zip(s: str) -> str:
    if not s:
        return ""
    m = re.search(r"\b(\d{5})\b", str(s))
    return m.group(1) if m else ""

def dedupe_tolerant_safe(places):
    """
    Safer dedupe:
      - If lat/lon present: key by (name_norm, zip, lat_round, lon_round)
      - Else if address present: key by (name_norm, addr_norm, zip)
      - Else: no dedupe (key uses record id)
    Keep most recent created_at; tie-break: has_photo.
    """
    best = {}

    for p in places:
        name = p.get("name", "")
        address = p.get("address", "")
        lat = p.get("latitude")
        lon = p.get("longitude")
        zip_code = extract_zip(address)

        name_n = norm_text(name)
        addr_n = norm_text(address)

        key = None
        if lat is not None and lon is not None:
            try:
                lat_r = round(float(lat), 4)
                lon_r = round(float(lon), 4)
                key = ("geo", name_n, zip_code, lat_r, lon_r)
            except Exception:
                key = None

        if key is None and addr_n:
            key = ("addr", name_n, addr_n, zip_code)

        if key is None:
            key = ("id", p.get("id"))

        cur_dt = parse_dt(p.get("created_at"))
        prev = best.get(key)

        if prev is None:
            best[key] = p
            continue

        prev_dt = parse_dt(prev.get("created_at"))

        if prev_dt is None and cur_dt is not None:
            best[key] = p
        elif prev_dt is not None and cur_dt is None:
            pass
        elif prev_dt is None and cur_dt is None:
            if p.get("has_photo") and not prev.get("has_photo"):
                best[key] = p
        else:
            if cur_dt > prev_dt:
                best[key] = p
            elif cur_dt == prev_dt:
                if p.get("has_photo") and not prev.get("has_photo"):
                    best[key] = p

    out = list(best.values())
    print(f"[✅] Deduped Berlin (safe): {len(places)} → {len(out)}")
    return out

def geocode_address(address):
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {"q": address, "format": "json", "limit": 1}
        res = requests.get(url, params=params, headers={"User-Agent": "changing-diapers-mvp"})
        data = res.json()
        if data:
            print(f"[✓] Geocoded: {address} → {data[0]['lat']}, {data[0]['lon']}")
            return float(data[0]["lat"]), float(data[0]["lon"])
        else:
            print(f"[!] No result for address: {address}")
    except Exception as e:
        print(f"[!] Geocode error for '{address}': {e}")
    return None, None

places_all = []
places_berlin_raw = []

url = f"https://api.airtable.com/v0/{BASE_ID}/{TABLE_NAME}"
params = {"pageSize": 100}

print("[...] Starting Airtable fetch...")

while True:
    res = requests.get(url, headers=HEADERS, params=params)
    data = res.json()

    if "error" in data:
        raise RuntimeError(f"Airtable API error: {data['error']}")

    records = data.get("records", [])
    print(f"[✓] Received {len(records)} records.")

    for record in records:
        fields = record.get("fields", {})
        name = fields.get("Name", "Unnamed")
        print(f"[🔍] Processing: {name}")

        lat = fields.get("Latitude")
        lon = fields.get("Longitude")
        address = fields.get("Full Address", "")
        city = (fields.get("City", "") or "").strip()
        country = fields.get("Country", "")
        created_at = fields.get("Created at") or record.get("createdTime")

        if (not lat or not lon) and address:
            parts = [address, city, country]
            search_address = ", ".join(part for part in parts if part)
            lat, lon = geocode_address(search_address)
            time.sleep(1)

        overall_score = fields.get("Overall user experience")
        if overall_score is not None:
            try:
                overall_score = float(overall_score)
            except (TypeError, ValueError):
                print(f"[⚠️] Invalid score for {name}: {overall_score}")
                overall_score = None

        photo_field = fields.get("Photo")
        review = (fields.get("Changing Table Review") or "").strip()

        photo_small_url, photo_large_url = pick_photo_thumbs(photo_field)
        has_photo = True if (photo_small_url or photo_large_url) else False
        photo_url = photo_large_url or photo_small_url

        neighborhood_raw = (fields.get("Neighborhood (Berlin)") or "").strip()
        neighborhood = normalize_neighborhood_hyphen(neighborhood_raw)

        place = {
            "id": record.get("id"),
            "name": fields.get("Name", ""),
            "city": city,
            "neighborhood": neighborhood,

            "address": address,
            "latitude": lat,
            "longitude": lon,
            "type": fields.get("Type", ""),

            "changing_table_location": to_list(fields.get("Changing Table Location")),
            "supplies_available": to_list(fields.get("Available Supplies") or fields.get("Available Suppllies")),
            "changing_table_condition": to_list(fields.get("Changing Table Condition")),

            "room_for_stroller": fields.get("Room for a stroller", False),
            "site": fields.get("Site", ""),
            "created_at": created_at,

            "photo_small_url": photo_small_url,
            "photo_large_url": photo_large_url,
            "photo_url": photo_url,
            "has_photo": has_photo,
            "review": review,

            "overall_user_experience": overall_score,
            "stars": stars_from_score10(overall_score)
        }

        places_all.append(place)
        if city.lower() == "berlin":
            places_berlin_raw.append(place)

    if "offset" in data:
        params["offset"] = data["offset"]
        print("[⏭️] More pages to fetch...")
    else:
        break

print(f"[✅] Total global places collected: {len(places_all)}")
print(f"[✅] Total Berlin places collected (raw): {len(places_berlin_raw)}")

places_berlin = dedupe_tolerant_safe(places_berlin_raw)
print(f"[✅] Total Berlin places collected (deduped): {len(places_berlin)}")

with open(os.path.abspath("places.json"), "w", encoding="utf-8") as f:
    json.dump(places_all, f, ensure_ascii=False, indent=2)

with open(os.path.abspath("places-berlin.json"), "w", encoding="utf-8") as f:
    json.dump(places_berlin, f, ensure_ascii=False, indent=2)

print("[🎉] Export done!")
