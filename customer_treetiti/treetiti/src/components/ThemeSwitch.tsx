import { motion } from "framer-motion";
import { useTheme } from "../providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import { buttonTap, springBounce } from "../constants/animations";

export default function ThemeSwitch() {
  const { t } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <motion.button
      onClick={toggleTheme}
      whileHover={{ scale: 1.1 }}
      whileTap={buttonTap}
      transition={springBounce}
      className="relative w-[48px] h-[48px] rounded-full flex items-center justify-center transition-all duration-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6EA8FF] group"
      style={{
        background: isLight
          ? "rgba(110,168,255,0.06)"
          : "rgba(255,255,255,0.04)",
        border: "1px solid",
        borderColor: isLight
          ? "rgba(110,168,255,0.12)"
          : "rgba(255,255,255,0.06)",
      }}
      aria-label={isLight ? t("themeSwitch.switchToDark") : t("themeSwitch.switchToLight")}
    >
      {/* Glow ring */}
      <div
        className="absolute inset-0 rounded-full transition-all duration-700"
        style={{
          background: isLight
            ? "radial-gradient(circle at 50% 50%, rgba(110,168,255,0.08) 0%, transparent 70%)"
            : "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.03) 0%, transparent 70%)",
          opacity: 0,
        }}
      />

      {/* Sun/Moon SVG */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className="relative z-10 transition-all duration-700"
        style={{
          width: 18,
          height: 18,
          transform: `rotate(${isLight ? 0 : 180}deg)`,
        }}
        aria-hidden="true"
      >
        {isLight ? (
          <>
            {/* Sun body */}
            <circle cx="12" cy="12" r="4.5" fill="white" />
            {/* Sun glow */}
            <circle cx="12" cy="12" r="4.5" fill="#6EA8FF" opacity="0.15" />
            {/* Rays */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
              const rad = (angle * Math.PI) / 180;
              const x1 = 12 + Math.cos(rad) * 6.5;
              const y1 = 12 + Math.sin(rad) * 6.5;
              const x2 = 12 + Math.cos(rad) * 9.5;
              const y2 = 12 + Math.sin(rad) * 9.5;
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="white"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  opacity="0.7"
                />
              );
            })}
          </>
        ) : (
          <>
            {/* Moon body */}
            <path
              d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.34 0 .67-.02 1-.05-2.47-1.28-4.15-3.88-4.15-6.95s1.68-5.67 4.15-6.95c-.33-.03-.66-.05-1-.05z"
              fill="white"
            />
            {/* Moon glow */}
            <circle cx="12" cy="12" r="9" fill="#6EA8FF" opacity="0.06" />
            {/* Tiny dots (stars) */}
            <circle cx="7" cy="8" r="0.5" fill="white" opacity="0.4" />
            <circle cx="17" cy="7" r="0.5" fill="white" opacity="0.3" />
            <circle cx="16" cy="16" r="0.5" fill="white" opacity="0.35" />
            <circle cx="8" cy="17" r="0.4" fill="white" opacity="0.25" />
            <circle cx="14" cy="10" r="0.4" fill="white" opacity="0.3" />
          </>
        )}
      </svg>
    </motion.button>
  );
}
