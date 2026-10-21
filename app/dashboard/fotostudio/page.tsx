"use client";

import { ChangeEvent, DragEvent, PointerEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "./page.module.css";

const OUTPUT_WIDTH = 1920;
const OUTPUT_HEIGHT = 1280;
const MAX_BATCH = 30;

type CarState = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
};

type CameraPresetId = "hero" | "front" | "frontThreeQuarter" | "side" | "rearThreeQuarter" | "rear" | "detail";

type CameraPreset = {
  id: CameraPresetId;
  label: string;
  state: CarState;
};

type StudioStatus = "queued" | "processing" | "ready" | "error";

type StudioItem = {
  id: string;
  file: File;
  sourceName: string;
  cutoutUrl?: string;
  status: StudioStatus;
  error?: string;
  preset: CameraPresetId;
  car: CarState;
};

const CAMERA_PRESETS: CameraPreset[] = [
  { id: "hero", label: "Hero", state: { x: 960, y: 800, scale: 1.02, rotation: 0 } },
  { id: "front", label: "Voor", state: { x: 960, y: 795, scale: 0.94, rotation: 0 } },
  { id: "frontThreeQuarter", label: "Voor ¾", state: { x: 960, y: 805, scale: 1.02, rotation: 0 } },
  { id: "side", label: "Zij", state: { x: 960, y: 815, scale: 1.04, rotation: 0 } },
  { id: "rearThreeQuarter", label: "Achter ¾", state: { x: 960, y: 805, scale: 1.02, rotation: 0 } },
  { id: "rear", label: "Achter", state: { x: 960, y: 795, scale: 0.94, rotation: 0 } },
  { id: "detail", label: "Detail", state: { x: 960, y: 740, scale: 1.18, rotation: 0 } },
];

const INITIAL_CAR = CAMERA_PRESETS[2].state;

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Afbeelding kon niet worden geladen."));
    image.src = src;
  });
}

function drawBackground(ctx: CanvasRenderingContext2D) {
  const gradient = ctx.createLinearGradient(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(0.68, "#fbfdff");
  gradient.addColorStop(1, "#eef7fc");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);

  ctx.save();
  ctx.strokeStyle = "rgba(91, 174, 226, 0.18)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(80, 0);
  ctx.lineTo(235, 330);
  ctx.lineTo(385, 0);
  ctx.stroke();

  ctx.strokeStyle = "rgba(91, 174, 226, 0.13)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(1740, 230, 345, Math.PI * 0.66, Math.PI * 1.28);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = "#071526";
  ctx.font = "600 38px Manrope, Inter, Arial, sans-serif";
  ctx.letterSpacing = "12px";
  ctx.fillText("VOLT & VROOM", OUTPUT_WIDTH / 2, 112);

  ctx.fillStyle = "#5baee2";
  ctx.font = "500 18px Inter, Arial, sans-serif";
  ctx.letterSpacing = "8px";
  ctx.fillText("AUTOMOTIVE", OUTPUT_WIDTH / 2, 158);

  ctx.strokeStyle = "rgba(91,174,226,.55)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(OUTPUT_WIDTH / 2 - 255, 151);
  ctx.lineTo(OUTPUT_WIDTH / 2 - 115, 151);
  ctx.moveTo(OUTPUT_WIDTH / 2 + 115, 151);
  ctx.lineTo(OUTPUT_WIDTH / 2 + 255, 151);
  ctx.stroke();
  ctx.restore();

  const floor = ctx.createLinearGradient(0, 780, 0, OUTPUT_HEIGHT);
  floor.addColorStop(0, "rgba(238,244,248,0)");
  floor.addColorStop(1, "rgba(220,230,236,0.52)");
  ctx.fillStyle = floor;
  ctx.fillRect(0, 760, OUTPUT_WIDTH, OUTPUT_HEIGHT - 760);
}

function drawCar(ctx: CanvasRenderingContext2D, image: HTMLImageElement, car: CarState) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate((car.rotation * Math.PI) / 180);
  const baseScale = Math.min((OUTPUT_WIDTH * 0.76) / image.naturalWidth, (OUTPUT_HEIGHT * 0.58) / image.naturalHeight);
  const scale = baseScale * car.scale;
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.shadowColor = "rgba(4, 20, 31, 0.16)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 18;
  ctx.drawImage(image, -width / 2, -height / 2, width, height);
  ctx.restore();
}

