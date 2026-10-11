import type { ReactNode } from "react";
import styles from "./VehicleEditorialPanel.module.css";

/** Native disclosure keeps form fields mounted when a topic is collapsed. */
export function VehicleDossierSection({ title, children }: { title: string; children: ReactNode }) {
  return <details className={`panel ${styles.topic}`}>
    <summary><h2>{title}</h2></summary>
    <div className={styles.topicBody}>{children}</div>
  </details>;
}
