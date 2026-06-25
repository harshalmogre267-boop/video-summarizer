'use client';

import React, { useState, useEffect } from 'react';
import { Search, Clock, Link as LinkIcon, AlertCircle, ArrowRight } from 'lucide-react';
import { Youtube } from '../../components/Icons';
import { api } from '../../services/api';


interface VideoCard {
  id: number;
  video_id: string;
  title: string;
  author: string;
  thumbnail: string;
  duration: number;
  youtube_url: string;
  created_at: string;
  has_short_summary: boolean;
}

export default function DashboardPage() {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [history, setHistory] = useState<VideoCard[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const data = await api.getHistory();
      setHistory(data);
    } catch (err: any) {
      console.error('Failed to fetch history', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleProcessVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!youtubeUrl.trim()) {
      setError('Please paste a YouTube URL.');
      return;
    }

    setProcessing(true);
    setProcessingStep('Validating YouTube URL...');

    // Simulate progress updates for visual clarity
    const steps = [
      { msg: 'Connecting to YouTube...', delay: 1500 },
      { msg: 'Extracting video transcript...', delay: 3500 },
      { msg: 'Partitioning text and indexing vectors...', delay: 5500 },
      { msg: 'Generating initial summaries...', delay: 8500 }
    ];

    const timers = steps.map(step => 
      setTimeout(() => {
        setProcessingStep(step.msg);
      }, step.delay)
    );

    try {
      const response = await api.processVideo(youtubeUrl.trim());
      // Clear timers
      timers.forEach(t => clearTimeout(t));
      
      // Redirect to video detail page
      router.push(`/video/${response.id}`);
    } catch (err: any) {
      timers.forEach(t => clearTimeout(t));
      setError(err.message || 'Failed to process YouTube video. Check if the video has captions enabled.');
      setProcessing(false);
    }
  };

  const formatDuration = (seconds: number): string => {
    if (!seconds) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const formattedSecs = secs < 10 ? `0${secs}` : secs;
    
    if (hrs > 0) {
      const formattedMins = mins < 10 ? `0${mins}` : mins;
      return `${hrs}:${formattedMins}:${formattedSecs}`;
    }
    return `${mins}:${formattedSecs}`;
  };

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 flex-grow">
      {/* Top Banner URL Processing */}
      <section className="mb-12">
        <div className="glass-panel p-6 sm:p-10 rounded-3xl border border-card-border/80 shadow-2xl relative overflow-hidden">
          {/* Accent light glows */}
          <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-accent-purple/10 blur-3xl"></div>
          <div className="absolute -left-20 -bottom-20 h-40 w-40 rounded-full bg-accent-cyan/10 blur-3xl"></div>
          
          <div className="max-w-3xl relative z-10 text-left">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Analyse a YouTube Video
            </h1>
            <p className="mt-2 text-slate-400 text-sm sm:text-base leading-relaxed">
              Paste any YouTube video link (lecture, podcast, tutorial, review) to extract notes, chat with the transcript, generate quizzes, and more.
            </p>

            {error && (
              <div className="mt-5 flex items-start gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 p-3.5 text-sm text-rose-300 animate-fade-in">
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            {processing ? (
              <div className="mt-6 flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-accent-purple/20 bg-slate-900/50 p-6">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-accent-cyan border-t-transparent shrink-0"></div>
                <div className="text-center sm:text-left">
                  <p className="text-sm font-semibold text-white">TubeSense is processing the video...</p>
                  <p className="text-xs text-accent-cyan mt-0.5">{processingStep}</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleProcessVideo} className="mt-6 flex flex-col sm:flex-row gap-3">
                <div className="relative flex-grow">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <LinkIcon className="h-5 w-5 text-slate-500" />
                  </div>
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl glass-input text-sm"
                  />
                </div>
                <button
                  type="submit"
                  className="glow-btn-purple text-white px-7 py-3.5 rounded-xl font-semibold text-sm cursor-pointer whitespace-nowrap"
                >
                  Process Video
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* History section */}
      <section>
        <h2 className="text-xl font-extrabold text-white mb-6 flex items-center gap-2">
          <Clock className="h-5 w-5 text-accent-purple" />
          Processed Videos Library
        </h2>

        {loadingHistory ? (
          <div className="flex h-48 items-center justify-center rounded-2xl border border-card-border/50 bg-slate-900/10">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-accent-purple border-t-transparent"></div>
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-12 rounded-2xl border border-dashed border-card-border/80 bg-slate-900/5">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900/60 border border-card-border mb-4">
              <Search className="h-6 w-6 text-slate-500" />
            </div>
            <h3 className="text-base font-bold text-slate-300">No videos analyzed yet</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Paste your first YouTube link above and click Process Video to start extracting knowledge insights.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {history.map((video) => (
              <div
                key={video.id}
                onClick={() => router.push(`/video/${video.id}`)}
                className="group glass-panel glass-panel-hover rounded-2xl overflow-hidden cursor-pointer flex flex-col h-full border border-card-border hover:-translate-y-1 transition-all"
              >
                {/* Thumbnail Container */}
                <div className="relative aspect-video w-full bg-slate-950 overflow-hidden">
                  <img
                    src={video.thumbnail || `https://img.youtube.com/vi/${video.video_id}/0.jpg`}
                    alt={video.title}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${video.video_id}/0.jpg`;
                    }}
                  />
                  <div className="absolute bottom-2.5 right-2.5 rounded-lg bg-black/80 px-2 py-0.5 text-3xs font-semibold text-slate-200 border border-white/5">
                    {formatDuration(video.duration)}
                  </div>
                </div>

                {/* Details Container */}
                <div className="p-4.5 flex flex-col flex-grow text-left">
                  <h3 className="text-sm font-bold text-slate-200 line-clamp-2 leading-snug group-hover:text-accent-cyan transition-colors">
                    {video.title}
                  </h3>
                  
                  <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-400">
                    <User className="h-3.5 w-3.5 text-accent-purple shrink-0" />
                    <span className="truncate">{video.author || 'YouTube Creator'}</span>
                  </div>

                  <div className="mt-auto pt-4 flex items-center justify-between border-t border-card-border/40 text-3xs text-slate-500">
                    <span>
                      Processed {new Date(video.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-accent-cyan group-hover:translate-x-0.5 transition-transform">
                      Open
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
