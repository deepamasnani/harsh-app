export async function saveOrShareFile(path: string, filename: string, mime: string) {
  const res = await fetch(path, { credentials: "include" });
  if (!res.ok) throw new Error("Could not open file");
  const blob = await res.blob();
  const file = new File([blob], filename, { type: mime || blob.type || "application/octet-stream" });
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  if (nav.share && nav.canShare?.({ files: [file] })) {
    await nav.share({ files: [file], title: filename });
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4_000);
}
