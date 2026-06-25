'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  FileText, BookOpen, BrainCircuit, MessageSquare, Share2, 
  Copy, Check, Send, Sparkles, ChevronDown, ChevronUp, AlertCircle, ArrowLeft 
} from 'lucide-react';
import { Youtube } from '../../../components/Icons';
import { api, getAuthToken } from '../../../services/api';


// Self-contained Markdown renderer for React 19 compatibility
function formatBold(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em class="text-slate-200 italic">$1</em>');
}

function MarkdownRenderer({ content }: { content: string }) {
  if (!content) return null;
  const lines = content.split('\n');
  return (
    <div className="space-y-3.5 text-left leading-relaxed text-slate-300 text-sm">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        
        // Headers
        if (trimmed.startsWith('### ')) {
          return <h4 key={i} className="text-base font-extrabold text-white mt-5 mb-2 flex items-center gap-2">{trimmed.replace('### ', '')}</h4>;
        }
        if (trimmed.startsWith('## ')) {
          return <h3 key={i} className="text-lg font-extrabold text-white mt-6 mb-3 border-b border-card-border pb-1">{trimmed.replace('## ', '')}</h3>;
        }
        if (trimmed.startsWith('# ')) {
          return <h2 key={i} className="text-xl font-black text-white mt-8 mb-4">{trimmed.replace('# ', '')}</h2>;
        }
        
        // Bullet list
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          const cleanLine = trimmed.replace(/^[-*]\s+/, '');
          return (
            <li key={i} className="list-disc ml-5 pl-1 my-1">
              <span dangerouslySetInnerHTML={{ __html: formatBold(cleanLine) }} />
            </li>
          );
        }
        
        // Numbered list
        if (/^\d+\.\s+/.test(trimmed)) {
          const cleanLine = trimmed.replace(/^\d+\.\s+/, '');
          return (
            <li key={i} className="list-decimal ml-5 pl-1 my-1">
              <span dangerouslySetInnerHTML={{ __html: formatBold(cleanLine) }} />
            </li>
          );
        }
        
        // Text block
        if (trimmed) {
          return <p key={i} className="my-1.5" dangerouslySetInnerHTML={{ __html: formatBold(trimmed) }} />;
        }
        
        return <div key={i} className="h-1.5" />;
      })}
    </div>
  );
}

interface VideoDetail {
  id: number;
  video_id: string;
  title: string;
  author: string;
  thumbnail: string;
  duration: number;
  youtube_url: string;
  transcript: string;
  summary_short: string | null;
  summary_detailed: string | null;
  summary_bullet: string | null;
  generated_notes: string | null;
}

interface ChatMsg {
  sender: string;
  message: string;
  created_at?: string;
}

interface QuizQuestion {
  id: number;
  type: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

export default function VideoWorkspace() {
  const params = useParams();
  const router = useRouter();
  const videoDbId = Number(params.id);

  const [video, setVideo] = useState<VideoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'notes' | 'quiz' | 'chat' | 'repurpose'>('summary');
  
  // Transcript toggle
  const [showTranscript, setShowTranscript] = useState(false);
  const [copiedText, setCopiedText] = useState('');

  // Summary state
  const [summaryType, setSummaryType] = useState<'short' | 'detailed' | 'bullet'>('short');
  const [summaryText, setSummaryText] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);

