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

places = []
url = f"https://api.airtable.com/v0/{BASE_ID}/{TABLE_NAME}"
params = {"pageSize": 100}

print("[...] Starting Airtable fetch...")

# === Paginação dos resultados ===
while True:
    res = requests.get(url, headers=HEADERS, params=params)
    data = res.json()
    records = data.get("records", [])
    print(f"[✓] Received {len(records)} records.")

    for record in records:
        fields = record.get("fields", {})
        print(f"[🔍] Processing: {fields.get('Name', 'Unnamed')}")

        lat = fields.get("Latitude")
        lon = fields.get("Longitude")
        address = fields.get("Full Address", "")
        city = fields.get("City", "")
        country = fields.get("Country", "")
        created_at = fields.get("Created at")

        # 🌍 Geocodificação caso não tenha lat/lon
        if (not lat or not lon) and address:
            parts = [address, city, country]
            search_address = ", ".join(part for part in parts if part)
            lat, lon = geocode_address(search_address)
            time.sleep(1)  # evita bloqueio da API

            if not lat or not lon:
                print(f"[!] Could not geocode: {search_address}")

        # ⭐️ Novo: pegar o campo "Overall user experience"
        overall_score = fields.get("Overall user experience")
        if overall_score is not None:
            try:
                overall_score = float(overall_score)
            except ValueError:
                print(f"[⚠️] Invalid score for {fields.get('Name')}: {overall_score}")
                overall_score = None

        # === Criar dicionário do local ===
        place = {
            "name": fields.get("Name", ""),
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
            "created_at": created_at,
            "overall_user_experience": overall_score  # ✅ novo campo
        }

        places.append(place)

    # === Paginação ===
    if 'offset' in data:
        params['offset'] = data['offset']
        print("[⏭️] More pages to fetch...")
    else:
        break

print(f"[✅] Total places collected: {len(places)}")

# === Exportar para JSON ===
with open("places.json", "w", encoding="utf-8") as f:
    json.dump(places, f, ensure_ascii=False, indent=2)

print("[🎉] places.json updated successfully with overall_user_experience!")
