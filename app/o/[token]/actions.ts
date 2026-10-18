"use server";

import { db } from "@/lib/db";
import type { OfferSnapshot } from "@/lib/types";

/** A buyer's Buy or Counter from their offer page. Validated against the offer as it was sent. */
export async function placeBid(
  token: string, productId: string, yardIndex: number, kind: "buy" | "counter", counter: number | null,
): Promise<{ error?: string; price?: number }> {
  const { data: r } = await db().from("recipients").select("id, customer_id, snapshot").eq("token", token).maybeSingle();
  if (!r) return { error: "This offer link is no longer valid." };
  const snap = r.snapshot as OfferSnapshot;
  const line = snap.lines.find(l => l.product_id === productId);
  const priced = line?.yards.filter(y => y.delivered != null) ?? [];
  const yard = priced[yardIndex];
  if (!line || !yard) return { error: "That line isn't on this offer." };
  const price = kind === "buy" ? (yard.delivered as number) : Number(counter);
  if (!(price > 0) || price > 100000) return { error: "Enter a price per MBF." };
  const existing = await db().from("bids").select("id").eq("recipient_id", r.id).eq("product_id", productId).maybeSingle();
  if (existing.data) return { error: "You've already responded on this line. The mill will be in touch." };
  const ins = await db().from("bids").insert({
    recipient_id: r.id, customer_id: r.customer_id, product_id: productId,
    product_label: `${line.dim} ${line.description}`, yard: yard.label, kind, price, currency: snap.customer.currency,
  });
  if (ins.error) return { error: "Couldn't send that. Please try again." };
  return { price };
}
