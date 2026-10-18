import { notFound } from "next/navigation";
import { getCustomers, getLists, getProducts, getRates } from "@/lib/data";
import CustomerForm from "./CustomerForm";

export default async function CustomerPage({ params }: { params: { id: string } }) {
  const [customers, lists, products, rates] = await Promise.all([getCustomers(), getLists(), getProducts(), getRates()]);
  const isNew = params.id === "new";
  const c = isNew ? null : customers.find(x => x.id === params.id);
  if (!isNew && !c) notFound();
  const dims = [...new Set(products.map(p => p.dim))].sort((a, b) => parseInt(a.split("x")[1]) - parseInt(b.split("x")[1]));
  const lanes = new Map<string, { city: string; st: string; truck: string[]; rail: string[] }>();
  for (const t of rates.truck) {
    const k = `${t.city}, ${t.st}`;
    const v = lanes.get(k) ?? { city: t.city, st: t.st, truck: [], rail: [] };
    if (!v.truck.includes(t.equipment)) v.truck.push(t.equipment);
    lanes.set(k, v);
  }
  for (const r of rates.rail) {
    const k = `${r.city}, ${r.st}`;
    const v = lanes.get(k) ?? { city: r.city, st: r.st, truck: [], rail: [] };
    if (!v.rail.includes(r.carrier)) v.rail.push(r.carrier);
    lanes.set(k, v);
  }
  return (
    <>
      <div className="head">
        <div>
          <div className="eyebrow">{isNew ? "New customer" : "Customer profile"}</div>
          <h1>{c?.name ?? "Add a customer"}</h1>
        </div>
      </div>
      <CustomerForm
        customer={c ?? null}
        lists={lists.map(l => ({ key: l.key, label: l.label }))}
        dims={dims}
        lanes={[...lanes.entries()].sort().map(([label, v]) => ({ label, ...v }))}
      />
    </>
  );
}
