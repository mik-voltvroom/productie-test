"use client";

import { useMemo, useState } from "react";
import type { PublicSocialVideo } from "@/lib/social-video/model";
import { SocialVideo } from "@/components/SocialVideo";

const filters = [
  ["all", "Alles"], ["vehicle", "Auto's"], ["explanation", "Uitleg"], ["carcheck", "CarCheck"], ["review", "Reviews"], ["delivery", "Afleveringen"], ["showroom", "Showroom"], ["short", "Shorts"],
] as const;

export function SocialVideoHub({ videos }: { videos: PublicSocialVideo[] }) {
  const [filter, setFilter] = useState<string>("all");
  const visible = useMemo(() => filter === "all" ? videos : videos.filter(video => video.contentType === filter), [filter, videos]);

  return <>
    <div className="videoFilterBar" role="group" aria-label="Filter video's">{filters.map(([value, label]) => <button key={value} type="button" className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label}</button>)}</div>
    {visible.length === 0 ? <div className="videoEmptyState"><strong>Nog geen video's in deze categorie.</strong><p>Bekijk een andere categorie of kom binnenkort terug.</p></div> : <div className="socialVideoHubGrid">{visible.map(video => <SocialVideo key={video.id} video={video} />)}</div>}
  </>;
}