function safeFileBase(name: string) {
  return (name.replace(/\.[^.]+$/, "") || "auto").replace(/[^a-zA-Z0-9-_]+/g, "-");
}

export default function PhotoStudioPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ pointerId: number; x: number; y: number; carX: number; carY: number } | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const [items, setItems] = useState<StudioItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [batchMessage, setBatchMessage] = useState("Upload 1 tot 30 autofoto’s om te beginnen.");

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);
  const readyCount = items.filter((item) => item.status === "ready").length;
  const errorCount = items.filter((item) => item.status === "error").length;

  const render = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, OUTPUT_WIDTH, OUTPUT_HEIGHT);
    drawBackground(ctx);

    if (!selected?.cutoutUrl || selected.status !== "ready") return;
    let image = imageCacheRef.current.get(selected.id);
    if (!image) {
      image = await loadImage(selected.cutoutUrl);
      imageCacheRef.current.set(selected.id, image);
    }
    drawCar(ctx, image, selected.car);
  }, [selected]);

  useEffect(() => {
    void render();
  }, [render]);

  useEffect(() => {
    return () => {
      items.forEach((item) => item.cutoutUrl && URL.revokeObjectURL(item.cutoutUrl));
    };
  }, [items]);

  function updateItem(id: string, patch: Partial<StudioItem>) {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  async function removeBackground(file: File) {
    const form = new FormData();
    form.append("image", file);
    const response = await fetch("/api/photo-studio/cutout", { method: "POST", body: form });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: "Vrijstaand maken is mislukt." }));
      throw new Error(error.error || "Vrijstaand maken is mislukt.");
    }
    return response.blob();
  }

  async function processQueue(newItems: StudioItem[]) {
    setBusy(true);
    let completed = 0;
    for (const item of newItems) {
      updateItem(item.id, { status: "processing", error: undefined });
      setBatchMessage(`Foto ${completed + 1} van ${newItems.length} vrijstaand maken…`);
      try {
        const blob = await removeBackground(item.file);
        const url = URL.createObjectURL(blob);
        const image = await loadImage(url);
        imageCacheRef.current.set(item.id, image);
        updateItem(item.id, { status: "ready", cutoutUrl: url });
      } catch (error) {
        updateItem(item.id, { status: "error", error: error instanceof Error ? error.message : "Verwerking mislukt." });
      }
      completed += 1;
    }
    setBatchMessage(`${completed} foto${completed === 1 ? "" : "’s"} verwerkt. Controleer de plaatsing en exporteer daarna de serie.`);
    setBusy(false);
  }

  function addFiles(fileList: FileList | File[]) {
    const incoming = Array.from(fileList).filter((file) => ["image/jpeg", "image/png", "image/webp"].includes(file.type));
    const available = Math.max(0, MAX_BATCH - items.length);
    const accepted = incoming.slice(0, available);
    if (!accepted.length) {
      setBatchMessage(items.length >= MAX_BATCH ? `Maximaal ${MAX_BATCH} foto’s per serie.` : "Kies JPG, PNG of WebP-afbeeldingen.");
      return;
    }

    const batch = accepted.map((file, index): StudioItem => {
      const preset = index === 0 && items.length === 0 ? CAMERA_PRESETS[0] : CAMERA_PRESETS[2];
      return {
        id: uid(),
        file,
        sourceName: file.name,
        status: "queued",
        preset: preset.id,
        car: { ...preset.state },
      };
    });

    setItems((current) => [...current, ...batch]);
    setSelectedId((current) => current ?? batch[0].id);
    void processQueue(batch);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files?.length) addFiles(event.target.files);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    if (event.dataTransfer.files?.length) addFiles(event.dataTransfer.files);
  }

  function selectPreset(preset: CameraPreset) {
    if (!selected) return;
    updateItem(selected.id, { preset: preset.id, car: { ...preset.state } });
  }

  function patchSelectedCar(patch: Partial<CarState>) {
    if (!selected) return;
    updateItem(selected.id, { car: { ...selected.car, ...patch } });
  }

  function onPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (!selected || selected.status !== "ready") return;
    const rect = event.currentTarget.getBoundingClientRect();
    const sx = OUTPUT_WIDTH / rect.width;
    const sy = OUTPUT_HEIGHT / rect.height;
    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX * sx,
      y: event.clientY * sy,
      carX: selected.car.x,
      carY: selected.car.y,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId || !selected) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const sx = OUTPUT_WIDTH / rect.width;
    const sy = OUTPUT_HEIGHT / rect.height;
    patchSelectedCar({
      x: drag.carX + event.clientX * sx - drag.x,
      y: drag.carY + event.clientY * sy - drag.y,
    });
  }

  function onPointerUp(event: PointerEvent<HTMLCanvasElement>) {
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null;
  }

  async function compositeItem(item: StudioItem, format: "jpeg" | "png") {
    if (!item.cutoutUrl || item.status !== "ready") throw new Error("Foto is nog niet klaar.");
    let image = imageCacheRef.current.get(item.id);
    if (!image) {
      image = await loadImage(item.cutoutUrl);
      imageCacheRef.current.set(item.id, image);
    }
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas niet beschikbaar.");
    drawBackground(ctx);
    drawCar(ctx, image, item.car);
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Export mislukt."))), `image/${format}`, format === "jpeg" ? 0.94 : undefined);
    });
  }

  async function downloadItem(item: StudioItem, format: "jpeg" | "png", order?: number) {
    const blob = await compositeItem(item, format);
    const ext = format === "jpeg" ? "jpg" : "png";
    const position = order ? `${String(order).padStart(2, "0")}-` : "";
    const link = document.createElement("a");
    link.download = `${position}volt-vroom-${safeFileBase(item.sourceName)}-1920x1280.${ext}`;
    link.href = URL.createObjectURL(blob);
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1500);
  }

  async function downloadSelected(format: "jpeg" | "png") {
    if (!selected) return;
    await downloadItem(selected, format);
  }

  async function downloadAll() {
    const ready = items.filter((item) => item.status === "ready");
    if (!ready.length) return;
    setBusy(true);
    setBatchMessage(`Serie exporteren: 0 van ${ready.length}…`);
    for (let index = 0; index < ready.length; index += 1) {
      await downloadItem(ready[index], "jpeg", index + 1);
      setBatchMessage(`Serie exporteren: ${index + 1} van ${ready.length}…`);
      await new Promise((resolve) => setTimeout(resolve, 180));
    }
    setBatchMessage(`${ready.length} websitefoto’s geëxporteerd op 1920×1280.`);
    setBusy(false);
  }

  function removeItem(id: string) {
    const target = items.find((item) => item.id === id);
    if (target?.cutoutUrl) URL.revokeObjectURL(target.cutoutUrl);
    imageCacheRef.current.delete(id);
    const remaining = items.filter((item) => item.id !== id);
    setItems(remaining);
    if (selectedId === id) setSelectedId(remaining[0]?.id ?? null);
  }

  function clearSeries() {
    items.forEach((item) => item.cutoutUrl && URL.revokeObjectURL(item.cutoutUrl));
    imageCacheRef.current.clear();
    setItems([]);
    setSelectedId(null);
    setBatchMessage("Upload 1 tot 30 autofoto’s om te beginnen.");
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>VVOS · Photo Studio</p>
          <h1>Van fotoserie naar consistente showroombeelden.</h1>
          <p>Upload tot 30 foto’s tegelijk. VVOS maakt alleen de achtergrond vrijstaand; de auto zelf blijft onaangetast. Daarna gebruik je vaste camerahoek-presets en exporteer je de hele serie op websiteformaat.</p>
        </div>
        <div className={styles.outputBadge}>1920 × 1280 px</div>
      </header>

      <div className={styles.batchBar}>
        <div><strong>{items.length}</strong><span>foto’s in serie</span></div>
        <div><strong>{readyCount}</strong><span>gereed</span></div>
        <div><strong>{errorCount}</strong><span>fouten</span></div>
        <p>{batchMessage}</p>
        {items.length > 0 && <button onClick={clearSeries} disabled={busy}>Wis serie</button>}
      </div>

      <div className={styles.grid}>
        <aside className={styles.controls}>
          <section className={styles.card}>
            <h2>1. Fotoserie</h2>
            <label className={styles.dropzone} onDrop={onDrop} onDragOver={(e) => e.preventDefault()}>
              <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onFileChange} disabled={busy || items.length >= MAX_BATCH} />
              <strong>{busy ? "Bezig met verwerken…" : "Sleep 1–30 foto’s hierheen"}</strong>
              <span>of tik om foto’s te kiezen</span>
            </label>
            <p className={styles.hint}>De vrijstaand-service wordt bewust na elkaar aangeroepen. Dat is stabieler, voorspelbaarder en voorkomt piekbelasting.</p>
          </section>

          <section className={styles.card}>
            <h2>2. Camerahoek</h2>
            <div className={styles.presetGrid}>
              {CAMERA_PRESETS.map((preset) => (
                <button key={preset.id} className={selected?.preset === preset.id ? styles.presetActive : styles.presetButton} onClick={() => selectPreset(preset)} disabled={!selected || selected.status !== "ready"}>{preset.label}</button>
              ))}
            </div>
            <p className={styles.hint}>De preset zet schaal en positie consequent. Je kunt daarna nog handmatig finetunen.</p>
          </section>

          <section className={styles.card}>
            <h2>3. Fijnafstelling</h2>
            <label className={styles.controlRow}>
              <span>Grootte</span>
              <b>{Math.round((selected?.car.scale ?? 1) * 100)}%</b>
              <input type="range" min="0.55" max="1.35" step="0.01" value={selected?.car.scale ?? 1} disabled={!selected || selected.status !== "ready"} onChange={(e) => patchSelectedCar({ scale: Number(e.target.value) })} />
            </label>
            <label className={styles.controlRow}>
              <span>Hoek</span>
              <b>{(selected?.car.rotation ?? 0).toFixed(1)}°</b>
              <input type="range" min="-8" max="8" step="0.1" value={selected?.car.rotation ?? 0} disabled={!selected || selected.status !== "ready"} onChange={(e) => patchSelectedCar({ rotation: Number(e.target.value) })} />
            </label>
            <button className={styles.secondaryButton} onClick={() => selected && selectPreset(CAMERA_PRESETS.find((preset) => preset.id === selected.preset) ?? CAMERA_PRESETS[2])} disabled={!selected || selected.status !== "ready"}>Reset naar preset</button>
          </section>

          <section className={styles.card}>
            <h2>4. Export</h2>
            <button className={styles.primaryButton} onClick={downloadAll} disabled={busy || readyCount === 0}>Download hele serie als JPG</button>
            <button className={styles.secondaryButton} onClick={() => void downloadSelected("jpeg")} disabled={!selected || selected.status !== "ready"}>Alleen geselecteerde JPG</button>
            <button className={styles.secondaryButton} onClick={() => void downloadSelected("png")} disabled={!selected || selected.status !== "ready"}>Alleen geselecteerde PNG</button>
            <p className={styles.hint}>De serie krijgt automatisch 01-, 02-, 03-… als volgorde voor makkelijke verwerking in voorraad en website.</p>
          </section>
        </aside>

        <section className={styles.workspace}>
          <section className={styles.previewCard}>
            <div className={styles.previewTopline}>
              <span>{selected?.sourceName ?? "Geen foto geselecteerd"}</span>
              <span>{selected ? CAMERA_PRESETS.find((preset) => preset.id === selected.preset)?.label : "Websiteformaat"}</span>
            </div>
            <div className={styles.canvasWrap}>
              <canvas
                ref={canvasRef}
                width={OUTPUT_WIDTH}
                height={OUTPUT_HEIGHT}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className={selected?.status === "ready" ? styles.canvasActive : undefined}
              />
            </div>
            <div className={styles.guardrail}>
              <strong>Originaliteitsregel</strong>
              <span>Geen nieuwe velgen, lak, lampen, nummerplaten, carrosseriedelen of interieur. Alleen uitsnede/compositie.</span>
            </div>
          </section>

          {items.length > 0 && (
            <section className={styles.filmstripCard}>
              <div className={styles.filmstripHeader}><strong>Fotoserie</strong><span>Klik een beeld om te controleren</span></div>
              <div className={styles.filmstrip}>
                {items.map((item, index) => (
                  <div key={item.id} className={`${styles.thumbWrap} ${selectedId === item.id ? styles.thumbSelected : ""}`}>
                    <button className={styles.thumbButton} onClick={() => setSelectedId(item.id)}>
                      <div className={styles.thumbImage}>
                        {item.cutoutUrl ? <img src={item.cutoutUrl} alt="" /> : <span>{item.status === "processing" ? "…" : item.status === "error" ? "!" : index + 1}</span>}
                      </div>
                      <small>{String(index + 1).padStart(2, "0")}</small>
                      <b>{item.status === "ready" ? CAMERA_PRESETS.find((preset) => preset.id === item.preset)?.label : item.status === "error" ? "Fout" : "Verwerken"}</b>
                    </button>
                    <button className={styles.removeThumb} onClick={() => removeItem(item.id)} aria-label={`Verwijder ${item.sourceName}`}>×</button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
