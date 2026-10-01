import { useState } from "react";

const PRIMARY_SRC = "/logo-brand-mark.png";
const FALLBACK_SRC = "/logo.png";

type BrandLogoProps = {
  className?: string;
  style?: React.CSSProperties;
};

/**
 * Treetiti brand wordmark.
 * Uses public/logo-brand-mark.png (the TREEtiti + BRAND artwork) when present,
 * automatically falling back to public/logo.png.
 * Rendered with object-fit: contain so the full artwork is always visible —
 * never zoomed, cropped or stretched.
 */
export default function BrandLogo({ className = "h-6 w-auto", style }: BrandLogoProps) {
  const [src, setSrc] = useState(PRIMARY_SRC);
  return (
    <img
      src={src}
      onError={() => {
        if (src !== FALLBACK_SRC) setSrc(FALLBACK_SRC);
      }}
      alt="Treetiti"
      draggable={false}
      className={`brand-logo ${className}`}
      style={{ objectFit: "contain", objectPosition: "center", ...style }}
    />
  );
}
