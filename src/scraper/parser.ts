import type { Page, ElementHandle } from "playwright";
import type { ApartmentListing } from "../types/index.js";

/*
  parse a single apartment listing from apartments.com

  HTML structure from apartments.com:
  <li class="mortar-wrapper">
    <article class="placard" data-url="..." data-streetaddress="...">
      <header class="placard-header">
        <div class="property-address">Address text</div>
      </header>
      <section class="placard-content">
        <div class="bedTextBox">2 Beds</div>
        <div class="priceTextBox"><span>$5,449+</span></div>
      </section>
    </article>
  </li>
 */
export async function parseSingleListing(
  listingElement: ElementHandle,
  page: Page
): Promise<ApartmentListing | null> {
  try {
    // extract URL from data-url attribute on the article element
    const article = await listingElement.$("article");
    if (!article) {
      console.warn("no article element found in listing, skipping");
      return null;
    }

    const url = await article.getAttribute("data-url");
    if (!url) {
      console.warn("no data-url attribute found in listing, skipping");
      return null;
    }

    let address = await article.getAttribute("data-streetaddress");
    if (!address) {
      address = await article.evaluate((el) => {
        const addressDiv = el.querySelector(".property-address");
        return addressDiv?.textContent?.trim() || null;
      });
    }

    if (!address) {
      console.warn("no address found in listing, skipping");
      return null;
    }

    const priceText = await article.evaluate((el) => {
      const priceSpan = el.querySelector(".priceTextBox span");
      return priceSpan?.textContent?.trim() || null;
    });

    if (!priceText) {
      console.warn("no price found in listing, skipping");
      return null;
    }

    const bedTextBox = await article.evaluate((el) => {
      const bedBox = el.querySelector(".bedTextBox");
      return bedBox?.textContent?.trim() || null;
    });

    let bedrooms = 0;
    if (bedTextBox) {
      const bedMatch = bedTextBox.match(/(\d+)\s*(?:bed)/i);
      bedrooms = bedMatch ? parseInt(bedMatch[1], 10) : 0;
    }

    // trying to extract bathroom but i'm not really sure
    // this might be in a separate element or in an amenities/details section... will look into it later or just manually check the list
    const bathText = await article.evaluate((el) => {
      // Look for bath info in various places
      const bathElements = el.querySelectorAll("*");
      for (const elem of Array.from(bathElements)) {
        const text = (elem as any).textContent || "";
        if (text.match(/\d+\s*(?:bath)/i) && text.length < 50) {
          return text.trim();
        }
      }
      return null;
    });

    let bathrooms = 2;
    if (bathText) {
      const bathMatch = bathText.match(/(\d+)\s*(?:bath)/i);
      bathrooms = bathMatch ? parseInt(bathMatch[1], 10) : 0;
    }

    // if it couldn't extract bathroom info, just setting it to 2 so we dont skip the listing

    if (bedrooms < 2 || bathrooms < 1) {
      console.warn(
        `NOT FOR US!!!! the listing has ${bedrooms}bd/${bathrooms}ba (need 2bd/1ba+), skipping`
      );
      return null;
    }


    const listing: ApartmentListing = {
      url,
      price: priceText,
      bedrooms,
      bathrooms,
      address,
      nearestShuttleComment: null,
      nearestTransitComment: null,
    };

    return listing;
  } catch (error) {
    console.error(" Error parsing single listing:", error);
    return null;
  }
}


export async function debugListingStructure(page: Page): Promise<void> {
  const firstListing = await page.$("li.mortar-wrapper article");
  if (firstListing) {
    const html = await firstListing.evaluate((el) => el.outerHTML);
    console.log("First listing HTML (first 1000 chars):\n", html.substring(0, 1000));
  }
}
