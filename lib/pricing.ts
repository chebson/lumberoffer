import type {
  Currency, Customer, Equipment, Freight, List, OfferLine, Product, RailRate, Settings, TruckRate, Yard,
} from "./types";

export const CANADIAN = new Set(["AB", "BC", "MB", "NB", "NL", "NS", "NT", "NU", "ON", "PE", "QC", "PQ", "SK", "YT"]);

export const laneKey = (city: string, st: string) => `${city.trim().toLowerCase()}|${st.trim().toUpperCase()}`;

export function convert(amount: number, from: Currency, to: Currency, fxUsdCad: number): number {
  if (from === to) return amount;
  const fx = fxUsdCad > 0 ? fxUsdCad : 1.37;
  return from === "USD" ? amount * fx : amount / fx;
}

export function mbfPerTruck(list: List | undefined, equipment: Equipment): number {
  if (!list) return 30;
  if (equipment === "Tridem/Maxi") return Number(list.mbf_tridem) || 30;
  if (equipment === "Tandem") return Number(list.mbf_tandem) || 24;
  return Number(list.mbf_superb) || 50;
}

export function money(n: number, cur: Currency): string {
  return (cur === "CAD" ? "C$" : "US$") + Math.round(n).toLocaleString("en-US");
}

export type RateBook = { truck: Map<string, TruckRate[]>; rail: Map<string, RailRate[]> };

export function buildRateBook(truck: TruckRate[], rail: RailRate[]): RateBook {
  const t = new Map<string, TruckRate[]>();
  const r = new Map<string, RailRate[]>();
  for (const q of truck) {
    const k = laneKey(q.city, q.st);
    t.set(k, [...(t.get(k) ?? []), q]);
  }
  for (const q of rail) {
    const k = laneKey(q.city, q.st);
    r.set(k, [...(r.get(k) ?? []), q]);
  }
  return { truck: t, rail: r };
}

/** Freight to one yard for one list, in $/MBF in the customer's currency. */
export function freightFor(
  currency: Currency, yard: Yard, list: List | undefined, book: RateBook, s: Pick<Settings, "fx_usd_cad" | "truck_pick">,
): Freight {
  const k = laneKey(yard.city, yard.st);
  const fx = Number(s.fx_usd_cad);
  if (yard.mode === "rail") {
    const opts = book.rail.get(k) ?? [];
    const pick = opts.find(o => o.carrier === yard.rail_carrier) ?? [...opts].sort((a, b) => a.rate_mbf - b.rate_mbf)[0];
    if (pick) {
      const v = convert(Number(pick.rate_mbf), pick.currency, currency, fx);
      return { ok: true, mbf: v, how: `Rail, ${pick.carrier}, ${money(pick.rate_mbf, pick.currency)}/MBF` };
    }
  } else {
    const quotes = (book.truck.get(k) ?? []).filter(q => q.equipment === yard.equipment);
    if (quotes.length) {
      const per = mbfPerTruck(list, yard.equipment);
      let rate: number, cur: Currency, who: string;
      if (s.truck_pick === "avg") {
        rate = quotes.map(q => convert(Number(q.rate), q.currency, "USD", fx)).reduce((a, b) => a + b, 0) / quotes.length;
        cur = "USD";
        who = `average of ${quotes.length} quotes`;
      } else {
        const sorted = [...quotes].sort(
          (a, b) => convert(Number(a.rate), a.currency, "USD", fx) - convert(Number(b.rate), b.currency, "USD", fx),
        );
        const q = s.truck_pick === "min" ? sorted[0] : sorted[sorted.length - 1];
        rate = Number(q.rate);
        cur = q.currency;
        who = q.carrier || "carrier";
      }
      return { ok: true, mbf: convert(rate / per, cur, currency, fx), how: `${yard.equipment}, ${who}, ${money(rate, cur)}/truck / ${per} MBF` };
    }
  }
  if (yard.manual_frt != null && !Number.isNaN(Number(yard.manual_frt))) {
    return { ok: true, mbf: Number(yard.manual_frt), how: `Manual ${money(Number(yard.manual_frt), currency)}/MBF` };
  }
  return { ok: false, how: yard.mode === "rail" ? `No rail rate for ${yard.city}, ${yard.st}` : `No ${yard.equipment} rate for ${yard.city}, ${yard.st}` };
}

export const yardLabel = (y: Pick<Yard, "city" | "st">) => `${y.city}, ${y.st}`;

/** The offer lines one customer would get: only lists and widths they buy, priced to every yard. */
export function buildOffer(
  c: Customer, products: Product[], lists: List[], book: RateBook,
  s: Pick<Settings, "fx_usd_cad" | "truck_pick">, scope: string | null,
): OfferLine[] {
  const byKey = new Map(lists.map(l => [l.key, l]));
  return products
    .filter(p => p.active && c.lists.includes(p.list_key) && (!scope || p.list_key === scope) && (!c.dims.length || c.dims.includes(p.dim)))
    .sort((a, b) => a.sort - b.sort)
    .map(p => {
      const base = c.currency === "CAD" ? Number(p.cad) : Number(p.usd);
      const yards = c.yards.map(y => {
        const f = freightFor(c.currency, y, byKey.get(p.list_key), book, s);
        return { label: yardLabel(y), delivered: f.ok ? Math.round(base + f.mbf + Number(c.adj || 0)) : null, how: f.how };
      });
      return {
        product_id: p.id, list_key: p.list_key, dim: p.dim, description: p.description,
        tally: p.tally, fbm: p.fbm, ship: p.ship, base, yards,
      };
    })
    .filter(l => l.yards.some(y => y.delivered != null));
}
