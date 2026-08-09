import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Maximize, Minimize, RotateCcw, Play, Pause } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function VideoPlayer({
  src,
  open,
  onClose,
}: {
  src: string;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!open) { setPlaying(false); return; }
    setPlaying(true);
  }, [open]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") onClose();
      if (e.key === " " || e.key === "k") {
        e.preventDefault();
        const v = videoRef.current;
        if (!v) return;
        if (v.paused) { v.play(); setPlaying(true); }
        else { v.pause(); setPlaying(false); }
      }
      if (e.key === "f") {
        const v = videoRef.current;
        if (!v) return;
        if (document.fullscreenElement) { document.exitFullscreen(); setFullscreen(false); }
        else { v.requestFullscreen(); setFullscreen(true); }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  }

  function toggleFullscreen() {
    const v = videoRef.current;
    if (!v) return;
    if (document.fullscreenElement) { document.exitFullscreen(); setFullscreen(false); }
    else { v.requestFullscreen(); setFullscreen(true); }
  }

  function replay() {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play();
    setPlaying(true);
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={t("videoPlayer.videoPlayer")}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-6xl mx-4 aspect-video rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <video
              ref={videoRef}
              src={src}
              autoPlay
              muted={false}
              playsInline
              className="w-full h-full object-cover rounded-2xl"
              onEnded={() => setPlaying(false)}
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3">
              <button onClick={togglePlay} className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 flex items-center justify-center transition-all" aria-label={playing ? t("videoPlayer.pause") : t("videoPlayer.play")}>
                {playing ? <Pause className="w-5 h-5 text-white" /> : <Play className="w-5 h-5 text-white" />}
              </button>
              <button onClick={replay} className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 flex items-center justify-center transition-all" aria-label={t("videoPlayer.replay")}>
                <RotateCcw className="w-5 h-5 text-white" />
              </button>
              <button onClick={toggleFullscreen} className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 flex items-center justify-center transition-all" aria-label={fullscreen ? t("videoPlayer.exitFullscreen") : t("videoPlayer.fullscreen")}>
                {fullscreen ? <Minimize className="w-5 h-5 text-white" /> : <Maximize className="w-5 h-5 text-white" />}
              </button>
            </div>

            <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/20 flex items-center justify-center transition-all z-10" aria-label={t("videoPlayer.close")}>
              <X className="w-5 h-5 text-white" />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
