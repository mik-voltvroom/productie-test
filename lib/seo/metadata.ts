import type { Metadata } from "next";
import type { Vehicle } from "@/types";
import { vehicleSeo } from "./business";
import { canonicalUrl } from "./business";

/** Replace nested social metadata, which Next otherwise inherits wholesale from the homepage. */
export function publicPageMetadata(metadata: Metadata): Metadata {
  const path = metadata.alternates?.canonical;
  if (typeof path !== "string") throw new Error("Public page metadata requires an explicit canonical path");
  const url = canonicalUrl(path);
  const title = typeof metadata.title === "string" ? metadata.title : undefined;
  const description = metadata.description ?? undefined;
  return { ...metadata, alternates: { ...metadata.alternates, canonical: url },
    openGraph: { title, description, url, type: "website", images: [], ...metadata.openGraph },
    twitter: { card: "summary", title, description, images: [], ...metadata.twitter } };
}

export function vehicleMetadata(vehicle: Vehicle): Metadata {
  const { title, description, url, mainImage, name } = vehicleSeo(vehicle);
  const images = mainImage ? [mainImage] : [];
  return { title, description, alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", images: images.slice(0, 1).map(url => ({ url, alt: name })) },
    twitter: { card: images.length ? "summary_large_image" : "summary", title, description, images: images.slice(0, 1) } };
}
