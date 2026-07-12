"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useMotionValue, useSpring } from "framer-motion";

export function StatCounter({
  value,
  suffix = "",
  label,
}: {
  value: number;
  suffix?: string;
  label: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { damping: 30, stiffness: 60 });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (inView) motionValue.set(value);
  }, [inView, value, motionValue]);

  useEffect(() => {
    const unsub = springValue.on("change", (v) => setDisplay(Math.round(v)));
    return unsub;
  }, [springValue]);

  return (
    <div className="text-center">
      <span
        ref={ref}
        className="font-display text-4xl md:text-5xl text-navy-900 tabular-nums"
      >
        {display}
        {suffix}
      </span>
      <p className="mt-2 text-sm text-navy-700/70">{label}</p>
    </div>
  );
}
