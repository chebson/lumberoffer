import Link from "next/link";
import { getCustomers, getLists, getRates, getSettings } from "@/lib/data";
import { buildRateBook, freightFor, money, yardLabel } from "@/lib/pricing";
import CsvImport from "../CsvImport";

export default async function CustomersPage() {
  const [customers, lists, rates, settings] = await Promise.all([getCustomers(), getLists(), getRates(), getSettings()]);
  const book = buildRateBook(rates.truck, rates.rail);
  const label = (k: string) => lists.find(l => l.key === k)?.label ?? k;
  return (
    <>
      <div className="head">
        <div>
          <div className="eyebrow">Customers</div>
          <h1>Customer profiles</h1>
          <p>Buyer email, yards, how each yard ships, and what they buy. Species groups build themselves from what each customer buys.</p>
        </div>
        <Link className="btn primary" href="/app/customers/new">Add customer</Link>
      </div>
      <div className="panel scroll" style={{ marginBottom: 16 }}>
        <table className="grid">
          <thead><tr><th>Customer</th><th>Buys</th><th>Yards and freight</th><th>Currency</th></tr></thead>
          <tbody>
            {customers.length === 0 ? <tr><td colSpan={4} className="empty">No customers yet. Add one, or load a CSV below.</td></tr>
              : customers.map(c => (
                <tr key={c.id}>
                  <td>
                    <Link href={`/app/customers/${c.id}`} style={{ fontWeight: 600 }}>{c.name}</Link>
                    {c.unsubscribed_at ? <> <span className="pill bad">Unsubscribed</span></> : null}
                    <div className="sub">{c.contact} · {c.email}</div>
                  </td>
                  <td>{c.lists.map(label).join(", ")}{c.dims.length ? <div className="sub">{c.dims.join(", ")} only</div> : null}</td>
                  <td>{c.yards.map((y, i) => {
                    const f = freightFor(c.currency, y, lists.find(l => l.key === c.lists[0]), book, settings);
                    return (
                      <div key={i} style={{ padding: "2px 0" }}>
                        {yardLabel(y)}{" "}
                        {f.ok ? <span className="pill bid">{money(f.mbf, c.currency)}/MBF</span> : <span className="pill warn">No rate</span>}{" "}
                        <span className="sub">{f.how}</span>
                      </div>
                    );
                  })}</td>
                  <td>{c.currency}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <CsvImport kind="customers" label="Load customers from CSV"
        columns="name, contact, email, currency, lists, dims, yard_city, yard_state, yard_mode, yard_equipment, yard_rail (one row per yard; lists like SPF;DF)" />
    </>
  );
}
