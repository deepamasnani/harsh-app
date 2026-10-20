"use client";

import { useEffect, useState } from "react";

export default function AuthImg({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [url, setUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!src) return;
    let objectUrl = "";
    let cancelled = false;
    setFailed(false);
    setUrl("");
    (async () => {
      try {
        const res = await fetch(src, { credentials: "include", cache: "no-store" });
        if (cancelled) return;
        if (!res.ok) {
          setFailed(true);
          return;
        }
        objectUrl = URL.createObjectURL(await res.blob());
        if (!cancelled) setUrl(objectUrl);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (failed) return <p className="text-sm text-stone-400 mt-2">Signature unavailable</p>;
  if (!url) return null;
  return <img src={url} alt={alt} className={className} />;
}

export async function openAuthedFile(path: string) {
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) throw new Error("Could not open file");
  const blob = await res.blob();
  window.open(URL.createObjectURL(blob), "_blank");
}
