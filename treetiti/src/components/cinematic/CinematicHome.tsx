import { Suspense, lazy, useEffect } from "react"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import Scene01_Arrival from "../scenes/Scene01_Arrival"

const UGCSection = lazy(() => import("../UGCSection"))
const Scene03_AIWebsites = lazy(() => import("../scenes/Scene03_AIWebsites"))
const Scene04_Automation = lazy(() => import("../scenes/Scene04_Automation"))
const Scene05_Branding = lazy(() => import("../scenes/Scene05_Branding"))
const Scene07_Pipeline = lazy(() => import("../scenes/Scene07_Pipeline"))
const Scene08_Workflow = lazy(() => import("../scenes/Scene08_Workflow"))
const Scene09_Partners = lazy(() => import("../scenes/Scene09_Partners"))
const Scene10_Partnership = lazy(() => import("../scenes/Scene10_Partnership"))

function BelowFold({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div style={{ minHeight: "60vh" }} aria-hidden="true" />}>
      {children}
    </Suspense>
  )
}

export default function CinematicHome() {
  useEffect(() => {
    if (!window.location.hash) return
    const to = setTimeout(() => {
      document.querySelector(window.location.hash)?.scrollIntoView({ behavior: "instant", block: "start" })
    }, 1200)
    return () => clearTimeout(to)
  }, [])

  useEffect(() => {
    const refresh = () => ScrollTrigger.refresh()
    window.addEventListener("load", refresh)
    const to = setTimeout(refresh, 2500)
    if (document.fonts) document.fonts.ready.then(refresh).catch(() => {})
    return () => {
      window.removeEventListener("load", refresh)
      clearTimeout(to)
    }
  }, [])

  return (
    <div className="relative" style={{ background: "var(--bg)" }}>
      <div id="hero"><Scene01_Arrival /></div>
      <div id="services"><BelowFold><UGCSection /></BelowFold></div>
      <div id="ai-content"><BelowFold><Scene03_AIWebsites /></BelowFold></div>
      <div id="automation"><BelowFold><Scene04_Automation /></BelowFold></div>
      <div id="branding"><BelowFold><Scene05_Branding /></BelowFold></div>
      <div id="pipeline"><BelowFold><Scene07_Pipeline /></BelowFold></div>
      <div id="workflow"><BelowFold><Scene08_Workflow /></BelowFold></div>
      <div id="partners"><BelowFold><Scene09_Partners /></BelowFold></div>
      <div id="cta"><BelowFold><Scene10_Partnership /></BelowFold></div>
    </div>
  )
}
