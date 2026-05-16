export interface ApartmentListing {
  url: string;
  price: string; // "$1,500"
  bedrooms: number;
  bathrooms: number;
  address: string;
  nearestShuttleComment: string | null; 
  nearestTransitComment: string | null;
}
