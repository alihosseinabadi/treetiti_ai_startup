import { useRef, useMemo } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";

function GatherWord({
  word,
  index,
  totalWords,
  scrollProgress,
}: {
  word: string;
  index: number;
  totalWords: number;
  scrollProgress: MotionValue<number>;
}) {
  const tStart = useMemo(
    () => (index / Math.max(totalWords, 1)) * 0.35,
    [index, totalWords]
  );
  const tEnd = useMemo(() => Math.min(tStart + 0.12, 1), [tStart]);

  const t = useTransform(scrollProgress, [tStart, tEnd], [0, 1]);
  const clip = useTransform(t, [0, 1], ["inset(0 100% 0 0)", "inset(0 0% 0 0)"]);
  const opacity = useTransform(t, [0, 0.3, 1], [0.1, 0.4, 1]);
  const x = useTransform(t, [0, 1], [20, 0]);

  return (
    <span className="inline-block relative" style={{ opacity, x } as unknown as React.CSSProperties}>
      <span className="inline-block" style={{ clipPath: clip } as unknown as React.CSSProperties}>
        {word}
      </span>
    </span>
  );
}

export default function ScrollGather({
  lines,
  className = "",
  lineClassName = "",
  letterSpread = 0.10,
  letterTight = -0.012,
}: {
  lines: string[];
  className?: string;
  lineClassName?: string;
  letterSpread?: number;
  letterTight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const letterSpacing = useTransform(
    scrollYProgress,
    [0, 1],
    [`${letterSpread}em`, `${letterTight}em`]
  );

  return (
    <div ref={ref} className={className}>
      {lines.map((line: string, i: number) => (
        <div
          key={i}
          className={`${lineClassName} transition-[letter-spacing]`}
          style={{ letterSpacing } as unknown as React.CSSProperties}
        >
          {line.split(" ").map((word: string, j: number, arr: string[]) => (
            <GatherWord
              key={`${i}-${j}`}
              word={word + (j < arr.length - 1 ? "\u00A0" : "")}
              index={j}
              scrollProgress={scrollYProgress}
              totalWords={arr.length}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
