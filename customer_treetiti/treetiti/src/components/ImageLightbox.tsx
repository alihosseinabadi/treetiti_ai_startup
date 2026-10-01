import { useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function ImageLightbox({
  images,
  index,
  open,
  onClose,
  onPrev,
  onNext,
}: {
  images: string[];
  index: number;
  open: boolean;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { t } = useTranslation();
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    setZoomed(false);
  }, [index]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") { onClose(); }
      if (e.key === "ArrowLeft") { onPrev(); }
      if (e.key === "ArrowRight") { onNext(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onPrev, onNext, onClose]);

  const toggleZoom = useCallback(() => setZoomed((z) => !z), []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-xl"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={t("imageLightbox.imageGallery")}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.92, opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {images.length > 0 && (
              <img
                src={images[index]}
                alt={t("imageLightbox.imageOf", { current: index + 1, total: images.length })}
                className={`max-w-[90vw] max-h-[85vh] object-contain transition-transform duration-300 cursor-zoom-in rounded-2xl ${
                  zoomed ? "scale-150 cursor-zoom-out" : "scale-100 cursor-zoom-in"
                }`}
                onClick={toggleZoom}
              />
            )}

            {images.length > 1 && (
              <>
                <button onClick={onPrev} className="absolute left-4 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 flex items-center justify-center transition-all" aria-label={t("imageLightbox.previous")}>
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <button onClick={onNext} className="absolute right-4 w-12 h-12 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 flex items-center justify-center transition-all" aria-label={t("imageLightbox.next")}>
                  <ChevronRight className="w-6 h-6 text-white" />
                </button>
                <div className="absolute bottom-6 text-sm text-white/60 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full">
                  {index + 1} / {images.length}
                </div>
              </>
            )}

            <button onClick={toggleZoom} className="absolute top-20 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 flex items-center justify-center transition-all" aria-label={zoomed ? t("imageLightbox.zoomOut") : t("imageLightbox.zoomIn")}>
              {zoomed ? <ZoomOut className="w-5 h-5 text-white" /> : <ZoomIn className="w-5 h-5 text-white" />}
            </button>

            <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 flex items-center justify-center transition-all z-10" aria-label={t("imageLightbox.close")}>
              <X className="w-5 h-5 text-white" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
