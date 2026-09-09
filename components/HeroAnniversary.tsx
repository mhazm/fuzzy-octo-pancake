"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";

const PHOTOS = [
  "https://images.nismara.my.id/ets2_20251223_205632_00.webp",
  "https://images.nismara.my.id/eut2_hq_68a2aa1f.webp",
  "https://images.nismara.my.id/ets2_20251223_213322_00.webp",
];

const SLIDE_DURATION = 7000;

const STATS = [
  { label: "Driver Aktif", value: 80, suffix: "+" },
  { label: "Convoy Selesai", value: 24, suffix: "x" },
  { label: "Season Pass", value: 1, suffix: "Live" },
];

function useCountUp(target: number, delay = 900) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (!started) return;
    let raf: number;
    const startTime = performance.now();
    const duration = 1400;
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setCount(Math.floor(easeOut(progress) * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
      else setCount(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, target]);

  return count;
}

function StatItem({ value, suffix, label, delay }: {
  value: number; suffix: string; label: string; delay: number;
}) {
  const count = useCountUp(value, delay);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: delay / 1000 }}
      className="flex flex-col"
    >
      <span className="text-3xl font-black tabular-nums text-amber-400 leading-none tracking-tight">
        {count.toLocaleString("id-ID")}
        <span className="text-xl font-bold ml-0.5 text-amber-300">{suffix}</span>
      </span>
      <span className="text-[10px] text-zinc-500 font-semibold mt-1.5 uppercase tracking-[0.2em]">
        {label}
      </span>
    </motion.div>
  );
}

