import { describe, expect, it } from "vitest";
import { buildOffer, buildRateBook, freightFor } from "../lib/pricing";
import { offerSubject, renderOfferEmail } from "../lib/email";
import type { Customer, List, Product, OfferSnapshot } from "../lib/types";

const spf: List = { key: "SPF", label: "SPF", mbf_tridem: 35, mbf_tandem: 28, mbf_superb: 55, sort: 1 };
const df: List = { key: "DF", label: "Douglas Fir", mbf_tridem: 30, mbf_tandem: 24, mbf_superb: 50, sort: 2 };
const settings = { fx_usd_cad: 1.37, truck_pick: "max" as const };
const book = buildRateBook(
  [
    { city: "Salt Lake City", st: "UT", equipment: "Tridem/Maxi", carrier: "A", rate: 3600, currency: "USD" },
    { city: "Salt Lake City", st: "UT", equipment: "Tridem/Maxi", carrier: "B", rate: 3200, currency: "USD" },
    { city: "Calgary", st: "AB", equipment: "Super B", carrier: "C", rate: 3450, currency: "CAD" },
  ],
  [{ city: "Denver", st: "CO", carrier: "BNSF", rate_mbf: 152, currency: "USD" }],
);
const products: Product[] = [
  { id: "p1", list_key: "SPF", dim: "2x4", description: "#2&Btr SPF", tally: { "16": 16 }, fbm: 112896, ship: "Prompt", usd: 538, cad: 737, active: true, sort: 1 },
  { id: "p2", list_key: "DF", dim: "2x6", description: "#2&Btr DF", tally: { "12": 2 }, fbm: 29484, ship: "Prompt", usd: 655, cad: 897, active: true, sort: 2 },
  { id: "p3", list_key: "SPF", dim: "2x8", description: "#2&Btr SPF", tally: {}, fbm: 1000, ship: "Prompt", usd: 600, cad: 820, active: false, sort: 3 },
];
const cust = (over: Partial<Customer>): Customer => ({
  id: "c", name: "Mountain West", contact: "Mark Jensen", email: "m@x.com", currency: "USD",
  lists: ["SPF"], dims: [], adj: 0, unsubscribed_at: null, yards: [], ...over,
});

describe("freight", () => {
  it("uses the highest truck quote divided by MBF per truck", () => {
    const f = freightFor("USD", { city: "Salt Lake City", st: "UT", mode: "truck", equipment: "Tridem/Maxi", rail_carrier: null, manual_frt: null, sort: 0 }, spf, book, settings);
    expect(f.ok && Math.round(f.mbf * 100) / 100).toBe(102.86);
  });
  it("can use the lowest quote", () => {
    const f = freightFor("USD", { city: "Salt Lake City", st: "UT", mode: "truck", equipment: "Tridem/Maxi", rail_carrier: null, manual_frt: null, sort: 0 }, spf, book, { ...settings, truck_pick: "min" });
    expect(f.ok && Math.round(f.mbf * 100) / 100).toBe(91.43);
  });
  it("converts a CAD quote onto a USD price", () => {
    const f = freightFor("USD", { city: "Calgary", st: "AB", mode: "truck", equipment: "Super B", rail_carrier: null, manual_frt: null, sort: 0 }, spf, book, settings);
    expect(f.ok && Math.round(f.mbf * 100) / 100).toBe(45.79); // 3450 / 55 / 1.37
  });
  it("uses rail $/MBF", () => {
    const f = freightFor("USD", { city: "Denver", st: "CO", mode: "rail", equipment: "Tridem/Maxi", rail_carrier: "BNSF", manual_frt: null, sort: 0 }, spf, book, settings);
    expect(f.ok && f.mbf).toBe(152);
  });
  it("falls back to manual freight, then reports no rate", () => {
    const y = { city: "Nowhere", st: "ZZ", mode: "truck" as const, equipment: "Tandem" as const, rail_carrier: null, manual_frt: 80, sort: 0 };
    expect(freightFor("USD", y, spf, book, settings)).toMatchObject({ ok: true, mbf: 80 });
    expect(freightFor("USD", { ...y, manual_frt: null }, spf, book, settings).ok).toBe(false);
  });
});

describe("buildOffer", () => {
  const c = cust({
    lists: ["SPF", "DF"],
    yards: [
      { city: "Salt Lake City", st: "UT", mode: "truck", equipment: "Tridem/Maxi", rail_carrier: null, manual_frt: null, sort: 0 },
      { city: "Denver", st: "CO", mode: "rail", equipment: "Tridem/Maxi", rail_carrier: "BNSF", manual_frt: null, sort: 1 },
    ],
  });
  it("prices every yard and skips inactive lines", () => {
    const lines = buildOffer(c, products, [spf, df], book, settings, null);
    expect(lines.map(l => l.product_id)).toEqual(["p1", "p2"]);
    expect(lines[0].yards.map(y => y.delivered)).toEqual([641, 690]); // 538 + 102.86, 538 + 152
  });
  it("limits to one species group", () => {
    expect(buildOffer(c, products, [spf, df], book, settings, "DF").map(l => l.product_id)).toEqual(["p2"]);
  });
  it("limits to the widths a customer buys", () => {
    expect(buildOffer({ ...c, dims: ["2x6"] }, products, [spf, df], book, settings, null).map(l => l.product_id)).toEqual(["p2"]);
  });
});

describe("email", () => {
  const snap: OfferSnapshot = {
    mill_name: "Similkameen Forest Products", sender_name: "Sales", sender_email: "sales@x.com",
    customer: { name: "Mountain West", contact: "Mark Jensen", currency: "USD" },
    yards: [{ label: "Salt Lake City, UT", mode: "truck", equipment: "Tridem/Maxi" }],
    scope_label: "Douglas Fir",
    lines: [{ product_id: "p2", list_key: "DF", dim: "2x6", description: "#2&Btr DF", tally: { "12": 2 }, fbm: 29484, ship: "Prompt", base: 655, yards: [{ label: "Salt Lake City, UT", delivered: 765, how: "" }] }],
    created_at: new Date().toISOString(),
  };
  it("builds the subject line", () => {
    expect(offerSubject("Simfor", snap)).toBe("Simfor Douglas Fir Offering - Mountain West - Mark Jensen");
  });
  it("renders a bordered table with links and an unsubscribe", () => {
    const { html, text } = renderOfferEmail(snap, { offer: "https://a/o/t", unsubscribe: "https://a/u/t", pixel: "https://a/api/px/t" });
    expect(html).toContain("border-collapse:collapse");
    expect(html).toContain("US$765");
    expect(html).toContain("https://a/u/t");
    expect(text).toContain("Unsubscribe: https://a/u/t");
  });
});
