"use client";

import { useState, useTransition } from "react";
import { importCsv, type ImportResult } from "./actions";

/** File picker that sends a CSV to the server and shows the result. */
export default function CsvImport({ kind, label, columns }: {
  kind: "products" | "truck" | "rail" | "customers"; label: string; columns: string;
}) {
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="panel pad stack">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h3>{label}</h3>
        <label className="btn small" style={{ cursor: "pointer" }}>
          {pending ? "Loading..." : "Choose CSV file"}
          <input
            type="file" accept=".csv,text/csv" hidden disabled={pending}
            onChange={e => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              f.text().then(text => start(async () => setResult(await importCsv(kind, text))));
            }}
          />
        </label>
      </div>
      <div className="sub">Columns: <span className="num">{columns}</span></div>
      {kind !== "customers" ? <div className="sub">Loading replaces what&apos;s there now.</div> : null}
      {result ? <div className={result.ok ? "msg-ok" : "msg-err"}>{result.message}</div> : null}
    </div>
  );
}
