import Image from "next/image";

function ContactActionIcon({ name }: { name: "phone" | "whatsapp" }) {
  return <Image className="contactActionImage" src={`/icons/${name}-3d.webp`} alt="" aria-hidden="true" width={192} height={192} unoptimized />;
}

export function PhoneIcon() {
  return <ContactActionIcon name="phone" />;
}

export function WhatsAppIcon() {
  return <ContactActionIcon name="whatsapp" />;
}