function TimerBar({ photoIndex }: { photoIndex: number }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    setProgress(0);
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const p = Math.min((now - start) / SLIDE_DURATION, 1);
      setProgress(p);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [photoIndex]);

  return (
    <div className="absolute bottom-8 right-8 z-30 flex items-center gap-2">
      {PHOTOS.map((_, i) => (
        <div
          key={i}
          className="relative h-[2px] rounded-full overflow-hidden bg-white/15"
          style={{ width: i === photoIndex ? 40 : 10, transition: "width 0.5s cubic-bezier(0.4,0,0.2,1)" }}
        >
          {i === photoIndex && (
            <div
              className="absolute inset-y-0 left-0 bg-amber-400 rounded-full"
              style={{ width: `${progress * 100}%`, transition: "none" }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function CustomCursor() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const springX = useSpring(x, { stiffness: 200, damping: 22 });
  const springY = useSpring(y, { stiffness: 200, damping: 22 });

  useEffect(() => {
    const move = (e: MouseEvent) => { x.set(e.clientX); y.set(e.clientY); };
    window.addEventListener("mousemove", move);
    return () => window.removeEventListener("mousemove", move);
  }, [x, y]);

  return (
    <motion.div
      className="fixed top-0 left-0 w-4 h-4 rounded-full bg-amber-400 pointer-events-none z-[9999] mix-blend-difference hidden lg:block"
      style={{ x: springX, y: springY, translateX: "-50%", translateY: "-50%" }}
    />
  );
}

export default function HeroAnniversary({ isDriver }: { isDriver: boolean }) {
  const [photoIndex, setPhotoIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springX = useSpring(rawX, { stiffness: 60, damping: 20 });
  const springY = useSpring(rawY, { stiffness: 60, damping: 20 });

  const bgX = useTransform(springX, [-1, 1], ["-2%", "2%"]);
  const bgY = useTransform(springY, [-1, 1], ["-2%", "2%"]);
  const numX = useTransform(springX, [-1, 1], ["-20px", "20px"]);
  const numY = useTransform(springY, [-1, 1], ["-15px", "15px"]);
  const textX = useTransform(springX, [-1, 1], ["-8px", "8px"]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const { left, top, width, height } = el.getBoundingClientRect();
    rawX.set(((e.clientX - left) / width) * 2 - 1);
    rawY.set(((e.clientY - top) / height) * 2 - 1);
  }, [rawX, rawY]);

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setPhotoIndex(p => (p + 1) % PHOTOS.length), SLIDE_DURATION);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("mousemove", handleMouseMove);
    return () => el.removeEventListener("mousemove", handleMouseMove);
  }, [handleMouseMove]);

  return (
    <>
      <style>{`
        @keyframes kenBurns {
          0%   { transform: scale(1.08) translate(0,0); }
          100% { transform: scale(1.0) translate(-1%,-0.5%); }
        }
        @keyframes rayRotate {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes grainShift {
          0%,100% { transform: translate(0,0); }
          20%     { transform: translate(-2%,-3%); }
          40%     { transform: translate(3%,2%); }
          60%     { transform: translate(-1%,3%); }
          80%     { transform: translate(2%,-1%); }
        }
        .line-reveal { overflow: hidden; }
      `}</style>

      <section
        ref={containerRef}
        className="relative w-full min-h-[96vh] flex items-center overflow-hidden bg-zinc-950"
        aria-label="Satu Tahun Nismara Transport"
        style={{ cursor: "none" }}
      >
        {/* LAYER 0: Background foto dengan parallax */}
        <div className="absolute inset-0 overflow-hidden">
          {PHOTOS.map((src, i) => (
            <motion.div
              key={i}
              className="absolute inset-0"
              style={{ x: bgX, y: bgY }}
              animate={{ opacity: i === photoIndex ? 1 : 0 }}
              transition={{ duration: 2.2, ease: "easeInOut" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                aria-hidden="true"
                className="w-full h-full object-cover"
                style={{
                  animation: i === photoIndex
                    ? `kenBurns ${SLIDE_DURATION}ms ease-out forwards`
                    : "none",
                  transform: "scale(1.08)",
                }}
              />
            </motion.div>
          ))}

          {/* Grain texture — purposeful: feel sinematik */}
          <svg
            className="absolute inset-0 w-full h-full opacity-[0.04] pointer-events-none z-20"
            style={{ animation: "grainShift 0.3s steps(2) infinite" }}
          >
            <filter id="hero-noise">
              <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#hero-noise)" />
          </svg>

          {/* Overlay purposeful: teks harus terbaca di atas foto (R-25) */}
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/98 via-zinc-950/80 to-zinc-950/35 z-10" />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-zinc-950/70 z-10" />
          <div className="absolute inset-0 z-10" style={{ boxShadow: "inset 0 0 180px 60px rgba(9,9,11,0.8)" }} />
        </div>

        {/* LAYER 1: Konten split asymmetric */}
        <div className="relative z-20 w-full max-w-7xl mx-auto px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-[1fr_auto] items-center min-h-[96vh] py-28 lg:py-0 gap-0">

          {/* KOLOM KIRI */}
          <motion.div style={{ x: textX }} className="flex flex-col items-start justify-center lg:pr-12">

            {/* Kicker line — bukan capsule badge AI (R-09) */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: revealed ? 1 : 0, x: revealed ? 0 : -24 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-center gap-3 mb-10"
            >
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: revealed ? 1 : 0 }}
                transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="w-8 h-px bg-amber-400 origin-left"
              />
              <span className="text-amber-400/90 text-[11px] font-bold uppercase tracking-[0.25em]">
                Nismara Transport &middot; 2025 – 2026
              </span>
            </motion.div>

            {/* Heading line 1 — clip slide dari bawah, bukan fade biasa */}
            <div className="line-reveal mb-1">
              <motion.h1
                initial={{ y: "110%" }}
                animate={{ y: revealed ? "0%" : "110%" }}
                transition={{ duration: 0.85, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                className="block font-black text-white leading-[0.88] tracking-tighter"
                style={{ fontSize: "clamp(44px,7.5vw,88px)" }}
              >
                Satu Tahun
              </motion.h1>
            </div>

            <div className="line-reveal mb-8">
              <motion.span
                initial={{ y: "110%" }}
                animate={{ y: revealed ? "0%" : "110%" }}
                transition={{ duration: 0.85, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
                className="block font-black text-amber-400 leading-[0.88] tracking-tighter"
                style={{ fontSize: "clamp(44px,7.5vw,88px)" }}
              >
                Di Aspal.
              </motion.span>
            </div>

            {/* Separator purposeful: memotong heading dari body */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: revealed ? 1 : 0 }}
              transition={{ duration: 0.9, delay: 0.42, ease: [0.16, 1, 0.3, 1] }}
              className="w-16 h-px bg-amber-400/40 origin-left mb-8"
            />

            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 16 }}
              transition={{ duration: 0.7, delay: 0.5, ease: "easeOut" }}
              className="text-zinc-400 text-base sm:text-[17px] leading-[1.7] max-w-[400px] mb-10"
            >
              Dari convoy perdana hingga Season Pass pertama, komunitas ini
              dibangun oleh driver yang hadir setiap hari. Terima kasih sudah
              ada bersama kami.
            </motion.p>

            {/* CTA spesifik — bukan "Learn More" (R-15) */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: revealed ? 1 : 0, y: revealed ? 0 : 14 }}
              transition={{ duration: 0.7, delay: 0.62, ease: "easeOut" }}
              className="flex flex-col sm:flex-row gap-3 mb-14"
            >
              {isDriver ? (
                <Link
                  href="/dashboard"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-amber-400 text-zinc-950 text-sm font-black tracking-wide hover:bg-amber-300 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
                >
                  <span>Buka Dashboard</span>
                  <span className="translate-x-0 group-hover:translate-x-1 transition-transform inline-block">→</span>
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-lg bg-amber-400 text-zinc-950 text-sm font-black tracking-wide hover:bg-amber-300 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
                >
                  <span>Daftar Jadi Driver</span>
                  <span className="translate-x-0 group-hover:translate-x-1 transition-transform inline-block">→</span>
                </Link>
              )}
              <Link
                href="/onboarding"
                className="inline-flex items-center justify-center px-8 py-4 rounded-lg border border-white/15 text-white text-sm font-semibold hover:bg-white/8 hover:border-white/30 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/40"
              >
                Panduan Bergabung
              </Link>
            </motion.div>

            {/* Stats nyata (R-17) */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: revealed ? 1 : 0 }}
              transition={{ duration: 0.8, delay: 0.75 }}
              className="flex flex-wrap gap-8 pt-7 border-t border-white/8"
            >
              {STATS.map((s, i) => (
                <StatItem key={s.label} value={s.value} suffix={s.suffix} label={s.label} delay={900 + i * 180} />
              ))}
            </motion.div>
          </motion.div>

          {/* KOLOM KANAN: Angka "1" raksasa + light rays + parallax */}
          <div className="hidden lg:flex items-center justify-center self-stretch relative" aria-hidden="true">

            {/* Light rays purposeful: anniversary = sumber cahaya baru */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: revealed ? 1 : 0, scale: revealed ? 1 : 0.5 }}
              transition={{ duration: 1.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div
                className="absolute w-[500px] h-[500px] opacity-[0.07]"
                style={{
                  background: "conic-gradient(from 0deg, transparent 0%, #f59e0b 5%, transparent 10%, transparent 15%, #f59e0b 20%, transparent 25%, transparent 30%, #f59e0b 35%, transparent 40%, transparent 45%, #f59e0b 50%, transparent 55%, transparent 60%, #f59e0b 65%, transparent 70%, transparent 75%, #f59e0b 80%, transparent 85%, transparent 90%, #f59e0b 95%, transparent 100%)",
                  animation: "rayRotate 20s linear infinite",
                  borderRadius: "50%",
                }}
              />
              <div
                className="absolute w-64 h-64 rounded-full"
                style={{ background: "radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)" }}
              />
            </motion.div>

            {/* Angka "1" — focal point utama (C-1, R-20) */}
            <motion.div
              style={{ x: numX, y: numY }}
              initial={{ opacity: 0, scale: 0.75 }}
              animate={{ opacity: revealed ? 1 : 0, scale: revealed ? 1 : 0.75 }}
              transition={{ duration: 1.1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="relative z-10"
            >
              <span
                className="block font-black leading-none select-none"
                style={{
                  fontSize: "clamp(260px, 25vw, 440px)",
                  letterSpacing: "-0.08em",
                  backgroundImage: "linear-gradient(160deg, #fef3c7 0%, #fbbf24 30%, #d97706 65%, #7c2d12 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  filter: "drop-shadow(0 0 80px rgba(251,191,36,0.08)) drop-shadow(0 40px 80px rgba(0,0,0,0.5))",
                }}
              >
                1
              </span>
            </motion.div>


            {/* Label vertikal purposeful: konteks angka */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: revealed ? 1 : 0, x: revealed ? 0 : 20 }}
              transition={{ duration: 0.6, delay: 0.7 }}
              className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-start gap-1 pl-4 border-l border-amber-400/20"
              style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
            >
              <span className="text-amber-400 text-[9px] font-black uppercase tracking-[0.35em] rotate-180">TAHUN</span>
              <span className="text-zinc-600 text-[9px] font-semibold uppercase tracking-[0.25em] rotate-180">BERSAMA</span>
            </motion.div>

            {/* Garis bawah purposeful: "mendarat" focal point */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: revealed ? 1 : 0 }}
              transition={{ duration: 1.0, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
              className="absolute bottom-[18%] left-1/2 -translate-x-1/2 w-48 h-px origin-left"
              style={{ background: "linear-gradient(to right, transparent, rgba(245,158,11,0.4), transparent)" }}
            />
          </div>

        </div>

        <TimerBar photoIndex={photoIndex} />

        {/* Gradient fade ke section berikutnya */}
        <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-background to-transparent z-20 pointer-events-none" />

        <CustomCursor />
      </section>
    </>
  );
}
