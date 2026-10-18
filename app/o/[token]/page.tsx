import { notFound } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { mbf, shipLabel } from "@/lib/format";
import { money } from "@/lib/pricing";
import { LENGTHS, type OfferSnapshot } from "@/lib/types";
import BidCell from "./BidCell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your delivered offer", robots: { index: false } };

export default async function OfferPage({ params }: { params: { token: string } }) {
  const { data: r } = await db().from("recipients").select("id, snapshot, sent_at").eq("token", params.token).maybeSingle();
  if (!r) notFound();
  const snap = r.snapshot as OfferSnapshot;
  await db().from("opens").insert({ recipient_id: r.id, kind: "page", user_agent: headers().get("user-agent")?.slice(0, 300) ?? null });
  const { data: bids } = await db().from("bids").select("product_id, kind, price, yard").eq("recipient_id", r.id);
  const cur = snap.customer.currency;
  const sent = new Date(r.sent_at ?? snap.created_at);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px 60px" }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <div className="eyebrow" style={{ color: "var(--accent)", fontSize: 14, letterSpacing: ".14em" }}>{snap.mill_name}</div>
          <h1 style={{ fontSize: 34 }}>Delivered offer for {snap.customer.name}</h1>
          <div className="muted" style={{ marginTop: 6 }}>
            {snap.yards.map(y => `${y.label} (${y.mode === "rail" ? "rail" : y.equipment})`).join(" · ")} · {cur}/MBF · sent {sent.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
          </div>
        </div>
        <div className="sub" style={{ textAlign: "right" }}>{snap.sender_name}<br />{snap.sender_email}</div>
      </div>
      <div className="panel scroll">
        <table className="grid">
          <thead>
            <tr>
              <th>Product</th>
              <th><div className="tally-head">{LENGTHS.map(L => <span key={L}>{L}&apos;</span>)}</div></th>
              <th className="r">MBF</th><th>Ship</th>
              {snap.yards.map(y => <th key={y.label} className="r">{y.label.split(",")[0]}</th>)}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {snap.lines.map(l => {
              const done = bids?.find(b => b.product_id === l.product_id);
              return (
                <tr key={l.product_id}>
                  <td className="nowrap"><b>{l.dim}</b> {l.description}</td>
                  <td><div className="tally">{LENGTHS.map(L => <span key={L} className={l.tally[String(L)] ? "on" : ""}>{l.tally[String(L)] || "·"}</span>)}</div></td>
                  <td className="r num">{mbf(l.fbm)}</td>
                  <td className="nowrap">{shipLabel(l.ship)}</td>
                  {l.yards.map(y => <td key={y.label} className="r"><span className="price">{y.delivered != null ? money(y.delivered, cur) : "n/a"}</span></td>)}
                  <td className="r" style={{ minWidth: 230 }}>
                    <BidCell token={params.token} productId={l.product_id} currency={cur}
                      yards={l.yards.filter(y => y.delivered != null).map(y => ({ label: y.label, price: y.delivered as number }))}
                      done={done ? { kind: done.kind as "buy" | "counter", price: Number(done.price), yard: done.yard } : null} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="sub" style={{ marginTop: 14 }}>Tally shows units per length, 8&apos; to 20&apos;. Prices are delivered and subject to prior sale.</p>
    </div>
  );
}
