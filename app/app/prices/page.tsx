import Link from "next/link";
import { getLists, getProducts } from "@/lib/data";
import { mbf, shipLabel } from "@/lib/format";
import { LENGTHS } from "@/lib/types";
import { updateProduct } from "../actions";
import CsvImport from "../CsvImport";

export default async function PricesPage({ searchParams }: { searchParams: { list?: string } }) {
  const [lists, products] = await Promise.all([getLists(), getProducts()]);
  const tab = searchParams.list && lists.some(l => l.key === searchParams.list) ? searchParams.list : lists[0]?.key;
  const rows = products.filter(p => p.list_key === tab);
  return (
    <>
      <div className="head">
        <div>
          <div className="eyebrow">Price list</div>
          <h1>Mill price list</h1>
          <p>Mill price per MBF, tally by length and ship week. Change a price and every customer&apos;s delivered offer reprices. Untick Active to hold a line back.</p>
        </div>
      </div>
      {lists.length === 0 ? <div className="panel empty">Add your species lists under Settings first.</div> : (
        <>
          <div className="tabs">
            {lists.map(l => (
              <Link key={l.key} href={`/app/prices?list=${l.key}`} aria-current={l.key === tab ? "page" : undefined}>
                {l.label} <span className="num">{products.filter(p => p.list_key === l.key).length}</span>
              </Link>
            ))}
          </div>
          <div className="panel scroll" style={{ marginBottom: 16 }}>
            <table className="grid">
              <thead>
                <tr>
                  <th>Product</th>
                  <th><div className="tally-head">{LENGTHS.map(L => <span key={L}>{L}&apos;</span>)}</div></th>
                  <th className="r">MBF</th><th>Ship</th><th className="r">Mill US$</th><th className="r">Mill C$</th><th>Active</th><th></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? <tr><td colSpan={8} className="empty">No lines on this list. Load a price list CSV below.</td></tr>
                  : rows.map(p => (
                    <tr key={p.id}>
                      <td className="nowrap"><b>{p.dim}</b> {p.description}</td>
                      <td><div className="tally">{LENGTHS.map(L => <span key={L} className={p.tally[String(L)] ? "on" : ""}>{p.tally[String(L)] || "·"}</span>)}</div></td>
                      <td className="r num">{mbf(p.fbm)}</td>
                      <td className="nowrap">{shipLabel(p.ship)}</td>
                      <td colSpan={4}>
                        <form action={updateProduct} className="row" style={{ justifyContent: "flex-end", flexWrap: "nowrap" }}>
                          <input type="hidden" name="id" value={p.id} />
                          <input className="inline" name="usd" type="number" step="0.01" defaultValue={p.usd} aria-label="US price" />
                          <input className="inline" name="cad" type="number" step="0.01" defaultValue={p.cad} aria-label="CAD price" />
                          <label className="row sub" style={{ gap: 4 }}><input type="checkbox" name="active" defaultChecked={p.active} /> Active</label>
                          <button className="btn small">Save</button>
                        </form>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      <CsvImport kind="products" label="Load this week's price list (CSV)"
        columns="list, dim, description, 8, 10, 12, 14, 16, 18, 20, fbm, ship, usd, cad (ship is Prompt or YYYY-MM-DD)" />
    </>
  );
}
