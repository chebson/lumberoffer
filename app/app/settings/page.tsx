import { getLists, getSettings } from "@/lib/data";
import { saveList, saveSettings } from "../actions";

export default async function SettingsPage() {
  const [s, lists] = await Promise.all([getSettings(), getLists()]);
  return (
    <>
      <div className="head">
        <div>
          <div className="eyebrow">Settings</div>
          <h1>Mill and sending settings</h1>
          <p>Offers carry your mill name and come from your own address. The subject reads: prefix, species, &quot;Offering&quot;, customer, buyer.</p>
        </div>
      </div>
      <form action={saveSettings} className="panel pad stack" style={{ marginBottom: 16 }}>
        <div className="grid2">
          <div className="field"><label htmlFor="mill_name">Mill name</label><input id="mill_name" name="mill_name" defaultValue={s.mill_name} /></div>
          <div className="field"><label htmlFor="subject_prefix">Subject prefix</label><input id="subject_prefix" name="subject_prefix" defaultValue={s.subject_prefix} /></div>
          <div className="field"><label htmlFor="sender_name">Sender name</label><input id="sender_name" name="sender_name" defaultValue={s.sender_name} /></div>
          <div className="field"><label htmlFor="sender_email">Send from</label><input id="sender_email" name="sender_email" type="email" defaultValue={s.sender_email} /></div>
          <div className="field"><label htmlFor="truck_pick">Truck rate to use</label>
            <select id="truck_pick" name="truck_pick" defaultValue={s.truck_pick}>
              <option value="max">Highest quote on the lane</option><option value="min">Lowest quote</option><option value="avg">Average of quotes</option>
            </select></div>
          <div className="field"><label htmlFor="fx">USD to CAD</label><input id="fx" name="fx_usd_cad" type="number" step="0.0001" defaultValue={s.fx_usd_cad} /></div>
        </div>
        <div className="sub">The send-from address must be verified in Postmark (sender signature or domain) before live sending works.</div>
        <div><button className="btn primary">Save settings</button></div>
      </form>

      <h2 style={{ marginBottom: 10 }}>Species lists and MBF per truck</h2>
      <div className="panel scroll">
        <table className="grid">
          <thead><tr><th>Key</th><th>Name</th><th className="r">Tridem/Maxi</th><th className="r">Tandem</th><th className="r">Super B</th><th className="r">Order</th><th></th></tr></thead>
          <tbody>
            {[...lists, { key: "", label: "", mbf_tridem: 30, mbf_tandem: 24, mbf_superb: 50, sort: lists.length + 1 }].map(l => (
              <tr key={l.key || "new"}>
                <td colSpan={7}>
                  <form action={saveList} className="row" style={{ flexWrap: "nowrap" }}>
                    <input className="inline" style={{ width: 80, textAlign: "left" }} name="key" defaultValue={l.key} placeholder="New key" readOnly={!!l.key} aria-label="Key" />
                    <input className="inline" style={{ width: 180, textAlign: "left", fontFamily: "inherit" }} name="label" defaultValue={l.label} placeholder="Name, e.g. Spruce" aria-label="Name" />
                    <input className="inline" name="mbf_tridem" type="number" step="0.1" defaultValue={l.mbf_tridem} aria-label="MBF per Tridem/Maxi" />
                    <input className="inline" name="mbf_tandem" type="number" step="0.1" defaultValue={l.mbf_tandem} aria-label="MBF per Tandem" />
                    <input className="inline" name="mbf_superb" type="number" step="0.1" defaultValue={l.mbf_superb} aria-label="MBF per Super B" />
                    <input className="inline" style={{ width: 60 }} name="sort" type="number" defaultValue={l.sort} aria-label="Order" />
                    <button className="btn small">{l.key ? "Save" : "Add list"}</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
