import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Mail, Lock, Eye, EyeOff, LogIn, Loader2 } from "lucide-react";
import { buttonTap, springBounce } from "../constants/animations";
import { useAuth } from "../providers/AuthProvider";
import { useTranslation } from "react-i18next";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AuthModal({ open, onClose }: AuthModalProps) {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setEmail("");
      setPassword("");
      setError("");
      setShowPassword(false);
      setRemember(false);
      setTimeout(() => emailRef.current?.focus(), 400);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError(t("auth.validationError"));
      return;
    }
    setLoading(true);
    setError("");
    const err = await signIn(email, password);
    setLoading(false);
    if (err) {
      setError(err);
    } else {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[420px] rounded-3xl overflow-hidden"
            style={{
              background: "rgba(14, 14, 14, 0.95)",
              border: "1px solid rgba(255,255,255,0.06)",
              boxShadow: "0 40px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03) inset",
              backdropFilter: "blur(40px)",
            }}
          >
            <button
              onClick={onClose}
              className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-all duration-300 z-10"
              aria-label={t("auth.close")}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="p-8 md:p-10">
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="w-2 h-2 rounded-full bg-[#6EA8FF] shadow-[0_0_12px_rgba(110,168,255,0.5)]" />
                  <span className="text-sm font-semibold text-white">Treetiti</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-1 tracking-tight">{t("auth.welcomeBack")}</h2>
                <p className="text-sm text-zinc-500">{t("auth.signInToContinue")}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="auth-email" className="block text-xs font-medium text-zinc-400 mb-1.5">{t("auth.email")}</label>
                  <div className="relative">
                    <Mail className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                    <input
                      ref={emailRef}
                      id="auth-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full ps-10 pe-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#6EA8FF]/40 focus:border-[#6EA8FF]/40 transition-all duration-300"
                      placeholder={t("auth.emailPlaceholder")}
                      disabled={loading}
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="auth-password" className="block text-xs font-medium text-zinc-400 mb-1.5">{t("auth.password")}</label>
                  <div className="relative">
                    <Lock className="absolute start-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                    <input
                      id="auth-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full ps-10 pe-10 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#6EA8FF]/40 focus:border-[#6EA8FF]/40 transition-all duration-300"
                      placeholder="••••••••"
                      disabled={loading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute end-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors duration-200"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 bg-white/5 text-[#6EA8FF] focus:ring-[#6EA8FF] focus:ring-offset-0 cursor-pointer"
                    />
                    <span className="text-xs text-zinc-500 group-hover:text-zinc-300 transition-colors duration-200">{t("auth.rememberMe")}</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => window.location.href = "mailto:hellotreetiti@gmail.com?subject=Password%20Reset"}
                    className="text-xs text-zinc-500 hover:text-[#6EA8FF] transition-colors duration-200"
                  >
                    {t("auth.forgotPassword")}
                  </button>
                </div>

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-lg"
                  >
                    {error}
                  </motion.p>
                )}

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3.5 rounded-xl font-medium text-sm bg-white text-black hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      {t("auth.continue")}
                    </>
                  )}
                </motion.button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/5" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 text-xs text-zinc-600" style={{ background: "rgba(14, 14, 14, 0.95)" }}>{t("auth.orContinueWith")}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={buttonTap}
                  transition={springBounce}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 text-xs font-medium transition-all duration-300 group"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  <span className="relative">{t("auth.googleLabel")} <span className="absolute -top-2 -right-6 text-[8px] text-zinc-600 font-normal">{t("auth.googleSoon")}</span></span>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={buttonTap}
                  transition={springBounce}
                  className="flex items-center justify-center gap-2 py-3 rounded-xl border border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 text-xs font-medium transition-all duration-300 group"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
                  <span className="relative">{t("auth.gitHubLabel")} <span className="absolute -top-2 -right-6 text-[8px] text-zinc-600 font-normal">{t("auth.gitHubSoon")}</span></span>
                </motion.button>
              </div>

              <p className="text-center text-xs text-zinc-600 mt-6">
                {t("auth.dontHaveAccount")}{" "}
                <button
                  type="button"
                  className="text-[#6EA8FF] hover:text-white transition-colors duration-200"
                  onClick={() => {
                    onClose();
                    navigate("/start");
                  }}
                >
                  {t("auth.getStarted")}
                </button>
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
