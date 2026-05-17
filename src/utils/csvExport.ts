import { createObjectCsvWriter } from "csv-writer";
import fs from "fs";
import path from "path";
import type { ApartmentListing } from "../types/index.js";

function extractWalkTimeMinutes(comment: string | null): number {
  if (!comment) return Infinity;
  const match = comment.match(/Takes ([\d.]+) mins/);
  if (match && match[1]) {
    return parseFloat(match[1]);
  }
  return Infinity;
}

export async function exportToCSV(
  listings: ApartmentListing[],
  outputPath: string
): Promise<void> {
  const sortedListings = [...listings].sort((a, b) => {
    return extractWalkTimeMinutes(a.nearestShuttleComment) - extractWalkTimeMinutes(b.nearestShuttleComment);
  });

  const csvWriter = createObjectCsvWriter({
    path: outputPath,
    header: [
      { id: "name", title: "name" },
      { id: "url", title: "url" },
      { id: "phone", title: "phone" },
      { id: "street_address", title: "street_address" },
      { id: "city", title: "city" },
      { id: "state", title: "state" },
      { id: "postal_code", title: "postal_code" },
      { id: "country", title: "country" },
      { id: "latitude", title: "latitude" },
      { id: "longitude", title: "longitude" },
      { id: "currency", title: "currency" },
      { id: "low_price", title: "low_price" },
      { id: "high_price", title: "high_price" },
      { id: "amenities", title: "amenities" },
      { id: "image_url", title: "image_url" },
      { id: "nearestShuttleComment", title: "nearestShuttleComment" },
      { id: "nearestTransitComment", title: "nearestTransitComment" },
    ],
  });

  await csvWriter.writeRecords(sortedListings);

  console.log(`  CSV exported to ${outputPath}`);
  console.log(`  Total records: ${sortedListings.length}\n`);
}

export async function exportToJSON(
  listings: ApartmentListing[],
  outputPath: string
): Promise<void> {
  const sortedListings = [...listings].sort((a, b) => {
    return extractWalkTimeMinutes(a.nearestShuttleComment) - extractWalkTimeMinutes(b.nearestShuttleComment);
  });

  fs.writeFileSync(outputPath, JSON.stringify(sortedListings, null, 2), "utf-8");

  console.log(`  JSON exported to ${outputPath}`);
  console.log(`  Total records: ${sortedListings.length}\n`);
}

export async function exportEnrichedData(listings: ApartmentListing[]): Promise<void> {
  const outputDir = path.join(process.cwd(), "extracted_data");

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const csvPath = path.join(outputDir, "apartments_with_transit.csv");
  const jsonPath = path.join(outputDir, "apartments_with_transit.json");

  console.log("Exporting enriched apartment data...\n");

  await exportToCSV(listings, csvPath);
  await exportToJSON(listings, jsonPath);

  console.log(" All exports complete!!!");
}
