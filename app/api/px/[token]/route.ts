import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

/** Tracking pixel in the email. Counted as an email open; less reliable than a page visit. */
export async function GET(req: Request, { params }: { params: { token: string } }) {
  try {
    const { data: r } = await db().from("recipients").select("id").eq("token", params.token).maybeSingle();
    if (r) await db().from("opens").insert({ recipient_id: r.id, kind: "pixel", user_agent: req.headers.get("user-agent")?.slice(0, 300) ?? null });
  } catch {
    // never break the image
  }
  return new Response(GIF, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-store, max-age=0" } });
}
