import { getCustomers, getLists, getProducts, getRates, getSettings, getStatuses } from "@/lib/data";
import { buildOffer, buildRateBook, yardLabel } from "@/lib/pricing";
import { testMode } from "@/lib/mailer";
import SendBoard, { type BoardCustomer, type BoardGroup } from "./SendBoard";

export default async function SendPage() {
  const [settings, lists, products, rates, customers, statuses] = await Promise.all([
    getSettings(), getLists(), getProducts(), getRates(), getCustomers(), getStatuses(),
  ]);
  const book = buildRateBook(rates.truck, rates.rail);
  const scopes = [...lists.map(l => l.key), ""];

  const board: BoardCustomer[] = customers.map(c => {
    const s = statuses.get(c.id);
    const byScope: BoardCustomer["byScope"] = {};
    for (const k of scopes) {
      const lines = buildOffer(c, products, lists, book, settings, k || null);
      const prices = lines.flatMap(l => l.yards.map(y => y.delivered).filter((v): v is number => v != null));
      byScope[k] = { lines: lines.length, from: prices.length ? Math.min(...prices) : null };
    }
    return {
      id: c.id, name: c.name, contact: c.contact, email: c.email, currency: c.currency,
      unsubscribed: !!c.unsubscribed_at, lists: c.lists,
      yards: c.yards.map(y => `${yardLabel(y)} · ${y.mode === "rail" ? "Rail" : y.equipment}`),
      status: s ?? null, byScope,
    };
  });

  const groups: BoardGroup[] = [
    ...lists.map(l => ({
      key: l.key, label: `${l.label} buyers`,
      ids: customers.filter(c => c.lists.includes(l.key)).map(c => c.id),
      lines: products.filter(p => p.active && p.list_key === l.key).length,
    })),
    { key: "", label: "Everyone", ids: customers.map(c => c.id), lines: products.filter(p => p.active).length },
  ];

  return (
    <>
      <div className="head">
        <div>
          <div className="eyebrow">Send offers</div>
          <h1>One click, every buyer in the group</h1>
          <p>Pick a species group. Each buyer gets a personalized email from {settings.sender_email} with only the lines they buy, priced delivered to each of their yards.</p>
        </div>
      </div>
      {testMode() ? <div className="banner">Test mode: sends are recorded and buyer pages work, but no email goes out until a Postmark token is added.</div> : null}
      {customers.length === 0 ? (
        <div className="panel empty">No customers yet. Add them under Customers, then come back here to send.</div>
      ) : (
        <SendBoard customers={board} groups={groups} />
      )}
    </>
  );
}
