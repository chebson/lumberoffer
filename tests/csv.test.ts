import { describe, expect, it } from "vitest";
import fs from "fs";
import path from "path";
import { customersFromCsv, productsFromCsv, railFromCsv, truckFromCsv } from "../lib/csv";

const tpl = (f: string) => fs.readFileSync(path.join(__dirname, "..", "templates", f), "utf8");

describe("CSV templates load", () => {
  it("price list", () => {
    const { rows, errors } = productsFromCsv(tpl("price-list.csv"));
    expect(errors).toEqual([]);
    expect(rows[0]).toMatchObject({ list_key: "SPF", dim: "2x4", tally: { "12": 8, "14": 10, "16": 14 }, fbm: 112896, usd: 505, cad: 692 });
    expect(rows[1].ship).toBe("2026-11-02");
  });
  it("truck and rail", () => {
    expect(truckFromCsv(tpl("truck-rates.csv")).rows[1]).toMatchObject({ st: "AB", equipment: "Super B", currency: "CAD", rate: 3450 });
    expect(railFromCsv(tpl("rail-rates.csv")).rows[0]).toMatchObject({ carrier: "BNSF", rate_mbf: 152 });
  });
  it("customers with several yards", () => {
    const { rows, errors } = customersFromCsv(tpl("customers.csv"));
    expect(errors).toEqual([]);
    expect(rows).toHaveLength(2);
    expect(rows[0].lists).toEqual(["SPF", "DF"]);
    expect(rows[0].yards.map(y => y.city)).toEqual(["Salt Lake City", "Boise"]);
    expect(rows[1]).toMatchObject({ dims: ["2x4", "2x6"], yards: [{ mode: "rail", rail_carrier: "BNSF" }] });
  });
});
