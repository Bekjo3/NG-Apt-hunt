import { queryRoutesApi } from "./routesApi.js";

export interface ShuttleStop {
  address: string;
}

export interface BatchRouteResult {
  shuttleStopIndex: number;
  shuttleStopAddress: string;
  duration: number; // in seconds
  distance: number; // in meters
  isValid: boolean;
  errorMessage?: string;
}

export interface NearestShuttleResult {
  found: boolean;
  stopName?: string;
  durationMinutes?: number;
  durationSeconds?: number;
  distance?: number;
  fullAddress?: string;
  errorMessage?: string;
}

export async function batchQueryShuttleStops(
  apartmentAddress: string,
  shuttleStops: ShuttleStop[],
  apiKey: string,
  delayMs: number = 500
): Promise<BatchRouteResult[]> {
  const results: BatchRouteResult[] = [];

  console.log(
    `Querying ${shuttleStops.length} shuttle stops for apartment at "${apartmentAddress}"`
  );

  for (let i = 0; i < shuttleStops.length; i++) {
    const shuttle = shuttleStops[i];

    if (!shuttle) {
      console.warn(
        `[${i + 1}/${shuttleStops.length}] Shuttle stop not found, skipping...`
      );
      continue;
    }

    try {
      const routeResult = await queryRoutesApi(
        apartmentAddress,
        shuttle.address,
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

function extractShuttleStopName(fullAddress: string): string {
  const parts = fullAddress.split(",");
  return parts[0]?.trim() || fullAddress;
}

export function findNearestShuttle(
  batchResults: BatchRouteResult[]
): NearestShuttleResult {
  const validResults = batchResults.filter((result) => result.isValid);

  if (validResults.length === 0) {
    const failedCount = batchResults.filter((r) => !r.isValid).length;
    return {
      found: false,
      errorMessage: `No valid routes found. All ${batchResults.length} queries failed.${
        failedCount > 0
          ? ` First error: ${batchResults.find((r) => r.errorMessage)?.errorMessage}`
          : ""
      }`,
    };
  }

  const nearest = validResults.reduce((closest, current) => {
    return current.duration < closest.duration ? current : closest;
  });

  const stopName = extractShuttleStopName(nearest.shuttleStopAddress);
  const durationMinutes = Math.round((nearest.duration / 60) * 10) / 10;

  return {
    found: true,
    stopName,
    durationMinutes,
    durationSeconds: nearest.duration,
    distance: nearest.distance,
    fullAddress: nearest.shuttleStopAddress,
  };
}

export function formatShuttleComment(result: NearestShuttleResult): string {
  if (!result.found) {
    const errorReason = result.errorMessage?.includes("No valid routes")
      ? "API error"
      : result.errorMessage?.includes("failed")
        ? "Query failed"
        : "Unknown error";
    return `Unable to calculate transit time to shuttle stops (${errorReason})`;
  }

  if (result.durationMinutes === undefined) {
    return `Unable to calculate transit time to shuttle stops (No duration data)`;
  }

  const formattedDuration =
    result.durationMinutes === Math.floor(result.durationMinutes)
      ? Math.floor(result.durationMinutes)
      : result.durationMinutes;

  return `Takes ${formattedDuration} mins to the nearest Microsoft shuttle stop at ${result.stopName}`;
}
