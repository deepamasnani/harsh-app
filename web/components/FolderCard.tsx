import { Folder } from "lucide-react";
import Link from "next/link";
import { inr } from "@/lib/utils";

export default function FolderCard({ folder, to, hideDue }: { folder: any; to: string; hideDue?: boolean }) {
  return (
    <Link href={to} className="block rounded-3xl border border-slate-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 text-brass-600">
          <Folder size={26} strokeWidth={1.6} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-lg leading-tight truncate">{folder.name}</p>
          <p className="text-sm text-slate-500 mt-0.5">
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
            <p className="text-sm text-slate-400">Open</p>
          )}
        </div>
      </div>
    </Link>
  );
}
