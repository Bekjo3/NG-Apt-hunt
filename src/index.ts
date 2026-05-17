import fs from "fs";
import path from "path";
import { chromium } from "playwright";
import { scrapePageListings } from "./scraper/scraper.js";
import { MICROSOFT_SHUTTLE_STOPS } from "./utils/shuttleData.js";

async function main(): Promise<void> {
  console.log("starting Seattle Apartment Scraper ETL Pipeline\n");

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage(); // equivalent to brand new tab

    // get list of downloaded HTML pages
    const pagesDir = path.join(process.cwd(), "src/apt_lists");
    const pageFiles = fs
      .readdirSync(pagesDir)
      .filter((f) => f.startsWith("page") && f.endsWith(".html"))
      .sort((a, b) => { // because js sorts arrays alphabetically. and this is bad because "page10.html" would be sorted before "page2.html" (since 1 comes before 2).
        const aNum = parseInt(a.match(/\d+/)![0]); // extracting the "10" out of the sttring and converts it to int
        const bNum = parseInt(b.match(/\d+/)![0]); // 
        return aNum - bNum; // if res in -ve then a is smaller else b is smaller
        // similar to python it's O(Nlogn)
      });

    console.log(`found ${pageFiles.length} downloaded pages\n`);

    let totalListings = 0;

    for (const pageFile of pageFiles) {
      const filePath = path.join(pagesDir, pageFile);  // "/Users/bereketgwol/Documents/Projects/NG-Apt-hunt/src/apt_lists/page1.html"
      const fileUrl = `file://${filePath}`; 

      console.log(`Processing: ${pageFile}`);
      
      try {
        await page.goto(fileUrl);
        const listings = await scrapePageListings(page, false);
        console.log(` found ${listings.length} listings\n`);
        totalListings += listings.length;

        if (listings.length > 0) {
          const listing = listings[0];
          if (listing) {
            console.log(`  sample ${listing.address} - ${listing.price}`);
            console.log(`           ${listing.bedrooms}bd/${listing.bathrooms}ba\n`);
          }
        }
      } catch (error) {
        console.error(`  error processing ${pageFile}: ${error}\n`);
      }
    }

    console.log(`total listings found: ${totalListings}`);
    console.log("Done with scraping!!!\n");

    await page.close();
  } catch (error) {
    console.error("\nerror during scraping:", error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the main function
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
