"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
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

// Animated ECG SVG component
function ECGLine() {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-20"
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

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.15 } },
};

export default function LandingPage() {
  return (
    <div className="bg-[#0A0A0A] text-white min-h-screen overflow-x-hidden">
      {/* HERO */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-red-950/20 via-transparent to-transparent" />
        <ECGLine />

        {/* Logo bar */}
        <div className="absolute top-6 left-8 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          <span className="text-red-600 font-bold tracking-widest text-sm">FIRSTWATCH</span>
        </div>
        <div className="absolute top-6 right-8">
          <Link
            href="/sign-in"
            className="text-sm text-zinc-400 hover:text-white transition-colors"
          >
            Sign in
          </Link>
        </div>

        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="relative z-10 max-w-4xl"
        >
          <motion.div variants={fadeUp} className="mb-6">
            <span className="inline-block px-3 py-1 rounded-full border border-red-800 text-red-400 text-xs tracking-widest uppercase mb-4">
              AI Medical Emergency Detection
            </span>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-6xl md:text-8xl font-black tracking-tight mb-4 leading-none"
          >
            FIRST
            <span className="text-red-600">WATCH</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-xl md:text-2xl text-zinc-400 mb-4 font-light"
          >
            The only guardian that never sleeps.
          </motion.p>

          <motion.div variants={fadeUp} className="text-5xl md:text-7xl font-black text-red-600 mb-2">
            <AnimatedCounter target={40} />s
          </motion.div>
          <motion.p variants={fadeUp} className="text-zinc-500 mb-10 text-lg">
            Every 40 seconds, someone has a medical emergency — alone.
          </motion.p>

          <motion.div variants={fadeUp}>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-4 rounded-lg text-lg transition-all hover:scale-105 active:scale-95"
            >
              Start Protecting
              <ChevronRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
        >
          <div className="w-px h-12 bg-gradient-to-b from-red-600 to-transparent mx-auto" />
        </motion.div>
      </section>

      {/* THE PROBLEM */}
      <section className="py-24 px-4 max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.h2 variants={fadeUp} className="text-4xl font-bold text-center mb-4">
            The Silent Crisis
          </motion.h2>
          <motion.p variants={fadeUp} className="text-zinc-400 text-center max-w-2xl mx-auto mb-16">
            14 million Americans over 65 live alone. When a medical emergency strikes,
            every minute determines whether they walk out of the hospital — or don&apos;t.
          </motion.p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { stat: "14M", label: "Elderly Americans living alone", icon: User },
              { stat: "40s", label: "Medical emergency every 40 seconds", icon: Heart },
              { stat: "1 hour", label: "The 'golden window' to call for help", icon: Zap },
            ].map(({ stat, label, icon: Icon }, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="bg-[#111] border border-[#1F1F1F] rounded-xl p-8 text-center hover:border-red-900 transition-colors"
              >
                <Icon className="w-8 h-8 text-red-600 mx-auto mb-4" />
                <div className="text-5xl font-black text-white mb-2">{stat}</div>
                <p className="text-zinc-400 text-sm">{label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 px-4 bg-[#0D0D0D]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2 variants={fadeUp} className="text-4xl font-bold text-center mb-4">
              How It Works
            </motion.h2>
            <motion.p variants={fadeUp} className="text-zinc-400 text-center mb-16">
              Four steps. Zero delay.
            </motion.p>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-0">
              {[
                { icon: Activity, label: "AI Watches", desc: "Live video analysis every 3 seconds" },
                { icon: AlertTriangle, label: "Detects Emergency", desc: "Stroke, fall, cardiac, seizure" },
                { icon: Volume2, label: "Speaks & Alerts", desc: "Verbal check-in + contact notification" },
                { icon: Ambulance, label: "EMS Responds", desc: "Full medical profile ready" },
              ].map(({ icon: Icon, label, desc }, i) => (
                <motion.div key={i} variants={fadeUp} className="relative flex flex-col items-center text-center px-6">
                  {i < 3 && (
                    <div className="hidden md:block absolute top-10 left-[60%] w-[80%] h-px bg-red-900/50 z-0" />
                  )}
                  <div className="relative z-10 w-20 h-20 rounded-full bg-red-950 border border-red-800 flex items-center justify-center mb-4">
                    <Icon className="w-8 h-8 text-red-500" />
                    <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-600 text-white text-xs font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                  </div>
                  <h3 className="font-semibold text-white mb-1">{label}</h3>
                  <p className="text-zinc-500 text-sm">{desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* WHAT IT DETECTS */}
      <section className="py-24 px-4 max-w-6xl mx-auto">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.h2 variants={fadeUp} className="text-4xl font-bold text-center mb-4">
            What FirstWatch Detects
          </motion.h2>
          <motion.p variants={fadeUp} className="text-zinc-400 text-center mb-16">
            Trained to recognize the medical emergencies most likely to affect those living alone.
          </motion.p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Brain, type: "Stroke Signs", desc: "Facial drooping, sudden slumping, disorientation" },
              { icon: Activity, type: "Fall Detection", desc: "Person on floor, rapid descent, motionless" },
              { icon: Heart, type: "Cardiac Events", desc: "Chest clutching, sudden collapse, severe pain" },
              { icon: Zap, type: "Seizures", desc: "Convulsive movements, unresponsive on floor" },
            ].map(({ icon: Icon, type, desc }, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="bg-[#111] border border-[#1F1F1F] rounded-xl p-6 hover:border-red-800 transition-all hover:bg-red-950/10 group"
              >
                <div className="w-12 h-12 rounded-lg bg-red-950 flex items-center justify-center mb-4 group-hover:bg-red-900 transition-colors">
                  <Icon className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="font-bold text-white mb-2">{type}</h3>
                <p className="text-zinc-500 text-sm">{desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ROBERT'S STORY */}
      <section className="py-24 px-4 bg-[#0D0D0D]">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.div variants={fadeUp} className="text-center mb-16">
              <span className="text-red-600 text-sm tracking-widest uppercase">A True Story</span>
              <h2 className="text-4xl font-bold mt-2">Robert&apos;s Morning</h2>
              <p className="text-zinc-500 mt-2">How 11 minutes changed everything.</p>
            </motion.div>

            <div className="space-y-0">
              {[
                { time: "7:15 AM", event: "Speech pattern changes detected", detail: "FirstWatch flags subtle facial asymmetry and slurred movement", type: "warning" },
                { time: "7:15:30", event: "FirstWatch speaks aloud", detail: '"Robert, are you okay? Say something if you can hear me."', type: "action" },
                { time: "7:16 AM", event: "Daughter called", detail: "No answer — FirstWatch automatically moves to next contact", type: "warning" },
                { time: "7:17 AM", event: "Neighbor called", detail: "Picks up immediately — runs over", type: "action" },
                { time: "7:18 AM", event: "EMS dispatched", detail: "Full medical profile (blood type, medications, allergies) sent ahead", type: "action" },
                { time: "7:26 AM", event: "Neighbor finds Robert on floor", detail: "EMS arrives knowing it's a stroke — treatment starts immediately", type: "critical" },
              ].map(({ time, event, detail, type }, i) => (
                <motion.div key={i} variants={fadeUp} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
                      type === "warning" ? "bg-yellow-500" :
                      type === "critical" ? "bg-red-600" : "bg-red-500"
                    }`} />
                    {i < 5 && <div className="w-px flex-1 bg-[#1F1F1F] my-1" style={{ minHeight: "2rem" }} />}
                  </div>
                  <div className="pb-8">
                    <span className="text-red-600 text-sm font-mono">{time}</span>
                    <h3 className="font-semibold text-white">{event}</h3>
                    <p className="text-zinc-500 text-sm italic mt-1">{detail}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              variants={fadeUp}
              className="mt-8 p-6 bg-red-950/20 border border-red-900 rounded-xl text-center"
            >
              <Shield className="w-10 h-10 text-red-500 mx-auto mb-3" />
              <h3 className="text-xl font-bold text-white">Robert made a full recovery.</h3>
              <p className="text-zinc-400 mt-2">
                Because his daughter set up FirstWatch the week before.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-32 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-red-950/30 via-transparent to-transparent" />
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="relative z-10 max-w-2xl mx-auto"
        >
          <motion.h2 variants={fadeUp} className="text-5xl md:text-6xl font-black mb-6">
            Stop hoping.<br />
            <span className="text-red-600">Start knowing.</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-zinc-400 text-lg mb-10">
            Give your loved one — or yourself — a guardian that watches every moment.
          </motion.p>
          <motion.div variants={fadeUp}>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold px-10 py-5 rounded-lg text-xl transition-all hover:scale-105 active:scale-95"
            >
              Start Protecting for Free
              <ChevronRight className="w-6 h-6" />
            </Link>
          </motion.div>
          <motion.p variants={fadeUp} className="text-zinc-600 text-sm mt-6">
            No credit card required. Setup in under 5 minutes.
          </motion.p>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1F1F1F] py-8 px-4 text-center text-zinc-600 text-sm">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-red-600" />
          <span className="font-bold text-red-600 tracking-widest text-xs">FIRSTWATCH</span>
        </div>
        <p>AI Medical Guardian — Always Watching</p>
      </footer>
    </div>
  );
}
