"use client";

import { motion, type Variants } from "framer-motion";
import { useEffect, type ReactNode } from "react";

const variants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] },
  },
};

/** Marks <html> as hydrated so the CSS reveal failsafe stands down. */
function useMarkHydrated() {
  useEffect(() => {
    document.documentElement.setAttribute("data-hydrated", "");
  }, []);
}

function withReveal(className?: string) {
  return className ? `motion-reveal ${className}` : "motion-reveal";
}

export function AnimatedSection({
  children,
  className,
  delay = 0,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section";
}) {
  useMarkHydrated();
  const MotionTag = as === "section" ? motion.section : motion.div;
  return (
    <MotionTag
      className={withReveal(className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={variants}
      transition={{ delay }}
    >
      {children}
    </MotionTag>
  );
}

export function Stagger({
  children,
  className,
  staggerDelay = 0.08,
}: {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}) {
  useMarkHydrated();
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={{
        hidden: {},
        visible: {
          transition: { staggerChildren: staggerDelay },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={withReveal(className)} variants={variants}>
      {children}
    </motion.div>
  );
}
