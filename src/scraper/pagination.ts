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
