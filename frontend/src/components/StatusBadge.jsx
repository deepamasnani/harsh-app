import { STATUS } from "../utils";

export default function StatusBadge({ status }) {
  const s = STATUS[status] || { label: status, className: "bg-stone-200" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${s.className}`}>
      {s.label}
    </span>
  );
}
