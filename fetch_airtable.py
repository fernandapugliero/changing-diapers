import requests
import json
import os

AIRTABLE_TOKEN = os.environ.get('AIRTABLE_PAT')
BASE_ID = "appjWF7WnC8DRWaXM"
TABLE_NAME = "Changing Diapers"
HEADERS = {
    "Authorization": f"Bearer {AIRTABLE_TOKEN}"
}

url = f"https://api.airtable.com/v0/{BASE_ID}/{TABLE_NAME}"
params = {"pageSize": 100}

places = []

while url:
    res = requests.get(url, headers=HEADERS, params=params)
    data = res.json()
    for record in data.get("records", []):
        fields = record.get("fields", {})
        place = {
            "name": fields.get("Name", ""),
            "city": fields.get("City", ""),
            "neighborhood": fields.get("Neighborhood", ""),
            "address": fields.get("Full Address", ""),
            "latitude": fields.get("Latitude", 0.0),
            "longitude": fields.get("Longitude", 0.0),
            "type": fields.get("Type", ""),
            "changing_table_location": fields.get("Changing Table Location", ""),
            "supplies_available": fields.get("Supplies Available", []),
            "conditions": fields.get("Changing Table Condition", []),
            "room_for_stroller": fields.get("Room for a stroller", False)
        }
        places.append(place)
    url = data.get("offset")
    if url:
        url = f"https://api.airtable.com/v0/{BASE_ID}/{TABLE_NAME}?offset={url}"

with open("places.json", "w", encoding="utf-8") as f:
    json.dump(places, f, ensure_ascii=False, indent=2)