import requests
import json
import os
import time

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
            return float(data[0]["lat"]), float(data[0]["lon"])
    except Exception as e:
        print(f"Error geocoding address '{address}':", e)
    return None, None

url = f"https://api.airtable.com/v0/{BASE_ID}/{TABLE_NAME}"
params = {"pageSize": 100}
places = []

while url:
    res = requests.get(url, headers=HEADERS, params=params)
    data = res.json()
    for record in data.get("records", []):
        fields = record.get("fields", {})
        lat = fields.get("Latitude")
        lon = fields.get("Longitude")
        address = fields.get("Full Address", "")
        if (not lat or not lon) and address:
            lat, lon = geocode_address(address)
            time.sleep(1)  # respeitar limite da API gratuita

        place = {
            "name": fields.get("Name", ""),
            "city": fields.get("City", ""),
            "neighborhood": fields.get("Neighborhood", ""),
            "address": address,
            "latitude": lat or 0.0,
            "longitude": lon or 0.0,
            "type": fields.get("Type", ""),
            "changing_table_location": fields.get("Changing Table Location", ""),
            "supplies_available": fields.get("Supplies Available", []),
            "conditions": fields.get("Changing Table Condition", []),
            "room_for_stroller": fields.get("Room for a stroller", False),
            "site": fields.get("Site", "")
        }
        places.append(place)
    url = data.get("offset")
    if url:
        url = f"https://api.airtable.com/v0/{BASE_ID}/{TABLE_NAME}?offset={url}"

with open("places.json", "w", encoding="utf-8") as f:
    json.dump(places, f, ensure_ascii=False, indent=2)
