import { LENGTHS } from "./types";

export const mbf = (fbm: number) => (fbm / 1000).toFixed(1);

export const tallyText = (t: Record<string, number>) => LENGTHS.map(L => t[String(L)] || 0).join(" ");

export function shipLabel(ship: string): string {
  if (!ship || /^prompt$/i.test(ship)) return "Prompt";
  const d = new Date(ship + "T12:00:00");
  if (Number.isNaN(d.getTime())) return ship;
  return "Wk of " + d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function ago(iso: string | null | undefined): string {
  if (!iso) return "";
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

export const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
