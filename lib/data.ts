import "server-only";
import { db, must } from "./db";
import type { Customer, List, Product, RailRate, Settings, TruckRate, Yard } from "./types";

export async function getSettings(): Promise<Settings> {
  const s = must<Settings>(await db().from("settings").select("*").eq("id", 1).single(), "settings");
  return { ...s, fx_usd_cad: Number(s.fx_usd_cad) };
}

export async function getLists(): Promise<List[]> {
  return must(await db().from("lists").select("*").order("sort"), "lists") as List[];
}

export async function getProducts(): Promise<Product[]> {
  const rows = must(await db().from("products").select("*").order("sort"), "products") as Product[];
  return rows.map(p => ({ ...p, usd: Number(p.usd), cad: Number(p.cad) }));
}

export async function getRates(): Promise<{ truck: TruckRate[]; rail: RailRate[] }> {
  const [t, r] = await Promise.all([
    db().from("truck_rates").select("*").order("st").order("city"),
    db().from("rail_rates").select("*").order("st").order("city"),
  ]);
  return {
    truck: (must(t, "truck rates") as TruckRate[]).map(q => ({ ...q, rate: Number(q.rate) })),
    rail: (must(r, "rail rates") as RailRate[]).map(q => ({ ...q, rate_mbf: Number(q.rate_mbf) })),
  };
}

export async function getCustomers(): Promise<Customer[]> {
  const rows = must(await db().from("customers").select("*, yards(*)").order("name"), "customers") as (Omit<Customer, "yards"> & { yards: Yard[] })[];
  return rows.map(c => ({
    ...c,
    adj: Number(c.adj || 0),
    yards: [...(c.yards ?? [])].sort((a, b) => a.sort - b.sort).map(y => ({ ...y, manual_frt: y.manual_frt == null ? null : Number(y.manual_frt) })),
  }));
}

export type CustomerStatus = {
  customer_id: string;
  last_sent: string | null;
  opens: number;
  last_opened: string | null;
  bid: "buy" | "counter" | null;
};

/** Opens and bids since each customer's most recent offer. */
export async function getStatuses(): Promise<Map<string, CustomerStatus>> {
  const since = new Date(Date.now() - 45 * 864e5).toISOString();
  const recips = must(
    await db().from("recipients").select("id, customer_id, sent_at").not("sent_at", "is", null).gte("sent_at", since).order("sent_at", { ascending: false }),
    "recipients",
  ) as { id: string; customer_id: string; sent_at: string }[];
  const latest = new Map<string, { id: string; sent_at: string }>();
  for (const r of recips) if (!latest.has(r.customer_id)) latest.set(r.customer_id, r);
  const ids = [...latest.values()].map(r => r.id);
  const out = new Map<string, CustomerStatus>();
  if (!ids.length) return out;
  const [opens, bids] = await Promise.all([
    db().from("opens").select("recipient_id, opened_at").in("recipient_id", ids).order("opened_at", { ascending: false }),
    db().from("bids").select("recipient_id, kind, created_at").in("recipient_id", ids).order("created_at", { ascending: false }),
  ]);
  const o = must(opens, "opens") as { recipient_id: string; opened_at: string }[];
  const b = must(bids, "bids") as { recipient_id: string; kind: "buy" | "counter" }[];
  for (const [cid, r] of latest) {
    const mine = o.filter(x => x.recipient_id === r.id);
    out.set(cid, {
      customer_id: cid, last_sent: r.sent_at, opens: mine.length, last_opened: mine[0]?.opened_at ?? null,
      bid: b.find(x => x.recipient_id === r.id)?.kind ?? null,
    });
  }
  return out;
}
