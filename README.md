# NG-Apt-hunt

I built this project to filter apartments in Seattle based on proximity to Microsoft shuttle stops, along with a few other constraints like price, commute time, and number of bedrooms.

The main hassle was checking the distance from every apartment I liked to the possible shuttle stops. There are 19+ stops in the city, but they are bundled together in groups of 4 or 5. Because of this, the first optimization I did was to only check the distance to one representative stop to eliminate a full bundle. Even with that heuristic, I still had to check the distance to 5 different locations for every single apartment.

This project automates that process!!!

It loops through a list of apartments, extracts some data points for each, and calculates the actual commute distance using Google's Routes API. Finally, it ranks the apartments based on their distance (in minutes) to the closest stop, which lets me review the best options efficiently instead of manually browsing Apartments.com.

Look into the extracted_data folder to check the list out:
- `apartments.csv` and `apartments.json` are the lists that only have the key data points for the apartments, excluding transit distance.
- `apartments_with_transit.csv` and `apartments_with_transit.json` have a few features missing from the previous tables, but the main addition is that they include the shuttle distance.