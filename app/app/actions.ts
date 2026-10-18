"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { db, must } from "@/lib/db";
import { getCustomers, getLists, getProducts, getRates, getSettings } from "@/lib/data";
import { buildOffer, buildRateBook, yardLabel } from "@/lib/pricing";
import { offerSubject, renderOfferEmail } from "@/lib/email";
import { appUrl, sendEmail, testMode } from "@/lib/mailer";
import { customersFromCsv, productsFromCsv, railFromCsv, truckFromCsv, toCurrency } from "@/lib/csv";
import { EQUIPMENT, type Customer, type Equipment, type OfferSnapshot } from "@/lib/types";

async function snapshotFor(c: Customer, scope: string | null) {
  const [settings, lists, products, rates] = await Promise.all([getSettings(), getLists(), getProducts(), getRates()]);
  const lines = buildOffer(c, products, lists, buildRateBook(rates.truck, rates.rail), settings, scope);
  const snap: OfferSnapshot = {
    mill_name: settings.mill_name, sender_name: settings.sender_name, sender_email: settings.sender_email,
    customer: { name: c.name, contact: c.contact, currency: c.currency },
    yards: c.yards.map(y => ({ label: yardLabel(y), mode: y.mode, equipment: y.equipment })),
    scope_label: scope ? lists.find(l => l.key === scope)?.label ?? scope : null,
    lines, created_at: new Date().toISOString(),
  };
  return { snap, settings };
}

const links = (token: string) => ({
  offer: `${appUrl()}/o/${token}`,
  unsubscribe: `${appUrl()}/api/unsubscribe/${token}`,
  pixel: `${appUrl()}/api/px/${token}`,
});

export async function previewEmail(customerId: string, scope: string | null) {
  await requireUser();
  const c = (await getCustomers()).find(x => x.id === customerId);
  if (!c) throw new Error("Customer not found");
  const { snap, settings } = await snapshotFor(c, scope);
  const { html } = renderOfferEmail(snap, links("preview"));
  return {
    subject: offerSubject(settings.subject_prefix, snap),
    from: `${settings.sender_name} <${settings.sender_email}>`,
    to: `${c.contact} <${c.email}>`,
    html, lines: snap.lines.length,
  };
}

export type SendResult = { sent: number; skipped: string[]; failed: string[]; testMode: boolean };

export async function sendOffers(customerIds: string[], scope: string | null): Promise<SendResult> {
  const user = await requireUser();
  const all = await getCustomers();
  const send = must(await db().from("sends").insert({ scope, created_by: user.email }).select("id").single(), "send") as { id: string };
  const result: SendResult = { sent: 0, skipped: [], failed: [], testMode: testMode() };
  for (const id of customerIds) {
    const c = all.find(x => x.id === id);
    if (!c) continue;
    if (c.unsubscribed_at) { result.skipped.push(`${c.name} (unsubscribed)`); continue; }
    const { snap, settings } = await snapshotFor(c, scope);
    if (!snap.lines.length) { result.skipped.push(`${c.name} (no priced lines)`); continue; }
    const token = randomBytes(18).toString("base64url");
    const subject = offerSubject(settings.subject_prefix, snap);
    const ins = await db().from("recipients")
      .insert({ send_id: send.id, customer_id: c.id, token, subject, snapshot: snap, test_mode: testMode() })
      .select("id").single();
    if (ins.error) { result.failed.push(`${c.name}: ${ins.error.message}`); continue; }
    try {
      const { html, text } = renderOfferEmail(snap, links(token));
      const providerId = await sendEmail({
        from: `${settings.sender_name} <${settings.sender_email}>`, to: c.contact ? `${c.contact} <${c.email}>` : c.email,
        subject, html, text, unsubscribeUrl: links(token).unsubscribe,
      });
      await db().from("recipients").update({ sent_at: new Date().toISOString(), provider_id: providerId }).eq("id", ins.data.id);
      result.sent++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await db().from("recipients").update({ error: msg }).eq("id", ins.data.id);
      result.failed.push(`${c.name}: ${msg}`);
    }
  }
  revalidatePath("/app", "layout");
  return result;
}

export async function setBidStatus(formData: FormData) {
  await requireUser();
  const status = String(formData.get("status"));
  if (!["confirmed", "declined"].includes(status)) return;
  must(await db().from("bids").update({ status }).eq("id", String(formData.get("id"))), "bid");
  revalidatePath("/app/activity");
}

export type CustomerInput = {
  id?: string; name: string; contact: string; email: string; currency: "USD" | "CAD";
  lists: string[]; dims: string[]; adj: number;
  yards: { city: string; st: string; mode: "truck" | "rail"; equipment: Equipment; rail_carrier: string | null; manual_frt: number | null }[];
};

