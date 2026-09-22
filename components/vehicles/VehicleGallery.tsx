"use client";

import { useEffect, useRef, useState } from "react";

/** Public photos only, in the order supplied by the public vehicle repository. */
export function VehicleGallery({ images, name, reserved }: { images: string[]; name: string; reserved: boolean }) {
  const [index, setIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const current = Math.min(index, Math.max(0, images.length - 1));
  const move = (delta: number) => setIndex(i => (i + delta + images.length) % images.length);

  useEffect(() => {
    if (!expanded) return;
    const modal = dialog.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modal?.showModal();
    return () => {
      modal?.close();
      document.body.style.overflow = previousOverflow;
      opener.current?.focus();
    };
  }, [expanded]);


  return <section className="gallery" aria-label={`Foto’s van ${name}`} onKeyDown={event => {
    if (images.length < 2 || (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
    event.preventDefault();
    move(event.key === "ArrowLeft" ? -1 : 1);
  }}>
    {images.length ? <>
      <div className="stage" onTouchStart={event => { const p = event.touches[0]; touch.current = { x: p.clientX, y: p.clientY }; }} onTouchEnd={event => {
        const start = touch.current; touch.current = null;
        if (!start || images.length < 2) return;
        const end = event.changedTouches[0]; const dx = end.clientX - start.x; const dy = end.clientY - start.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) move(dx < 0 ? 1 : -1);
      }} onTouchCancel={() => { touch.current = null; }}>
        <button ref={opener} type="button" className="open" onClick={() => setExpanded(true)} aria-label={`Vergroot foto ${current + 1} van ${name}`} aria-haspopup="dialog"><img src={images[current]} alt={`${name} — foto ${current + 1} van ${images.length}`} width={1920} height={1280} className="photo" /><span className="hint">Foto vergroten ↗</span></button>
        <span className="badge">{reserved ? "Gereserveerd" : "Beschikbaar"}</span>
      </div>
      <div className="controls">
    {images.length > 1 && <button type="button" onClick={() => move(-1)} aria-label="Vorige foto">←</button>}
    <span role="status" aria-live="polite" aria-atomic="true">Foto {current + 1} van {images.length}</span>
    {images.length > 1 && <button type="button" onClick={() => move(1)} aria-label="Volgende foto">→</button>}
  </div>
      {images.length > 1 && <div className="thumbnails" aria-label="Kies een foto">{images.map((src, i) => <button key={`${src}-${i}`} type="button" aria-label={`Toon foto ${i + 1}`} aria-pressed={current === i} onClick={() => setIndex(i)}><img src={src} alt="" width={120} height={80} loading="lazy" /></button>)}</div>}
      <dialog ref={dialog} aria-label={`Vergrote foto’s van ${name}`} onCancel={() => setExpanded(false)} onClose={() => setExpanded(false)} onClick={event => { if (event.target === event.currentTarget) setExpanded(false); }}>
        <div className="modalContent">
          <button type="button" className="close" autoFocus onClick={() => setExpanded(false)}>Sluiten ×</button>
          <img src={images[current]} alt={`${name} — foto ${current + 1} van ${images.length}`} width={1920} height={1280} className="largePhoto" />
          <div className="controls">
    {images.length > 1 && <button type="button" onClick={() => move(-1)} aria-label="Vorige foto">←</button>}
    <span role="status" aria-live="polite" aria-atomic="true">Foto {current + 1} van {images.length}</span>
    {images.length > 1 && <button type="button" onClick={() => move(1)} aria-label="Volgende foto">→</button>}
  </div>
        </div>
      </dialog>
    </> : <div className="empty">Foto’s volgen binnenkort.</div>}
    <style jsx>{`
      .gallery{min-width:0;align-self:start;background:#fff;border:1px solid #dce5eb;border-radius:28px;overflow:hidden;color:#101d28}
      .stage{position:relative;aspect-ratio:3/2;background:#eaf0f4;touch-action:pan-y}
      .open{display:block;width:100%;height:100%;border:0;padding:0;background:transparent;cursor:zoom-in}
      .photo{display:block;width:100%;height:100%;object-fit:contain}
      .badge,.hint{position:absolute;border-radius:999px;padding:9px 13px;font-size:.78rem;font-weight:700;pointer-events:none}
      .badge{top:16px;left:16px;background:#fff;color:#0b5d45}.hint{bottom:16px;right:16px;background:#101d28;color:#fff}
      .controls{display:flex;align-items:center;justify-content:center;gap:18px;padding:12px;font-size:.85rem}
      .controls button,.close{min-width:44px;min-height:44px;border:1px solid #d4dfe6;border-radius:999px;background:#fff;color:#101d28;cursor:pointer;font:inherit}
      .controls button{font-size:1.3rem}.close{padding:10px 18px;align-self:flex-end}
      .thumbnails{display:flex;gap:8px;overflow-x:auto;padding:0 14px 14px}
      .thumbnails button{flex:0 0 90px;border:2px solid transparent;border-radius:10px;padding:2px;background:#eaf0f4;cursor:pointer}
      .thumbnails button[aria-pressed="true"]{border-color:#0a7eb8}.thumbnails img{display:block;width:100%;height:auto;aspect-ratio:3/2;object-fit:cover;border-radius:6px}
      button:focus-visible{outline:3px solid #0a7eb8;outline-offset:-3px}
      dialog{max-width:none;max-height:none;width:100vw;height:100dvh;margin:0;padding:16px;border:0;background:rgba(10,20,29,.97);color:#fff}
      dialog::backdrop{background:rgba(10,20,29,.9)}
      .modalContent{height:100%;display:flex;flex-direction:column;gap:12px;max-width:1600px;margin:auto}
      .largePhoto{display:block;min-height:0;flex:1;width:100%;height:100%;object-fit:contain}.modalContent .controls{flex-shrink:0;padding:0}
      .empty{display:grid;place-items:center;aspect-ratio:3/2;background:#eaf0f4;color:#60717e}
      @media(max-width:640px){.gallery{border-radius:24px}.badge{top:10px;left:10px}.hint{bottom:10px;right:10px}.thumbnails button{flex-basis:76px}dialog{padding:12px}}
    `}</style>
  </section>;
}
