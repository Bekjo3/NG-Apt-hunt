import json
import csv
import os
import re
import requests
from pathlib import Path
from typing import List, Dict, Any, Optional
from time import sleep

GEOCODING_API_KEY = os.getenv("MAPS_API_KEY", "")

def geocode_address(address: str) -> tuple[Optional[float], Optional[float]]:
    if not GEOCODING_API_KEY:
        return None, None
    
    try:
        url = "https://maps.googleapis.com/maps/api/geocode/json"
        params = {
            "address": address,
            "key": GEOCODING_API_KEY
        }
        response = requests.get(url, params=params, timeout=5)
        data = response.json()
        
        if data.get("results") and len(data["results"]) > 0:
            location = data["results"][0]["geometry"]["location"]
            return location.get("lat"), location.get("lng")
    except Exception as e:
        print(f"  Geocoding error for '{address}': {e}")
    
    return None, None

def extract_json_ld_data(html_content: str) -> List[Dict[str, Any]]:
    json_ld_data = []
    
    pattern = r'<script type="application/ld\+json">(.*?)</script>'
    matches = re.findall(pattern, html_content, re.DOTALL)
    
    for match in matches:
        try:
            data = json.loads(match)
            json_ld_data.append(data)
        except json.JSONDecodeError as e:
            print(f"Warning: Could not parse JSON-LD data: {e}")
            continue
    
    return json_ld_data


def extract_apartments_from_html_elements(html_content: str) -> List[Dict[str, Any]]:
    apartments = []
    
    li_pattern = r'<li class="mortar-wrapper">\s*<article[^>]*data-listingid="([^"]*)"[^>]*data-url="([^"]*)"[^>]*data-streetaddress="([^"]*)"'
    li_matches = re.finditer(li_pattern, html_content, re.DOTALL)
    
    for match in li_matches:
        listing_id, url, street_address = match.groups()
        
        search_start = match.end()
        search_text = html_content[search_start:search_start+2000]  # Get next 2000 chars
        
        name_match = re.search(r'<div class="property-title"[^>]*title="([^"]*)"', search_text)
        if name_match:
            full_title = name_match.group(1)  # e.g., "110 Roy Apartments, Seattle, WA"
            
            name = full_title.split(',')[0].strip()
        else:
            name = ""
        
        address_match = re.search(r'<div class="property-address[^>]*title="([^"]*)"', search_text)
        if address_match:
            full_address = address_match.group(1)  # e.g., "110 Roy St, Seattle, WA 98109"
            parts = full_address.split(',')
            
            # Parse the address components
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
        
        apartment = {
            "name": name,
            "url": url,
            "phone": "",  
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
            "amenities": "",  
            "image_url": ""  
        }
        
        apartments.append(apartment)
    
    return apartments


