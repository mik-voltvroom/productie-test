import * as React from "react";
import { vehiclePresentation } from "@/lib/vehicle/presentation";
import styles from "./VehicleHighlights.module.css";

export function VehicleHighlights({ trim, compact = false, className = "" }: {
  trim: string;
  compact?: boolean;
  className?: string;
}) {
  const { edition, highlights } = vehiclePresentation(trim);
  if (!edition && !highlights.length) return null;
  const visible = compact ? highlights.slice(0, 3) : highlights;
  const remaining = highlights.slice(visible.length);

  return <div className={`${styles.root} ${compact ? styles.compact : styles.detail} ${className}`}>
    {edition && <p className={styles.edition}>{edition}</p>}
    {visible.length > 0 && <ul className={styles.labels} aria-label="Highlights van deze auto">
      {visible.map(highlight => <li className={styles.label} key={highlight}>{highlight}</li>)}
      {remaining.length > 0 && <li className={styles.more} title={remaining.join(" · ")} aria-label={`${remaining.length} aanvullende highlights: ${remaining.join(", ")}`}>
        +{remaining.length} highlights
      </li>}
    </ul>}
  </div>;
}
