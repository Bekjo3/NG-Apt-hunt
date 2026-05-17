import type { Page } from "playwright";
import type { ApartmentListing } from "../types/index.js";
import { parseSingleListing, debugListingStructure } from "./parser.js";


export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function scrapePageListings(
  page: Page,
  debugMode: boolean = false
): Promise<ApartmentListing[]> {
  const listings: ApartmentListing[] = [];

  try {
    if (debugMode) {
      await debugListingStructure(page);
    }

    await page.waitForSelector("li.mortar-wrapper", {
      timeout: 10000,
    });

    const listingElements = await page.$$("li.mortar-wrapper"); // equivalent of document.querySelectorAll(): it finds all matching elements
    console.log(`found ${listingElements.length} listing elements on page`);


    for (let i = 0; i < listingElements.length; i++) {
      const element = listingElements[i];
      if (!element) continue;

      const listing = await parseSingleListing(element, page);

      if (listing) {
        listings.push(listing);
        console.log(
          `  [${listings.length}] ${listing.street_address.substring(0, 50)}... - ${listing.low_price}`
        );
      }

      await sleep(100);
    }

    console.log(`successfully scraped ${listings.length} listings from page`);
    return listings;
  } catch (error) {
    console.error("error scraping page listings:", error);
    return listings; 
  }
}


export async function scrapeMultiplePages(
  page: Page,
  pageUrls: string[],
  delayBetweenPages: number = 2000
): Promise<ApartmentListing[]> {
  const allListings: ApartmentListing[] = [];

  for (let i = 0; i < pageUrls.length; i++) {
    const url = pageUrls[i];
    if (!url) continue;

    console.log(`\n scraping page ${i + 1}/${pageUrls.length}`);
    console.log(`navigating to: ${url}`);

    try {
      await page.goto(url, { waitUntil: "networkidle" });
      await sleep(1000); 

      const pageListings = await scrapePageListings(page, i === 0); 
      allListings.push(...pageListings);

      if (i < pageUrls.length - 1) {
        console.log(`waiting ${delayBetweenPages}ms before next page...`);
        await sleep(delayBetweenPages);
      }
    } catch (error) {
      console.error(`error scraping page ${i + 1}:`, error);
      continue; // just get to the next page if one fails
    }
  }

  console.log(
    `\n total listings scraped across all pages: ${allListings.length}`
  );
  return allListings;
}
