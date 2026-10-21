import Image from "next/image";
import Link from "next/link";

export function BrandLogo({ href = "/", compact = false, dark = false }: { href?: string; compact?: boolean; dark?: boolean }) {
  return (
    <Link href={href} className={`brandLogo${compact ? " brandLogoCompact" : ""}${dark ? " brandLogoDark" : ""}`} aria-label="Volt & Vroom">
      <Image src="/brand/vv-symbol.svg" alt="" width={58} height={28} priority />
      {!compact && <><i aria-hidden="true" /><span aria-hidden="true">VOLT &amp; VROOM</span></>}
    </Link>
  );
}
