import fs from "fs";
import path from "path";
import {
  batchQueryShuttleStops,
  findNearestShuttle,
  formatShuttleComment,
} from "./api/batchRoutes.js";
import { MICROSOFT_SHUTTLE_STOPS } from "./utils/shuttleData.js";
import { exportEnrichedData } from "./utils/csvExport.js";
import { formatFullAddress, parseOptionalCoord } from "./utils/address.js";
import type { ApartmentListing } from "./types/index.js";
import dotenv from "dotenv";

dotenv.config();

async function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface RawApartmentData {
  name: string;
  url: string;
  phone: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude: number | string;
  longitude: number | string;
  currency: string;
  low_price: number | string | null;
  high_price: number | string | null;
  amenities: string;
  image_url: string;
}

function toListing(
  apt: RawApartmentData,
  shuttleComment: string
): ApartmentListing {
  return {
    name: apt.name,
    url: apt.url,
    phone: apt.phone,
    street_address: apt.street_address,
    city: apt.city,
    state: apt.state,
    postal_code: apt.postal_code,
    country: apt.country,
    latitude: parseOptionalCoord(apt.latitude),
    longitude: parseOptionalCoord(apt.longitude),
    currency: apt.currency,
    low_price:
      apt.low_price === "" || apt.low_price === null
        ? null
        : Number(apt.low_price),
    high_price:
      apt.high_price === "" || apt.high_price === null
        ? null
        : Number(apt.high_price),
    amenities: apt.amenities,
    image_url: apt.image_url,
    nearestShuttleComment: shuttleComment,
    nearestTransitComment: null,
  };
}

async function processApartmentsWithShuttle(): Promise<ApartmentListing[]> {
  const apiKey = process.env.MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("MAPS_API_KEY not found in .env file");
  }

  console.log("loading extracted apartment data...\n");

  const apartmentsJsonPath = path.join(
    process.cwd(),
    "extracted_data/apartments.json"
  );
  const rawData: RawApartmentData[] = JSON.parse(
    fs.readFileSync(apartmentsJsonPath, "utf-8")
  );

  console.log(`Loaded ${rawData.length} apartments from extracted data`);
  console.log("Using text addresses for Routes API (no geocoding step)\n");

  const enrichedListings: ApartmentListing[] = [];
  const apiDelayMs = 600;

  for (let i = 0; i < rawData.length; i++) {
    const apt = rawData[i];

    if (!apt) {
      console.warn(`[${i + 1}/${rawData.length}] apt data missing, skipping...\n`);
      continue;
    }

    const address = formatFullAddress(apt);

    console.log(`[${i + 1}/${rawData.length}] Processing: ${apt.name}`);
    console.log(`  address: ${address}`);

    try {
      const batchResults = await batchQueryShuttleStops(
        address,
        MICROSOFT_SHUTTLE_STOPS,
        apiKey,
        apiDelayMs
      );

      const nearestResult = findNearestShuttle(batchResults);
      const shuttleComment = formatShuttleComment(nearestResult);

      console.log(`  Result: ${shuttleComment}\n`);

      enrichedListings.push(toListing(apt, shuttleComment));
    } catch (error) {
      console.error(`  Error processing apartment: ${error}\n`);

      enrichedListings.push(
        toListing(
          apt,
          "Unable to calculate transit time to shuttle stops (Unexpected error)"
        )
      );
    }

    if (i < rawData.length - 1) {
      await delay(apiDelayMs);
    }
  }

  return enrichedListings;
}

async function main(): Promise<void> {
  try {
    const enrichedListings = await processApartmentsWithShuttle();

    console.log(`\n successfully processed ${enrichedListings.length} apartments`);
    console.log("\n now sorting by closest shuttle stop...");

    await exportEnrichedData(enrichedListings);

    console.log("\n Pipeline complete! Check /extracted_data/ for output files.");
  } catch (error) {
    console.error("\nfatal error during processing:", error);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("fatal error:", error);
  process.exit(1);
});
