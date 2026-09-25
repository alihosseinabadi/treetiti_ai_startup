import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence, type Easing } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import { Check, Upload, Sparkles, Send, Package, Cpu, ChevronLeft } from "lucide-react";
import { supabase } from "../lib/supabase";

type Phase = "entry" | "packages" | "custom" | "package-form" | "summary" | "done";

interface PackageData {
  id: string;
  name: string;
  tagline: string;
  features: string[];
  timeline: string;
  accent: string;
  videoDesc: string;
}



interface CustomAnswers {
  [key: string]: string;
}

const TYPING_DELAY = 800;

const entryVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.1 + i * 0.15, duration: 0.6, ease: [0.16, 1, 0.3, 1] as Easing },
  }),
};

export default function StartPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const PACKAGES: PackageData[] = (t("startPage.packages", { returnObjects: true }) as any[]).map((p: any, i: number) => ({
    ...p,
    id: ["starter", "ugc", "professional", "architecture", "enterprise"][i] || `pkg-${i}`,
    accent: ["rgba(110,168,255,0.25)", "rgba(168,85,247,0.25)", "rgba(110,168,255,0.3)", "rgba(34,211,238,0.25)", "rgba(251,191,36,0.25)"][i] || "rgba(110,168,255,0.25)",
    videoDesc: p.desc || "",
  }));

  const CUSTOM_QUESTIONS = [
    { key: "type", question: t("startPage.customQuestions.type"), placeholder: t("startPage.customPlaceholders.type") },
    { key: "industry", question: t("startPage.customQuestions.industry"), placeholder: t("startPage.customPlaceholders.industry") },
    { key: "goal", question: t("startPage.customQuestions.goal"), placeholder: t("startPage.customPlaceholders.goal") },
    { key: "branding", question: t("startPage.customQuestions.branding"), placeholder: t("startPage.customPlaceholders.branding") },
    { key: "deadline", question: t("startPage.customQuestions.deadline"), placeholder: t("startPage.customPlaceholders.deadline") },
  ];

  const [phase, setPhase] = useState<Phase>("entry");
  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [pkgName, setPkgName] = useState("");
  const [pkgEmail, setPkgEmail] = useState("");
  const [pkgNotes, setPkgNotes] = useState("");
  const [pkgFiles, setPkgFiles] = useState<{ name: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [refNum, setRefNum] = useState("");

  // Custom chat state
  const [customAnswers, setCustomAnswers] = useState<CustomAnswers>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [inputVal, setInputVal] = useState("");
  const [chatLog, setChatLog] = useState<{ role: "ai" | "user"; text: string }[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addAssistantMsg = useCallback((text: string) => {
    setIsTyping(true);
    setTimeout(() => {
      setChatLog((prev) => [...prev, { role: "ai", text }]);
      setIsTyping(false);
    }, TYPING_DELAY);
  }, []);

  useEffect(() => {
    if (phase === "custom" && chatLog.length === 0) {
      addAssistantMsg(t("startPage.customQuestions.type"));
    }
  }, [phase, chatLog.length, addAssistantMsg]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog, isTyping]);

  const handleCustomSend = () => {
    if (!inputVal.trim() || isTyping) return;
    const q = CUSTOM_QUESTIONS[currentQ];
    if (!q) return;

    setChatLog((prev) => [...prev, { role: "user", text: inputVal }]);
    setCustomAnswers((prev) => ({ ...prev, [q.key]: inputVal }));
    setInputVal("");

    if (currentQ < CUSTOM_QUESTIONS.length - 1) {
      setCurrentQ((prev) => prev + 1);
      const next = CUSTOM_QUESTIONS[currentQ + 1];
      if (next) {
        setTimeout(() => addAssistantMsg(next.question), 400);
      }
    } else {
      setTimeout(() => {
        setChatLog((prev) => [...prev, { role: "ai", text: t("startPage.thanksSummary") }]);
        setTimeout(() => setPhase("summary"), 800);
      }, 600);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const data = getSummaryData();
    try {
      const { error } = await supabase.from("leads").insert({
        name: data.company,
        email: data.email,
        company: data.company,
        service: data.type,
        message: `Type: ${data.type}\nIndustry: ${data.industry}\nTimeline: ${data.timeline}\nBudget: ${data.budget}\nNotes: ${data.notes}`,
        status: "new",
        score: 0,
        source: "website",
        metadata: { services: data.services, timeline: data.timeline, budget: data.budget },
      });
      if (error) console.error("Submit error:", error);
    } catch (e) {
      console.error("Submit error:", e);
    }
    setSubmitting(false);
    const code = "TT-" + Date.now().toString(36).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    setRefNum(code);
    setPhase("done");
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPkgFiles((prev) => [...prev, ...files.map((f) => ({ name: f.name }))]);
    e.target.value = "";
  };

  const getSummaryData = () => {
    if (selectedPkg) {
      const pkg = PACKAGES.find((p) => p.id === selectedPkg);
      return {
        type: pkg?.name || t("startPage.premiumPackage"),
        industry: t("startPage.selectPackage"),
        timeline: pkg?.timeline || "",
        services: pkg?.features || [],
        company: pkgName,
        email: pkgEmail,
        notes: pkgNotes,
      };
    }
    return {
      type: customAnswers.type || t("startPage.customSolution"),
      industry: customAnswers.industry || "",
      timeline: customAnswers.deadline || t("startPage.customPlaceholders.deadline"),
      budget: customAnswers.budget || "To be discussed",
      services: ["Custom AI Solution", customAnswers.type || ""].filter(Boolean),
      company: customAnswers.company || "",
      email: customAnswers.email || "",
      notes: "",
    };
  };

  const pkgFileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="min-h-screen bg-[var(--bg)] overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-10 h-16 flex items-center justify-between" style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <Link to="/" className="flex items-center gap-3" aria-label="Home">
          <span className="w-2 h-2 rounded-full bg-[#6EA8FF]" style={{ boxShadow: "0 0 12px rgba(110,168,255,0.5)" }} />
          <span className="text-sm font-semibold text-white">Treetiti</span>
        </Link>
        <div className="flex items-center gap-4">
          {phase !== "entry" && phase !== "done" && (
            <button onClick={() => navigate("/")} className="text-xs px-3 py-1.5 rounded-full transition-colors" style={{ color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {t("startPage.exit")}
            </button>
          )}
          {phase !== "entry" && phase !== "done" && phase !== "packages" && (
            <button onClick={() => setPhase("entry")} className="text-xs px-3 py-1.5 rounded-full transition-colors" style={{ color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {t("startPage.back")}
            </button>
          )}
        </div>
      </nav>

      {/* ENTRY */}
      <AnimatePresence mode="wait">
        {phase === "entry" && <EntryScreen onSelect={(v) => setPhase(v)} />}

        {/* PACKAGE EXPLORER */}
        {phase === "packages" && (
          <PackageExplorer
            packages={PACKAGES}
            onSelect={(id) => { setSelectedPkg(id); setPhase("package-form"); }}
            onBack={() => setPhase("entry")}
          />
        )}

        {/* PACKAGE MINI FORM */}
        {phase === "package-form" && (
          <PackageForm
            pkg={PACKAGES.find((p) => p.id === selectedPkg) || PACKAGES[0]!}
            name={pkgName}
            email={pkgEmail}
            notes={pkgNotes}
            files={pkgFiles}
            onNameChange={setPkgName}
            onEmailChange={setPkgEmail}
            onNotesChange={setPkgNotes}
            onFile={handleFile}
            onRemove={(name) => setPkgFiles((prev) => prev.filter((f) => f.name !== name))}
            onBack={() => setPhase("packages")}
            onSubmit={() => setPhase("summary")}
            fileInputRef={pkgFileInputRef}
          />
        )}

        {/* CUSTOM AI SOLUTION */}
        {phase === "custom" && (
          <CustomChat
            chatLog={chatLog}
            isTyping={isTyping}
            inputVal={inputVal}
            onInputChange={setInputVal}
            onSend={handleCustomSend}
            onBack={() => setPhase("entry")}
            answers={customAnswers}
            chatEndRef={chatEndRef}
            currentQ={currentQ}
            customQuestions={CUSTOM_QUESTIONS}
          />
        )}

        {/* SUMMARY */}
        {phase === "summary" && (
          <SummaryScreen
            data={getSummaryData()}
            submitting={submitting}
            onSubmit={handleSubmit}
            onBack={() => setPhase(selectedPkg ? "package-form" : "custom")}
          />
        )}

        {/* DONE */}
        {phase === "done" && <DoneScreen refNum={refNum} />}
      </AnimatePresence>

      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] pointer-events-none z-0" style={{ background: "radial-gradient(circle at center, rgba(110,168,255,0.03) 0%, transparent 60%)", filter: "blur(120px)" }} aria-hidden="true" />
    </div>
  );
}

/* ── ENTRY SCREEN ── */
function EntryScreen({ onSelect }: { onSelect: (p: Phase) => void }) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6"
    >
      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="text-[clamp(28px,4.5vw,64px)] font-bold leading-[1.08] tracking-[-0.02em] text-white text-center max-w-[700px] mb-16"
      >
        {t("startPage.entryTitle")}
      </motion.h1>

      <div className="flex flex-col md:flex-row gap-5 w-full max-w-[700px]">
        <motion.button
          custom={0}
          initial="hidden"
          animate="visible"
          variants={entryVariants}
          onClick={() => onSelect("packages")}
          className="group relative flex-1 text-start px-8 py-10 rounded-3xl overflow-hidden transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6EA8FF]"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: "radial-gradient(ellipse at 30% 40%, rgba(110,168,255,0.06) 0%, transparent 60%)",
            }}
          />
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(110,168,255,0.2)]" style={{ background: "rgba(110,168,255,0.1)", border: "1px solid rgba(110,168,255,0.2)" }}>
              <Package className="w-5 h-5 text-[#6EA8FF]" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{t("startPage.premiumPackage")}</h3>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("startPage.premiumPackageDesc")}</p>
          </div>
        </motion.button>

        <motion.button
          custom={1}
          initial="hidden"
          animate="visible"
          variants={entryVariants}
          onClick={() => onSelect("custom")}
          className="group relative flex-1 text-start px-8 py-10 rounded-3xl overflow-hidden transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6EA8FF]"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <motion.div
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: "radial-gradient(ellipse at 70% 40%, rgba(168,85,247,0.06) 0%, transparent 60%)",
            }}
          />
          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-all duration-500 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(168,85,247,0.2)]" style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)" }}>
              <Cpu className="w-5 h-5 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">{t("startPage.customSolution")}</h3>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>{t("startPage.customSolutionDesc")}</p>
          </div>
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ── PACKAGE EXPLORER ── */
function PackageExplorer({ packages, onSelect, onBack }: { packages: PackageData[]; onSelect: (id: string) => void; onBack: () => void }) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 min-h-screen pt-24 pb-20"
    >
      <div className="max-w-[1200px] mx-auto px-6 md:px-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <button onClick={onBack} className="flex items-center gap-1.5 text-xs mb-8 transition-colors hover:text-white" style={{ color: "var(--text-muted)" }}>
            <ChevronLeft className="w-3 h-3 rtl:scale-x-[-1]" />
            {t("startPage.back")}
          </button>
          <h2 className="text-[clamp(28px,3.5vw,48px)] font-bold text-white mb-2 tracking-tight">{t("startPage.choosePackage")}</h2>
          <p className="text-sm mb-12" style={{ color: "var(--text-muted)" }}>{t("startPage.choosePackageDesc")}</p>
        </motion.div>

        <div ref={scrollRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {packages.map((pkg, i) => (
            <motion.div
              key={pkg.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              onMouseEnter={() => setHoveredId(pkg.id)}
              onMouseLeave={() => setHoveredId(null)}
              className="group relative rounded-3xl overflow-hidden cursor-pointer transition-all duration-500"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
                border: selectedId === pkg.id ? "1px solid rgba(110,168,255,0.4)" : "1px solid rgba(255,255,255,0.06)",
                transform: hoveredId === pkg.id ? "translateY(-4px)" : "translateY(0)",
                boxShadow: hoveredId === pkg.id ? "0 20px 60px rgba(0,0,0,0.4)" : "0 0 0 rgba(0,0,0,0)",
              }}
            >
              <div className="relative p-6 md:p-8">
                <div className="aspect-[16/10] mb-6 rounded-2xl flex items-center justify-center overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <motion.div
                    animate={{ opacity: hoveredId === pkg.id ? 1 : 0.5, scale: hoveredId === pkg.id ? 1.05 : 1 }}
                    transition={{ duration: 0.5 }}
                    className="text-center"
                  >
                    <Package className="w-10 h-10 mx-auto mb-2" style={{ color: pkg.accent }} />
                    <span className="text-xs block" style={{ color: "var(--text-muted)" }}>{pkg.videoDesc}</span>
                  </motion.div>
                </div>

                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-white">{pkg.name}</h3>
                  {pkg.id === "professional" && (
                    <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "rgba(110,168,255,0.12)", color: "#6EA8FF", border: "1px solid rgba(110,168,255,0.2)" }}>
                      {t("startPage.popular")}
                    </span>
                  )}
                </div>

                <p className="text-xs mb-4" style={{ color: "var(--text-muted)" }}>{pkg.tagline}</p>

                <div className="flex items-center mb-5">
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>{pkg.timeline}</span>
                </div>

                <div className="space-y-1.5 mb-6">
                  {pkg.features.slice(0, 4).map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <Check className="w-3 h-3 shrink-0" style={{ color: pkg.accent }} />
                      <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{f}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => onSelect(pkg.id)}
                  className="w-full py-3 rounded-xl text-xs font-medium transition-all duration-300"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "var(--text-primary)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#FFFFFF"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "var(--text-primary)"; }}
                >
                  {t("startPage.selectPackage")}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ── PACKAGE MINI FORM ── */
