import { useState } from "react"
import { Routes, Route, useLocation } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import { useTranslation } from "react-i18next"
import { useLanguage } from "./i18n/LanguageProvider"

import Navigation from "./components/Navigation"
import FilmGrain from "./components/cinematic/FilmGrain"
import CinematicHome from "./components/cinematic/CinematicHome"
import Footer from "./components/Footer"
import { ChatWidget } from "./components/widgets/ChatWidget"
import { WhatsAppButton } from "./components/widgets/WhatsAppButton"
import AdminRouter from "./app/admin/AdminRouter"
import StartPage from "./pages/StartPage"
import Privacy from "./pages/Privacy"
import Terms from "./pages/Terms"
import Cookies from "./pages/Cookies"

function AmbientBackground() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      <div
        className="absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(110,168,255,0.025) 0%, transparent 65%)",
          filter: "blur(120px)",
          animation: "floatDrift 45s ease-in-out infinite",
        }}
      />
      <div
        className="absolute top-1/4 -left-48 w-[800px] h-[800px] rounded-full"
        style={{
          background: "radial-gradient(circle, var(--tw-orb-white) 0%, transparent 65%)",
          filter: "blur(140px)",
          animation: "orbDrift 50s ease-in-out infinite",
        }}
      />
      <div
        className="absolute bottom-1/3 -right-48 w-[900px] h-[900px] rounded-full"
        style={{
          background: "radial-gradient(circle, var(--tw-orb-blue) 0%, transparent 65%)",
          filter: "blur(160px)",
          animation: "orbDrift 55s ease-in-out infinite reverse",
        }}
      />
    </div>
  )
}

export default function App() {
  const { t } = useTranslation()
  const location = useLocation()
  const isAdmin = location.pathname.startsWith("/admin")
  const isLegal = ["/privacy", "/terms", "/cookies"].includes(location.pathname)
  const isStart = location.pathname === "/start"
  const { dir } = useLanguage()

  if (isAdmin) return <AdminRouter />

  return (
    <>
      {isStart ? (
        <AnimatePresence mode="wait">
          <motion.div
            key="start-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            style={{ backgroundColor: "var(--bg)", minHeight: "100vh" }}
          >
            <StartPage />
          </motion.div>
        </AnimatePresence>
      ) : isLegal ? (
        <div className={`grain-overlay ${dir === "rtl" ? "rtl" : "ltr"}`} style={{ overflowX: "clip" }}>
          <AmbientBackground />
          <Navigation />
          <main id="main-content" className="relative z-10 min-h-screen pt-24" tabIndex={-1}>
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <Routes location={location}>
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/cookies" element={<Cookies />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </main>
          <Footer />
        </div>
      ) : (
        <>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:text-black focus:rounded-lg focus:text-sm focus:font-medium"
          >
            {t("app.skipToMain")}
          </a>
          <Navigation />
          <div className={`grain-overlay ${dir === "rtl" ? "rtl" : "ltr"}`} style={{ overflowX: "clip" }}>
            <AmbientBackground />
            <FilmGrain />
            <main id="main-content" className="relative z-10" tabIndex={-1}>
              <CinematicHome />
            </main>
          </div>
          <Footer />
          <ChatWidget />
          <WhatsAppButton phoneNumber="971585338222" />
        </>
      )}
    </>
  )
}
