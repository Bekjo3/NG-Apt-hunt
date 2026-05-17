import { queryRoutesApi } from "./routesApi.js";


export interface BatchRouteResult {
  shuttleStopIndex: number;
  shuttleStopAddress: string;
  duration: number; // in seconds
  distance: number; // in meters
  isValid: boolean;
  errorMessage?: string;
}

export async function batchQueryShuttleStops(
  apartmentLat: number,
  apartmentLng: number,
  shuttleStops: Array<{ address: string; latitude: number; longitude: number }>,
  apiKey: string,
  delayMs: number = 500
): Promise<BatchRouteResult[]> {
  const results: BatchRouteResult[] = [];

  console.log(
    `Querying ${shuttleStops.length} shuttle stops for apartment at (${apartmentLat.toFixed(4)}, ${apartmentLng.toFixed(4)})`
  );

  for (let i = 0; i < shuttleStops.length; i++) {
    const shuttle = shuttleStops[i];

    if (!shuttle) {
      console.warn(`[${i + 1}/${shuttleStops.length}] Shuttle stop not found, skipping...`);
      continue;
    }

    try {
      const routeResult = await queryRoutesApi(
        apartmentLat,
        apartmentLng,
        shuttle.latitude,
        shuttle.longitude,
        apiKey
      );

      const batchResult: BatchRouteResult = {
        shuttleStopIndex: i,
        shuttleStopAddress: shuttle.address,
        duration: routeResult.duration,
        distance: routeResult.distance,
        isValid: routeResult.isValid,
      };
      
      if (routeResult.errorMessage) {
        batchResult.errorMessage = routeResult.errorMessage;
      }

      results.push(batchResult);

      console.log(
        `  [${i + 1}/${shuttleStops.length}] ${shuttle.address}: ${
          routeResult.isValid
            ? `${(routeResult.duration / 60).toFixed(1)} mins`
            : "ERROR"
        }`
      );

      // delay before next API call (except on last call)
      if (i < shuttleStops.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(
        `  [${i + 1}/${shuttleStops.length}] Error querying shuttle stop:`,
        error
      );

      results.push({
        shuttleStopIndex: i,
        shuttleStopAddress: shuttle?.address || "Unknown",
        duration: 0,
        distance: 0,
        isValid: false,
        errorMessage: `Unexpected error: ${String(error)}`,
      });
    }
  }

  console.log(
    ` Batch query complete!!! ${results.filter((r) => r.isValid).length}/${
      results.length
    } successful\n`
  );
  return results;
}