function PackageForm({
  pkg, name, email, notes, files,
  onNameChange, onEmailChange, onNotesChange,
  onFile, onRemove, onBack, onSubmit, fileInputRef,
}: {
  pkg: PackageData;
  name: string; email: string; notes: string; files: { name: string }[];
  onNameChange: (v: string) => void; onEmailChange: (v: string) => void;
  onNotesChange: (v: string) => void; onFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (n: string) => void; onBack: () => void; onSubmit: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 min-h-screen pt-24 pb-20"
    >
      <div className="max-w-[540px] mx-auto px-6">
        <button onClick={onBack} className="flex items-center gap-1.5 text-xs mb-8 transition-colors hover:text-white" style={{ color: "var(--text-muted)" }}>
          <ChevronLeft className="w-3 h-3 rtl:scale-x-[-1]" />
          {t("startPage.backToPackages")}
        </button>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-xl font-bold text-white">{pkg.name}</span>
          </div>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{pkg.tagline}</p>
        </div>

        <div className="space-y-5">
          <Field label={t("startPage.projectName")} required>
            <input value={name} onChange={(e) => onNameChange(e.target.value)} placeholder={t("startPage.projectNamePlaceholder")} className={inputCls} />
          </Field>
          <Field label={t("startPage.businessEmail")} required>
            <input type="email" value={email} onChange={(e) => onEmailChange(e.target.value)} placeholder={t("startPage.businessEmailPlaceholder")} className={inputCls} />
          </Field>
          <Field label={t("startPage.notesOptional")}>
            <textarea value={notes} onChange={(e) => onNotesChange(e.target.value)} placeholder={t("startPage.notesPlaceholder")} className={inputCls + " min-h-[100px] resize-none"} rows={3} />
          </Field>
          <Field label={t("startPage.uploadFiles")}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 rounded-2xl flex flex-col items-center gap-2 cursor-pointer transition-all duration-300"
              style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.12)" }}
            >
              <Upload className="w-5 h-5" style={{ color: "var(--text-muted)" }} />
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>{t("startPage.dropFilesHere")}</span>
            </button>
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onFile} accept="image/*,.pdf,.zip" />
            {files.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {files.map((f) => (
                  <div key={f.name} className="flex items-center justify-between px-4 py-2.5 rounded-xl text-xs" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="text-white/60 truncate pe-2">{f.name}</span>
                    <button type="button" onClick={() => onRemove(f.name)} className="text-white/20 hover:text-white/60 transition-colors shrink-0">{t("startPage.remove")}</button>
                  </div>
                ))}
              </div>
            )}
          </Field>
        </div>

        <div className="flex items-center justify-between mt-10">
          <button onClick={onBack} className="text-xs" style={{ color: "var(--text-muted)" }}>{t("startPage.back")}</button>
          <button
            onClick={onSubmit}
            disabled={!name.trim() || !email.trim()}
            className="px-8 py-3 rounded-full text-xs font-medium text-black transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #E8E8E8 100%)" }}
          >
            {t("auth.continue")}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── CUSTOM AI CHAT ── */
