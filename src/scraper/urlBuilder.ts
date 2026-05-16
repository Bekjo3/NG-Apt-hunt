export interface SearchFilters {
  bedrooms: number;
  bathrooms: number;
  location: string;
  page?: number | undefined; 
}

/*
   apartments.com uses a URL structure like:
   eg. https://www.apartments.com/seattle-wa/min-2-bedrooms-1-bathrooms/

   query params:
   - sf: sort field (listDate for newest)
   - sc: sort criteria (descending)
 */
export function buildApartmentsComUrl(filters: SearchFilters): string {
  const baseUrl = "https://www.apartments.com";
  const locationSlug = filters.location.toLowerCase().replace(/\s+/g, "-");
  const bedroomBathroomString = `min-${filters.bedrooms}bd-${filters.bathrooms}ba`;

  let url = `${baseUrl}/${locationSlug}/${bedroomBathroomString}/`;

  const params = new URLSearchParams();
//   params.append("sf", "listDate");
//   params.append("sc", "desc");

  // add page parameter if specified for some reason (probs a trial)
  if (filters.page && filters.page > 1) {
    params.append("p", filters.page.toString());
  }

  // Append query string if there are parameters
  const queryString = params.toString();
  if (queryString) {
    url += `?${queryString}`;
  }

  return url;
}

/*
 the initial search URL for Seattle 2bd/1ba apartments.
 */
export function getSeattleApartmentsUrl(page: number = 1): string {
  return buildApartmentsComUrl({
    bedrooms: 2,
    bathrooms: 1,
    location: "seattle-wa",
    page: page > 1 ? page : undefined,
  });
}
