import "server-only";
import { ServerClient } from "postmark";

export const testMode = () => !process.env.POSTMARK_SERVER_TOKEN;

export const appUrl = () => (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Sends one email through Postmark. In test mode nothing is sent and null is returned. */
export async function sendEmail(msg: {
  from: string; to: string; subject: string; html: string; text: string; unsubscribeUrl: string;
}): Promise<string | null> {
  if (testMode()) return null;
  const client = new ServerClient(process.env.POSTMARK_SERVER_TOKEN!);
  const res = await client.sendEmail({
    From: msg.from,
    To: msg.to,
    Subject: msg.subject,
    HtmlBody: msg.html,
    TextBody: msg.text,
    MessageStream: "outbound",
    TrackOpens: false,
    Headers: [
      { Name: "List-Unsubscribe", Value: `<${msg.unsubscribeUrl}>` },
      { Name: "List-Unsubscribe-Post", Value: "List-Unsubscribe=One-Click" },
    ],
  });
  return res.MessageID;
}