function CustomChat({
  chatLog, isTyping, inputVal, onInputChange, onSend, onBack, answers, chatEndRef, currentQ, customQuestions,
}: {
  chatLog: { role: string; text: string }[];
  isTyping: boolean;
  inputVal: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onBack: () => void;
  answers: CustomAnswers;
  chatEndRef: React.RefObject<HTMLDivElement | null>;
  currentQ: number;
  customQuestions: { key: string; question: string; placeholder: string }[];
}) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 min-h-screen pt-20"
    >
      <div className="flex h-[calc(100vh-80px)]">
        {/* LEFT: CHAT */}
        <div className="flex-1 flex flex-col px-6 md:px-12 lg:px-20 pt-8 pb-6">
          <button onClick={onBack} className="flex items-center gap-1.5 text-xs mb-6 transition-colors hover:text-white self-start" style={{ color: "var(--text-muted)" }}>
            <ChevronLeft className="w-3 h-3 rtl:scale-x-[-1]" />
            {t("startPage.back")}
          </button>

          <div className="flex-1 overflow-y-auto space-y-5 pe-4 scrollbar-thin">
            {chatLog.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={"flex " + (msg.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={"max-w-[85%] md:max-w-[70%] px-5 py-3.5 rounded-2xl text-sm leading-relaxed " + (msg.role === "user" ? "text-white" : "")}
                  style={{
                    background: msg.role === "user" ? "rgba(110,168,255,0.12)" : "rgba(255,255,255,0.04)",
                    border: msg.role === "user" ? "1px solid rgba(110,168,255,0.2)" : "1px solid rgba(255,255,255,0.06)",
                    color: msg.role === "user" ? "var(--text-primary)" : "var(--text-muted)",
                  }}
                >
                  {msg.text}
                </div>
              </motion.div>
            ))}
            {isTyping && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-start"
              >
                <div className="px-5 py-3.5 rounded-2xl text-sm" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", color: "var(--text-secondary)" }}>
                  <span className="inline-flex gap-1">
                    <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0 }} className="w-1.5 h-1.5 rounded-full bg-white/40 inline-block" />
                    <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }} className="w-1.5 h-1.5 rounded-full bg-white/40 inline-block" />
                    <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }} className="w-1.5 h-1.5 rounded-full bg-white/40 inline-block" />
                  </span>
                </div>
              </motion.div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="mt-4 flex items-center gap-3 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <input
              value={inputVal}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSend()}
              placeholder={customQuestions[currentQ]?.placeholder || t("startPage.typeYourMessage")}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-zinc-600 focus:outline-none py-3"
            />
            <button
              onClick={onSend}
              disabled={!inputVal.trim() || isTyping}
              className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ background: "rgba(110,168,255,0.15)" }}
            >
              <Send className="w-4 h-4" style={{ color: "#6EA8FF" }} />
            </button>
          </div>
        </div>

        {/* RIGHT: LIVE SUMMARY */}
        <div className="hidden lg:flex w-[360px] p-6 flex-col" style={{ borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
          <span className="text-[10px] font-semibold tracking-[0.3em] uppercase mb-6" style={{ color: "var(--text-muted)" }}>{t("startPage.projectSummary")}</span>
          <div className="flex-1 space-y-3">
            {customQuestions.map((q) => (
              <motion.div
                key={q.key}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: answers[q.key] ? 1 : 0.3, x: 0 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="px-4 py-3.5 rounded-2xl transition-all duration-300"
                style={{
                  background: answers[q.key] ? "rgba(255,255,255,0.03)" : "transparent",
                  border: answers[q.key] ? "1px solid rgba(255,255,255,0.06)" : "1px solid transparent",
                }}
              >
                <span className="block text-[10px] font-medium mb-1" style={{ color: "var(--text-muted)" }}>{q.question}</span>
                <span className="block text-sm" style={{ color: answers[q.key] ? "var(--text-primary)" : "var(--text-muted)" }}>
                  {answers[q.key] || t("startPage.awaitingResponse")}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ── SUMMARY SCREEN ── */
function SummaryScreen({ data, submitting, onSubmit, onBack }: { data: any; submitting: boolean; onSubmit: () => void; onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="relative z-10 min-h-screen pt-24 pb-20"
    >
      <div className="max-w-[500px] mx-auto px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight"
        >
          {t("startPage.reviewYourProject")}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="text-sm mb-8"
          style={{ color: "var(--text-muted)" }}
        >
          {t("startPage.everythingLooksGood")}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="rounded-3xl p-6 md:p-8"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)",
            border: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="space-y-5">
            {data.type && <SummaryRow label={t("startPage.projectType")} value={data.type} />}
            {data.industry && <SummaryRow label={t("startPage.industry")} value={data.industry} />}
            {data.timeline && <SummaryRow label={t("startPage.timeline")} value={data.timeline} />}
            {data.budget && <SummaryRow label={t("startPage.budget")} value={data.budget} />}
            {data.company && <SummaryRow label={t("startPage.company")} value={data.company} />}
            {data.email && <SummaryRow label={t("startPage.email")} value={data.email} />}
            {data.notes && <SummaryRow label={t("startPage.notes")} value={data.notes} />}
            {data.services && data.services.length > 0 && (
              <div>
                <span className="block text-[10px] font-medium mb-2" style={{ color: "var(--text-muted)" }}>{t("startPage.services")}</span>
                <div className="flex flex-wrap gap-2">
                  {data.services.map((s: string) => (
                    <span key={s} className="text-xs px-3 py-1.5 rounded-full" style={{ background: "rgba(110,168,255,0.1)", color: "#6EA8FF", border: "1px solid rgba(110,168,255,0.15)" }}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-center justify-between mt-8"
        >
          <button onClick={onBack} className="text-xs" style={{ color: "var(--text-muted)" }}>{t("startPage.edit")}</button>
          <motion.button
            onClick={onSubmit}
            disabled={submitting}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-full text-sm font-medium text-black transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #E8E8E8 100%)" }}
          >
            {submitting ? (
              <><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> {t("startPage.submitting")}</>
            ) : (
              <><Sparkles className="w-4 h-4" /> {t("startPage.submitProject")}</>
            )}
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] font-medium" style={{ color: "var(--text-muted)" }}>{label.toUpperCase()}</span>
      <span className="text-sm text-white/80 text-end ms-4">{value}</span>
    </div>
  );
}

/* ── DONE SCREEN ── */
function DoneScreen({ refNum }: { refNum: string }) {
  const { t } = useTranslation();
  return (
    <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center max-w-[500px]"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-8"
          style={{ background: "rgba(110,168,255,0.15)", border: "1px solid rgba(110,168,255,0.3)" }}
        >
          <Check className="w-7 h-7" style={{ color: "#6EA8FF" }} />
        </motion.div>

        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 tracking-tight">{t("startPage.thankYou")}</h2>
        <p className="text-sm mb-8 max-w-sm mx-auto" style={{ color: "var(--text-secondary)" }}>
          {t("startPage.wellReview")}
        </p>

        <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm mb-10" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <span style={{ color: "var(--text-muted)" }}>{t("startPage.reference")}</span>
          <span className="font-mono text-white/80 tracking-wider">{refNum}</span>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/" className="px-6 py-3 rounded-full text-sm font-medium text-black transition-all duration-300" style={{ background: "linear-gradient(135deg, #FFFFFF 0%, #E8E8E8 100%)" }}>
            {t("startPage.returnHome")}
          </Link>
        </div>
      </motion.div>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
        {label}{required && <span className="text-[#6EA8FF] ms-1">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full px-4 py-3 rounded-xl text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#6EA8FF]/40 focus:border-[#6EA8FF]/40 transition-all duration-300 bg-white/5 border border-white/10";
