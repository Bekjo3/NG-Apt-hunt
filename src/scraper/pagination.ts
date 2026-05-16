import type { Page } from "playwright";
import { getSeattleApartmentsUrl } from "./urlBuilder.js";
import { sleep } from "./scraper.js";


export function generatePageUrls(startPage: number = 1, numPages: number = 1): string[] {
  const urls: string[] = [];
  for (let i = startPage; i < startPage + numPages; i++) {
    urls.push(getSeattleApartmentsUrl(i));
  }
  return urls;
}

/**
  apartments.com uses: <a class="next" aria-label="Next Page" data-page="2">
 */
export async function hasNextPage(page: Page): Promise<boolean> {
  try {
    // primary selector: apartments.com uses a.next with aria-label
    const nextButton = await page.$('a.next[aria-label*="Next"]');

    if (nextButton) {
      const isEnabled = await nextButton.evaluate((el) => {
        const isDisabled =
          el.hasAttribute("disabled") ||
          el.getAttribute("aria-disabled") === "true" ||
          el.className.includes("disabled");
        return !isDisabled;
      });

      if (isEnabled) {
        console.log("found next page button and it is enabled");
        return true;
      }
    }

    console.log("no enabled next page button found");
    return false;
  } catch (error) {
    console.error("error checking for next page:", error);
    return false;
  }
}


export async function clickNextPage(page: Page): Promise<boolean> {
  try {
    // Primary selector: apartments.com uses a.next
    const nextButton = await page.$('a.next[aria-label*="Next"]');

    if (nextButton) {
      const isEnabled = await nextButton.evaluate((el) => {
        const isDisabled =
          el.hasAttribute("disabled") ||
          el.getAttribute("aria-disabled") === "true" ||
          el.className.includes("disabled");
        return !isDisabled;
      });

      if (isEnabled) {
        console.log("⏭ Clicking next page button...");
        await nextButton.click();
        await page.waitForLoadState("networkidle");
        await sleep(1000); // Wait for content to render
        return true;
      }
    }

    return false;
  } catch (error) {
    console.error("error clicking next page:", error);
    return false;
  }
}


export async function getPagesToScrape(
  page: Page,
  maxPages: number = 0
): Promise<number[]> {
  const pagesToScrape: number[] = [1];
  let currentPage = 1;

  while (maxPages === 0 || currentPage < maxPages) {
    const hasNext = await hasNextPage(page);
    if (!hasNext) {
      console.log("yay we reached the last page");
      break;
    }

    currentPage++;
    pagesToScrape.push(currentPage);

    const clicked = await clickNextPage(page);
    if (!clicked) {
      console.log("could not click next page");
      break;
    }
  }

  return pagesToScrape;
}

