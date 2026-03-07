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

def to_list(v):
    if v is None:
        return []
    return v if isinstance(v, list) else [v]

def stars_from_score10(score):
    if score is None:
        return None
    try:
        s = float(score) / 2.0
    except:
        return None
    s = max(0.0, min(5.0, s))
    return round(s * 2) / 2

places_all = []
places_berlin = []

url = f"https://api.airtable.com/v0/{BASE_ID}/{TABLE_NAME}"
params = {"pageSize": 100}

print("[...] Starting Airtable fetch...")

while True:

    res = requests.get(url, headers=HEADERS, params=params)
    data = res.json()

    records = data.get("records", [])

    for record in records:

        fields = record.get("fields", {})

        overall_score = fields.get("Overall user experience")

        if overall_score is not None:
            try:
                overall_score = float(overall_score)
            except:
                overall_score = None

        photo_field = fields.get("Photo")

        photo_small = None
        photo_large = None
        photo_url = None

        if isinstance(photo_field, list) and len(photo_field) > 0:

            first = photo_field[0]
            thumbs = first.get("thumbnails", {})

            if thumbs.get("small"):
                photo_small = thumbs["small"]["url"]

            if thumbs.get("large"):
                photo_large = thumbs["large"]["url"]

            photo_url = first.get("url")

        place = {

            "id": record.get("id"),
            "name": fields.get("Name", ""),
            "city": fields.get("City", ""),
            "neighborhood": fields.get("Neighborhood (Berlin)", ""),
            "address": fields.get("Full Address", ""),
            "latitude": fields.get("Latitude"),
            "longitude": fields.get("Longitude"),
            "type": fields.get("Type", ""),

            "changing_table_location": to_list(fields.get("Changing Table Location")),
            "supplies_available": to_list(fields.get("Available Supplies")),
            "changing_table_condition": to_list(fields.get("Changing Table Condition")),

            "room_for_stroller": fields.get("Room for a stroller", False),

            "site": fields.get("Site", ""),
            "created_at": fields.get("Created at"),

            "photo_small_url": photo_small,
            "photo_large_url": photo_large,
            "photo_url": photo_url,

            "review": fields.get("Changing Table Review", ""),

            "overall_user_experience": overall_score,
            "stars": stars_from_score10(overall_score)

        }

        places_all.append(place)

        if place["city"].lower() == "berlin":
            places_berlin.append(place)

    if 'offset' in data:
        params['offset'] = data['offset']
    else:
        break

with open("places.json", "w", encoding="utf-8") as f:
    json.dump(places_all, f, ensure_ascii=False, indent=2)

with open("places-berlin.json", "w", encoding="utf-8") as f:
    json.dump(places_berlin, f, ensure_ascii=False, indent=2)

print("[✓] JSON updated")
