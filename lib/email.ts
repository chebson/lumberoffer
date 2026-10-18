import { money } from "./pricing";
import { esc, mbf, shipLabel, tallyText } from "./format";
import type { OfferSnapshot } from "./types";

export function offerSubject(prefix: string, snap: OfferSnapshot): string {
  const species = snap.scope_label ? `${snap.scope_label} ` : "";
  return `${prefix} ${species}Offering - ${snap.customer.name} - ${snap.customer.contact}`.replace(/\s+/g, " ").trim();
}

const C = { ink: "#17201B", muted: "#5A675F", line: "#D6DDD7", head: "#1E5A45", band: "#F6F8F5" };

/**
 * Email HTML with inline styles only, since mail clients drop style sheets.
 * A bordered table with one delivered column per yard.
 */
export function renderOfferEmail(snap: OfferSnapshot, links: { offer: string; unsubscribe: string; pixel: string }) {
  const cur = snap.customer.currency;
  const first = snap.customer.contact.split(" ")[0] || "there";
  const multi = snap.yards.length > 1;
  const cell = `border:1px solid ${C.line};padding:8px 12px;font-size:13px;color:${C.ink}`;
  const th = `border:1px solid ${C.head};background:${C.head};color:#ffffff;padding:8px 12px;font-size:11px;letter-spacing:.06em;text-transform:uppercase;text-align:left`;
  const rows = snap.lines.map((l, i) => {
    const bg = i % 2 ? `background:${C.band};` : "";
    return `<tr>
<td style="${cell};${bg}white-space:nowrap"><b>${esc(l.dim)}</b> ${esc(l.description)}</td>
<td style="${cell};${bg}font-family:Menlo,Consolas,monospace;color:${C.muted};white-space:nowrap">${esc(tallyText(l.tally))}</td>
<td style="${cell};${bg}text-align:right">${mbf(l.fbm)}</td>
<td style="${cell};${bg}white-space:nowrap">${esc(shipLabel(l.ship))}</td>
${l.yards.map(y => `<td style="${cell};${bg}text-align:right;white-space:nowrap"><b>${y.delivered != null ? money(y.delivered, cur) : "n/a"}</b></td>`).join("")}
</tr>`;
  }).join("");

  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:${C.ink}">
<div style="max-width:900px">
<p style="font-size:13px;font-weight:bold;letter-spacing:.12em;text-transform:uppercase;color:${C.head};margin:0 0 16px">${esc(snap.mill_name)}</p>
<p style="font-size:14px;margin:0 0 12px">Hi ${esc(first)},</p>
<p style="font-size:14px;margin:0 0 16px">Here's what we have open, priced delivered to ${multi ? "each of your yards" : esc(snap.yards[0]?.label ?? "your yard")}. Prices in ${cur} per MBF.</p>
<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid ${C.line}">
<thead><tr>
<th style="${th}">Product</th><th style="${th}">Tally, 8' to 20'</th><th style="${th};text-align:right">MBF</th><th style="${th}">Ship</th>
${snap.yards.map(y => `<th style="${th};text-align:right">Delivered ${esc(y.label.split(",")[0])}</th>`).join("")}
</tr></thead>
<tbody>${rows}</tbody>
</table>
<p style="font-size:14px;margin:20px 0 10px">Buy or counter any line in one click:</p>
<p style="margin:0 0 20px"><a href="${esc(links.offer)}" style="display:inline-block;background:${C.head};color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:10px 18px;border-radius:6px">View your offer</a></p>
<p style="font-size:12px;color:${C.muted};margin:0 0 16px">Subject to prior sale.</p>
<p style="font-size:14px;margin:0">${esc(snap.sender_name)}<br>${esc(snap.mill_name)}<br>${esc(snap.sender_email)}</p>
<p style="font-size:11px;color:${C.muted};margin:24px 0 0">Don't want these offers? <a href="${esc(links.unsubscribe)}" style="color:${C.muted}">Unsubscribe</a>.</p>
<img src="${esc(links.pixel)}" width="1" height="1" alt="" style="display:block;border:0">
</div></body></html>`;

  const text = [
    `Hi ${first},`, "",
    `Delivered prices (${cur}/MBF):`, "",
    ...snap.lines.map(l => `${l.dim} ${l.description} | ${mbf(l.fbm)} MBF | ${shipLabel(l.ship)} | ` +
      l.yards.map(y => `${y.label.split(",")[0]} ${y.delivered != null ? money(y.delivered, cur) : "n/a"}`).join(" | ")),
    "", `Buy or counter: ${links.offer}`, "", "Subject to prior sale.", "",
    snap.sender_name, snap.mill_name, "", `Unsubscribe: ${links.unsubscribe}`,
  ].join("\n");

  return { html, text };
}
