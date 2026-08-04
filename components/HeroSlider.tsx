"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { DiaText } from "@/components/animations/text/dia-text";
import { BorderGradientButton } from "@/components/animations/buttons/border-gradient";

const words = ["Driver", "Leader", "Professional", "Yourself"];

// Latar belakang yang berubah pelan
const slides = [
  "https://images.nismara.my.id/ets2_20251223_205632_00.webp",
  "https://images.nismara.my.id/eut2_hq_68a2aa1f.webp",
  "https://images.nismara.my.id/ets2_20251223_213322_00.webp",
];

export default function HeroSlider({ isDriver }: { isDriver: boolean }) {
  const [index, setIndex] = useState(0);
  const [bgIndex, setBgIndex] = useState(0);

  // Timer gambar background
  useEffect(() => {
    const id = setInterval(() => {
      setBgIndex((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative w-full h-[90vh] min-h-[600px] max-h-[1000px] overflow-hidden flex items-center justify-center">
      {/* BACKGROUNDS */}
      {slides.map((slide, i) => (
        <div
          key={i}
          className={`absolute inset-0 transition-opacity duration-[2000ms] ease-in-out ${
            i === bgIndex ? "opacity-100" : "opacity-0"
          }`}
        >
          {/* Overlay gradient elegan agar teks jelas dibaca */}
          <div className="absolute inset-0 bg-background/20 dark:bg-black/50 z-10" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/60 to-background z-10" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent z-10" />

          <motion.img
            src={slide}
            alt="Hero Background"
            className="w-full h-full object-cover object-center"
            initial={{ scale: 1.05 }}
            animate={{ scale: i === bgIndex ? 1 : 1.05 }}
            transition={{ duration: 10, ease: "linear" }}
          />
        </div>
      ))}

      {/* MAIN CONTENT */}
      <div className="relative z-20 w-full px-4 max-w-6xl mx-auto flex flex-col items-center justify-center text-center">
        {/* Badge Animasi */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 backdrop-blur-md text-primary text-sm font-bold mb-8 shadow-[0_0_20px_rgba(126,87,194,0.2)]"
        >
          <Sparkles className="w-4 h-4 text-accent-sky" />
          <span>Musim Logistik 2026 Telah Dimulai</span>
        </motion.div>

        {/* WORD CAROUSEL HEADING */}
        <div className="mb-6 flex flex-col lg:flex-row items-center justify-center gap-2 lg:gap-4 text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black tracking-tighter">
          <motion.span
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-foreground drop-shadow-xl text-center lg:text-left whitespace-nowrap"
          >
            You can be
          </motion.span>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="flex justify-center lg:justify-start text-primary lg:min-w-[420px]"
          >
            <DiaText
              words={words}
              duration={5000}
              className="drop-shadow-[0_0_15px_rgba(126,87,194,0.5)]"
            />
          </motion.div>
        </div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="max-w-2xl text-lg sm:text-xl text-muted-foreground mb-12 leading-relaxed"
        >
          Bergabunglah dengan ekosistem simulasi transportasi paling keren. Satu
          identitas untuk seluruh perjalanan, kontrak, dan komunitas Anda di
          Nismara.
        </motion.p>

        {/* Call To Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 w-full justify-center max-w-md md:max-w-none"
        >
          {isDriver ? (
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto px-8 h-14 rounded-xl text-base font-bold shadow-[0_0_30px_rgba(126,87,194,0.4)] hover:shadow-[0_0_40px_rgba(126,87,194,0.6)] transition-all"
              >
                Masuk Dashboard <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          ) : (
            <Link href="/login" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto px-8 h-14 rounded-xl text-base font-bold shadow-[0_0_30px_rgba(126,87,194,0.4)] hover:shadow-[0_0_40px_rgba(126,87,194,0.6)] transition-all"
              >
                Gabung Nismara <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          )}
          <a href="/onboarding" className="w-full sm:w-auto">
            <BorderGradientButton
              colors={["#8b5cf6", "#ec4899"]}
              duration={10}
              className="w-full sm:w-auto px-8 h-14 rounded-xl text-base font-bold shadow-[0_0_30px_rgba(126,87,194,0.4)] hover:shadow-[0_0_40px_rgba(126,87,194,0.6)] transition-all"
            >
              Mulai Perjalananmu
            </BorderGradientButton>
          </a>
        </motion.div>
      </div>

      {/* Decorative Ambient Glows */}
      <div className="absolute bottom-0 left-0 w-full h-32 bg-linear-to-t from-background to-transparent z-10" />
      <div className="absolute top-1/4 left-10 w-64 h-64 bg-primary/20 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-1/4 right-10 w-64 h-64 bg-accent-sky/20 rounded-full blur-[120px] pointer-events-none z-0" />
    </div>
  );
}
