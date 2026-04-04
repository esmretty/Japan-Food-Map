export interface Restaurant {
  id: string;
  name: string;
  score: number;
  cuisine: string;
  url: string;
  lat: number;
  lng: number;
  businessHours: string;
  awards: string[];
  hyakumeiten: string[];
  photos: string[];
  description: string;
  storeInfo?: Record<string, string>;
  address: string;
  googleMapUrl?: string;
}
