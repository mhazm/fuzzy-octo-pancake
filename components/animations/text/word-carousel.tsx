"use client";
import * as React from "react";
import { motion, AnimatePresence, HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";
import {
  useWordCarousel,
  type UseWordCarouselOptions,
} from "@/lib/use-word-carousel";
export interface TextWordCarouselProps
  extends Omit<HTMLMotionProps<"span">, "children">, UseWordCarouselOptions {
  duration?: number;
}
export function TextWordCarousel({
  words,
  interval,
  className,
  duration = 0.6,
  ...props
}: TextWordCarouselProps) {
  const { currentWord, key } = useWordCarousel({ words, interval });

  // Pisah menjadi karakter untuk efek per-huruf (seperti Dia Text)
  const characters = currentWord.split("");

  return (
    <span
      className={cn(
        "inline-flex justify-start relative overflow-hidden",
        className,
      )}
    >
      <AnimatePresence mode="popLayout">
        <motion.span
          key={key}
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: { staggerChildren: 0.03 },
            },
            exit: {
              opacity: 0,
              transition: { staggerChildren: 0.02, staggerDirection: 1 },
            },
          }}
          className="inline-flex whitespace-nowrap"
          {...props}
        >
          {characters.map((char, i) => (
            <motion.span
              key={i}
              variants={{
                hidden: {
                  opacity: 0,
                  y: 30,
                  filter: "blur(8px)",
                  rotateX: -45,
                },
                visible: {
                  opacity: 1,
                  y: 0,
                  filter: "blur(0px)",
                  rotateX: 0,
                  transition: {
                    type: "spring",
                    bounce: 0.2,
                    duration: duration,
                  },
                },
                exit: {
                  opacity: 0,
                  y: -30,
                  filter: "blur(8px)",
                  rotateX: 45,
                  transition: { duration: 0.3 },
                },
              }}
              className="inline-block"
            >
              {char === " " ? "\u00A0" : char}
            </motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
