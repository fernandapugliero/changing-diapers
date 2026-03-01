import requests
import json
import os
import time

# === Configurações da API ===
AIRTABLE_TOKEN = os.environ.get('AIRTABLE_PAT')
BASE_ID = "appjWF7WnC8DRWaXM"
TABLE_NAME = "Changing Diapers"
HEADERS = {
    "Authorization": f"Bearer {AIRTABLE_TOKEN}"
}

# === Helpers ===
def to_list(v):
    if v is None:
        return []
    return v if isinstance(v, list) else [v]

def first_photo_url(photo_field):
    if not isinstance(photo_field, list) or len(photo_field) == 0:
        return None
    first = photo_field[0] or {}
    thumbs = first.get("thumbnails") or {}
    if isinstance(thumbs, dict):
        large = thumbs.get("large")
        if isinstance(large, dict) and large.get("url"):
            return large["url"]
    return first.get("url")

def stars_from_score10(score):
    if score is None:
        return None
    try:
        s = float(score) / 2.0
    except (TypeError, ValueError):
        return None
    s = max(0.0, min(5.0, s))
    return round(s * 2) / 2

# === Função para geocodificar endereços ===
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
places_berlin = []

url = f"https://api.airtable.com/v0/{BASE_ID}/{TABLE_NAME}"
params = {"pageSize": 100}

print("[...] Starting Airtable fetch...")

# === Paginação ===
while True:
    res = requests.get(url, headers=HEADERS, params=params)
    data = res.json()
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
        created_at = fields.get("Created at")

        # 🌍 Geocodificação caso não tenha lat/lon
        if (not lat or not lon) and address:
            parts = [address, city, country]
            search_address = ", ".join(part for part in parts if part)
            lat, lon = geocode_address(search_address)
            time.sleep(1)

        # ⭐️ rating 0–10
        overall_score = fields.get("Overall user experience")
        if overall_score is not None:
            try:
                overall_score = float(overall_score)
            except (TypeError, ValueError):
                print(f"[⚠️] Invalid score for {name}: {overall_score}")
                overall_score = None

        photo_field = fields.get("Photo")
        review = (fields.get("Changing Table Review") or "").strip()

        place = {
            "id": record.get("id"),
            "name": fields.get("Name", ""),
            "city": city,
            "neighborhood": (fields.get("Neighborhood (Berlin)") or "").strip(),
            "address": address,
            "latitude": lat,
            "longitude": lon,
            "type": fields.get("Type", ""),

            # tags
            "changing_table_location": to_list(fields.get("Changing Table Location")),
            "supplies_available": to_list(fields.get("Available Supplies")),
            "changing_table_condition": to_list(fields.get("Changing Table Condition")),

            # extras
            "room_for_stroller": fields.get("Room for a stroller", False),
            "site": fields.get("Site", ""),
            "created_at": created_at,

            # photo + review
            "photo": photo_field if isinstance(photo_field, list) else [],
            "photo_url": first_photo_url(photo_field),
            "review": review,

            # rating
            "overall_user_experience": overall_score,
            "stars": stars_from_score10(overall_score)
        }

        # adiciona ao global
        places_all.append(place)

        # adiciona ao Berlin se for Berlin
        if city.lower() == "berlin":
            places_berlin.append(place)

    if "offset" in data:
        params["offset"] = data["offset"]
        print("[⏭️] More pages to fetch...")
    else:
        break

print(f"[✅] Total global places: {len(places_all)}")
print(f"[✅] Total Berlin places: {len(places_berlin)}")

# === Exportar JSON global (mapa) ===
with open("places.json", "w", encoding="utf-8") as f:
    json.dump(places_all, f, ensure_ascii=False, indent=2)

# === Exportar JSON Berlin (/berlin page) ===
with open("places-berlin.json", "w", encoding="utf-8") as f:
    json.dump(places_berlin, f, ensure_ascii=False, indent=2)

print("[🎉] places.json (global) and places-berlin.json (Berlin only) updated successfully!")