export async function saveCustomer(input: CustomerInput): Promise<{ error?: string }> {
  await requireUser();
  const yards = input.yards.filter(y => y.city.trim() && y.st.trim());
  if (!input.name.trim() || !input.email.trim()) return { error: "Company and buyer email are required." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email.trim())) return { error: "That email address doesn't look right." };
  if (!input.lists.length) return { error: "Pick at least one list they buy." };
  if (!yards.length) return { error: "Add at least one yard." };
  if (yards.some(y => !EQUIPMENT.includes(y.equipment))) return { error: "Pick equipment for every truck yard." };
  const row = {
    name: input.name.trim(), contact: input.contact.trim(), email: input.email.trim(), currency: toCurrency(input.currency),
    lists: input.lists, dims: input.dims, adj: Number(input.adj) || 0,
  };
  let id = input.id;
  if (id) must(await db().from("customers").update(row).eq("id", id), "customer");
  else id = (must(await db().from("customers").insert(row).select("id").single(), "customer") as { id: string }).id;
  must(await db().from("yards").delete().eq("customer_id", id), "yards");
  must(await db().from("yards").insert(yards.map((y, i) => ({
    customer_id: id, city: y.city.trim(), st: y.st.trim().toUpperCase(), mode: y.mode, equipment: y.equipment,
    rail_carrier: y.rail_carrier || null, manual_frt: y.manual_frt ?? null, sort: i,
  }))), "yards");
  revalidatePath("/app", "layout");
  return {};
}

export async function deleteCustomer(id: string) {
  await requireUser();
  must(await db().from("customers").delete().eq("id", id), "customer");
  revalidatePath("/app", "layout");
  redirect("/app/customers");
}

export async function updateProduct(formData: FormData) {
  await requireUser();
  const usd = Number(formData.get("usd")), cad = Number(formData.get("cad"));
  if (!(usd > 0) || !(cad > 0)) return;
  must(await db().from("products").update({ usd, cad, active: formData.get("active") === "on" }).eq("id", String(formData.get("id"))), "product");
  revalidatePath("/app", "layout");
}

export type ImportResult = { ok: boolean; message: string };

export async function importCsv(kind: "products" | "truck" | "rail" | "customers", text: string): Promise<ImportResult> {
  await requireUser();
  if (kind === "products") {
    const { rows, errors } = productsFromCsv(text);
    if (errors.length) return { ok: false, message: errors.slice(0, 5).join(". ") };
    const known = new Set((await getLists()).map(l => l.key));
    const unknown = [...new Set(rows.map(r => r.list_key).filter(k => !known.has(k)))];
    if (unknown.length) return { ok: false, message: `Unknown list ${unknown.join(", ")}. Add it under Settings first.` };
    must(await db().from("products").delete().neq("id", "00000000-0000-0000-0000-000000000000"), "products");
    must(await db().from("products").insert(rows), "products");
    revalidatePath("/app", "layout");
    return { ok: true, message: `Loaded ${rows.length} price lines. Every offer now uses the new list.` };
  }
  if (kind === "truck" || kind === "rail") {
    const { rows, errors } = kind === "truck" ? truckFromCsv(text) : railFromCsv(text);
    if (!rows.length) return { ok: false, message: errors.slice(0, 5).join(". ") || "No rows found." };
    const table = kind === "truck" ? "truck_rates" : "rail_rates";
    must(await db().from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000"), table);
    must(await db().from(table).insert(rows), table);
    revalidatePath("/app", "layout");
    return { ok: true, message: `Loaded ${rows.length} ${kind} rates${errors.length ? `, skipped ${errors.length} rows` : ""}.` };
  }
  const { rows, errors } = customersFromCsv(text);
  if (errors.length) return { ok: false, message: errors.slice(0, 5).join(". ") };
  for (const c of rows) {
    const r = await saveCustomer({ ...c, adj: 0, yards: c.yards.map(y => ({ ...y, manual_frt: null })) });
    if (r.error) return { ok: false, message: `${c.name}: ${r.error}` };
  }
  return { ok: true, message: `Added ${rows.length} customers.` };
}

export async function saveSettings(formData: FormData) {
  await requireUser();
  const pick = String(formData.get("truck_pick"));
  must(await db().from("settings").update({
    mill_name: String(formData.get("mill_name") || "").trim(),
    sender_name: String(formData.get("sender_name") || "").trim(),
    sender_email: String(formData.get("sender_email") || "").trim(),
    subject_prefix: String(formData.get("subject_prefix") || "").trim(),
    fx_usd_cad: Number(formData.get("fx_usd_cad")) || 1.37,
    truck_pick: ["max", "min", "avg"].includes(pick) ? pick : "max",
    updated_at: new Date().toISOString(),
  }).eq("id", 1), "settings");
  revalidatePath("/app", "layout");
}

export async function saveList(formData: FormData) {
  await requireUser();
  const key = String(formData.get("key") || "").trim().toUpperCase();
  if (!key) return;
  must(await db().from("lists").upsert({
    key, label: String(formData.get("label") || key).trim(),
    mbf_tridem: Number(formData.get("mbf_tridem")) || 30, mbf_tandem: Number(formData.get("mbf_tandem")) || 24,
    mbf_superb: Number(formData.get("mbf_superb")) || 50, sort: Number(formData.get("sort")) || 0,
  }), "list");
  revalidatePath("/app", "layout");
}
