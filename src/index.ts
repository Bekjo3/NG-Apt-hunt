/**
 * Main entry point for the Apartment Scraper ETL Pipeline
 * Demonstrates how to use all the modules together
 */

import { browserManager } from "./scraper/browser.js";
import { generatePageUrls } from "./scraper/pagination.js";
import { scrapeMultiplePages } from "./scraper/scraper.js";
import { MICROSOFT_SHUTTLE_STOPS } from "./utils/shuttleData.js";

async function main(): Promise<void> {
  console.log("starting Seattle Apartment Scraper ETL Pipeline\n");

  let browser;
  try {
    browser = await browserManager.launch();
    const page = await browserManager.createPage();
    const pageUrls = generatePageUrls(1, 1); 
    const listings = await scrapeMultiplePages(page, pageUrls, 2000);
    console.log(`total listings found: ${listings.length}`);

    if (listings.length > 0) {
      console.log("\n first 3 listings:");
      listings.slice(0, 3).forEach((listing, idx) => {
        console.log(`\n   [${idx + 1}] ${listing.address}`);
        console.log(`       price: ${listing.price}`);
        console.log(`       beds/baths: ${listing.bedrooms}bd/${listing.bathrooms}ba`);
        console.log(`       URL: ${listing.url}`);
      });
    }

    console.log("\n MSFT Shuttle Stops:");
    MICROSOFT_SHUTTLE_STOPS.forEach((stop, idx) => {
      console.log(`   [${idx + 1}] ${stop.address}`);
      console.log(`   Coords: ${stop.latitude}, ${stop.longitude}`);
    });

    console.log(
      "\n Done with scraping!!!\n"
    );

    await page.close();
  } catch (error) {
    console.error("\n error during scraping:", error);
    process.exit(1);
  } finally {
    if (browser) {
      await browserManager.close();
    }
  }
}

// Run the main function
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
