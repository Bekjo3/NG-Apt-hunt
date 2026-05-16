import { chromium } from "playwright";
import type { Browser, Page } from "playwright";

export class BrowserManager {
  private browser: Browser | null = null;

  /*
   launch a headless Chromium browser instance.
   */
  async launch(): Promise<Browser> {
    try {
      this.browser = await chromium.launch({
        headless: true,
      });
      console.log(" yay browser launched successfully");
      return this.browser;
    } catch (error) {
      console.error(" hmmm... failed to launch browser:", error);
      throw error;
    }
  }

  /*
   create a new page context
   */
  async createPage(): Promise<Page> {
    if (!this.browser) {
      throw new Error("browser not launched!!! go and call launch() rq.");
    }
    const page = await this.browser.newPage();
    page.setDefaultTimeout(30000); // 30 seconds is kinda a lot but lets see
    page.setDefaultNavigationTimeout(30000);
    return page;
  }

  /*
   close the browser and clean up
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log("browser closed successfully");
    }
  }

  /*
   navigate to a URL and wait for the page to load.
   */
  async navigateToUrl(page: Page, url: string): Promise<void> {
    try {
      await page.goto(url, { waitUntil: "networkidle" });
      console.log(`navigated to ${url}`);
    } catch (error) {
      console.error(`failed to navigate to ${url}:`, error);
      throw error;
    }
  }
}

/*
singleton instance of BrowserManager for use throughout the application
 */
export const browserManager = new BrowserManager();
