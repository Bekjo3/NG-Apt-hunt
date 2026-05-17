export interface Duration {
  seconds: number;
}

export interface Distance {
  meters: number;
}

/*

*/
export interface RouteElement {
  originIndex: number;
  destinationIndex: number;
  status: {
    code: number; // 0 = OK, other codes = error
    message?: string;
  };
  duration?: Duration;
  staticDuration?: Duration; // the "static" duration doesn't account for real time traffic.
  distance?: Distance;
}

export interface ComputeRouteMatrixResponse {
  routes: RouteElement[];
}

export interface ComputeRouteMatrixRequest {
  origins: Array<{
    location: {
      latLng: {
        latitude: number;
        longitude: number;
      };
    };
  }>;
  destinations: Array<{
    location: {
      latLng: {
        latitude: number;
        longitude: number;
      };
    };
  }>;
  travelMode: "WALK" | "TRANSIT";
}

export interface ParsedRouteResult {
  originIndex: number;
  destinationIndex: number;
  duration: number; // in seconds
  distance: number; // in meters
  isValid: boolean;
  errorMessage?: string;
}
