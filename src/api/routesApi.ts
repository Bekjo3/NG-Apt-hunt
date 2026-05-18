import axios, { AxiosError } from "axios";

export interface RouteElement {
  originIndex: number;
  destinationIndex: number;
  status?: {
    code: number; // 0 = OK
    message?: string;
  };
  duration?: string; // google returns a string ending in 's' e.g. "120s"
  distanceMeters?: number;
}

interface RouteMatrixWaypoint {
  waypoint: {
    address: string;
  };
}

export interface ComputeRouteMatrixRequest {
  origins: RouteMatrixWaypoint[];
  destinations: RouteMatrixWaypoint[];
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

export async function queryRoutesApi(
  originAddress: string,
  destinationAddress: string,
  apiKey: string
): Promise<ParsedRouteResult> {
  const ROUTES_API_URL =
    "https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix";

  const requestPayload: ComputeRouteMatrixRequest = {
    origins: [{ waypoint: { address: originAddress } }],
    destinations: [{ waypoint: { address: destinationAddress } }],
    travelMode: "WALK",
  };

  try {
    const response = await axios.post<RouteElement[]>(
      ROUTES_API_URL,
      requestPayload,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "duration,distanceMeters,originIndex,destinationIndex,status",
        },
        timeout: 10000,
      }
    );

    const routeElement = response.data[0];

    if (!routeElement) {
      return {
        originIndex: 0,
        destinationIndex: 0,
        duration: 0,
        distance: 0,
        isValid: false,
        errorMessage: "No route data returned from API",
      };
    }

    if (routeElement.status?.code && routeElement.status.code !== 0) {
      return {
        originIndex: routeElement.originIndex,
        destinationIndex: routeElement.destinationIndex,
        duration: 0,
        distance: 0,
        isValid: false,
        errorMessage: `API error: ${routeElement.status.message || "Unknown error"}`,
      };
    }

    const durationString = routeElement.duration || "0s";
    const durationSeconds = parseInt(durationString.replace("s", ""), 10);
    const distanceMeters = routeElement.distanceMeters || 0;

    return {
      originIndex: routeElement.originIndex,
      destinationIndex: routeElement.destinationIndex,
      duration: durationSeconds,
      distance: distanceMeters,
      isValid: true,
    };
  } catch (error) {
    const axiosError = error as AxiosError;
    const errorMessage =
      axiosError?.response?.data ||
      axiosError?.message ||
      "Unknown error querying Routes API";

    console.error(
      `Routes API error for origin "${originAddress}" to destination "${destinationAddress}":`,
      errorMessage
    );

    return {
      originIndex: 0,
      destinationIndex: 0,
      duration: 0,
      distance: 0,
      isValid: false,
      errorMessage: `Request failed: ${JSON.stringify(errorMessage)}`,
    };
  }
}
