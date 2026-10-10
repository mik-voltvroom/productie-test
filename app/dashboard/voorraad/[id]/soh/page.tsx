"use client";
import "./print.css";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { SohCertificate } from "@/components/soh/SohCertificate";
import { validateSohCertificate, type SohCertificate as Certificate } from "@/lib/soh/certificate";
import styles from "@/components/soh/SohCertificate.module.css";
import { sohPrintScale } from "@/lib/soh/print";
export default function SohPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [report, setReport] = useState<Certificate | null>(null);
  const [error, setError] = useState(""); const [printing, setPrinting] = useState(false);
  useEffect(() => {
    document.body.classList.add("sohCertificatePrintMode");
    return () => document.body.classList.remove("sohCertificatePrintMode");
  }, []);
  useEffect(() => {
    const controller = new AbortController(); setReport(null); setError("");
    void fetch(`/api/vvos/vehicles/${encodeURIComponent(id)}/soh`, { cache:"no-store", credentials:"same-origin", signal:controller.signal }).then(async response => {
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Rapport laden mislukt.");
      if (!result.report) throw new Error("Voor dit voertuig is nog geen meting gevalideerd.");
      if (!controller.signal.aborted) setReport(validateSohCertificate(result.report));
    }).catch(failure => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Rapport laden mislukt."); });
    return () => controller.abort();
  }, [id]);
  async function print() {
    setPrinting(true); setError("");
    const sheet = document.querySelector<HTMLElement>(".sohCertificateSheet");
    const content = sheet?.querySelector<HTMLElement>("[data-soh-content]");
    const oldSheetStyle = sheet?.getAttribute("style") ?? "";
    try {
      await document.fonts.ready;
      await Promise.all(Array.from(document.querySelectorAll<HTMLImageElement>(".sohCertificateSheet img")).map(img => img.decode().catch(() => undefined)));
      if (!sheet || !content) throw new Error("Certificaat is nog niet beschikbaar.");
      // Measure at the print width even when previewing on a phone.
      sheet.style.width = "210mm"; sheet.style.height = "297mm"; sheet.style.padding = "16mm"; sheet.style.border = "0";
      const padding = getComputedStyle(sheet);
      const available = sheet.clientHeight - parseFloat(padding.paddingTop) - parseFloat(padding.paddingBottom) - 2;
      content.style.zoom = String(sohPrintScale(content.scrollHeight, available));
      window.print();
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Printen voorbereiden mislukt."); }
    finally { sheet?.setAttribute("style", oldSheetStyle); if (content) content.style.zoom = ""; setPrinting(false); }
  }
  return <main className={styles.page}><div className={styles.toolbar}>
    <Link className="button secondary" href={`/dashboard/voorraad/${encodeURIComponent(id)}`}>Terug naar voertuig</Link>
    {report && <><p>A4-portret · schaal 100% · browserkop- en voettekst uit.</p><button className="button" type="button" disabled={printing} onClick={print}>{printing ? "Voorbereiden…" : "Printen / opslaan als PDF"}</button></>}
  </div>{error ? <p role="alert">{error}</p> : report ? <SohCertificate report={report} /> : <p>Rapport laden…</p>}</main>;
}
