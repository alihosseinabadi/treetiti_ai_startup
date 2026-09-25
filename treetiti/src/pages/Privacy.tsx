import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function Privacy() {
  const { t } = useTranslation();
  const sections = t("privacy.sections", { returnObjects: true }) as { heading: string; body: string }[];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-3xl mx-auto px-6 py-16"
    >
      <h1 className="text-4xl font-bold text-white mb-8">{t("privacy.title")}</h1>
      <div className="space-y-6 text-white/70 leading-relaxed">
        <p>{t("privacy.lastUpdated")}</p>

        {sections.map((section, i) => (
          <div key={i}>
            <h2 className="text-xl font-semibold text-white mt-8">{section.heading}</h2>
            <p>{section.body}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
