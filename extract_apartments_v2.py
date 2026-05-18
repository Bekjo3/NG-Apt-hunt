import json
import csv
import os
import re
import urllib.request
import urllib.parse
from pathlib import Path
from typing import List, Dict, Any, Optional
from time import sleep

MAPS_API_KEY = os.getenv("MAPS_API_KEY", "")

def geocode_address(address: str):
    if not MAPS_API_KEY:
        return None, None
    
    try:
        url = "https://maps.googleapis.com/maps/api/geocode/json"
        params = urllib.parse.urlencode({
            "address": address,
            "key": MAPS_API_KEY
        })
        
        with urllib.request.urlopen(f"{url}?{params}", timeout=5) as response:
            data = json.loads(response.read())
            
            if data.get("results") and len(data["results"]) > 0:
                location = data["results"][0]["geometry"]["location"]
                return location.get("lat"), location.get("lng")
    except Exception as e:
        print(f"   geocoding error for '{address}': {e}")
    
    return None, None


def extract_apartments_from_html(html_content: str) -> List[Dict[str, Any]]:
    apartments = []
    
    li_pattern = r'<li class="mortar-wrapper">(.*?)</li>'
    li_matches = re.finditer(li_pattern, html_content, re.DOTALL)
    
    for match in li_matches:
        li_content = match.group(1)

        url_match = re.search(r'data-url="([^"]*)"', li_content)
        if not url_match:
            continue
        url = url_match.group(1)
        
        street_match = re.search(r'data-streetaddress="([^"]*)"', li_content)
        street_address = street_match.group(1) if street_match else ""
        
        name_match = re.search(r'<div class="property-title"[^>]*title="([^"]*)"', li_content)
        if name_match:
            full_title = name_match.group(1)  # e.g., "110 Roy Apartments, Seattle, WA"
            name = full_title.split(',')[0].strip()
        else:
            name = ""
        
        address_match = re.search(r'<div class="property-address[^>]*title="([^"]*)"', li_content)
        if address_match:
            full_address = address_match.group(1)  # eg. "110 Roy St, Seattle, WA 98109"
            parts = full_address.split(',')
            
            if len(parts) >= 3:
                street = parts[0].strip()
                city = parts[1].strip()
                state_zip = parts[2].strip().split()
                state = state_zip[0] if state_zip else "WA"
                postal_code = state_zip[1] if len(state_zip) > 1 else ""
            else:
                street = street_address
                city = ""
                state = "WA"
                postal_code = ""
        else:
            street = street_address
            city = ""
            state = "WA"
            postal_code = ""
        
        phone_match = re.search(r'phone-data="([^"]*)"', li_content)
        phone = phone_match.group(1) if phone_match else ""

        amenities_matches = re.findall(r'<span>([^<]*(?:Pets|Fitness|Pool|Gym|Parking|Balcony|Rooftop|Washer|Dryer)[^<]*)</span>', li_content)
        amenities = "; ".join(amenities_matches) if amenities_matches else ""
        
        apartment = {
            "name": name,
            "url": url,
            "phone": phone,
            "street_address": street,
            "city": city,
            "state": state,
            "postal_code": postal_code,
            "country": "US",
            "latitude": "",
            "longitude": "",
            "currency": "USD",
            "low_price": "",
            "high_price": "",
            "amenities": amenities,
            "image_url": ""
        }
        
        apartments.append(apartment)
    
    return apartments


def process_html_file(file_path: Path) -> List[Dict[str, Any]]:
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        apartments = extract_apartments_from_html(html_content)
        return apartments
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return []


def save_to_csv(apartments: List[Dict[str, Any]], output_path: Path):
    if not apartments:
        print("No apartments to save")
        return
    
    fieldnames = [
        "name", "url", "phone", "street_address", "city", "state", 
        "postal_code", "country", "latitude", "longitude", "currency",
        "low_price", "high_price", "amenities", "image_url"
    ]
    
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(apartments)
    
    print(f"Saved {len(apartments)} apartments to {output_path}")


def save_to_json(apartments: List[Dict[str, Any]], output_path: Path):
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(apartments, f, indent=2, ensure_ascii=False)
    
    print(f"Saved {len(apartments)} apartments to {output_path}")


def deduplicate_apartments(apartments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    seen = set()
    unique_apartments = []
    
    for apt in apartments:
        url = apt.get("url", "").strip()
        
        if url and url not in seen:
            seen.add(url)
            unique_apartments.append(apt)
    
    return unique_apartments


def geocode_apartments(apartments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    print("\ngeocoding addresses...")
    for i, apt in enumerate(apartments):
        address = f"{apt['street_address']}, {apt['city']}, {apt['state']}"
        print(f"  [{i+1}/{len(apartments)}] Geocoding: {address}")
        
        lat, lng = geocode_address(address)
        if lat and lng:
            apt["latitude"] = lat
            apt["longitude"] = lng
        
        if i < len(apartments) - 1:
            sleep(0.1)  # small delay to avoid API rate limits
    
    return apartments


def main():
    input_dir = Path("/Users/bereketgwol/Documents/Projects/NG-Apt-hunt/src/apt_lists")
    output_dir = Path("/Users/bereketgwol/Documents/Projects/NG-Apt-hunt/extracted_data")

    output_dir.mkdir(parents=True, exist_ok=True)
    html_files = sorted(input_dir.glob("page*.html"))
    
    if not html_files:
        print(f"No HTML files found in {input_dir}")
        return
    
    print(f"found {len(html_files)} HTML files\n")
    
    all_apartments = []
    
    for html_file in html_files:
        print(f"processing {html_file.name}...")
        apartments = process_html_file(html_file)
        print(f"  extracted {len(apartments)} apartments")
        all_apartments.extend(apartments)
    
    print(f"\ntotal apartments extracted: {len(all_apartments)}")
    
    print("\ndeduplicating apartments...")
    unique_apartments = deduplicate_apartments(all_apartments)
    print(f"Unique apartments after deduplication: {len(unique_apartments)}")

    if MAPS_API_KEY:
        unique_apartments = geocode_apartments(unique_apartments)
    else:
        print("\nWarning: MAPS_API_KEY not set. Skipping geocoding.")
        print("To add coordinates, set: export MAPS_API_KEY='your_key'")

    csv_output = output_dir / "apartments.csv"
    save_to_csv(unique_apartments, csv_output)
    
    json_output = output_dir / "apartments.json"
    save_to_json(unique_apartments, json_output)
    
    if unique_apartments:
        print("\n" + "="*60)
        print(f"Total apartments: {len(unique_apartments)}")
        
        with_coords = sum(1 for apt in unique_apartments if apt.get("latitude") and apt.get("longitude"))
        print(f"Apartments with coordinates: {with_coords}")
        
        with_phone = sum(1 for apt in unique_apartments if apt.get("phone"))
        print(f"Apartments with phone: {with_phone}")
        
        cities = sorted(set(apt.get("city", "") for apt in unique_apartments if apt.get("city")))
        print(f"Cities ({len(cities)}): {', '.join(cities)}")


if __name__ == "__main__":
    main()
