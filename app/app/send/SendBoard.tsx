"use client";

import { useMemo, useState, useTransition } from "react";
import { previewEmail, sendOffers, type SendResult } from "../actions";
import type { CustomerStatus } from "@/lib/data";
import { money } from "@/lib/pricing";
import { ago } from "@/lib/format";

export type BoardCustomer = {
  id: string; name: string; contact: string; email: string; currency: "USD" | "CAD";
  unsubscribed: boolean; lists: string[]; yards: string[];
  status: CustomerStatus | null;
  byScope: Record<string, { lines: number; from: number | null }>;
};
export type BoardGroup = { key: string; label: string; ids: string[]; lines: number };

type Preview = { subject: string; from: string; to: string; html: string; lines: number };

function statusPill(s: CustomerStatus | null) {
  if (!s?.last_sent) return <span className="pill idle">Never sent</span>;
  if (s.bid) return <span className="pill bid">{s.bid === "buy" ? "Wants to buy" : "Countered"}</span>;
  if (s.opens) return <span className="pill open">Opened {s.opens}×</span>;
  return <span className="pill sent">Not opened</span>;
}

export default function SendBoard({ customers, groups }: { customers: BoardCustomer[]; groups: BoardGroup[] }) {
  const [scope, setScope] = useState(groups[0]?.key ?? "");
  const eligible = (k: string) =>
    new Set((groups.find(g => g.key === k)?.ids ?? []).filter(id => {
      const c = customers.find(x => x.id === id);
      return c && !c.unsubscribed && c.byScope[k]?.lines > 0;
    }));
  const [selected, setSelected] = useState<Set<string>>(() => eligible(groups[0]?.key ?? ""));
  const [preview, setPreview] = useState<{ ids: string[]; i: number; data: Preview | null } | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const inGroup = useMemo(() => {
    const ids = new Set(groups.find(g => g.key === scope)?.ids ?? []);
    return customers.filter(c => ids.has(c.id));
  }, [customers, groups, scope]);
  const scopeLabel = scope ? groups.find(g => g.key === scope)?.label.replace(/ buyers$/, "") ?? scope : "full";
  const ids = [...selected].filter(id => inGroup.some(c => c.id === id));

  const pickGroup = (k: string) => { setScope(k); setSelected(eligible(k)); setResult(null); };

  const openPreview = (list: string[], i = 0) => {
    setError(null);
    setPreview({ ids: list, i, data: null });
    start(async () => {
      try { setPreview({ ids: list, i, data: await previewEmail(list[i], scope || null) }); }
      catch (e) { setError(e instanceof Error ? e.message : String(e)); setPreview(null); }
    });
  };

  const doSend = (list: string[]) => {
    setError(null);
    start(async () => {
      try { setResult(await sendOffers(list, scope || null)); setPreview(null); }
      catch (e) { setError(e instanceof Error ? e.message : String(e)); }
    });
  };

  return (
    <>
      <div className="groups">
        {groups.map(g => (
          <button key={g.key || "all"} className="group" aria-pressed={g.key === scope} onClick={() => pickGroup(g.key)}>
            <b>{g.label}</b>
            <span className="sub">{g.ids.length} customer{g.ids.length === 1 ? "" : "s"} · {g.lines} lines</span>
          </button>
        ))}
      </div>

      {result ? (
        <div className="banner">
          {result.testMode ? "Test mode: " : ""}{result.sent} offer{result.sent === 1 ? "" : "s"} {result.testMode ? "recorded" : "sent"}.
          {result.skipped.length ? ` Skipped ${result.skipped.join(", ")}.` : ""}
          {result.failed.length ? ` Failed: ${result.failed.join("; ")}.` : ""}
        </div>
      ) : null}
      {error ? <div className="banner msg-err">{error}</div> : null}

      <div className="panel scroll">
        <table className="grid">
          <thead>
            <tr><th style={{ width: 34 }}></th><th>Customer</th><th>Yards</th><th className="r">Lines</th><th className="r">Delivered</th><th>Last offer</th><th></th></tr>
          </thead>
          <tbody>
            {inGroup.length === 0 ? (
              <tr><td colSpan={7} className="empty">Nobody buys this list yet.</td></tr>
            ) : inGroup.map(c => {
              const o = c.byScope[scope] ?? { lines: 0, from: null };
              const can = !c.unsubscribed && o.lines > 0;
              return (
                <tr key={c.id}>
                  <td>
                    <input type="checkbox" aria-label={`Select ${c.name}`} disabled={!can} checked={selected.has(c.id)}
                      onChange={e => { const n = new Set(selected); if (e.target.checked) n.add(c.id); else n.delete(c.id); setSelected(n); }}
                      style={{ width: 16, height: 16, accentColor: "var(--accent)" }} />
                  </td>
                  <td><div style={{ fontWeight: 600 }}>{c.name}</div><div className="sub">{c.contact} · {c.email}</div></td>
                  <td>{c.yards.map(y => <div key={y}>{y}</div>)}</td>
                  <td className="r num">{o.lines}</td>
                  <td className="r">{o.from != null ? <><span className="num">{money(o.from, c.currency)}</span><div className="sub">from, delivered</div></> : <span className="sub">No priced lines</span>}</td>
                  <td>{c.unsubscribed ? <span className="pill bad">Unsubscribed</span> : statusPill(c.status)}
                    {c.status?.last_opened ? <div className="sub">last {ago(c.status.last_opened)}</div> : null}</td>
                  <td className="r"><button className="btn small" disabled={!can || pending} onClick={() => openPreview([c.id])}>Preview email</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="sendbar">
        <div><b>{ids.length}</b> buyer{ids.length === 1 ? "" : "s"} selected <span className="muted">· {scopeLabel} offer</span></div>
        <button className="btn primary" disabled={!ids.length || pending} onClick={() => openPreview(ids)}>
          Review and send {scopeLabel} offer to {ids.length}
        </button>
      </div>

      {preview ? (
        <div className="overlay" onClick={e => { if (e.target === e.currentTarget) setPreview(null); }}>
          <div className="drawer" role="dialog" aria-modal="true" aria-label="Review email">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <div><div className="eyebrow">Email {preview.i + 1} of {preview.ids.length}</div>
                <h2>{customers.find(c => c.id === preview.ids[preview.i])?.name}</h2></div>
              <button className="btn ghost" onClick={() => setPreview(null)}>Close</button>
            </div>
            <div className="panel">
              {preview.data ? (
                <>
                  <dl className="email-meta">
                    <dt>From</dt><dd>{preview.data.from}</dd>
                    <dt>To</dt><dd>{preview.data.to}</dd>
                    <dt>Subject</dt><dd><b>{preview.data.subject}</b></dd>
                  </dl>
                  <iframe className="email-frame" title="Email preview" srcDoc={preview.data.html} sandbox="" />
                </>
              ) : <div className="empty">Building the email...</div>}
            </div>
            <div className="row" style={{ justifyContent: "flex-end" }}>
              {preview.i > 0 ? <button className="btn" disabled={pending} onClick={() => openPreview(preview.ids, preview.i - 1)}>Back</button> : null}
              {preview.i < preview.ids.length - 1 ? <button className="btn" disabled={pending} onClick={() => openPreview(preview.ids, preview.i + 1)}>Next</button> : null}
              <button className="btn primary" disabled={pending || !preview.data} onClick={() => doSend(preview.ids)}>
                {pending ? "Working..." : `Send ${preview.ids.length === 1 ? "this offer" : `${preview.ids.length} offers`}`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
