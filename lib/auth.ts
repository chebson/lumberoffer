import "server-only";
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

/** Signed-in user allowed by ALLOWED_EMAILS, or a redirect to sign in. */
export async function requireUser() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const email = user.primaryEmailAddress?.emailAddress?.toLowerCase() ?? "";
  const allowed = (process.env.ALLOWED_EMAILS ?? "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
  if (allowed.length && !allowed.includes(email)) redirect("/no-access");
  return { id: user.id, email };
}
