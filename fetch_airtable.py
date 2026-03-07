import requests
import json
import os
import time
import re
from datetime import datetime
from urllib.parse import urlparse

AIRTABLE_TOKEN = os.environ.get("AIRTABLE_PAT")
BASE_ID = "appjWF7WnC8DRWaXM"
TABLE_NAME = "Changing Diapers"
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


def slugify(value: str) -> str:
    value = (value or "").strip().lower()
    value = re.sub(r"[^\w\s-]", "", value, flags=re.UNICODE)
    value = re.sub(r"[-\s]+", "-", value).strip("-")
    return value or "place"


def created_stamp(value: str) -> str:
    dt = parse_dt(value)
    if not dt:
        return "unknown"
    return dt.strftime("%Y%m%d%H%M%S")


def pick_photo_urls(photo_field):
    """
    Returns a dict with best available Airtable URLs.
    Prefer 'large' for local download quality.
    """
    if not isinstance(photo_field, list) or len(photo_field) == 0:
        return {
            "small": None,
            "large": None,
            "original": None,
            "filename": None,
            "attachment_id": None,
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
        "filename": first.get("filename"),
        "attachment_id": first.get("id"),
    }


def guess_extension(url: str, filename: str | None = None) -> str:
    if filename and "." in filename:
        ext = filename.rsplit(".", 1)[-1].lower()
        if ext in {"jpg", "jpeg", "png", "webp"}:
            return "jpg" if ext == "jpeg" else ext

    if url:
        path = urlparse(url).path.lower()
        if path.endswith(".jpg") or path.endswith(".jpeg"):
            return "jpg"
        if path.endswith(".png"):
            return "png"
        if path.endswith(".webp"):
            return "webp"

    return "jpg"


def download_photo_local(photo_info, name, created_at, record_id):
    """
    Downloads the best Airtable image to a local repo path.
    Uses timestamp in filename to bust cache when images change.
    """
    source_url = photo_info["large"] or photo_info["original"] or photo_info["small"]
    if not source_url:
        return None

    stamp = created_stamp(created_at)
    slug = slugify(name)
    ext = guess_extension(source_url, photo_info.get("filename"))
    filename = f"{slug}-{record_id}-{stamp}.{ext}"
    filepath = os.path.join(IMAGE_DIR, filename)

    if os.path.exists(filepath):
        return f"/images/berlin/{filename}"

    try:
        res = requests.get(source_url, timeout=30)
        res.raise_for_status()
        with open(filepath, "wb") as f:
            f.write(res.content)
        print(f"[📷] Saved local image: {filepath}")
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
            timeout=30,
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
    """
    Group by (Name + Full Address). For each group:
      1) if any record has photo -> pick the most recent among those with photo
      2) else pick the most recent overall
    """
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

    for _, items in grouped.items():
        with_photo = [x for x in items if x.get("has_photo")]
        if with_photo:
            with_photo.sort(
                key=lambda x: (parse_dt(x.get("created_at")) or datetime.min),
                reverse=True,
            )
            out.append(with_photo[0])
        else:
            items.sort(
                key=lambda x: (parse_dt(x.get("created_at")) or datetime.min),
                reverse=True,
            )
            out.append(items[0])

    print(f"[✅] Deduped (prefer recent with photo): {len(places)} → {len(out)}")
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

        photo_field = fields.get("Photo")
        review = (fields.get("Changing Table Review") or "").strip()

        photo_info = pick_photo_urls(photo_field)
        photo_small_url = photo_info["small"]
        photo_large_url = photo_info["large"]
        photo_url = photo_large_url or photo_small_url or photo_info["original"]
        has_photo = True if photo_url else False

        photo_local_url = None
        if city.lower() == "berlin" and has_photo:
            photo_local_url = download_photo_local(
                photo_info=photo_info,
                name=name,
                created_at=created_at,
                record_id=record.get("id"),
            )

        neighborhood = normalize_neighborhood(
            (fields.get("Neighborhood (Berlin)") or "").strip()
        )

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
            "supplies_available": to_list(
                fields.get("Available Supplies") or fields.get("Available Suppllies")
            ),
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
        print("[⏭️] More pages to fetch...")
    else:
        break

print(f"[✅] Total global places collected: {len(places_all)}")
print(f"[✅] Total Berlin places collected (raw): {len(places_berlin_raw)}")

places_berlin = dedupe_prefer_recent_with_photo(places_berlin_raw)
print(f"[✅] Total Berlin places collected (deduped): {len(places_berlin)}")

with open("places.json", "w", encoding="utf-8") as f:
    json.dump(places_all, f, ensure_ascii=False, indent=2)

with open("places-berlin.json", "w", encoding="utf-8") as f:
    json.dump(places_berlin, f, ensure_ascii=False, indent=2)

print("[🎉] Export done!")
