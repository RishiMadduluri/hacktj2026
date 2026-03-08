"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Volume2,
  Ambulance,
  Heart,
  User,
  Zap,
  Brain,
  ChevronRight,
  Shield,
} from "lucide-react";

// Animated ECG SVG component — now used decoratively in hero and footer
function ECGLine({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`w-full h-full opacity-20 ${className}`}
      viewBox="0 0 1200 200"
      preserveAspectRatio="none"
    >
      <motion.path
        d="M0,100 L100,100 L120,100 L140,20 L160,180 L180,100 L220,100 L300,100 L320,100 L340,20 L360,180 L380,100 L420,100 L500,100 L520,100 L540,20 L560,180 L580,100 L620,100 L700,100 L720,100 L740,20 L760,180 L780,100 L820,100 L900,100 L920,100 L940,20 L960,180 L980,100 L1020,100 L1100,100 L1120,100 L1140,20 L1160,180 L1180,100 L1200,100"
        fill="none"
        stroke="#DC2626"
        strokeWidth="2"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 3, repeat: Infinity, repeatType: "loop", ease: "linear" }}
      />
    </svg>
  );
}

// Animated counter component
function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    const duration = 2000;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [inView, target]);

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

// Typewriter text component
function TypewriterText({ text, delay = 0 }: { text: string; delay?: number }) {
  const [displayed, setDisplayed] = useState("");
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let i = 0;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        setDisplayed(text.slice(0, i + 1));
        i++;
        if (i >= text.length) clearInterval(interval);
      }, 60);
      return () => clearInterval(interval);
    }, delay);
    return () => clearTimeout(timeout);
  }, [inView, text, delay]);

  return (
    <span ref={ref} className="font-mono text-red-600">
      {displayed}
      {displayed.length < text.length && <span className="typewriter-cursor">&nbsp;</span>}
    </span>
  );
}

// Mouse-follow glow
function CursorGlow() {
  const [pos, setPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handler = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, []);

  return (
    <div
      className="fixed pointer-events-none z-10"
      style={{
        left: pos.x - 200,
        top: pos.y - 200,
        width: 400,
        height: 400,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(220,38,38,0.06) 0%, transparent 70%)",
        transition: "left 0.1s ease-out, top 0.1s ease-out",
      }}
    />
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.15 } },
};

