import requests
import json
import os
import time
from datetime import datetime

AIRTABLE_TOKEN = os.environ.get('AIRTABLE_PAT')
BASE_ID = "appjWF7WnC8DRWaXM"
TABLE_NAME = "Changing Diapers"
HEADERS = {
    "Authorization": f"Bearer {AIRTABLE_TOKEN}"
}

def geocode_address(address):
    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": address,
            "format": "json",
            "limit": 1
        }
        res = requests.get(url, params=params, headers={"User-Agent": "changing-diapers-mvp"})
        data = res.json()
        if data:
            lat, lon = float(data[0]["lat"]), float(data[0]["lon"])
            print(f"✅ Geocoded: {address} -> {lat}, {lon}")
            return lat, lon
        else:
            print(f"⚠️ No result for address: {address}")
    except Exception as e:
        print(f"❌ Error geocoding '{address}':", e)
    return None, None

url = f"https://api.airtable.com/v0/{BASE_ID}/{TABLE_NAME}"
params = {"pageSize": 100}
places = []

print("🔄 Requesting data from Airtable...")
res = requests.get(url, headers=HEADERS, params=params)
data = res.json()
records = data.get("records", [])
print(f"✅ Received {len(records)} records from Airtable.")

for record in records:
    fields = record.get("fields", {})
    lat = fields.get("Latitude")
    lon = fields.get("Longitude")
    address = fields.get("Full Address", "")
    city = fields.get("City", "")
    country = fields.get("Country", "")
    created_at = fields.get("Created at")

    name = fields.get("Name", "Unnamed")
    print(f"🗂️ Processing: {name} [{address}, {city}, {country}]")

    if (not lat or not lon) and address:
        # Monta endereço de busca flexível
        parts = [address, city, country]
        search_address = ", ".join(part for part in parts if part)
        lat, lon = geocode_address(search_address)
        time.sleep(1)

    if not lat or not lon:
        print(f"⏭️ Skipped '{name}' — missing coordinates even after geocoding.")
        continue

    place = {
        "name": name,
        "city": city,
        "neighborhood": fields.get("Neighborhood", ""),
        "address": address,
        "latitude": lat,
        "longitude": lon,
        "type": fields.get("Type", ""),
        "changing_table_location": fields.get("Changing Table Location", ""),
        "supplies_available": fields.get("Available Suppllies", []),
        "conditions": fields.get("Changing Table Condition", []),
        "room_for_stroller": fields.get("Room for a stroller", False),
        "site": fields.get("Site", ""),
        "created_at": created_at
    }
    places.append(place)

print(f"✅ Writing {len(places)} valid places to places.json...")
with open("places.json", "w", encoding="utf-8") as f:
    json.dump(places, f, ensure_ascii=False, indent=2)
print("🏁 Done.")
