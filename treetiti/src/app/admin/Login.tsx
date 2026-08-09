import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../../providers/AuthProvider";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const err = await signIn(email, password);
    if (err) {
      setError(err);
      setLoading(false);
    } else {
      navigate("/admin");
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-[#0E0E0E] border border-white/5 rounded-2xl p-8">
        <h1 className="text-lg font-semibold text-white mb-1">{t("admin.login.title")}</h1>
        <p className="text-xs text-zinc-500 mb-6">{t("admin.login.subtitle")}</p>

        {error && <p className="text-xs text-rose-400 mb-4 bg-rose-500/10 rounded-lg px-3 py-2">{error}</p>}

        <div className="space-y-4">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">{t("admin.login.email")}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
              className="w-full bg-[#0A0A0A] text-white text-sm rounded-xl px-4 py-2.5 border border-white/10 focus:border-white/20 focus:outline-none placeholder:text-zinc-600" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">{t("admin.login.password")}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              className="w-full bg-[#0A0A0A] text-white text-sm rounded-xl px-4 py-2.5 border border-white/10 focus:border-white/20 focus:outline-none placeholder:text-zinc-600" />
          </div>
          <button type="submit" disabled={loading}
            className="w-full bg-white text-black text-sm font-medium rounded-xl py-2.5 hover:bg-white/90 transition-colors disabled:opacity-50">
            {loading ? t("admin.login.signingIn") : t("admin.login.signIn")}
          </button>
        </div>
      </form>
    </div>
  );
}
