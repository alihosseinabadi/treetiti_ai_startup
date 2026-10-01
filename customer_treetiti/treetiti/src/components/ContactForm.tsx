import { useState, FormEvent } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import { useTranslation } from "react-i18next";
import { Loader2, CheckCircle, AlertCircle, Send } from "lucide-react";

interface FormData {
  name: string;
  email: string;
  company: string;
  service: string;
  message: string;
}

type Status = "idle" | "loading" | "success" | "error";

export default function ContactForm() {
  const { t } = useTranslation();
  const [form, setForm] = useState<FormData>({
    name: "",
    email: "",
    company: "",
    service: "",
    message: "",
  });
  const [status, setStatus] = useState<Status>("idle");
  const [errorText, setErrorText] = useState("");

  const serviceOptions = t("contact.services", { returnObjects: true }) as string[];

  const validate = (): string | null => {
    if (!form.name.trim()) return t("contact.errors.name");
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return t("contact.errors.email");
    if (!form.message.trim()) return t("contact.errors.message");
    return null;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const err = validate();
    if (err) { setErrorText(err); setStatus("error"); return; }

    setStatus("loading");
    setErrorText("");

    const { error } = await supabase.from("leads").insert({
      name: form.name,
      email: form.email,
      phone: form.company || null,
      service: form.service || null,
      message: form.message,
      source: "website_contact",
    });

    if (error) {
      console.error("Contact form error:", error);
      setErrorText(t("contact.errors.submit"));
      setStatus("error");
      return;
    }

    setStatus("success");
    setForm({ name: "", email: "", company: "", service: "", message: "" });
  };

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center py-16 text-center"
      >
        <CheckCircle className="w-16 h-16 text-emerald-400 mb-6" />
        <h3 className="text-2xl font-bold text-white mb-3">{t("contact.success.title")}</h3>
        <p className="text-white/60 max-w-md">{t("contact.success.message")}</p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-white/80 mb-2">
            {t("contact.form.name")} <span className="text-red-400">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
            placeholder={t("contact.placeholders.name")}
            disabled={status === "loading"}
            required
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-2">
            {t("contact.form.email")} <span className="text-red-400">*</span>
          </label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
            placeholder={t("contact.placeholders.email")}
            disabled={status === "loading"}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-white/80 mb-2">
            {t("contact.form.company")}
          </label>
          <input
            id="company"
            type="text"
            value={form.company}
            onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
            placeholder={t("contact.placeholders.company")}
            disabled={status === "loading"}
          />
        </div>
        <div>
          <label htmlFor="service" className="block text-sm font-medium text-white/80 mb-2">
            {t("contact.form.service")}
          </label>
          <select
            id="service"
            value={form.service}
            onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
            disabled={status === "loading"}
          >
            <option value="" className="bg-gray-900">{t("contact.placeholders.service")}</option>
            {serviceOptions.map((s) => (
              <option key={s} value={s} className="bg-gray-900">{s}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-white/80 mb-2">
          {t("contact.form.message")} <span className="text-red-400">*</span>
        </label>
        <textarea
          id="message"
          rows={5}
          value={form.message}
          onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
          className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all resize-none"
          placeholder={t("contact.placeholders.message")}
          disabled={status === "loading"}
          required
        />
      </div>

      {status === "error" && (
        <motion.p
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2 text-red-400 text-sm"
        >
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {errorText}
        </motion.p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-400 hover:to-blue-500 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "loading" ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            <Send className="w-4 h-4" />
            {t("contact.form.submit")}
          </>
        )}
      </button>
    </form>
  );
}
