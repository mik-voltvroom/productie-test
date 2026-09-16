import Image from "next/image";
import Link from "next/link";
import styles from "./AssuranceShowcase.module.css";

const assurances = [
  {
    href: "/vv-verified",
    image: "/editorial/assurance-history.png",
    icon: "/brand/icons/historie.svg",
    imageAlt: "Voertuigdossier en controleformulier in een moderne showroom",
    title: "Aantoonbare historie",
    text: "Onderhoud, kilometerstand, eigenaarsinformatie en relevante voertuiggegevens worden vóór verkoop gecontroleerd.",
  },
  {
    href: "/kennis/soh-accu-elektrische-auto-uitleg",
    image: "/editorial/assurance-battery-health.png",
    icon: "/brand/icons/accugezondheid.svg",
    imageAlt: "Weergave van accugezondheid in een elektrische auto",
    title: "Accu waar relevant",
    text: "Bij hybride en elektrische auto’s leggen we beschikbare hoogvolt- en SOH-data begrijpelijk uit, zonder er meer van te maken dan de meting zegt.",
  },
  {
    href: "/vv-verified",
    image: "/editorial/assurance-technical.png",
    icon: "/brand/icons/onderhoud.svg",
    imageAlt: "Professionele momentsleutel in een nette werkplaats",
    title: "Technisch geselecteerd",
    text: "Leeftijd, kilometerstand, onderhoud, uitvoering en technisch risico worden persoonlijk als één geheel beoordeeld.",
  },
  {
    href: "/keuzehulp",
    image: "/editorial/assurance-practical-advice.png",
    icon: "/brand/icons/praktijkverbruik.svg",
    imageAlt: "Elektrische auto op een rustige Nederlandse weg",
    title: "Advies uit de praktijk",
    text: "We kijken naar uw ritten, laadmogelijkheden en gebruik. Zo krijgt u eerlijk advies dat aansluit op uw dagelijkse situatie.",
  },
  {
    href: "/elektrische-auto-kopen-groningen",
    image: "/editorial/assurance-home-energy.png",
    icon: "/brand/icons/elektrisch.svg",
    imageAlt: "Particuliere wallbox bij een woning met aangesloten elektrische auto",
    title: "Energie voor thuis",
    text: "Laadpalen, energiecontracten en thuisbatterijen. Plaatsing waar mogelijk binnen 14 dagen, met persoonlijk advies.",
  },
] as const;

export function AssuranceShowcase() {
  return <div className={styles.grid}>
    {assurances.map((item) => <Link className={styles.card} href={item.href} key={item.title}>
      <div className={styles.media}>
        <Image src={item.image} alt={item.imageAlt} fill sizes="(max-width: 560px) 100vw, (max-width: 900px) 50vw, (max-width: 1280px) 33vw, 20vw" />
      </div>
      <div className={styles.body}>
        <span className={styles.icon}><Image src={item.icon} alt="" width={30} height={30} /></span>
        <h3>{item.title}</h3>
        <p>{item.text}</p>
        <span className={styles.action}>Meer informatie <span aria-hidden="true">→</span></span>
      </div>
    </Link>)}
  </div>;
}
