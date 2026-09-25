import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { ArrowRight, Check, Handshake, Loader2, Rocket, Sparkles } from "lucide-react"
import { supabase } from "../../lib/supabase"

gsap.registerPlugin(ScrollTrigger)

const EMAIL_RE = /^\S+@\S+\.\S+$/
const CONTACT_EMAIL = "brandingtreetiti@gmail.com"

const PERKS = [
  { icon: Handshake, t: "perk1t", d: "perk1d" },
  { icon: Rocket, t: "perk2t", d: "perk2d" },
  { icon: Sparkles, t: "perk3t", d: "perk3d" },
]

export default function Scene10_Partnership() {
  const { t } = useTranslation()
  const sectionRef = useRef<HTMLElement>(null)
  const textRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const glowRef = useRef<HTMLDivElement>(null)

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [idea, setIdea] = useState("")
  const [link, setLink] = useState("")
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const ctx = gsap.context(() => {
      gsap.fromTo(textRef.current,
        { opacity: 0, y: 60 },
        {
          opacity: 1, y: 0, ease: "power2.out",
          scrollTrigger: { trigger: section, start: "top 80%", end: "top 35%", scrub: 1.2 },
        }
      )
      gsap.fromTo(formRef.current,
        { opacity: 0, y: 60, scale: 0.97 },
        {
          opacity: 1, y: 0, scale: 1, ease: "power2.out",
          scrollTrigger: { trigger: section, start: "top 70%", end: "top 30%", scrub: 1.2 },
        }
      )
      gsap.fromTo(glowRef.current,
        { scale: 0.7, opacity: 0 },
        {
          scale: 1.1, opacity: 1, ease: "power2.out",
          scrollTrigger: { trigger: section, start: "top 80%", end: "top 35%", scrub: 1.2 },
        }
      )
    }, section)

    return () => ctx.revert()
  }, [])

  const canSubmit =
    !sending && !done &&
    name.trim() !== "" &&
    EMAIL_RE.test(email.trim()) &&
    idea.trim().length >= 20

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    setSending(true)
    setError("")
    try {
      const notes = [
        "Type: Partnership application",
        `Name: ${name.trim()}`,
        `Email: ${email.trim()}`,
        `Website / deck: ${link.trim() || "—"}`,
        `Idea / business:\n${idea.trim()}`,
      ].join("\n")
      const { error } = await supabase.from("leads").insert({
        name: name.trim(),
        email: email.trim(),
        source: "partnership",
        notes,
        phone: null,
      })
      if (error) {
        setError(error.message || "Something went wrong. Please try again.")
        setSending(false)
        return
      }
      setDone(true)
    } catch (err) {
      console.error(err)
      setError("Something went wrong. Please try again.")
      setSending(false)
    }
  }

  const inputStyle = {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(110,168,255,0.14)",
    color: "rgba(255,255,255,0.85)",
  }

  return (
    <section
      ref={sectionRef}
      className="relative w-full min-h-screen flex items-center justify-center overflow-hidden py-28"
      style={{ background: "var(--bg)" }}
    >
      <div
        ref={glowRef}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vmin] h-[80vmin] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(110,168,255,0.03) 0%, transparent 60%)",
          filter: "blur(120px)",
        }}
      />

      <div className="relative z-10 w-full max-w-6xl mx-auto px-6 grid gap-12 md:grid-cols-2 md:gap-16 items-center">
        <div ref={textRef}>
          <span className="text-[10px] tracking-[0.3em] text-[#6EA8FF]/60 uppercase font-medium block mb-4">
            {t("partner.eyebrow")}
          </span>
          <h2 className="text-[clamp(2.2rem,5vw,4rem)] font-display font-bold leading-[1.0] tracking-[-0.03em] text-white mb-6">
            {t("partner.title1")}
            <br />
            {t("partner.title2")}
            <br />
            <span className="text-[#6EA8FF]">{t("partner.titleAccent")}</span>
          </h2>
          <p className="text-sm md:text-base text-white/40 max-w-md leading-relaxed font-light mb-8">
            {t("partner.desc")}
          </p>

          <div className="space-y-5">
            {PERKS.map((p) => {
              const Icon = p.icon
              return (
                <div key={p.t} className="flex items-start gap-4">
                  <span
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "rgba(110,168,255,0.08)", border: "1px solid rgba(110,168,255,0.18)" }}
                  >
                    <Icon className="w-[18px] h-[18px]" style={{ color: "#6EA8FF" }} />
                  </span>
                  <span>
                    <span className="block text-[15px] font-semibold" style={{ color: "color-mix(in srgb, var(--text-primary) 92%, transparent)" }}>
                      {t(`partner.${p.t}`)}
                    </span>
                    <span className="block text-[13px] mt-1 leading-relaxed" style={{ color: "color-mix(in srgb, var(--text-primary) 55%, transparent)" }}>
                      {t(`partner.${p.d}`)}
                    </span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        <div ref={formRef}>
          <div
            className="rounded-[24px] p-7 md:p-8"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 40px 120px rgba(0,0,0,0.5)",
            }}
          >
            {done ? (
              <div className="flex flex-col items-center justify-center py-14 text-center">
                <span
                  className="w-14 h-14 rounded-full flex items-center justify-center mb-6"
                  style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }}
                >
                  <Check className="w-6 h-6" style={{ color: "#10B981" }} />
                </span>
                <p className="text-lg font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>
                  {t("partner.successTitle")}
                </p>
                <p className="text-[13px] mt-2 max-w-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {t("partner.successText")}
                </p>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label htmlFor="partner-name" className="block text-[12px] font-medium mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                    {t("partner.nameLabel")}
                  </label>
                  <input
                    id="partner-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("partner.namePh")}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-[rgba(110,168,255,0.45)] transition-colors placeholder:text-white/20"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label htmlFor="partner-email" className="block text-[12px] font-medium mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                    {t("partner.emailLabel")}
                  </label>
                  <input
                    id="partner-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("partner.emailPh")}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-[rgba(110,168,255,0.45)] transition-colors placeholder:text-white/20"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label htmlFor="partner-link" className="block text-[12px] font-medium mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                    {t("partner.linkLabel")} <span style={{ color: "rgba(255,255,255,0.3)" }}>({t("partner.optional")})</span>
                  </label>
                  <input
                    id="partner-link"
                    type="text"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder={t("partner.linkPh")}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none focus:border-[rgba(110,168,255,0.45)] transition-colors placeholder:text-white/20"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label htmlFor="partner-idea" className="block text-[12px] font-medium mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                    {t("partner.ideaLabel")}
                  </label>
                  <textarea
                    id="partner-idea"
                    value={idea}
                    onChange={(e) => setIdea(e.target.value)}
                    placeholder={t("partner.ideaPh")}
                    rows={4}
                    className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none focus:border-[rgba(110,168,255,0.45)] transition-colors placeholder:text-white/20"
                    style={inputStyle}
                  />
                </div>

                {error && (
                  <p className="text-[12.5px]" style={{ color: "#ff8080" }}>
                    {error} {t("partner.errorAlso")} {CONTACT_EMAIL}.
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="group w-full inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3.5 text-[14px] font-semibold text-white transition-all duration-300 disabled:opacity-40"
                  style={{
                    background: "linear-gradient(135deg, rgba(110,168,255,0.25) 0%, rgba(110,168,255,0.08) 100%)",
                    border: "1px solid rgba(110,168,255,0.3)",
                  }}
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {t("partner.submit")}
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
                    </>
                  )}
                </button>
                <p className="text-[11px] text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {t("partner.replyNote")}
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
