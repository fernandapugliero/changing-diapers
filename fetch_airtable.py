import requests
import json
import os
import time
import concurrent.futures
from datetime import datetime

AIRTABLE_TOKEN = os.environ.get('AIRTABLE_PAT')
BASE_ID = "appjWF7WnC8DRWaXM"
TABLE_NAME = "Changing Diapers"
HEADERS = {
    "Authorization": f"Bearer {patqKFEGtq3QyDYVL}"
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
            print(f"[✓] Geocoded: {address} -> {data[0]['lat']}, {data[0]['lon']}")
            return float(data[0]["lat"]), float(data[0]["lon"])
        else:
            print(f"[!] No result for address: {address}")
    except Exception as e:
        print(f"[!] Error geocoding address '{address}':", e)
    return None, None

# Função para processar cada local
def process_place(record):
    fields = record.get("fields", {})
    lat = fields.get("Latitude")
    lon = fields.get("Longitude")
    address = fields.get("Full Address", "")
    city = fields.get("City", "")
    created_at = fields.get("Created at")

    print(f"    - Processing: {fields.get('Name', 'Unnamed')} at {address}, {city}")

    if (not lat or not lon) and address:
        search_address = f"{address}, {city}, Germany"
        lat, lon = geocode_address(search_address)

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
        "created_at": created_at
    }

    return place

# Função para buscar locais da API do Airtable
def fetch_airtable_data():
    url = f"https://api.airtable.com/v0/{appjWF7WnC8DRWaXM}/{Changing Diapers}"
    params = {"pageSize": 100}
    places = []

    print("[...] Requesting data from Airtable...")
    res = requests.get(url, headers=HEADERS, params=params)
    data = res.json()
    records = data.get("records", [])
    print(f"[✓] Received {len(records)} records from Airtable.")
    
    # Verificando se a resposta está vindo corretamente
    if not records:
        print("[!] No records found.")
        return []

    # Usando execução paralela para processar múltiplos registros ao mesmo tempo
    with concurrent.futures.ThreadPoolExecutor() as executor:
        places = list(executor.map(process_place, records))

    return places

# Chamada para buscar dados e salvar no arquivo
places = fetch_airtable_data()

if places:
    print(f"[✓] Writing {len(places)} places to places.json...")
    with open("places.json", "w", encoding="utf-8") as f:
        json.dump(places, f, ensure_ascii=False, indent=2)
    print("[✓] Done.")
else:
    print("[!] No places to write.")
