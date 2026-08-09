import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useSpring, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../i18n/LanguageProvider";
import AuthModal from "./AuthModal";
import ThemeSwitch from "./ThemeSwitch";
import { buttonTap, buttonHover, springBounce } from "../constants/animations";

const BLUE = "#6EA8FF";

function LogoMark() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="14" cy="14" r="3.5" fill="white" />
      <circle cx="5" cy="5" r="2" fill={BLUE} opacity="0.6" />
      <circle cx="23" cy="5" r="2" fill={BLUE} opacity="0.6" />
      <circle cx="5" cy="23" r="2" fill="white" opacity="0.3" />
      <circle cx="23" cy="23" r="2" fill="white" opacity="0.3" />
      <circle cx="14" cy="5" r="1.5" fill="white" opacity="0.25" />
      <circle cx="14" cy="23" r="1.5" fill="white" opacity="0.25" />
      <circle cx="14" cy="14" r="12" fill="none" stroke={BLUE} strokeWidth="0.5" opacity="0.2" />
    </svg>
  );
}

const LANG_OPTIONS = [
  { code: "en", label: "EN" },
  { code: "fa", label: "FA" },
  { code: "ru", label: "RU" },
  { code: "ar", label: "AR" },
  { code: "tr", label: "TR" },
];

function LanguageSwitcher() {
  const { lang, setLang } = useLanguage();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-xs font-medium text-zinc-400 hover:text-white transition-all duration-300 px-3 py-1.5 rounded-full border border-white/10 hover:border-white/20 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6EA8FF] flex items-center gap-1.5"
        aria-label={t("language.switch")}
        aria-expanded={open}
      >
        {lang.toUpperCase()}
        <svg className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-24 rounded-xl border border-white/10 bg-black/80 backdrop-blur-xl overflow-hidden z-50"
          >
            {LANG_OPTIONS.map((opt) => (
              <button
                key={opt.code}
                onClick={() => { setLang(opt.code); setOpen(false); }}
                className={`w-full text-start px-4 py-2 text-xs font-medium transition-colors duration-200 ${
                  lang === opt.code
                    ? "text-white bg-white/10"
                    : "text-zinc-400 hover:text-white hover:bg-white/5"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const lastScrollY = useRef(0);
  const { scrollY } = useScroll();
  const navY = useTransform(scrollY, [0, 100], [0, -100]);
  const navYSpring = useSpring(navY, { stiffness: 300, damping: 35 });
  const { t } = useTranslation();
  const { dir } = useLanguage();

  useEffect(() => {
    function handleScroll() {
      const current = window.scrollY;
      if (current > 300 && current > lastScrollY.current + 10) {
        setHidden(true);
      } else if (current < lastScrollY.current - 10 || current < 300) {
        setHidden(false);
      }
      lastScrollY.current = current;
      setScrolled(current > 60);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const glassBg = scrolled
    ? "rgba(0, 0, 0, 0.5)"
    : "rgba(0, 0, 0, 0.1)";
  const glassBorder = scrolled
    ? "1px solid rgba(255, 255, 255, 0.04)"
    : "1px solid rgba(255, 255, 255, 0.01)";

  return (
    <>
      <motion.header
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          y: hidden ? navYSpring : 0,
          padding: "0 20px",
          paddingTop: "14px",
        }}
        role="banner"
      >
        <nav
          className="mx-auto max-w-[1440px] h-[50px] flex items-center justify-between gap-x-8 px-6 rounded-2xl transition-all duration-700"
          style={{
            background: glassBg,
            backdropFilter: "blur(80px) saturate(1.6)",
            WebkitBackdropFilter: "blur(80px) saturate(1.6)",
            border: glassBorder,
            boxShadow: scrolled
              ? "0 12px 60px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.03)"
              : "0 4px 20px rgba(0, 0, 0, 0.05)",
          }}
          aria-label={t("nav.main")}
          dir={dir}
        >
          <Link
            to="/"
            className="flex items-center gap-3 text-sm font-semibold tracking-tight text-white group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6EA8FF] focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded-md"
            aria-label={t("nav.home")}
          >
            <motion.span
              className="flex items-center gap-3"
              whileHover={{ scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <LogoMark />
              <span className="group-hover:text-white/80 transition-colors duration-300">Treetiti</span>
            </motion.span>
          </Link>

          <div className="flex items-center gap-1.5 md:gap-2">
            <LanguageSwitcher />
            <ThemeSwitch />
            <motion.button
              onClick={() => setAuthOpen(true)}
              className="hidden md:inline-flex px-4 py-1.5 text-xs font-medium text-zinc-400 hover:text-white rounded-full border border-white/10 hover:border-white/20 hover:bg-white/5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6EA8FF]"
              whileHover={{ scale: 1.05, color: "#fff" }}
              whileTap={buttonTap}
            >
              {t("auth.signIn")}
            </motion.button>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={buttonTap}
              className="inline-block"
              style={{ perspective: "800px" }}
            >
              <Link
                to="/start"
                className="relative overflow-hidden group px-5 py-1.5 text-xs font-medium text-white rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6EA8FF]"
                style={{
                  background: "linear-gradient(135deg, rgba(110,168,255,0.25) 0%, rgba(110,168,255,0.08) 100%)",
                  border: "1px solid rgba(110,168,255,0.3)",
                  boxShadow: "0 0 30px rgba(110,168,255,0.06)",
                }}
              >
                <span className="relative z-10">{t("auth.startProject")}</span>
                <motion.div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: "linear-gradient(135deg, rgba(110,168,255,0.35) 0%, rgba(110,168,255,0.12) 100%)",
                  }}
                />
                <div
                  className="absolute -inset-full top-0 h-full w-1/2 skew-x-12 opacity-0 group-hover:opacity-40 transition-all duration-700"
                  style={{
                    background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                    animation: "lensFlare 3s ease-in-out infinite",
                  }}
                />
              </Link>
            </motion.div>
          </div>
        </nav>
      </motion.header>
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </>
  );
}
