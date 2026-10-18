import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { requireUser } from "@/lib/auth";
import { getSettings, getStatuses } from "@/lib/data";
import { testMode } from "@/lib/mailer";
import SideNav from "./SideNav";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  const [settings, statuses] = await Promise.all([getSettings(), getStatuses()]);
  const day = Date.now() - 864e5;
  const hot = [...statuses.values()].filter(s => s.opens > 0 && !s.bid && s.last_opened && new Date(s.last_opened).getTime() > day).length;
  return (
    <div className="app">
      <aside className="rail">
        <Link href="/app/send" className="logo">
          <img src="/icon.png" alt="" />
          <b>Lumber<span>Offer</span></b>
        </Link>
        <div className="mill">
          <strong>{settings.mill_name}</strong>Sending as {settings.sender_email}
        </div>
        <SideNav hot={hot} />
        <div className="rail-foot">
          <UserButton />
          {testMode() ? <span>Test mode: no email goes out</span> : <span>Live sending</span>}
        </div>
      </aside>
      <main className="work">{children}</main>
    </div>
  );
}
