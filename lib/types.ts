export type Currency = "USD" | "CAD";
export type Equipment = "Tridem/Maxi" | "Tandem" | "Super B";
export const EQUIPMENT: Equipment[] = ["Tridem/Maxi", "Tandem", "Super B"];
export const LENGTHS = [8, 10, 12, 14, 16, 18, 20] as const;

export type Settings = {
  mill_name: string;
  sender_name: string;
  sender_email: string;
  subject_prefix: string;
  fx_usd_cad: number;
  truck_pick: "max" | "min" | "avg";
};

export type List = {
  key: string;
  label: string;
  mbf_tridem: number;
  mbf_tandem: number;
  mbf_superb: number;
  sort: number;
};

export type Product = {
  id: string;
  list_key: string;
  dim: string;
  description: string;
  tally: Record<string, number>;
  fbm: number;
  ship: string;
  usd: number;
  cad: number;
  active: boolean;
  sort: number;
};

export type TruckRate = {
  id?: string;
  city: string;
  st: string;
  equipment: Equipment;
  carrier: string;
  rate: number;
  currency: Currency;
};

export type RailRate = {
  id?: string;
  city: string;
  st: string;
  carrier: string;
  rate_mbf: number;
  currency: Currency;
};

export type Yard = {
  id?: string;
  customer_id?: string;
  city: string;
  st: string;
  mode: "truck" | "rail";
  equipment: Equipment;
  rail_carrier: string | null;
  manual_frt: number | null;
  sort: number;
};

export type Customer = {
  id: string;
  name: string;
  contact: string;
  email: string;
  currency: Currency;
  lists: string[];
  dims: string[];
  adj: number;
  unsubscribed_at: string | null;
  yards: Yard[];
};

export type Freight = { ok: true; mbf: number; how: string } | { ok: false; how: string };

export type OfferYardPrice = { label: string; delivered: number | null; how: string };

export type OfferLine = {
  product_id: string;
  list_key: string;
  dim: string;
  description: string;
  tally: Record<string, number>;
  fbm: number;
  ship: string;
  base: number;
  yards: OfferYardPrice[];
};

/** Everything a buyer sees, frozen at send time. */
export type OfferSnapshot = {
  mill_name: string;
  sender_name: string;
  sender_email: string;
  customer: { name: string; contact: string; currency: Currency };
  yards: { label: string; mode: "truck" | "rail"; equipment: Equipment }[];
  scope_label: string | null;
  lines: OfferLine[];
  created_at: string;
};
