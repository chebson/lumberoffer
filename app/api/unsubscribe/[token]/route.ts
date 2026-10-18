import { db } from "@/lib/db";
import { esc } from "@/lib/format";

export const dynamic = "force-dynamic";

const page = (title: string, body: string) =>
  new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="font-family:Arial,Helvetica,sans-serif;background:#EFF2EE;color:#17201B;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px">
<div style="background:#fff;border:1px solid #D6DDD7;border-radius:10px;padding:24px;max-width:420px">${body}</div></body></html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );

async function customerFor(token: string) {
  const { data } = await db().from("recipients").select("customer_id, snapshot").eq("token", token).maybeSingle();
  return data as { customer_id: string; snapshot: { mill_name: string } } | null;
}

/** Shows a confirm button, so link scanners that follow GET links don't unsubscribe anyone. */
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const r = await customerFor(params.token);
  if (!r) return page("Link not found", "<p>This link is no longer valid.</p>");
  return page("Unsubscribe", `<h2 style="margin-top:0">Stop offers from ${esc(r.snapshot.mill_name)}?</h2>
<form method="post"><button style="background:#1E5A45;color:#fff;border:0;border-radius:6px;padding:10px 16px;font-weight:bold;cursor:pointer">Unsubscribe</button></form>`);
}

/** Handles the button above and one-click unsubscribe from mail apps (List-Unsubscribe-Post). */
export async function POST(_req: Request, { params }: { params: { token: string } }) {
  const r = await customerFor(params.token);
  if (!r) return page("Link not found", "<p>This link is no longer valid.</p>");
  await db().from("customers").update({ unsubscribed_at: new Date().toISOString() }).eq("id", r.customer_id).is("unsubscribed_at", null);
  return page("Unsubscribed", `<h2 style="margin-top:0">You're unsubscribed</h2><p>You won't get more offers from ${esc(r.snapshot.mill_name)}.</p>`);
}
