"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/app/send", label: "Send offers" },
  { href: "/app/activity", label: "Opens & bids" },
  { href: "/app/customers", label: "Customers" },
  { href: "/app/prices", label: "Price list" },
  { href: "/app/freight", label: "Freight" },
  { href: "/app/settings", label: "Settings" },
];

export default function SideNav({ hot }: { hot: number }) {
  const path = usePathname();
  return (
    <nav className="side" aria-label="Sections">
      {items.map(i => (
        <Link key={i.href} href={i.href} aria-current={path.startsWith(i.href) ? "page" : undefined}>
          {i.label}
          {i.href === "/app/activity" && hot > 0 ? <span className="count hot">{hot}</span> : null}
        </Link>
      ))}
    </nav>
  );
}
