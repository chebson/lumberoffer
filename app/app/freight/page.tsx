import { getRates } from "@/lib/data";
import { money } from "@/lib/pricing";
import CsvImport from "../CsvImport";

export default async function FreightPage() {
  const { truck, rail } = await getRates();
  return (
    <>
      <div className="head">
        <div>
          <div className="eyebrow">Freight</div>
          <h1>Truck and rail rates</h1>
          <p>Truck quotes per load by city and equipment, and rail rates per MBF by destination. LumberOffer turns them into $/MBF for each customer&apos;s yard, using MBF per truck from Settings.</p>
        </div>
      </div>
      <div className="grid2" style={{ alignItems: "start", marginBottom: 16 }}>
        <CsvImport kind="truck" label="Load truck rates (CSV)" columns="city, state, equipment, carrier, rate, currency" />
        <CsvImport kind="rail" label="Load rail rates (CSV)" columns="city, state, carrier, rate_mbf, currency" />
      </div>
      <div className="grid2" style={{ alignItems: "start" }}>
        <div className="panel scroll">
          <table className="grid">
            <thead><tr><th>Truck to</th><th>Equipment</th><th>Carrier</th><th className="r">Rate</th></tr></thead>
            <tbody>
              {truck.length === 0 ? <tr><td colSpan={4} className="empty">No truck rates yet.</td></tr>
                : truck.map(t => <tr key={t.id}><td>{t.city}, {t.st}</td><td>{t.equipment}</td><td>{t.carrier}</td><td className="r num">{money(t.rate, t.currency)}/truck</td></tr>)}
            </tbody>
          </table>
        </div>
        <div className="panel scroll">
          <table className="grid">
            <thead><tr><th>Rail to</th><th>Carrier</th><th className="r">Rate</th></tr></thead>
            <tbody>
              {rail.length === 0 ? <tr><td colSpan={3} className="empty">No rail rates yet.</td></tr>
                : rail.map(r => <tr key={r.id}><td>{r.city}, {r.st}</td><td>{r.carrier}</td><td className="r num">{money(r.rate_mbf, r.currency)}/MBF</td></tr>)}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
