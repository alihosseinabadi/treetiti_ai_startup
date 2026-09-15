import React from "react";

export default function AssetPreview({
  kind,
  url,
  title,
}: {
  kind: string;
  url: string;
  title: string;
}) {
  if (!url) {
    return (
      <div className="grid h-28 w-full place-items-center rounded-lg bg-primary text-xs text-text-muted">
        no asset file yet
      </div>
    );
  }
  if (kind === "image") {
    return <img src={url} alt={title} className="h-28 w-full object-cover rounded-lg" />;
  }
  if (kind === "video") {
    return (
      <video src={url} className="h-28 w-full object-cover rounded-lg" muted preload="metadata" />
    );
  }
  if (kind === "audio") {
    return <audio src={url} controls className="w-full" />;
  }
  return (
    <div className="grid h-28 w-full place-items-center rounded-lg bg-primary text-xs text-text-muted">
      {kind} asset
    </div>
  );
}