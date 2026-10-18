import { db, must } from "@/lib/db";
import { getCustomers, getStatuses } from "@/lib/data";
import { ago } from "@/lib/format";
import { money } from "@/lib/pricing";
import { setBidStatus } from "../actions";

type Bid = {
  id: string; customer_id: string; product_label: string; yard: string; kind: "buy" | "counter";
  price: number; currency: "USD" | "CAD"; status: string; created_at: string;
};

export default async function ActivityPage() {
  const [customers, statuses] = await Promise.all([getCustomers(), getStatuses()]);
  const bids = must(await db().from("bids").select("*").order("created_at", { ascending: false }).limit(50), "bids") as Bid[];
  const name = (id: string) => customers.find(c => c.id === id)?.name ?? "Customer";
  const day = Date.now() - 864e5;
  const rows = customers
    .map(c => ({ c, s: statuses.get(c.id) }))
    .sort((a, b) => (b.s?.opens ?? 0) - (a.s?.opens ?? 0));
  const hot = rows.filter(r => r.s && r.s.opens > 0 && !r.s.bid && r.s.last_opened && new Date(r.s.last_opened).getTime() > day);

  return (
    <>
      <div className="head">
        <div>
          <div className="eyebrow">Opens &amp; bids</div>
          <h1>Who opened, and how many times</h1>
          <p>Counts are for each buyer&apos;s latest offer. Opened with no bid yet? That&apos;s a hot lead, so call them first. Visits to the offer page are the most reliable sign; email-app opens can be inflated by privacy features.</p>
        </div>
      </div>

      {hot.length ? (
        <div className="hotstrip">
          {hot.map(({ c, s }) => (
            <div key={c.id} className="hotcard">
              <div className="eyebrow" style={{ color: "inherit" }}>Hot lead · call</div>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end" }}>
                <b>{c.name}</b><span className="opens">{s!.opens}×</span>
              </div>
              <div className="sub" style={{ color: "inherit" }}>Last opened {ago(s!.last_opened)} · {c.contact}</div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="panel scroll" style={{ marginBottom: 16 }}>
        <table className="grid">
          <thead><tr><th>Customer</th><th className="r">Opens</th><th>Last opened</th><th>Last offer sent</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map(({ c, s }) => (
              <tr key={c.id}>
                <td style={{ fontWeight: 600 }}>{c.name}</td>
                <td className="r num" style={{ fontSize: 16 }}>{s?.opens ?? 0}</td>
                <td>{s?.last_opened ? ago(s.last_opened) : <span className="sub">Not yet</span>}</td>
                <td>{s?.last_sent ? ago(s.last_sent) : <span className="sub">Never</span>}</td>
                <td>{!s?.last_sent ? <span className="pill idle">Never sent</span>
                  : s.bid ? <span className="pill bid">{s.bid === "buy" ? "Wants to buy" : "Countered"}</span>
                  : s.opens ? <span className="pill open">Opened {s.opens}×</span>
                  : <span className="pill sent">Not opened</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 style={{ marginBottom: 10 }}>Bids and counters</h2>
      <div className="panel scroll">
        <table className="grid">
          <thead><tr><th>When</th><th>Customer</th><th>Line</th><th>Yard</th><th className="r">Price</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {bids.length === 0 ? <tr><td colSpan={7} className="empty">No bids yet. They land here when a buyer clicks Buy or Counter.</td></tr>
              : bids.map(b => (
                <tr key={b.id}>
                  <td className="nowrap sub">{ago(b.created_at)}</td>
                  <td style={{ fontWeight: 600 }}>{name(b.customer_id)}</td>
                  <td>{b.kind === "buy" ? "Buy" : "Counter"} · {b.product_label}</td>
                  <td>{b.yard}</td>
                  <td className="r num">{money(Number(b.price), b.currency)}</td>
                  <td><span className={`pill ${b.status === "confirmed" ? "bid" : b.status === "declined" ? "bad" : "open"}`}>{b.status === "new" ? "New" : b.status === "confirmed" ? "Confirmed" : "Declined"}</span></td>
                  <td className="r">
                    {b.status === "new" ? (
                      <div className="row" style={{ justifyContent: "flex-end" }}>
                        <form action={setBidStatus}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="status" value="confirmed" /><button className="btn small primary">Confirm order</button></form>
                        <form action={setBidStatus}><input type="hidden" name="id" value={b.id} /><input type="hidden" name="status" value="declined" /><button className="btn small">Decline</button></form>
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
