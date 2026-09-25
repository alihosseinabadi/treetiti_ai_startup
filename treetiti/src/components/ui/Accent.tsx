import { Fragment, type ReactNode } from "react"

const KEYWORDS = [
  "Treetiti",
  "AI",
  "UGC",
  "Cinematic",
  "Websites",
  "Automation",
  "Workflows",
  "Branding",
  "Identity",
  "Typography",
  "Palette",
  "Motion",
  "Voice",
  "Discovery",
  "Strategy",
  "Design",
  "Development",
  "Launch",
  "Growth",
  "Wireframe",
  "Components",
  "Content",
  "Animations",
  "Dashboard",
  "Mobile",
  "Ecosystem",
  "Pipeline",
  "Campaign",
  "Product",
  "Analysis",
  "Assets",
  "Trigger",
  "Agent",
  "Analytics",
  "Premium",
  "Systems",
  "Intelligence",
  "Precision",
  "Craftsmanship",
]

const RE = new RegExp(`\\b(${KEYWORDS.join("|")})\\b`, "gi")
const KEYWORDS_SET = new Set(KEYWORDS.map((word) => word.toLowerCase()))

export function Highlight({ text }: { text: string }) {
  const parts = text.split(RE)

  return (
    <>
      {parts.map((part, i) =>
        part && KEYWORDS_SET.has(part.toLowerCase()) ? (
          <span
            key={i}
            className={part.toLowerCase() === "treetiti" ? "text-[#6EA8FF]" : undefined}
          >
            {part}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  )
}