"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCustomer, saveCustomer, type CustomerInput } from "../../actions";
import { EQUIPMENT, type Customer, type Equipment } from "@/lib/types";

type Lane = { label: string; city: string; st: string; truck: string[]; rail: string[] };
type YardIn = CustomerInput["yards"][number];

const blankYard = (): YardIn => ({ city: "", st: "", mode: "truck", equipment: "Tridem/Maxi", rail_carrier: null, manual_frt: null });

export default function CustomerForm({ customer, lists, dims, lanes }: {
  customer: Customer | null; lists: { key: string; label: string }[]; dims: string[]; lanes: Lane[];
}) {
  const router = useRouter();
  const [f, setF] = useState<CustomerInput>(() => customer ? {
    id: customer.id, name: customer.name, contact: customer.contact, email: customer.email, currency: customer.currency,
    lists: customer.lists, dims: customer.dims, adj: customer.adj,
    yards: customer.yards.map(y => ({ city: y.city, st: y.st, mode: y.mode, equipment: y.equipment, rail_carrier: y.rail_carrier, manual_frt: y.manual_frt })),
  } : { name: "", contact: "", email: "", currency: "USD", lists: [], dims: [], adj: 0, yards: [blankYard()] });
  const [raw, setRaw] = useState<string[]>(() => f.yards.map(y => (y.city ? `${y.city}, ${y.st}` : "")));
  const [error, setError] = useState<string | null>(null);
  const [armed, setArmed] = useState(false);
  const [pending, start] = useTransition();

  const set = <K extends keyof CustomerInput>(k: K, v: CustomerInput[K]) => setF(p => ({ ...p, [k]: v }));
  const setYard = (i: number, patch: Partial<YardIn>) => set("yards", f.yards.map((y, j) => j === i ? { ...y, ...patch } : y));
  const toggle = (k: "lists" | "dims", v: string) => set(k, f[k].includes(v) ? f[k].filter(x => x !== v) : [...f[k], v]);
  const laneFor = (y: YardIn) => lanes.find(l => l.city.toLowerCase() === y.city.trim().toLowerCase() && l.st === y.st.trim().toUpperCase());

  return (
    <form className="panel pad stack" onSubmit={e => {
      e.preventDefault();
      setError(null);
      start(async () => {
        const r = await saveCustomer(f);
        if (r.error) setError(r.error); else { router.push("/app/customers"); router.refresh(); }
      });
    }}>
      <div className="grid2">
        <div className="field"><label htmlFor="name">Company</label><input id="name" value={f.name} onChange={e => set("name", e.target.value)} /></div>
        <div className="field"><label htmlFor="contact">Buyer</label><input id="contact" value={f.contact} onChange={e => set("contact", e.target.value)} /></div>
        <div className="field"><label htmlFor="email">Buyer email</label><input id="email" type="email" value={f.email} onChange={e => set("email", e.target.value)} /></div>
        <div className="field"><label htmlFor="cur">Quote in</label>
          <select id="cur" value={f.currency} onChange={e => set("currency", e.target.value as "USD" | "CAD")}><option>USD</option><option>CAD</option></select></div>
        <div className="field"><label htmlFor="adj">Price adjustment $/MBF</label><input id="adj" type="number" value={f.adj} onChange={e => set("adj", Number(e.target.value))} /></div>
      </div>

      <div className="field">
        <span className="flabel">Yards (each one is priced on the offer)</span>
        <datalist id="lanes">{lanes.map(l => <option key={l.label} value={l.label} />)}</datalist>
        <div className="stack" style={{ gap: 8 }}>
          {f.yards.map((y, i) => {
            const lane = laneFor(y);
            return (
              <div key={i} className="yard">
                <input aria-label="Yard city" list="lanes" placeholder="City, State" value={raw[i] ?? ""}
                  onChange={e => {
                    const v = e.target.value;
                    setRaw(r => r.map((x, j) => (j === i ? v : x)));
                    const [city, st] = v.split(",");
                    setYard(i, { city: (city ?? "").trim(), st: (st ?? "").trim().toUpperCase() });
                  }} />
                <select aria-label="Ships by" value={y.mode} onChange={e => setYard(i, { mode: e.target.value as "truck" | "rail" })}>
                  <option value="truck">Truck</option><option value="rail">Rail</option>
                </select>
                {y.mode === "truck" ? (
                  <select aria-label="Equipment" value={y.equipment} onChange={e => setYard(i, { equipment: e.target.value as Equipment })}>
                    {EQUIPMENT.map(eq => <option key={eq} value={eq}>{eq}{lane && !lane.truck.includes(eq) ? " (no rate)" : ""}</option>)}
                  </select>
                ) : (
                  <select aria-label="Rail carrier" value={y.rail_carrier ?? ""} onChange={e => setYard(i, { rail_carrier: e.target.value || null })}>
                    <option value="">Cheapest on file</option>
                    {(lane?.rail ?? []).map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                )}
                <input aria-label="Manual freight $/MBF" type="number" placeholder="Manual $/MBF" value={y.manual_frt ?? ""}
                  onChange={e => setYard(i, { manual_frt: e.target.value === "" ? null : Number(e.target.value) })} />
                <button type="button" className="btn small ghost" disabled={f.yards.length < 2} onClick={() => { set("yards", f.yards.filter((_, j) => j !== i)); setRaw(r => r.filter((_, j) => j !== i)); }}>Remove</button>
              </div>
            );
          })}
        </div>
        <div><button type="button" className="btn small" onClick={() => { set("yards", [...f.yards, blankYard()]); setRaw(r => [...r, ""]); }}>Add another yard</button></div>
        <div className="sub">Manual $/MBF is used only when no rate is on file for that yard.</div>
      </div>

      <div className="field"><span className="flabel">Buys (puts them in these groups)</span>
        <div className="checks">{lists.map(l => <label key={l.key}><input type="checkbox" checked={f.lists.includes(l.key)} onChange={() => toggle("lists", l.key)} /> {l.label}</label>)}</div></div>
      <div className="field"><span className="flabel">Widths (leave all off for every width)</span>
        <div className="checks">{dims.map(d => <label key={d}><input type="checkbox" checked={f.dims.includes(d)} onChange={() => toggle("dims", d)} /> {d}</label>)}</div></div>

      {error ? <div className="msg-err">{error}</div> : null}
      <div className="row" style={{ justifyContent: "space-between" }}>
        {customer ? (
          <button type="button" className="btn ghost danger" disabled={pending}
            onClick={() => armed ? start(() => deleteCustomer(customer.id)) : setArmed(true)}>
            {armed ? "Click again to remove" : "Remove customer"}
          </button>
        ) : <span />}
        <button className="btn primary" disabled={pending}>{pending ? "Saving..." : customer ? "Save changes" : "Add customer"}</button>
      </div>
    </form>
  );
}
