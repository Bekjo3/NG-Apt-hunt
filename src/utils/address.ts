export interface AddressParts {
  street_address: string;
  city: string;
  state: string;
  postal_code?: string;
}

export function formatFullAddress(parts: AddressParts): string {
  return [parts.street_address, parts.city, parts.state, parts.postal_code]
    .filter((segment) => segment && String(segment).trim())
    .join(", ");
}

export function parseOptionalCoord(
  value: number | string | null | undefined
): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const n = typeof value === "number" ? value : parseFloat(String(value));
  return Number.isFinite(n) ? n : null;
}
