"use client";

import { useState, useTransition } from "react";
import { placeBid } from "./actions";
import { money } from "@/lib/pricing";

export default function BidCell({ token, productId, currency, yards, done }: {
  token: string; productId: string; currency: "USD" | "CAD";
  yards: { label: string; price: number }[];
  done: { kind: "buy" | "counter"; price: number; yard: string } | null;
}) {
  const [state, setState] = useState(done);
  const [mode, setMode] = useState<"idle" | "buy" | "counter">("idle");
  const [yard, setYard] = useState(0);
  const [price, setPrice] = useState(String((yards[0]?.price ?? 0) - 10));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (state) {
    return <span className="msg-ok">{state.kind === "buy" ? "Purchase request sent" : `Counter at ${money(state.price, currency)} sent`}{yards.length > 1 ? `, ${state.yard.split(",")[0]}` : ""}</span>;
  }
  const submit = (kind: "buy" | "counter") => start(async () => {
    setError(null);
    const r = await placeBid(token, productId, yard, kind, kind === "counter" ? Number(price) : null);
    if (r.error) setError(r.error);
    else setState({ kind, price: r.price!, yard: yards[yard].label });
  });
  const yardPick = yards.length > 1 ? (
    <select aria-label="Yard" value={yard} onChange={e => setYard(Number(e.target.value))} className="inline" style={{ width: "auto", textAlign: "left", fontFamily: "inherit" }}>
      {yards.map((y, i) => <option key={y.label} value={i}>{y.label.split(",")[0]}</option>)}
    </select>
  ) : null;

  if (mode === "idle") {
    return (
      <div className="row" style={{ justifyContent: "flex-end" }}>
        <button className="btn small primary" onClick={() => setMode("buy")}>Buy</button>
        <button className="btn small" onClick={() => setMode("counter")}>Counter</button>
      </div>
    );
  }
  return (
    <div className="stack" style={{ gap: 4, alignItems: "flex-end" }}>
      <div className="row" style={{ justifyContent: "flex-end" }}>
        {yardPick}
        {mode === "counter" ? <input className="inline" type="number" aria-label="Counter price" value={price} onChange={e => setPrice(e.target.value)} /> : <span className="sub">at {money(yards[yard].price, currency)}</span>}
        <button className="btn small primary" disabled={pending} onClick={() => submit(mode)}>{mode === "buy" ? "Confirm buy" : "Send counter"}</button>
        <button className="btn small ghost" onClick={() => setMode("idle")}>Cancel</button>
      </div>
      {error ? <span className="msg-err sub">{error}</span> : null}
    </div>
  );
}
