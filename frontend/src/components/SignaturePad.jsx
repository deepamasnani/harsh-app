import { useEffect, useRef, useState } from "react";

/**
 * Phone-first signature pad. Uses CSS pixels for drawing coordinates and
 * devicePixelRatio for a sharp bitmap. Touch scrolling is locked on the canvas.
 */
export default function SignaturePad({ onChange }) {
  const canvasRef = useRef(null);
  const wrapRef = useRef(null);
  const drawing = useRef(false);
  const last = useRef(null);
  const [ink, setInk] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    let lastW = 0;
    let lastH = 0;

    const fit = () => {
      const rect = wrap.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      if (Math.abs(rect.width - lastW) < 1 && Math.abs(rect.height - lastH) < 1) return;
      lastW = rect.width;
      lastH = rect.height;
      const dpr = Math.max(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = 2.6;
      ctx.strokeStyle = "#1c1612";
      ctx.fillStyle = "#fffdf8";
      ctx.fillRect(0, 0, rect.width, rect.height);
      setInk(false);
      onChange?.(null);
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(wrap);
    window.addEventListener("orientationchange", fit);
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", fit);
    };
    // Size the canvas from layout only — parent callbacks must not retrigger a wipe.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pos(e) {
    const canvas = canvasRef.current;
    const r = canvas.getBoundingClientRect();
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX - r.left, y: t.clientY - r.top };
  }

  function start(e) {
    e.preventDefault();
    if (e.pointerId != null) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    drawing.current = true;
    last.current = pos(e);
  }

  function move(e) {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (!ink) {
      setInk(true);
      onChange?.(canvas.toDataURL("image/png"));
    } else {
      onChange?.(canvas.toDataURL("image/png"));
    }
  }

  function end(e) {
    e.preventDefault();
    drawing.current = false;
  }

  function clear() {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const ctx = canvas.getContext("2d");
    const rect = wrap.getBoundingClientRect();
    ctx.fillStyle = "#fffdf8";
    ctx.fillRect(0, 0, rect.width, rect.height);
    setInk(false);
    onChange?.(null);
  }

  return (
    <div className="space-y-2">
      <div
        ref={wrapRef}
        className="relative w-full rounded-2xl border-2 border-dashed border-stone-400 bg-white overflow-hidden"
        style={{ height: "min(42vh, 280px)", minHeight: 180, touchAction: "none" }}
      >
        <canvas
          ref={canvasRef}
          className="block w-full h-full touch-none cursor-crosshair"
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        />
        {!ink && (
          <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-stone-400 text-sm">
            Customer signs here
          </p>
        )}
      </div>
      <button type="button" onClick={clear} className="text-sm text-stone-600 underline">
        Clear signature
      </button>
    </div>
  );
}