def extract_apartments_from_schema(json_ld_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """DEPRECATED: This extracts from JSON-LD which has same 40 apartments on all pages.
    so i am using the  extract_apartments_from_html_elements instead for actual page apartments."""
    
    apartments = []
    
    for schema_obj in json_ld_data:
        # handle @graph structure (multiple objects in one schema)
        items_to_process = []
        
        if isinstance(schema_obj, dict):
            if "@graph" in schema_obj:
                items_to_process = schema_obj["@graph"]
            else:
                items_to_process = [schema_obj]
        elif isinstance(schema_obj, list):
            items_to_process = schema_obj
        
        for item in items_to_process if isinstance(items_to_process, list) else [items_to_process]:
            if not isinstance(item, dict):
                continue
                
            # check if item is a CollectionPage with itemListElement
            if item.get("@type") == "CollectionPage" and "mainEntity" in item:
                main_entity = item["mainEntity"]
                if isinstance(main_entity, dict) and "itemListElement" in main_entity:
                    for list_item in main_entity["itemListElement"]:
                        if isinstance(list_item, dict) and "item" in list_item:
                            apt_data = extract_apartment_info(list_item["item"])
                            if apt_data:
                                apartments.append(apt_data)
    
    return apartments


def extract_apartment_info(item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    # check if this is an apartment complex
    main_entity = item.get("mainEntity", {})
    if isinstance(main_entity, dict) and main_entity.get("@type") != "ApartmentComplex":
        return None
    
    if not isinstance(main_entity, dict) or "@type" not in main_entity:
        return None
    
    apartment = {}
    
    # basic information
    apartment["name"] = main_entity.get("name", "")
    apartment["url"] = item.get("url", "")
    apartment["phone"] = item.get("telephone", "") or main_entity.get("telephone", "")
    
    # address information
    address = main_entity.get("address", {})
    if isinstance(address, dict):
        apartment["street_address"] = address.get("streetAddress", "")
        apartment["city"] = address.get("addressLocality", "")
        apartment["state"] = address.get("addressRegion", "")
        apartment["postal_code"] = address.get("postalCode", "")
        apartment["country"] = address.get("addressCountry", "")
    
    # geo coordinates
    geo = main_entity.get("geo", {})
    if isinstance(geo, dict):
        apartment["latitude"] = geo.get("latitude", "")
        apartment["longitude"] = geo.get("longitude", "")
    
    # amenities
    amenities = []
    amenity_features = main_entity.get("amenityFeature", [])
    if isinstance(amenity_features, list):
        for feature in amenity_features:
            if isinstance(feature, dict) and feature.get("value") == "true":
                amenities.append(feature.get("name", ""))
    apartment["amenities"] = "; ".join(amenities) if amenities else ""

    # pricing information
    # tries to get offers from main_entity first, then from item
    offers = main_entity.get("offers", {}) or item.get("offers", {})
    apartment["currency"] = ""
    apartment["low_price"] = ""
    apartment["high_price"] = ""
    
    if isinstance(offers, dict):
        apartment["currency"] = offers.get("priceCurrency", "USD")
        
        # handle both AggregateOffer (with lowPrice/highPrice) and Offer (with price)
        if "lowPrice" in offers:
            apartment["low_price"] = offers.get("lowPrice", "")
            apartment["high_price"] = offers.get("highPrice", "")
        elif "price" in offers:
            price = offers.get("price", "")
            apartment["low_price"] = price
            apartment["high_price"] = price
        #  this is because some apts only list one price
    
    apartment["image_url"] = item.get("image", "") or main_entity.get("image", "")
    
    return apartment


def process_html_file(file_path: Path) -> List[Dict[str, Any]]:
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # Extract from HTML elements (actual page apartments) instead of JSON-LD
        apartments = extract_apartments_from_html_elements(html_content)
        
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
        # Use URL as unique key (most reliable identifier)
        url = apt.get("url", "").strip()
        
        if url and url not in seen:
            seen.add(url)
            unique_apartments.append(apt)
    
    return unique_apartments


def main():
    # paths
    input_dir = Path("/Users/bereketgwol/Documents/Projects/NG-Apt-hunt/src/apt_lists")
    output_dir = Path("/Users/bereketgwol/Documents/Projects/NG-Apt-hunt/extracted_data")

    output_dir.mkdir(parents=True, exist_ok=True)
    html_files = sorted(input_dir.glob("page*.html"))
    
    if not html_files:
        print(f"No HTML files found in {input_dir}")
        return
    
    print(f"found {len(html_files)} HTML files")
    
    all_apartments = []
    
    for html_file in html_files:
        print(f"\nProcessing {html_file.name}...")
        apartments = process_html_file(html_file)
        print(f"  Extracted {len(apartments)} apartments")
        all_apartments.extend(apartments)
    
    print(f"Total apartments extracted: {len(all_apartments)}")
    
    # deduplicate
    print("\nDeduplicating apartments...")
    unique_apartments = deduplicate_apartments(all_apartments)
    print(f"Unique apartments after deduplication: {len(unique_apartments)}")

    csv_output = output_dir / "apartments.csv"
    save_to_csv(unique_apartments, csv_output)
    
    # save to JSON
    json_output = output_dir / "apartments.json"
    save_to_json(unique_apartments, json_output)
    
    # print summary statistics
    if unique_apartments:
        print("\n")
        print(f"Total apartments: {len(unique_apartments)}")
        
        # count apartments with coordinates
        with_coords = sum(1 for apt in unique_apartments if apt.get("latitude") and apt.get("longitude"))
        print(f"Apartments with coordinates: {with_coords}")
        
        # count apartments with prices
        with_prices = sum(1 for apt in unique_apartments if apt.get("low_price") or apt.get("high_price"))
        print(f"Apartments with pricing: {with_prices}")

        cities = set()
        for apt in unique_apartments:
            if apt.get("city"):
                cities.add(apt["city"])
        print(f"Cities: {', '.join(sorted(cities))}")


if __name__ == "__main__":
    main()
