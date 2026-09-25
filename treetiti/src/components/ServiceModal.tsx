import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle, ArrowRight, Lightbulb, Layers, Wrench, HelpCircle, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ServiceData } from "../data/services";

const iconMap: Record<string, React.ReactNode> = {
  Lightbulb: <Lightbulb className="w-5 h-5" />,
  Layers: <Layers className="w-5 h-5" />,
  Wrench: <Wrench className="w-5 h-5" />,
  HelpCircle: <HelpCircle className="w-5 h-5" />,
};

export default function ServiceModal({
  service,
  open,
  onClose,
  onContact,
}: {
  service: ServiceData | null;
  open: boolean;
  onClose: () => void;
  onContact: () => void;
}) {
  const { t } = useTranslation();
  if (!service) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[90] overflow-y-auto"
          onClick={handleOverlayClick}
          role="dialog"
          aria-modal="true"
          aria-label={service.title}
        >
          <div className="min-h-screen flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />

            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 40 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-4xl bg-gradient-to-b from-gray-900 to-black border border-white/10 rounded-3xl overflow-hidden"
            >
              <div className="h-1 bg-gradient-to-r from-[#6EA8FF] to-[#6EA8FF]/50" />

              <div className="p-8 md:p-12">
                <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all" aria-label={t("serviceModal.close")}>
                  <X className="w-5 h-5 text-white" />
                </button>



                <h2 className="text-3xl md:text-4xl font-bold text-white mt-4 mb-6">
                  {service.title}
                </h2>

                <p className="text-lg text-white/70 leading-relaxed mb-10">
                  {service.overview}
                </p>

                <div className="space-y-10">
                  <section>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="w-8 h-8 rounded-lg bg-[#6EA8FF]/20 flex items-center justify-center text-[#6EA8FF]">
                        {iconMap.CheckCircle || <CheckCircle className="w-5 h-5" />}
                      </span>
                      <h3 className="text-xl font-semibold text-white">{t("serviceModal.benefits")}</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {service.benefits.map((b, i) => (
                        <div key={i} className="flex items-start gap-3 p-4 bg-white/5 rounded-xl">
                          <CheckCircle className="w-5 h-5 text-[#6EA8FF] mt-0.5 flex-shrink-0" />
                          <span className="text-white/70">{b}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center gap-3 mb-4">
                      <span className="w-8 h-8 rounded-lg bg-[#6EA8FF]/20 flex items-center justify-center text-[#6EA8FF]">
                        {iconMap.Layers || <Layers className="w-5 h-5" />}
                      </span>
                      <h3 className="text-xl font-semibold text-white">{t("serviceModal.workflow")}</h3>
                    </div>
                    <div className="relative pl-8 border-l-2 border-[#6EA8FF]/30 space-y-6">
                      {service.workflow.map((w, i) => (
                        <div key={i} className="relative">
                          <div className="absolute -left-[calc(1rem+5px)] top-1 w-4 h-4 rounded-full bg-[#6EA8FF] border-4 border-gray-900" />
                          <div className="flex items-start gap-2">
                            <span className="text-[#6EA8FF] font-bold text-sm mt-0.5 shrink-0">{t("serviceModal.step")} {i + 1}</span>
                            <div>
                              <p className="text-white font-medium">{w.step}</p>
                              <p className="text-white/70 text-sm mt-1">{w.desc}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {service.technologies.length > 0 && (
                    <section>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="w-8 h-8 rounded-lg bg-[#6EA8FF]/20 flex items-center justify-center text-[#6EA8FF]">
                          {iconMap.Wrench || <Wrench className="w-5 h-5" />}
                        </span>
                        <h3 className="text-xl font-semibold text-white">{t("serviceModal.technologies")}</h3>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {service.technologies.map((tech, i) => (
                          <span key={i} className="px-3 py-1.5 bg-white/5 border border-white/10 text-white/70 text-sm rounded-lg">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </section>
                  )}

                  {service.faq.length > 0 && (
                    <section>
                      <div className="flex items-center gap-3 mb-4">
                        <span className="w-8 h-8 rounded-lg bg-[#6EA8FF]/20 flex items-center justify-center text-[#6EA8FF]">
                          {iconMap.HelpCircle || <HelpCircle className="w-5 h-5" />}
                        </span>
                        <h3 className="text-xl font-semibold text-white">{t("serviceModal.faq")}</h3>
                      </div>
                      <div className="space-y-4">
                        {service.faq.map((item, i) => (
                          <details key={i} className="group bg-white/5 rounded-xl overflow-hidden">
                            <summary className="flex items-center justify-between p-4 cursor-pointer text-white/80 font-medium hover:text-white transition-colors">
                              {item.q}
                              <ArrowRight className="w-4 h-4 text-[#6EA8FF] group-open:rotate-90 transition-transform flex-shrink-0" />
                            </summary>
                            <div className="px-4 pb-4 text-white/60 text-sm leading-relaxed">
                              {item.a}
                            </div>
                          </details>
                        ))}
                      </div>
                    </section>
                  )}
                </div>

                <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={() => { onClose(); onContact(); }}
                    className="flex-1 py-4 bg-gradient-to-r from-[#6EA8FF] to-[#6EA8FF]/80 hover:from-[#6EA8FF]/90 hover:to-[#6EA8FF]/70 text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {t("serviceModal.discussThisService")}
                  </button>
                  <button
                    onClick={onClose}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-all duration-300 border border-white/10"
                  >
                    {t("serviceModal.close")}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