  // Notes state
  const [notesText, setNotesText] = useState('');
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Quiz state
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [loadingQuiz, setLoadingQuiz] = useState(false);
  const [selectedQuizAnswers, setSelectedQuizAnswers] = useState<Record<number, string>>({});
  const [shortAnswersText, setShortAnswersText] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(0);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingChat, setSendingChat] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // Repurpose state
  const [socialType, setSocialType] = useState<'linkedin' | 'twitter' | 'blog' | 'instagram'>('linkedin');
  const [socialContent, setSocialContent] = useState<Record<string, string>>({
    linkedin: '',
    twitter: '',
    blog: '',
    instagram: '',
  });
  const [loadingSocial, setLoadingSocial] = useState(false);

  // Auth Guard
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }
    loadVideoData();
  }, [videoDbId]);

  // Scroll chat to bottom when messages update
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const loadVideoData = async () => {
    try {
      setLoading(true);
      // We load the video details using getHistory and filter by database ID
      const history = await api.getHistory();
      const match = history.find((v: any) => v.id === videoDbId);
      
      if (!match) {
        throw new Error('Video record not found in user database.');
      }
      
      // Load detailed transcript and cached contents
      // Wait, we need the transcript which is in the full Video model. Let's make sure our route returns it.
      // Wait, we processed the video. The process video endpoint returns the Video object. 
      // We can use a trick: processing it again returns the parsed Video instantly! 
      // Or we can just call processVideo with the youtubeUrl. 
      // Let's call processVideo with the matching youtube_url to retrieve the full object with transcript.
      const fullVideo = await api.processVideo(match.youtube_url);
      setVideo(fullVideo);
      
      // Set initial summaries
      if (fullVideo.summary_short) {
        setSummaryText(fullVideo.summary_short);
      }
    } catch (err: any) {
      alert(err.message || 'Error loading video details.');
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(''), 2000);
  };

  // 1. Fetch Summary
  const handleLoadSummary = async (type: 'short' | 'detailed' | 'bullet') => {
    setSummaryType(type);
    setLoadingSummary(true);
    try {
      const res = await api.getSummary(videoDbId, type);
      setSummaryText(res.summary);
    } catch (err: any) {
      alert('Error fetching summary: ' + err.message);
    } finally {
      setLoadingSummary(false);
    }
  };

  // 2. Fetch Notes
  const handleLoadNotes = async () => {
    if (notesText) return; // already loaded
    setLoadingNotes(true);
    try {
      const res = await api.getNotes(videoDbId);
      setNotesText(res.notes);
    } catch (err: any) {
      alert('Error generating study notes: ' + err.message);
    } finally {
      setLoadingNotes(false);
    }
  };

  // 3. Fetch Quiz
  const handleLoadQuiz = async () => {
    if (quizQuestions.length > 0) return; // already loaded
    setLoadingQuiz(true);
    try {
      const res = await api.getQuiz(videoDbId);
      setQuizQuestions(res.questions);
      setQuizSubmitted(false);
      setSelectedQuizAnswers({});
      setShortAnswersText({});
    } catch (err: any) {
      alert('Error generating quiz: ' + err.message);
    } finally {
      setLoadingQuiz(false);
    }
  };

  const handleSubmitQuiz = () => {
    let score = 0;
    quizQuestions.forEach(q => {
      if (q.type === 'multiple_choice' || q.type === 'true_false') {
        if (selectedQuizAnswers[q.id] === q.correct_answer) {
          score += 1;
        }
      } else {
        // short answer: check if correct_answer keyword is inside written answer (case-insensitive)
        const userText = (shortAnswersText[q.id] || '').toLowerCase().trim();
        const keyword = q.correct_answer.toLowerCase().trim();
        if (userText && (userText.includes(keyword) || keyword.includes(userText))) {
          score += 1;
        }
      }
    });
    setQuizScore(score);
    setQuizSubmitted(true);
  };

  const handleResetQuiz = () => {
    setQuizSubmitted(false);
    setSelectedQuizAnswers({});
    setShortAnswersText({});
    setQuizScore(0);
  };

  // 4. Chat/RAG
  const handleLoadChat = async () => {
    if (chatMessages.length > 0) return;
    try {
      const history = await api.getChatHistory(videoDbId);
      if (history.length > 0) {
        setChatMessages(history);
      } else {
        setChatMessages([
          { sender: 'assistant', message: 'Hello! I am your TubeSense study assistant. Ask me anything about the concepts discussed in this video!' }
        ]);
      }
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || sendingChat) return;

    const userMessage = chatInput.trim();
    setChatMessages(prev => [...prev, { sender: 'user', message: userMessage }]);
    setChatInput('');
    setSendingChat(true);

    try {
      const res = await api.askQuestion(videoDbId, userMessage);
      setChatMessages(prev => [...prev, { sender: 'assistant', message: res.answer }]);
    } catch (err: any) {
      setChatMessages(prev => [...prev, { sender: 'assistant', message: 'Sorry, I encountered an error answering your question. ' + err.message }]);
    } finally {
      setSendingChat(false);
    }
  };

  // 5. Repurpose Content
  const handleLoadSocial = async () => {
    // If already loaded one of them, skip
    if (socialContent.linkedin) return;
    setLoadingSocial(true);
    try {
      const res = await api.getSocialContent(videoDbId);
      setSocialContent({
        linkedin: res.linkedin_post,
        twitter: res.twitter_thread,
        blog: res.blog_post,
        instagram: res.instagram_carousel,
      });
    } catch (err: any) {
      alert('Error generating social content: ' + err.message);
    } finally {
      setLoadingSocial(false);
    }
  };

  // Sync tab loading
  const handleTabChange = (tab: 'summary' | 'notes' | 'quiz' | 'chat' | 'repurpose') => {
    setActiveTab(tab);
    if (tab === 'notes') handleLoadNotes();
    if (tab === 'quiz') handleLoadQuiz();
    if (tab === 'chat') handleLoadChat();
    if (tab === 'repurpose') handleLoadSocial();
  };

  if (loading || !video) {
    return (
      <div className="flex flex-grow items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-accent-purple border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex-grow flex flex-col">
      {/* Header back navigation */}
      <div className="mb-5 flex items-center justify-between">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          Dashboard
        </button>
        <span className="text-2xs text-slate-500 font-medium bg-slate-900/60 py-1 px-2.5 rounded-lg border border-card-border">
          Video ID: {video.video_id}
        </span>
      </div>

      {/* Grid workspace layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow">
        {/* Left Column: Player & Transcript */}
        <div className="lg:col-span-5 flex flex-col gap-5 text-left">
          {/* Video Player */}
          <div className="aspect-video w-full rounded-2xl overflow-hidden glass-panel border border-card-border shadow-2xl relative bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${video.video_id}`}
              title={video.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="h-full w-full"
            ></iframe>
          </div>

          {/* Details */}
          <div>
            <h1 className="text-lg font-bold text-white leading-snug">{video.title}</h1>
            <p className="text-xs text-accent-cyan mt-1 font-semibold">{video.author}</p>
          </div>

          {/* Scrollable Transcript Panel */}
          <div className="glass-panel rounded-2xl border border-card-border/80 overflow-hidden flex flex-col">
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-900/40 text-slate-300 hover:text-white transition-all text-xs font-bold border-b border-card-border/40 cursor-pointer"
            >
              <span>Video Transcript</span>
              {showTranscript ? <ChevronUp className="h-4.5 w-4.5" /> : <ChevronDown className="h-4.5 w-4.5" />}
            </button>
            {showTranscript && (
              <div className="p-5 max-h-60 overflow-y-auto text-xs text-slate-400 leading-relaxed text-left">
                {video.transcript}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Panels */}
        <div className="lg:col-span-7 flex flex-col glass-panel rounded-3xl border border-card-border/90 shadow-2xl overflow-hidden min-h-[500px]">
          {/* Tab Navigation header */}
          <div className="flex border-b border-card-border overflow-x-auto scrollbar-none bg-slate-900/30">
            {[
              { id: 'summary', label: 'Summary', icon: <FileText className="h-4 w-4" /> },
              { id: 'notes', label: 'Study Notes', icon: <BookOpen className="h-4 w-4" /> },
              { id: 'quiz', label: 'Quizzes', icon: <BrainCircuit className="h-4 w-4" /> },
              { id: 'chat', label: 'Chat Assistant', icon: <MessageSquare className="h-4 w-4" /> },
              { id: 'repurpose', label: 'Repurpose', icon: <Share2 className="h-4 w-4" /> }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as any)}
                className={`flex items-center gap-1.5 px-5 py-4 border-b-2 font-semibold text-xs whitespace-nowrap transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'border-accent-purple text-white bg-slate-900/60'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/10'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Active Tab Panel Content */}
          <div className="p-6 flex-grow flex flex-col">
            
            {/* 1. SUMMARIES TAB */}
            {activeTab === 'summary' && (
              <div className="flex flex-col flex-grow text-left animate-fade-in">
                {/* Summary selector pills */}
                <div className="flex items-center gap-2 mb-5">
                  {(['short', 'detailed', 'bullet'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => handleLoadSummary(type)}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                        summaryType === type
                          ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/40'
                          : 'bg-slate-900/60 text-slate-400 border border-card-border hover:text-slate-200'
                      }`}
                    >
                      {type} Summary
                    </button>
                  ))}
                </div>

                {loadingSummary ? (
                  <div className="flex flex-grow items-center justify-center py-20">
                    <div className="h-7 w-7 animate-spin rounded-full border-3 border-accent-purple border-t-transparent"></div>
                  </div>
                ) : (
                  <div className="relative flex-grow flex flex-col">
                    <div className="glass-panel p-5 rounded-2xl bg-slate-900/40 text-slate-300 text-sm leading-relaxed whitespace-pre-line flex-grow overflow-y-auto">
                      {summaryType === 'detailed' ? (
                        <MarkdownRenderer content={summaryText} />
                      ) : (
                        summaryText || 'No summary generated for this video.'
                      )}
                    </div>
                    {summaryText && (
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => handleCopy(summaryText, 'summary')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-card-border text-2xs font-semibold text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
                        >
                          {copiedText === 'summary' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedText === 'summary' ? 'Copied' : 'Copy Summary'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 2. STUDY NOTES TAB */}
            {activeTab === 'notes' && (
              <div className="flex flex-col flex-grow text-left animate-fade-in">
                {loadingNotes ? (
                  <div className="flex flex-grow items-center justify-center py-20">
                    <div className="h-7 w-7 animate-spin rounded-full border-3 border-accent-purple border-t-transparent"></div>
                  </div>
                ) : (
                  <div className="relative flex-grow flex flex-col">
                    <div className="glass-panel p-5 rounded-2xl bg-slate-900/40 flex-grow max-h-[480px] overflow-y-auto">
                      {notesText ? (
                        <MarkdownRenderer content={notesText} />
                      ) : (
                        <p className="text-sm text-slate-400">Failed to load study notes.</p>
                      )}
                    </div>
                    {notesText && (
                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => handleCopy(notesText, 'notes')}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-card-border text-2xs font-semibold text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
                        >
                          {copiedText === 'notes' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedText === 'notes' ? 'Copied' : 'Copy Notes'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 3. QUIZZES TAB */}
            {activeTab === 'quiz' && (
              <div className="flex flex-col flex-grow text-left animate-fade-in">
                {loadingQuiz ? (
                  <div className="flex flex-grow items-center justify-center py-20">
                    <div className="h-7 w-7 animate-spin rounded-full border-3 border-accent-purple border-t-transparent"></div>
                  </div>
                ) : quizQuestions.length === 0 ? (
                  <p className="text-sm text-slate-400">Could not generate a quiz.</p>
                ) : (
                  <div className="flex-grow flex flex-col max-h-[480px] overflow-y-auto pr-1">
                    {/* Score display after submission */}
                    {quizSubmitted && (
                      <div className="mb-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5 flex items-center justify-between">
                        <div>
                          <h4 className="text-base font-bold text-white">Quiz Completed!</h4>
                          <p className="text-xs text-emerald-300 mt-0.5">Retained concept score achieved.</p>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-black text-white">{quizScore}</span>
                          <span className="text-sm text-slate-400 font-semibold"> / {quizQuestions.length}</span>
                        </div>
                      </div>
                    )}

                    <div className="space-y-6 flex-grow">
                      {quizQuestions.map((q, idx) => {
                        const isCorrect = q.type === 'short_answer'
                          ? (shortAnswersText[q.id] || '').toLowerCase().includes(q.correct_answer.toLowerCase())
                          : selectedQuizAnswers[q.id] === q.correct_answer;
                        
                        return (
                          <div key={q.id} className="p-5 rounded-2xl bg-slate-900/20 border border-card-border/60">
                            <span className="text-2xs font-extrabold text-accent-cyan tracking-wider uppercase">
                              Question {idx + 1} • {q.type.replace('_', ' ')}
                            </span>
                            <h4 className="text-sm font-bold text-white mt-1 leading-snug">{q.question}</h4>
                            
                            {/* MCQ / TF Render Options */}
                            {(q.type === 'multiple_choice' || q.type === 'true_false') ? (
                              <div className="mt-3.5 space-y-2">
                                {q.options.map((option) => {
                                  const isSelected = selectedQuizAnswers[q.id] === option;
                                  
                                  let optionStyle = "border-card-border/60 hover:bg-slate-900/30 text-slate-300";
                                  if (isSelected) optionStyle = "border-accent-purple text-white bg-accent-purple/10";
                                  
                                  if (quizSubmitted) {
                                    if (option === q.correct_answer) {
                                      optionStyle = "border-emerald-500/60 bg-emerald-500/15 text-emerald-300";
                                    } else if (isSelected) {
                                      optionStyle = "border-rose-500/60 bg-rose-500/15 text-rose-300";
                                    } else {
                                      optionStyle = "border-card-border/20 text-slate-500 opacity-60";
                                    }
                                  }

                                  return (
                                    <button
                                      key={option}
                                      disabled={quizSubmitted}
                                      onClick={() => setSelectedQuizAnswers(prev => ({ ...prev, [q.id]: option }))}
                                      className={`w-full text-left px-4 py-2.5 rounded-xl border text-xs font-medium transition-all ${optionStyle} ${!quizSubmitted ? 'cursor-pointer' : 'cursor-default'}`}
                                    >
                                      {option}
                                    </button>
                                  );
                                })}
                              </div>
                            ) : (
                              // Short Answer Render Input
                              <div className="mt-3">
                                <input
                                  type="text"
                                  disabled={quizSubmitted}
                                  value={shortAnswersText[q.id] || ''}
                                  onChange={(e) => setShortAnswersText(prev => ({ ...prev, [q.id]: e.target.value }))}
                                  placeholder="Type your answer here..."
                                  className="w-full px-4 py-2.5 rounded-xl glass-input text-xs"
                                />
                                {quizSubmitted && (
                                  <div className="mt-2.5 text-xs text-slate-400">
                                    <span className="font-semibold text-emerald-400">Keyword citation required:</span> {q.correct_answer}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Explanation Card */}
                            {quizSubmitted && (
                              <div className="mt-4 border-t border-card-border/40 pt-3 text-2xs text-slate-400 leading-relaxed bg-slate-900/10 p-2.5 rounded-lg">
                                <span className="font-bold text-accent-purple uppercase block mb-1">Explanation</span>
                                {q.explanation}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Submit / Reset Actions */}
                    <div className="mt-6 flex justify-end gap-3 border-t border-card-border/40 pt-4">
                      {quizSubmitted ? (
                        <button
                          onClick={handleResetQuiz}
                          className="px-5 py-2.5 rounded-xl border border-card-border text-xs font-semibold text-slate-300 hover:text-white hover:border-slate-700 cursor-pointer"
                        >
                          Retry Quiz
                        </button>
                      ) : (
                        <button
                          onClick={handleSubmitQuiz}
                          className="glow-btn-purple text-white px-6 py-2.5 rounded-xl font-semibold text-xs cursor-pointer"
                        >
                          Submit Answers
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. CHAT ASSISTANT TAB */}
            {activeTab === 'chat' && (
              <div className="flex flex-col flex-grow animate-fade-in">
                {/* Scrollable messages area */}
                <div 
                  ref={chatScrollRef}
                  className="flex-grow max-h-[360px] overflow-y-auto mb-4 p-4 rounded-2xl bg-slate-900/30 border border-card-border space-y-4 text-left"
                >
                  {chatMessages.map((msg, i) => (
                    <div 
                      key={i} 
                      className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-accent-indigo text-white rounded-tr-sm shadow-md'
                          : 'bg-slate-900/60 border border-card-border text-slate-300 rounded-tl-sm'
                      }`}>
                        <MarkdownRenderer content={msg.message} />
                      </div>
                    </div>
                  ))}
                  {sendingChat && (
                    <div className="flex justify-start">
                      <div className="rounded-2xl p-3.5 bg-slate-900/60 border border-card-border text-slate-500 rounded-tl-sm flex items-center gap-1.5 text-xs">
                        <div className="flex gap-1 shrink-0">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce"></span>
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce delay-150"></span>
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-500 animate-bounce delay-300"></span>
                        </div>
                        Assistant is retrieving context...
                      </div>
                    </div>
                  )}
                </div>

                {/* Send chat form */}
                <form onSubmit={handleSendChat} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask a question about this video..."
                    className="flex-grow px-4 py-3.5 rounded-xl glass-input text-xs"
                    disabled={sendingChat}
                  />
                  <button
                    type="submit"
                    disabled={sendingChat || !chatInput.trim()}
                    className="glow-btn-purple text-white p-3.5 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-55 cursor-pointer"
                  >
                    <Send className="h-4 w-4" />
                  </button>
                </form>
              </div>
            )}

            {/* 5. REPURPOSE TAB */}
            {activeTab === 'repurpose' && (
              <div className="flex flex-col flex-grow text-left animate-fade-in">
                {loadingSocial ? (
                  <div className="flex flex-grow items-center justify-center py-20">
                    <div className="h-7 w-7 animate-spin rounded-full border-3 border-accent-purple border-t-transparent"></div>
                  </div>
                ) : (
                  <div className="flex flex-col flex-grow">
                    {/* Social platform selectors */}
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      {[
                        { id: 'linkedin', label: 'LinkedIn Post' },
                        { id: 'twitter', label: 'Twitter Thread' },
                        { id: 'blog', label: 'Blog Article' },
                        { id: 'instagram', label: 'Instagram Slides' }
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => setSocialType(item.id as any)}
                          className={`px-3 py-1.5 rounded-lg text-2xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            socialType === item.id
                              ? 'bg-accent-purple/20 text-accent-purple border border-accent-purple/40'
                              : 'bg-slate-900/60 text-slate-400 border border-card-border hover:text-slate-200'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {/* Social Text rendering container */}
                    <div className="relative flex-grow flex flex-col">
                      <div className="glass-panel p-5 rounded-2xl bg-slate-900/40 text-slate-300 text-sm leading-relaxed whitespace-pre-wrap flex-grow max-h-[380px] overflow-y-auto font-sans">
                        {socialType === 'blog' ? (
                          <MarkdownRenderer content={socialContent.blog} />
                        ) : (
                          socialContent[socialType] || 'Repurposed content could not be generated.'
                        )}
                      </div>
                      
                      {socialContent[socialType] && (
                        <div className="mt-4 flex justify-end">
                          <button
                            onClick={() => handleCopy(socialContent[socialType], 'social')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-card-border text-2xs font-semibold text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
                          >
                            {copiedText === 'social' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                            {copiedText === 'social' ? 'Copied' : `Copy ${socialType.toUpperCase()}`}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
            
          </div>
        </div>
      </div>
    </div>
  );
}
