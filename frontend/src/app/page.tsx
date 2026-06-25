'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Brain, MessageSquare, BookOpen, PenTool, CheckCircle, ArrowRight } from 'lucide-react';
import { Youtube } from '../components/Icons';
import { getAuthToken } from '../services/api';


export default function LandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If logged in, redirect straight to dashboard
    if (getAuthToken()) {
      router.push('/dashboard');
    } else {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className="flex flex-grow items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-purple border-t-transparent"></div>
      </div>
    );
  }

  const features = [
    {
      icon: <Brain className="h-6 w-6 text-accent-purple" />,
      title: "AI Video Summaries",
      desc: "Instantly condense hours of video into Short, Detailed, or bulleted summaries depending on your study needs."
    },
    {
      icon: <MessageSquare className="h-6 w-6 text-accent-cyan" />,
      title: "Transcript Chat Assistant",
      desc: "Ask specific questions and get answers referencing exact video segments. Full context-aware dialogue."
    },
    {
      icon: <BookOpen className="h-6 w-6 text-accent-indigo" />,
      title: "Structured Study Notes",
      desc: "Auto-generate lecture outlines, core glossaries, chapter details, key takeaways, and revision questions."
    },
    {
      icon: <CheckCircle className="h-6 w-6 text-emerald-400" />,
      title: "Interactive Quizzes",
      desc: "Test your retention immediately with custom-generated MCQs, True/False, and short-answer evaluations."
    },
    {
      icon: <PenTool className="h-6 w-6 text-amber-400" />,
      title: "Content Repurposing",
      desc: "Draft LinkedIn articles, Twitter threads, slide carousels, or fully-formatted blogs based on the video context."
    }
  ];

  return (
    <div className="flex flex-grow flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 md:pt-32 md:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-accent-purple/30 bg-accent-purple/10 px-4 py-1.5 mb-6 animate-fade-in">
            <Youtube className="h-4 w-4 text-accent-purple animate-pulse" />
            <span className="text-xs font-semibold tracking-wide text-slate-300 uppercase">
              Next-Gen Learning Companion
            </span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl max-w-4xl mx-auto leading-tight animate-fade-in">
            <span className="block text-glow-gradient">Transform YouTube Videos</span>
            <span className="block text-white mt-1">Into Interactive Knowledge Assets</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-slate-400 leading-relaxed animate-fade-in" style={{ animationDelay: '0.1s' }}>
            TubeSense extracts transcripts, builds intelligent search indexes, and uses generative AI to generate summaries, study notes, quizzes, and repurpose content on demand.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <Link href="/register" className="glow-btn-purple flex items-center gap-2 text-white px-8 py-3.5 rounded-xl font-semibold text-base">
              Get Started Free
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/login" className="glass-panel text-slate-300 hover:text-white border border-card-border px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-slate-900/55 transition-all">
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Grid Section */}
      <section className="py-16 md:py-24 border-t border-card-border/60 bg-slate-950/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Engineered for Learning & Productivity
            </h2>
            <p className="mt-4 text-slate-400">
              We extract transcripts, partition concepts, build semantic vectors, and utilize Large Language Models to offer modular learning panels.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {features.map((feat, index) => (
              <div 
                key={index} 
                className="glass-panel glass-panel-hover p-6.5 rounded-2xl flex flex-col gap-4 text-left transition-all"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900/80 border border-card-border shadow-inner">
                  {feat.icon}
                </div>
                <h3 className="text-lg font-bold text-white tracking-tight">{feat.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed flex-grow">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto border-t border-card-border/40 bg-slate-950/40 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
          <p>© 2026 TubeSense. Designed for modern education and productivity. Powered by Gemini API.</p>
        </div>
      </footer>
    </div>
  );
}
