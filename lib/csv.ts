import Papa from "papaparse";
import { EQUIPMENT, LENGTHS, type Currency, type Equipment } from "./types";

export function parseCsv(text: string): Record<string, string>[] {
  const res = Papa.parse<Record<string, string>>(text.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim().toLowerCase().replace(/\s+/g, "_"),
  });
  return res.data.map(r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v ?? "").trim()])));
}

const num = (v: string | undefined) => {
  const n = parseFloat(String(v ?? "").replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};

export function toCurrency(v: string | undefined, fallback: Currency = "USD"): Currency {
  const s = String(v ?? "").trim().toUpperCase();
  if (s.startsWith("C")) return "CAD";
  if (s.startsWith("U")) return "USD";
  return fallback;
}

export function toEquipment(v: string | undefined): Equipment | null {
  const s = String(v ?? "").trim().toLowerCase();
  if (s.startsWith("super")) return "Super B";
  if (s.startsWith("tandem")) return "Tandem";
  if (/^(tri|maxi)/.test(s)) return "Tridem/Maxi";
  return EQUIPMENT.find(e => e.toLowerCase() === s) ?? null;
}

/** Price list: list, dim, description, 8,10,12,14,16,18,20, fbm, ship, usd, cad */
export function productsFromCsv(text: string) {
  const errors: string[] = [];
  const rows = parseCsv(text).map((r, i) => {
    const tally: Record<string, number> = {};
    for (const L of LENGTHS) {
      const v = num(r[String(L)]);
      if (v > 0) tally[String(L)] = v;
    }
    const p = {
      list_key: (r.list || "").toUpperCase(), dim: (r.dim || "").toLowerCase(), description: r.description || "",
      tally, fbm: Math.round(num(r.fbm)), ship: r.ship || "Prompt", usd: num(r.usd), cad: num(r.cad), active: true, sort: i,
    };
    if (!p.list_key || !p.dim || !(p.fbm > 0) || !(p.usd > 0) || !(p.cad > 0)) errors.push(`Row ${i + 2}: needs list, dim, fbm, usd and cad`);
    return p;
  });
  return { rows, errors };
}

/** Truck rates: city, state, equipment, carrier, rate, currency */
export function truckFromCsv(text: string) {
  const errors: string[] = [];
  const rows = parseCsv(text).flatMap((r, i) => {
    const equipment = toEquipment(r.equipment);
    const rate = num(r.rate);
    if (!r.city || !(r.state || r.st) || !equipment || !(rate > 0)) {
      errors.push(`Row ${i + 2}: needs city, state, equipment and a rate above 0`);
      return [];
    }
    return [{ city: r.city, st: (r.state || r.st).toUpperCase(), equipment, carrier: r.carrier || "", rate, currency: toCurrency(r.currency) }];
  });
  return { rows, errors };
}

/** Rail rates: city, state, carrier, rate_mbf, currency */
export function railFromCsv(text: string) {
  const errors: string[] = [];
  const rows = parseCsv(text).flatMap((r, i) => {
    const rate = num(r.rate_mbf || r.rate);
    if (!r.city || !(r.state || r.st) || !(rate > 0)) {
      errors.push(`Row ${i + 2}: needs city, state and a rate above 0`);
      return [];
    }
    return [{ city: r.city, st: (r.state || r.st).toUpperCase(), carrier: r.carrier || "Rail", rate_mbf: rate, currency: toCurrency(r.currency) }];
  });
  return { rows, errors };
}

/**
 * Customers: name, contact, email, currency, lists, dims, yard_city, yard_state, yard_mode, yard_equipment, yard_rail
 * One row per yard. Rows with the same name and email are one customer.
 */
export function customersFromCsv(text: string) {
  const errors: string[] = [];
  const byKey = new Map<string, {
    name: string; contact: string; email: string; currency: Currency; lists: string[]; dims: string[];
    yards: { city: string; st: string; mode: "truck" | "rail"; equipment: Equipment; rail_carrier: string | null }[];
  }>();
  parseCsv(text).forEach((r, i) => {
    if (!r.name || !r.email) { errors.push(`Row ${i + 2}: needs name and email`); return; }
    const key = `${r.name.toLowerCase()}|${r.email.toLowerCase()}`;
    const c = byKey.get(key) ?? {
      name: r.name, contact: r.contact || "", email: r.email, currency: toCurrency(r.currency),
      lists: (r.lists || "").split(/[;|]/).map(s => s.trim().toUpperCase()).filter(Boolean),
      dims: (r.dims || "").split(/[;|]/).map(s => s.trim().toLowerCase()).filter(Boolean),
      yards: [],
    };
    if (r.yard_city && r.yard_state) {
      const mode = /rail/i.test(r.yard_mode) ? "rail" : "truck";
      c.yards.push({ city: r.yard_city, st: r.yard_state.toUpperCase(), mode, equipment: toEquipment(r.yard_equipment) ?? "Tridem/Maxi", rail_carrier: r.yard_rail || null });
    }
    byKey.set(key, c);
  });
  return { rows: [...byKey.values()], errors };
}
