import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PortfolioProject } from "../data/portfolio";
import ImageLightbox from "./ImageLightbox";

export default function CaseStudyModal({
  project,
  open,
  onClose,
}: {
  project: PortfolioProject | null;
  open: boolean;
  onClose: () => void;
}) {
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  const imagesLength = project?.images.length ?? 0;

  const openLightbox = useCallback((idx: number) => setLightboxIndex(idx), []);
  const closeLightbox = useCallback(() => setLightboxIndex(-1), []);
  const prevLightbox = useCallback(
    () => setLightboxIndex((i) => (i - 1 + imagesLength) % imagesLength),
    [imagesLength]
  );
  const nextLightbox = useCallback(
    () => setLightboxIndex((i) => (i + 1) % imagesLength),
    [imagesLength]
  );

  const { t } = useTranslation();

  if (!project) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <>
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
            aria-label={project.title}
          >
            <div className="min-h-screen flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" />

              <motion.div
                initial={{ scale: 0.92, opacity: 0, y: 40 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.92, opacity: 0, y: 40 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                className="relative w-full max-w-5xl bg-gradient-to-b from-gray-900 to-black border border-white/10 rounded-3xl overflow-hidden"
              >
                <div className="h-1 bg-gradient-to-r from-[#6EA8FF] to-[#6EA8FF]/50" />

                <div className="p-8 md:p-12">
                  <button onClick={onClose} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all" aria-label={t("caseStudyModal.close")}>
                    <X className="w-5 h-5 text-white" />
                  </button>

                  <span className="px-3 py-1 bg-[#6EA8FF]/10 text-[#6EA8FF] text-xs font-medium rounded-full">
                    {project.tag}
                  </span>

                  <h2 className="text-3xl md:text-4xl font-bold text-white mt-4 mb-2">
                    {project.title}
                  </h2>

                  <p className="text-white/50 text-sm mb-8">
                    {t("caseStudyModal.client")} <span className="text-white/70">{project.client}</span>
                    {" · "}
                    {t("caseStudyModal.timeline")} <span className="text-white/70">{project.timeline}</span>
                  </p>



                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-8">
                      <section>
                        <h3 className="text-lg font-semibold text-white mb-3">{t("caseStudyModal.overview")}</h3>
                        <p className="text-white/70 leading-relaxed">{project.overview}</p>
                      </section>

                      <section>
                        <h3 className="text-lg font-semibold text-white mb-3">{t("caseStudyModal.challenge")}</h3>
                        <p className="text-white/70 leading-relaxed">{project.challenge}</p>
                      </section>

                      <section>
                        <h3 className="text-lg font-semibold text-white mb-3">{t("caseStudyModal.solution")}</h3>
                        <p className="text-white/70 leading-relaxed">{project.solution}</p>
                      </section>
                    </div>

                    <div className="space-y-6">
                      <section>
                        <h3 className="text-lg font-semibold text-white mb-3">{t("caseStudyModal.results")}</h3>
                        <div className="grid grid-cols-1 gap-3">
                          {project.results.map((r, i) => (
                            <div key={i} className="bg-white/5 rounded-xl p-4 text-center">
                              <div className="text-2xl font-bold text-emerald-400">{r.value}</div>
                              <div className="text-xs text-white/50 mt-1">{r.metric}</div>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section>
                        <h3 className="text-lg font-semibold text-white mb-3">{t("caseStudyModal.technologies")}</h3>
                        <div className="flex flex-wrap gap-2">
                          {project.technologies.map((tech, i) => (
                            <span key={i} className="px-2.5 py-1 bg-white/5 border border-white/10 text-white/60 text-xs rounded-lg">
                              {tech}
                            </span>
                          ))}
                        </div>
                      </section>
                    </div>
                  </div>

                  {project.images.length > 0 && (
                    <section className="mt-10 pt-8 border-t border-white/10">
                      <h3 className="text-lg font-semibold text-white mb-4">{t("caseStudyModal.gallery")}</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {project.images.map((img, i) => (
                          <div
                            key={i}
                            className="aspect-video rounded-xl overflow-hidden bg-gray-800 cursor-pointer group relative"
                            onClick={() => openLightbox(i)}
                          >
                            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900" />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center">
                              <ExternalLink className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <div className="mt-10 pt-8 border-t border-white/10 flex justify-end">
                    <button
                      onClick={onClose}
                      className="py-3 px-6 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl transition-all border border-white/10"
                    >
                      {t("caseStudyModal.close")}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ImageLightbox
        images={project.images}
        index={lightboxIndex >= 0 ? lightboxIndex : 0}
        open={lightboxIndex >= 0}
        onClose={closeLightbox}
        onPrev={prevLightbox}
        onNext={nextLightbox}
      />
    </>
  );
}
