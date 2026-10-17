import { Folder } from "lucide-react";
import { Link } from "react-router-dom";
import { inr } from "../utils";

export default function FolderCard({ folder, to, hideDue }) {
  return (
    <Link
      to={to}
      className="block rounded-2xl border border-stone-400/60 bg-[#efe6d4] p-4 shadow-sheet hover:border-ink/40"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-brass-700">
          <Folder size={28} strokeWidth={1.6} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-lg leading-tight truncate">{folder.name}</p>
          <p className="text-sm text-stone-600 mt-0.5">
            {folder.phone || "No phone"} · {folder.count} {folder.count === 1 ? "bill" : "bills"}
            {folder.pending ? ` · ${folder.pending} with staff` : ""}
          </p>
        </div>
        <div className="text-right shrink-0">
          {!hideDue && folder.outstanding > 0 ? (
            <>
              <p className="text-[10px] uppercase tracking-widest text-orange-800">Due</p>
              <p className="font-semibold">{inr(folder.outstanding)}</p>
            </>
          ) : (
            <p className="text-sm text-stone-500">Open folder</p>
          )}
        </div>
      </div>
    </Link>
  );
}