const slideIn = (direction: "left" | "right") => ({
  hidden: { opacity: 0, x: direction === "left" ? -60 : 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: "easeOut" } },
});

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.95]);

  return (
    <div className="bg-[#0A0A0A] text-white min-h-screen overflow-x-hidden">
      {/* Noise grain overlay */}
      <div className="noise-overlay" />
      {/* Cursor glow — hero only */}
      <CursorGlow />

      {/* ====== HERO ====== */}
      <motion.section
        ref={heroRef}
        style={{ opacity: heroOpacity, scale: heroScale }}
        className="relative min-h-screen flex items-center px-4 md:px-12 lg:px-20 overflow-hidden"
      >
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-red-950/20 via-transparent to-transparent" />
        <div className="gradient-orb-1" style={{ top: "10%", right: "10%" }} />
        <div className="gradient-orb-2" style={{ bottom: "20%", left: "5%" }} />
        <div className="scanline" />

        {/* ECG line across the middle */}
        <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-24 z-0 opacity-30">
          <ECGLine />
        </div>

        {/* Top bar */}
        <div className="absolute top-6 left-8 flex items-center gap-2 z-20">
          <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          <span className="text-red-600 font-bold tracking-widest text-sm">FIRSTWATCH</span>
        </div>
        <div className="absolute top-6 right-8 z-20">
          <Link
            href="/sign-in"
            className="text-sm text-zinc-400 hover:text-white transition-colors border border-zinc-800 hover:border-zinc-600 px-4 py-1.5 rounded-full"
          >
            Sign in
          </Link>
        </div>

        {/* Split layout: Left text + Right vital card */}
        <div className="relative z-10 w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-20 lg:pt-0">
          {/* LEFT: Title + CTA */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="lg:col-span-7"
          >
            <motion.div variants={fadeUp} className="mb-4">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-red-800/50 text-red-400 text-xs tracking-widest uppercase bg-red-950/20">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                AI Medical Emergency Detection
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="text-7xl md:text-[7rem] lg:text-[8rem] font-black tracking-tighter leading-[0.85] mb-6"
            >
              <span className="glitch-text block" data-text="FIRST">FIRST</span>
              <span className="text-red-600 glitch-text block" data-text="WATCH">WATCH</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="text-xl md:text-2xl text-zinc-400 mb-8 max-w-xl font-light leading-relaxed"
            >
              The only guardian that{" "}
              <span className="text-white font-medium">never</span> sleeps.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-4">
              <Link
                href="/sign-up"
                className="relative inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-4 rounded-lg text-lg transition-all hover:scale-105 active:scale-95 group"
              >
                <span className="cta-pulse-ring" />
                Start Protecting
                <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <span className="text-zinc-600 text-sm">No credit card required</span>
            </motion.div>
          </motion.div>

          {/* RIGHT: Floating vital signs card */}
          <motion.div
            initial={{ opacity: 0, y: 40, rotateY: -8 }}
            animate={{ opacity: 1, y: 0, rotateY: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="lg:col-span-5 animate-float"
          >
            <div className="bg-[#111]/80 backdrop-blur-xl border border-[#1F1F1F] rounded-2xl p-8 shadow-2xl shadow-red-900/10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-red-950/10 to-transparent" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-red-400 text-xs font-bold tracking-widest">VITAL MONITOR</span>
                </div>
                <div className="text-7xl md:text-8xl font-black text-red-600 mb-1">
                  <AnimatedCounter target={40} />s
                </div>
                <p className="text-zinc-500 text-sm leading-relaxed">
                  Every 40 seconds, someone has a medical emergency — alone.
                </p>
                <div className="mt-6 h-16 opacity-60">
                  <ECGLine />
                </div>
                {/* Simulated HUD elements */}
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {[
                    { label: "BPM", value: "72" },
                    { label: "SpO₂", value: "98%" },
                    { label: "STATUS", value: "OK" },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center p-2 bg-black/30 rounded-lg border border-[#1F1F1F]">
                      <div className="text-[10px] text-zinc-600 font-mono uppercase">{label}</div>
                      <div className="text-sm font-bold text-zinc-300 font-mono">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-zinc-600 text-[10px] tracking-widest uppercase">Scroll</span>
            <div className="w-px h-12 bg-gradient-to-b from-red-600 to-transparent" />
          </div>
        </motion.div>
      </motion.section>

      {/* ====== THE SILENT CRISIS — Masonry-style staggered ====== */}
      <section className="py-28 px-4 max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="mb-16">
            <span className="text-red-600 text-xs tracking-widest uppercase font-semibold">The Problem</span>
            <h2 className="text-5xl md:text-6xl font-black tracking-tight mt-2">
              The Silent<br />
              <span className="text-red-600">Crisis</span>
            </h2>
          </motion.div>

          {/* Masonry-style staggered layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            {/* Big stat - spans more */}
            <motion.div
              variants={slideIn("left")}
              className="md:col-span-7 clip-diagonal bg-[#111] border border-[#1F1F1F] p-10 relative group hover:border-red-900/50 transition-all duration-500"
            >
              <User className="w-10 h-10 text-red-600/60 mb-4" />
              <div className="text-7xl md:text-8xl font-black text-white mb-3 tracking-tight">14M</div>
              <p className="text-zinc-400 text-lg">Elderly Americans living completely alone</p>
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>

            {/* Stacked right column */}
            <div className="md:col-span-5 space-y-6">
              <motion.div
                variants={slideIn("right")}
                className="clip-diagonal bg-[#111] border border-[#1F1F1F] p-8 relative group hover:border-red-900/50 transition-all duration-500"
              >
                <Heart className="w-8 h-8 text-red-600/60 mb-3" />
                <div className="text-5xl font-black text-white mb-2">40s</div>
                <p className="text-zinc-400 text-sm">Medical emergency every 40 seconds</p>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>

              <motion.div
                variants={slideIn("right")}
                className="clip-diagonal bg-[#111] border border-[#1F1F1F] p-8 relative group hover:border-red-900/50 transition-all duration-500"
              >
                <Zap className="w-8 h-8 text-red-600/60 mb-3" />
                <div className="text-5xl font-black text-white mb-2">1 hr</div>
                <p className="text-zinc-400 text-sm">The &ldquo;golden window&rdquo; to call for help</p>
                <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </motion.div>
            </div>
          </div>

          <motion.p variants={fadeUp} className="text-zinc-500 mt-12 max-w-2xl text-sm leading-relaxed">
            14 million Americans over 65 live alone. When a medical emergency strikes,
            every minute determines whether they walk out of the hospital — or don&apos;t.
          </motion.p>
        </motion.div>
      </section>

      {/* ====== HOW IT WORKS — Vertical zigzag timeline ====== */}
      <section className="py-28 px-4 bg-[#0D0D0D] relative">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="text-center mb-20">
              <span className="text-red-600 text-xs tracking-widest uppercase font-semibold">Process</span>
              <h2 className="text-5xl md:text-6xl font-black tracking-tight mt-2">
                How It <span className="text-red-600">Works</span>
              </h2>
              <p className="text-zinc-500 mt-4">Four steps. Zero delay.</p>
            </motion.div>

            {/* Zigzag timeline */}
            <div className="relative">
              {/* Center connector line */}
              <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 hidden md:block">
                <div className="pulse-connector h-full" />
              </div>

              {[
                { icon: Activity, label: "AI Watches", desc: "Computer vision analyzes your live feed every 3 seconds — detecting posture, facial expressions, and movement patterns.", num: "01" },
                { icon: AlertTriangle, label: "Detects Emergency", desc: "Trained on stroke signs, falls, cardiac events, and seizures. The moment something is wrong, FirstWatch knows.", num: "02" },
                { icon: Volume2, label: "Speaks & Alerts", desc: "A verbal check-in plays aloud. If there's no response within 10 seconds, emergency contacts are immediately notified.", num: "03" },
                { icon: Ambulance, label: "EMS Responds", desc: "Emergency services receive a complete medical profile — blood type, medications, allergies — before they even arrive.", num: "04" },
              ].map(({ icon: Icon, label, desc, num }, i) => (
                <motion.div
                  key={i}
                  variants={slideIn(i % 2 === 0 ? "left" : "right")}
                  className={`flex items-center gap-8 mb-16 last:mb-0 ${
                    i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                  }`}
                >
                  {/* Content */}
                  <div className={`flex-1 ${i % 2 === 0 ? "md:text-right" : "md:text-left"}`}>
                    <div className={`flex items-center gap-3 mb-3 ${i % 2 === 0 ? "md:justify-end" : "md:justify-start"}`}>
                      <span className="text-red-600/40 text-4xl font-black font-mono">{num}</span>
                      <h3 className="font-bold text-xl text-white">{label}</h3>
                    </div>
                    <p className="text-zinc-400 text-sm leading-relaxed max-w-md inline-block">{desc}</p>
                  </div>

                  {/* Center node */}
                  <div className="relative z-10 flex-shrink-0">
                    <div className="w-16 h-16 rounded-2xl bg-[#111] border border-red-900/40 flex items-center justify-center shadow-lg shadow-red-900/10 rotate-45">
                      <Icon className="w-7 h-7 text-red-500 -rotate-45" />
                    </div>
                  </div>

                  {/* Spacer for alignment */}
                  <div className="flex-1 hidden md:block" />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ====== WHAT IT DETECTS — Overlapping card deck ====== */}
      <section className="py-28 px-4 max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="mb-16">
            <span className="text-red-600 text-xs tracking-widest uppercase font-semibold">Detection</span>
            <h2 className="text-5xl md:text-6xl font-black tracking-tight mt-2">
              What We <span className="text-red-600">Detect</span>
            </h2>
            <p className="text-zinc-500 mt-4 max-w-lg">
              Trained to recognize the medical emergencies most likely to affect those living alone.
            </p>
          </motion.div>

          {/* Overlapping card stack */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative">
            {[
              { icon: Brain, type: "Stroke Signs", desc: "Facial drooping, sudden slumping, disorientation", color: "#DC2626" },
              { icon: Activity, type: "Fall Detection", desc: "Person on floor, rapid descent, motionless after impact", color: "#F97316" },
              { icon: Heart, type: "Cardiac Events", desc: "Chest clutching, sudden collapse, severe pain indicators", color: "#EF4444" },
              { icon: Zap, type: "Seizures", desc: "Convulsive movements, unresponsive on floor, tremors", color: "#B91C1C" },
            ].map(({ icon: Icon, type, desc, color }, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="card-deck relative bg-[#111] border border-[#1F1F1F] rounded-xl p-6 hover:border-red-800/60 transition-all group"
                style={{
                  transform: `rotate(${i % 2 === 0 ? -1 : 1}deg)`,
                  marginTop: i % 2 === 1 ? "16px" : "0",
                }}
              >
                {/* Left accent stripe */}
                <div
                  className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full opacity-60 group-hover:opacity-100 transition-opacity"
                  style={{ backgroundColor: color }}
                />
                <div className="pl-3">
                  <div className="w-12 h-12 rounded-xl bg-red-950/50 flex items-center justify-center mb-4 group-hover:bg-red-900/30 transition-colors">
                    <Icon className="w-6 h-6 text-red-500" />
                  </div>
                  <h3 className="font-bold text-white mb-2 text-lg">{type}</h3>
                  <p className="text-zinc-500 text-sm leading-relaxed">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ====== ROBERT'S STORY — Cinematic scroll reveal ====== */}
      <section className="py-28 px-4 bg-[#0D0D0D] relative">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="mb-16">
              <span className="text-red-600 text-xs tracking-widest uppercase font-semibold">Case Study</span>
              <h2 className="text-5xl md:text-6xl font-black tracking-tight mt-2">
                Robert&apos;s<br /><span className="text-red-600">Morning</span>
              </h2>
              <p className="text-zinc-500 mt-4">How 11 minutes changed everything.</p>
            </motion.div>

            <div className="space-y-0 relative">
              {/* Continuous vertical line */}
              <div className="absolute left-[7px] top-2 bottom-8 w-px bg-gradient-to-b from-red-600/50 via-red-800/30 to-transparent" />

              {[
                { time: "7:15 AM", event: "Speech pattern changes detected", detail: "FirstWatch flags subtle facial asymmetry and slurred movement", type: "warning" },
                { time: "7:15:30", event: "FirstWatch speaks aloud", detail: '"Robert, are you okay? Say something if you can hear me."', type: "action" },
                { time: "7:16 AM", event: "Daughter called", detail: "No answer — FirstWatch automatically moves to next contact", type: "warning" },
                { time: "7:17 AM", event: "Neighbor called", detail: "Picks up immediately — runs over", type: "action" },
                { time: "7:18 AM", event: "EMS dispatched", detail: "Full medical profile (blood type, medications, allergies) sent ahead", type: "action" },
                { time: "7:26 AM", event: "Neighbor finds Robert on floor", detail: "EMS arrives knowing it's a stroke — treatment starts immediately", type: "critical" },
              ].map(({ time, event, detail, type }, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="flex gap-6 group"
                >
                  {/* Dot on the line */}
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={`w-[15px] h-[15px] rounded-full border-2 mt-1 ${
                      type === "warning" ? "bg-yellow-500/20 border-yellow-500" :
                      type === "critical" ? "bg-red-600/20 border-red-600" : "bg-red-500/20 border-red-500"
                    }`}>
                      <div className={`w-full h-full rounded-full ${
                        type === "critical" ? "bg-red-600 animate-pulse" : ""
                      }`} />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="pb-10 flex-1">
                    <div className="mb-1">
                      <TypewriterText text={time} delay={i * 300} />
                    </div>
                    <h3 className="font-bold text-white text-lg group-hover:text-red-400 transition-colors">{event}</h3>
                    <p className="text-zinc-500 text-sm mt-1 italic leading-relaxed">{detail}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mt-8 p-8 bg-gradient-to-r from-red-950/30 to-red-950/10 border border-red-900/50 rounded-2xl relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-red-600/5 to-transparent" />
              <div className="relative z-10 flex items-center gap-4">
                <Shield className="w-12 h-12 text-red-500 flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-black text-white">Robert made a full recovery.</h3>
                  <p className="text-zinc-400 mt-1">
                    Because his daughter set up FirstWatch the week before.
                  </p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ====== FINAL CTA ====== */}
      <section className="py-36 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-red-950/30 via-red-950/10 to-transparent" />
        <div className="gradient-orb-1" style={{ bottom: "0", left: "20%" }} />
        <div className="gradient-orb-2" style={{ top: "20%", right: "15%" }} />

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="relative z-10 max-w-3xl mx-auto"
        >
          <motion.h2 variants={fadeUp} className="text-5xl md:text-7xl font-black mb-6 tracking-tight leading-[0.9]">
            Stop hoping.<br />
            <span className="text-red-600">Start knowing.</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-zinc-400 text-lg mb-10 max-w-lg mx-auto">
            Give your loved one — or yourself — a guardian that watches every moment.
          </motion.p>
          <motion.div variants={fadeUp} className="relative inline-block">
            <span className="cta-pulse-ring" />
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-10 py-5 rounded-xl text-xl transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-red-900/30"
            >
              Start Protecting for Free
              <ChevronRight className="w-6 h-6" />
            </Link>
          </motion.div>
          <motion.p variants={fadeUp} className="text-zinc-600 text-sm mt-8">
            No credit card required. Setup in under 5 minutes.
          </motion.p>
        </motion.div>
      </section>

      {/* ====== FOOTER ====== */}
      <footer className="border-t border-[#1F1F1F] py-8 px-4 relative">
        {/* ECG line across footer */}
        <div className="absolute top-0 left-0 right-0 h-8 opacity-10 -translate-y-4">
          <ECGLine />
        </div>
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-red-600" />
          <span className="font-bold text-red-600 tracking-widest text-xs">FIRSTWATCH</span>
        </div>
        <p className="text-zinc-600 text-sm text-center">AI Medical Guardian — Always Watching</p>
      </footer>
    </div>
  );
}
