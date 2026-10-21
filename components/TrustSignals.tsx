import Image from "next/image";
import styles from "./TrustSignals.module.css";

const signals = [
  {
    icon: "/brand/icons/historie.svg",
    title: "Transparant advies",
    description: "Duidelijk inzicht in prijs, historie, techniek en gebruikskosten.",
  },
  {
    icon: "/brand/icons/accugezondheid.svg",
    title: "Inzicht in accugezondheid",
    description: "Waar beschikbaar onderbouwd met technische accugegevens en metingen.",
  },
  {
    icon: "/brand/icons/onderhoud.svg",
    title: "Zorgvuldig geselecteerd",
    description: "Aandacht voor historie, onderhoud en technische conditie.",
  },
];

export function TrustSignals() {
  return (
    <section className={styles.section} aria-label="Onze expertise en werkwijze">
      <div className="container">
        <ul className={styles.signals} role="list">
          {signals.map(signal => (
            <li className={styles.signal} key={signal.title}>
              <Image src={signal.icon} alt="" width={28} height={28} />
              <div>
                <h2 className={styles.title}>{signal.title}</h2>
                <p className={styles.description}>{signal.description}</p>
              </div>
            </li>
          ))}
        </ul>
        <a className={`textButton ${styles.link}`} href="/vv-verified">
          Ontdek onze werkwijze <span aria-hidden="true">→</span>
        </a>
      </div>
    </section>
  );
}
