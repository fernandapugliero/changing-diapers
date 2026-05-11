import requests
import json
import os
import time
import re
from datetime import datetime
from urllib.parse import urlparse

AIRTABLE_TOKEN = os.environ.get("AIRTABLE_PAT")
BASE_ID = "appjWF7WnC8DRWaXM"
TABLE_NAME = "FixMyDiaper"
HEADERS = {"Authorization": f"Bearer {AIRTABLE_TOKEN}"}

IMAGE_DIR = os.path.join("images", "berlin")
os.makedirs(IMAGE_DIR, exist_ok=True)

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

def normalize_neighborhood(s):
    if not s:
        return ""
    return re.sub(r"\s*-\s*", "-", str(s).strip())

def slugify(value):
    value = (value or "").strip().lower()
    value = re.sub(r"[^\w\s-]", "", value, flags=re.UNICODE)
    value = re.sub(r"[-\s]+", "-", value).strip("-")
    return value or "place"

def get_extension(url, filename=None):
    if filename and "." in filename:
        ext = filename.rsplit(".", 1)[-1].lower()
        if ext in ["jpg", "jpeg", "png", "webp"]:
            return "jpg" if ext == "jpeg" else ext

    path = urlparse(url or "").path.lower()
    if path.endswith(".png"):
        return "png"
    if path.endswith(".webp"):
        return "webp"
    return "jpg"

def pick_photo_data(photo_field):
    if not isinstance(photo_field, list) or len(photo_field) == 0:
        return {
            "small": None,
            "large": None,
            "original": None,
            "attachment_id": None,
            "filename": None
        }

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

    return {
        "small": small,
        "large": large,
        "original": first.get("url"),
        "attachment_id": first.get("id"),
        "filename": first.get("filename")
    }

def download_berlin_photo(photo_data, name, record_id):
    source_url = photo_data.get("large") or photo_data.get("original") or photo_data.get("small")
    if not source_url:
        return None

    attachment_id = photo_data.get("attachment_id") or "photo"
    ext = get_extension(source_url, photo_data.get("filename"))
    filename = f"{slugify(name)}-{record_id}-{attachment_id}.{ext}"
    filepath = os.path.join(IMAGE_DIR, filename)

    if os.path.exists(filepath):
        return f"/images/berlin/{filename}"

    try:
        res = requests.get(source_url, timeout=30)
        res.raise_for_status()

        with open(filepath, "wb") as f:
            f.write(res.content)

        print(f"[📷] Saved image: {filepath}")
        return f"/images/berlin/{filename}"

    except Exception as e:
        print(f"[!] Failed to download image for {name}: {e}")
        return None

def geocode_address(address):
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {"q": address, "format": "json", "limit": 1}
        res = requests.get(
            url,
            params=params,
            headers={"User-Agent": "changing-diapers-mvp"},
            timeout=30
        )
        data = res.json()
        if data:
            print(f"[✓] Geocoded: {address}")
            return float(data[0]["lat"]), float(data[0]["lon"])
        else:
            print(f"[!] No result for address: {address}")
    except Exception as e:
        print(f"[!] Geocode error for '{address}': {e}")
    return None, None

def dedupe_prefer_recent_with_photo(places):
    grouped = {}

    for p in places:
        name = (p.get("name") or "").strip().lower()
        address = (p.get("address") or "").strip().lower()

        if not address:
            key = f"{name}|__noaddr__|{(p.get('neighborhood') or '').strip().lower()}"
        else:
            key = f"{name}|{address}"

        grouped.setdefault(key, []).append(p)

    out = []

    for items in grouped.values():
        with_photo = [x for x in items if x.get("has_photo")]

        if with_photo:
            with_photo.sort(
                key=lambda x: (parse_dt(x.get("created_at")) or datetime.min),
                reverse=True
            )
            out.append(with_photo[0])
        else:
            items.sort(
                key=lambda x: (parse_dt(x.get("created_at")) or datetime.min),
                reverse=True
            )
            out.append(items[0])

    print(f"[✅] Deduped: {len(places)} → {len(out)}")
    return out


places_all = []
places_berlin_raw = []

url = f"https://api.airtable.com/v0/{BASE_ID}/{TABLE_NAME}"
params = {"pageSize": 100}

print("[...] Starting Airtable fetch...")

while True:
    res = requests.get(url, headers=HEADERS, params=params, timeout=30)
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
            search_address = ", ".join(x for x in parts if x)
            lat, lon = geocode_address(search_address)
            time.sleep(1)

        overall_score = fields.get("Overall user experience")
        if overall_score is not None:
            try:
                overall_score = float(overall_score)
            except (TypeError, ValueError):
                overall_score = None

        photo_field = (
            fields.get("Photo")
            or fields.get("photo")
            or fields.get("Images")
            or fields.get("images")
            or []
        )

        photo_data = pick_photo_data(photo_field)

        photo_small_url = photo_data["small"] or photo_data["original"]
        photo_large_url = photo_data["large"] or photo_data["original"]
        photo_url = photo_large_url or photo_small_url or photo_data["original"]

        photo_local_url = None
        if city.lower() == "berlin" and photo_url:
            photo_local_url = download_berlin_photo(
                photo_data=photo_data,
                name=name,
                record_id=record.get("id")
            )

        has_photo = bool(photo_local_url or photo_url)

        if not has_photo:
            print(f"[⚠️ NO PHOTO] {name}")

        review = (fields.get("Changing Table Review") or "").strip()
        neighborhood = normalize_neighborhood((fields.get("Neighborhood (Berlin)") or "").strip())

        place = {
            "id": record.get("id"),
            "name": name,
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
            "photo_local_url": photo_local_url,
            "has_photo": has_photo,

            "review": review,

            "overall_user_experience": overall_score,
            "stars": stars_from_score10(overall_score),

            "unique_entry": fields.get("Unique entry?", "")
        }

        places_all.append(place)

        if city.lower() == "berlin":
            places_berlin_raw.append(place)

    if "offset" in data:
        params["offset"] = data["offset"]
        print("[⏭️] More pages...")
    else:
        break

print(f"[✅] Total places: {len(places_all)}")
print(f"[✅] Berlin raw: {len(places_berlin_raw)}")

places_berlin = dedupe_prefer_recent_with_photo(places_berlin_raw)

print(f"[✅] Berlin deduped: {len(places_berlin)}")

with open("places.json", "w", encoding="utf-8") as f:
    json.dump(places_all, f, ensure_ascii=False, indent=2)

with open("places-berlin.json", "w", encoding="utf-8") as f:
    json.dump(places_berlin, f, ensure_ascii=False, indent=2)

print("[🎉] Export done!")
