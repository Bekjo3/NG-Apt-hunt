export interface ApartmentListing {
  name: string;
  url: string;
  phone: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  latitude: number;
  longitude: number;
  currency: string;
  low_price: number | null;
  high_price: number | null;
  amenities: string;
  image_url: string;
  nearestShuttleComment: string | null;
  nearestTransitComment: string | null;
}
