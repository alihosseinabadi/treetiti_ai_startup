import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { useLanguage } from "../i18n/LanguageProvider";
import { buttonTap, springBounce } from "../constants/animations";
import { Mail, MessageCircle } from "lucide-react";

const CONTACT_EMAIL = "hellotreetiti@gmail.com";
const UA_WHATSAPP = "971585338222";
const RU_WHATSAPP = "79990004136";

const socials = [
  { name: "LinkedIn", url: "https://tr.linkedin.com/in/ali-hosseinabadi-92781b259", icon: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" },
  { name: "GitHub", url: "https://github.com/alihosseinabadi", icon: "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" },
  { name: "Instagram", url: "https://instagram.com/hellotreetiti", icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" },
];

export default function Footer() {
  const { t } = useTranslation();
  const { dir, lang } = useLanguage();
  const location = useLocation();
  const isHome = location.pathname === "/";

  const whatsappNumber = lang === "ru" ? RU_WHATSAPP : UA_WHATSAPP;
  const whatsappDisplay = lang === "ru" ? "+7 999 000 4136" : "+971 58 533 8222";

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handleLink = (to: string) => {
    if (isHome) {
      scrollTo(to);
    } else {
      window.location.href = `/${to}`;
    }
  };

  const serviceLinks: { label: string; section: string }[] = [
    { label: (t("footer.columns.0.links", { returnObjects: true }) as string[])[0] ?? "AI Website Design", section: "services" },
    { label: (t("footer.columns.0.links", { returnObjects: true }) as string[])[1] ?? "AI Automation", section: "automation" },
    { label: (t("footer.columns.0.links", { returnObjects: true }) as string[])[2] ?? "AI Workflow Systems", section: "pipeline" },
    { label: (t("footer.columns.0.links", { returnObjects: true }) as string[])[3] ?? "AI Content Creation", section: "ai-content" },
    { label: (t("footer.columns.0.links", { returnObjects: true }) as string[])[4] ?? "Custom AI Solutions", section: "cta" },
  ];

  const platformLinks: { label: string; to: string }[] = [
    { label: (t("footer.columns.1.links", { returnObjects: true }) as string[])[0] ?? "Overview", to: "/start" },
    { label: (t("footer.columns.1.links", { returnObjects: true }) as string[])[1] ?? "Capabilities", to: "/start" },
    { label: (t("footer.columns.1.links", { returnObjects: true }) as string[])[2] ?? "Pricing", to: "/start" },
    { label: (t("footer.columns.1.links", { returnObjects: true }) as string[])[3] ?? "Integrations", to: "/start" },
    { label: (t("footer.columns.1.links", { returnObjects: true }) as string[])[4] ?? "API", to: "/start" },
  ];

  const companyLinks: { label: string; to: string }[] = [
    { label: (t("footer.columns.2.links", { returnObjects: true }) as string[])[0] ?? "About Us", to: "/" },
    { label: (t("footer.columns.2.links", { returnObjects: true }) as string[])[1] ?? "Careers", to: "/" },
    { label: (t("footer.columns.2.links", { returnObjects: true }) as string[])[2] ?? "Blog", to: "/" },
    { label: (t("footer.columns.2.links", { returnObjects: true }) as string[])[3] ?? "News", to: "/" },
    { label: (t("footer.columns.2.links", { returnObjects: true }) as string[])[4] ?? "Contact", to: "/start" },
  ];

  return (
    <footer className={`footer-depth relative overflow-hidden ${dir === "rtl" ? "rtl" : "ltr"}`}>
      <div
        className="absolute top-0 left-[10%] right-[10%] h-px"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(110,168,255,0.05) 25%, rgba(110,168,255,0.03) 50%, rgba(110,168,255,0.05) 75%, transparent 100%)",
        }}
      />

      <motion.div
        className="py-20 md:py-28"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.2, ease: springBounce }}
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-16 md:mb-20">
            <div className="md:col-span-4">
              <Link to="/" className="inline-flex items-center gap-3 text-xl font-bold text-white mb-4 group">
                <span className="w-2 h-2 rounded-full bg-[#6EA8FF]" />
                <span className="text-[#6EA8FF]">Treetiti</span>
              </Link>
              <p className="text-sm text-zinc-500 leading-relaxed max-w-xs">
                {t("footer.tagline")}
              </p>
              <div className="flex flex-col gap-3 mt-6">
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="flex items-center gap-2 text-xs text-zinc-500 hover:text-[#6EA8FF] transition-colors duration-200"
                >
                  <Mail className="w-3.5 h-3.5" />
                  {CONTACT_EMAIL}
                </a>
                <a
                  href={`https://wa.me/${whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-zinc-500 hover:text-[#25D366] transition-colors duration-200"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {whatsappDisplay}
                </a>
              </div>
              <div className="flex gap-3 mt-4">
                {socials.map((s) => (
                  <motion.a
                    key={s.name}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-10 h-10 rounded-full border border-white/5 flex items-center justify-center hover:border-[#6EA8FF]/20 hover:bg-[#6EA8FF]/5 transition-all duration-300 group"
                    aria-label={s.name}
                    whileHover={{ scale: 1.15, borderColor: "rgba(110,168,255,0.4)" }}
                    whileTap={buttonTap}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="w-[15px] h-[15px] fill-white/40 group-hover:fill-[#6EA8FF] transition-colors duration-300"
                    >
                      <path d={s.icon} />
                    </svg>
                  </motion.a>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <h4 className="text-sm font-semibold text-white mb-4">{t("footer.columns.0.title")}</h4>
              <ul className="space-y-3">
                {serviceLinks.map((link) => (
                  <li key={link.label}>
                    {isHome ? (
                      <button
                        onClick={() => scrollTo(link.section)}
                        className="relative text-sm text-zinc-500 hover:text-white transition-colors duration-200 group text-start"
                      >
                        {link.label}
                        <span className="absolute bottom-0 left-0 w-0 h-px bg-[#6EA8FF] group-hover:w-full transition-all duration-300" />
                      </button>
                    ) : (
                      <Link
                        to={{ pathname: "/", hash: link.section }}
                        className="relative text-sm text-zinc-500 hover:text-white transition-colors duration-200 group"
                      >
                        {link.label}
                        <span className="absolute bottom-0 left-0 w-0 h-px bg-[#6EA8FF] group-hover:w-full transition-all duration-300" />
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-2">
              <h4 className="text-sm font-semibold text-white mb-4">{t("footer.columns.1.title")}</h4>
              <ul className="space-y-3">
                {platformLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="relative text-sm text-zinc-500 hover:text-white transition-colors duration-200 group"
                    >
                      {link.label}
                      <span className="absolute bottom-0 left-0 w-0 h-px bg-[#6EA8FF] group-hover:w-full transition-all duration-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-2">
              <h4 className="text-sm font-semibold text-white mb-4">{t("footer.columns.2.title")}</h4>
              <ul className="space-y-3">
                {companyLinks.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.to}
                      className="relative text-sm text-zinc-500 hover:text-white transition-colors duration-200 group"
                    >
                      {link.label}
                      <span className="absolute bottom-0 left-0 w-0 h-px bg-[#6EA8FF] group-hover:w-full transition-all duration-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-4 pt-8" style={{ borderTop: "1px solid rgba(255,255,255,0.03)" }}>
            <p className="text-xs text-zinc-500">{t("footer.rights")}</p>
            <div className="flex gap-6">
              {(() => {
                const legal = t("footer.legal", { returnObjects: true }) as string[];
                return [
                  { label: legal[0] ?? "Privacy", to: "/privacy" },
                  { label: legal[1] ?? "Terms", to: "/terms" },
                  { label: legal[2] ?? "Cookies", to: "/cookies" },
                ];
              })().map((item) => (
                <Link
                  key={item.label}
                  to={item.to ?? "/"}
                  className="relative text-xs text-zinc-500 hover:text-white transition-colors duration-200 group"
                >
                  {item.label}
                  <span className="absolute -bottom-0.5 left-0 w-0 h-px bg-[#6EA8FF] group-hover:w-full transition-all duration-300" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </footer>
  );
}