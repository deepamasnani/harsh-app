import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import FolderCard from "../../components/FolderCard.jsx";
import { groupFolders } from "../../utils";

export default function Receipts() {
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    api("/api/invoices")
      .then(setRows)
      .catch((e) => setErr(e.message));
  }, []);

  const folders = useMemo(() => groupFolders(rows), [rows]);
  const waiting = folders.filter((f) => f.pending > 0);
  const earlier = folders.filter((f) => f.pending === 0);

  if (err) return <p className="text-red-700">{err}</p>;

  return (
    <div>
      <h1 className="font-display text-3xl mb-1">Today’s receipts</h1>
      <p className="text-stone-500 text-sm mb-5">
        {waiting.length ? `${waiting.reduce((s, f) => s + f.pending, 0)} waiting — grouped by customer` : "Nothing left for today"}
      </p>

      <div className="space-y-3">
        {waiting.map((f) => (
          <FolderCard key={f.key} folder={f} hideDue to={`/staff/customer/${encodeURIComponent(f.key)}`} />
        ))}
      </div>

      {earlier.length > 0 && (
        <>
          <h2 className="text-xs tracking-widest uppercase text-stone-500 mt-8 mb-3">Done today</h2>
          <div className="space-y-3">
            {earlier.map((f) => (
              <FolderCard key={f.key} folder={f} hideDue to={`/staff/customer/${encodeURIComponent(f.key)}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
