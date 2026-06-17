/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, Smile, BookOpen, BarChart3, User as UserIcon, Heart, LogOut, Menu, X, Sparkles, Award, Globe, Bell, Trophy
} from 'lucide-react';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import AIChat from './components/AIChat';
import MoodJournal from './components/MoodJournal';
import Analytics from './components/Analytics';
import Profile from './components/Profile';
import Meditation from './components/Meditation';
import Community from './components/Community';
import Notifications from './components/Notifications';
import WellnessScoreView from './components/WellnessScoreView';
import { Mood, MoodType, User } from './types';
import { Smartphone, Download, Info, Copy, Check, RefreshCw } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type ActiveView = 'landing' | 'login' | 'register' | 'dashboard' | 'chat' | 'journal' | 'analytics' | 'profile' | 'meditation' | 'community' | 'notifications' | 'wellness';

export default function App() {
  const [view, setView] = useState<ActiveView>('landing');
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [todayMood, setTodayMood] = useState<Mood | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Private developer URL redirect / CORS interception tracking
  const [privateUrlError, setPrivateUrlError] = useState(false);
  const [showWarningBanner, setShowWarningBanner] = useState(true);
  const [copiedShared, setCopiedShared] = useState(false);

  // Monitor deferred install prompt & standalone status
  useEffect(() => {
    const handleUrlError = () => {
      setPrivateUrlError(true);
      setShowWarningBanner(true);
    };
    window.addEventListener('private-url-error', handleUrlError);
    return () => {
      window.removeEventListener('private-url-error', handleUrlError);
    };
  }, []);

  const handleCopySharedLink = () => {
    const publicUrl = window.location.origin.replace('-dev-', '-pre-');
    navigator.clipboard.writeText(publicUrl);
    setCopiedShared(true);
    setTimeout(() => setCopiedShared(false), 2000);
  };

  // PWA states
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(() => {
    const closed = localStorage.getItem('pwa_banner_closed');
    return closed !== 'true';
  });
  const [showManualGuide, setShowManualGuide] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  // Monitor deferred install prompt & standalone status
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    setIsStandalone(!!checkStandalone);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Load token + user on launch
  useEffect(() => {
    const savedToken = localStorage.getItem('mind_mood_token');
    if (savedToken) {
      setToken(savedToken);
      fetchProfile(savedToken);
    }
  }, []);

  const fetchProfile = async (authToken: string) => {
    try {
      const res = await fetch('/api/auth/profile', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setView('dashboard');
        fetchTodayMood(authToken);
        fetchUnreadCount(authToken);
      } else {
        // Stale token
        handleClearAuth();
      }
    } catch (e) {
      console.error(e);
      // Fallback offline survival
      handleClearAuth();
    }
  };

  const fetchTodayMood = async (authToken: string) => {
    try {
      const res = await fetch('/api/mood/today', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTodayMood(data.mood);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUnreadCount = async (authToken: string) => {
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        const unreads = (data.notifications || []).filter((n: any) => !n.read).length;
        setUnreadCount(unreads);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAuthSuccess = (authToken: string, authUser: User) => {
    localStorage.setItem('mind_mood_token', authToken);
    setToken(authToken);
    setUser(authUser);
    setView('dashboard');
    fetchTodayMood(authToken);
    fetchUnreadCount(authToken);
  };

  const handleClearAuth = () => {
    localStorage.removeItem('mind_mood_token');
    setToken(null);
    setUser(null);
    setTodayMood(null);
    setView('landing');
  };

  const recordMood = async (moodType: MoodType, intensity: number, note: string) => {
    if (!token) return;
    try {
      const res = await fetch('/api/mood/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ moodType, intensity, note }),
      });
      if (res.ok) {
        const data = await res.json();
        setTodayMood(data.mood);
        if (data.user) {
          setUser(data.user); // Sync consecutive streak metrics
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTheme = () => {
    setIsDarkMode((prev) => !prev);
  };

  // Safe navigation switch
  const navigateTab = (targetTab: ActiveView) => {
    setView(targetTab);
    setIsMobileMenuOpen(false);
    if (token) {
      fetchUnreadCount(token);
    }
  };

  // Sidebar navigation definitions
  const tabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: Smile },
    { id: 'chat' as const, label: 'AI Support Chat', icon: Brain },
    { id: 'journal' as const, label: 'Mood Journal', icon: BookOpen },
    { id: 'analytics' as const, label: 'Analytics & Insights', icon: BarChart3 },
    { id: 'meditation' as const, label: 'Breathing Guide', icon: Heart },
    { id: 'community' as const, label: 'Community Plaza', icon: Globe },
    { id: 'wellness' as const, label: 'Wellness Core', icon: Trophy },
    { id: 'notifications' as const, label: 'Notifications Feed', icon: Bell },
    { id: 'profile' as const, label: 'Profile & Settings', icon: UserIcon },
  ];

  const renderWarningBanner = () => {
    if (!privateUrlError || !showWarningBanner) return null;
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-500 px-4 py-2.5 text-xs flex justify-between items-center gap-3 font-sans transition-all duration-300 w-full shrink-0" id="dev-url-warning-banner">
        <div className="flex items-center gap-2 max-w-4xl text-left">
          <span className="text-sm shrink-0">💡</span>
          <span className="leading-relaxed">
            <strong>Private link / static wrapper detected:</strong> Running securely in <strong>client-only sandbox database mode</strong>. Your data is stored locally in this browser. To sync live database of AI Studio across devices, please use the public Shared URL instead.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={handleCopySharedLink}
            className="px-2.5 py-1 bg-amber-500/15 hover:bg-amber-500/25 active:scale-95 text-[10px] font-bold rounded-lg transition text-amber-500 cursor-pointer border border-amber-500/20"
          >
            {copiedShared ? 'Copied Shared URL!' : 'Copy Shared URL'}
          </button>
          <button 
            onClick={() => setShowWarningBanner(false)}
            className="p-1 hover:bg-amber-500/15 rounded-md transition text-amber-500/80 cursor-pointer text-[10px] font-bold w-4 h-4 flex items-center justify-center border border-transparent hover:border-amber-500/20"
            title="Dismiss warning"
          >
            ✕
          </button>
        </div>
      </div>
    );
  };

  // Render Authentication and Landing page if unauthorized
  if (!token) {
    if (view === 'landing') {
      return (
        <div className="flex flex-col min-h-screen">
          {renderWarningBanner()}
          <div className="flex-1">
            <LandingPage 
              onGetStarted={() => setView('register')} 
              onLoginClick={() => setView('login')} 
            />
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col min-h-screen">
        {renderWarningBanner()}
        <div className="flex-1">
          <AuthPage 
            initialMode={view === 'register' ? 'register' : 'login'}
            onAuthSuccess={handleAuthSuccess}
            onBackToLanding={() => setView('landing')}
          />
        </div>
      </div>
    );
  }

  // Double guard check
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans text-slate-400">
        <span className="w-8 h-8 border-3 border-indigo-600/25 border-t-indigo-600 rounded-full animate-spin mr-3"></span>
        <span>Assembling secure emotional records...</span>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans flex flex-col transition-colors duration-300 ${
      isDarkMode ? 'bg-[#0f172a] text-[#f1f5f9]' : 'bg-[#f8fafc] text-[#1e293b]'
    }`} id="applet-body-shell">
      {renderWarningBanner()}
      
      <div className="flex flex-col md:flex-row flex-1">
        
        {/* 1. Large Screen Sidebar */}
      <aside className={`hidden md:flex flex-col w-64 p-6 border-r shrink-0 transition-colors duration-200 ${
        isDarkMode ? 'bg-[#1e293b]/90 border-slate-700/50' : 'bg-white border-slate-200/60'
      }`} id="desktop-sidebar">
        
        {/* Sidebar Header logotype */}
        <div className="flex items-center gap-2 mb-8">
          <div className="p-2.5 bg-gradient-to-tr from-violet-600 to-indigo-500 rounded-xl text-white">
            <Brain className="w-5 h-5 animate-pulse-slow" />
          </div>
          <span className="font-sans font-black text-lg tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Mind Mood AI
          </span>
        </div>

        {/* Navigation Link Stack */}
        <nav className="flex-1 space-y-1.5" id="sidebar-nav">
          {tabs.map((tab) => {
            const IconComp = tab.icon;
            const isSelected = view === tab.id;
            const isNotif = tab.id === 'notifications';
            return (
              <button
                key={tab.id}
                onClick={() => navigateTab(tab.id)}
                id={`lnk-${tab.id}`}
                className={`w-full px-4 py-3 rounded-2xl font-sans text-xs font-bold tracking-wide flex items-center justify-between transition cursor-pointer ${
                  isSelected 
                    ? 'bg-violet-600 text-white shadow-xs' 
                    : isDarkMode 
                      ? 'text-slate-400 hover:bg-slate-800 hover:text-white'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <div className="flex items-center gap-3.5">
                  <IconComp className="w-4.5 h-4.5 shrink-0" />
                  <span>{tab.label}</span>
                </div>
                {isNotif && unreadCount > 0 && (
                  <span className="bg-rose-500 text-white px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold">
                    {unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Mini Credentials card bottom of sidebar */}
        <div className={`mt-auto p-4 rounded-2xl flex items-center gap-3 border transition-colors ${
          isDarkMode ? 'bg-slate-800/50 border-slate-700/60' : 'bg-slate-50/50 border-slate-100'
        }`} id="user-badge">
          <div className="w-9 h-9 bg-violet-100 text-violet-700 rounded-lg flex items-center justify-center font-bold font-sans text-sm">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="truncate flex-1">
            <span id="user-display-name" className="block text-xs font-bold truncate leading-tight">{user.name}</span>
            <span className="text-[9px] text-[#22c55e] font-sans font-bold flex items-center gap-0.5 mt-0.5">
              <Award className="w-3.5 h-3.5 fill-[#22c55e]/15" /> Streak: {user.moodStreak || 0}d
            </span>
          </div>
          <button
            onClick={handleClearAuth}
            id="sidebar-signout-btn"
            title="Leave Wellness Space"
            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition cursor-pointer"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </aside>

      {/* 2. Mobile Header Bar & Collapse Triggers */}
      <header className={`md:hidden p-4 border-b flex items-center justify-between sticky top-0 z-50 transition-colors ${
        isDarkMode ? 'bg-[#1e293b] border-slate-700/40' : 'bg-white border-slate-150'
      }`} id="mobile-header">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-tr from-violet-600 to-indigo-500 rounded-lg text-white">
            <Brain className="w-4.5 h-4.5" />
          </div>
          <span className="font-sans font-extrabold text-sm tracking-tight bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Mind Mood AI
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            id="mobile-drawer-toggle"
            className="p-2 text-slate-500 hover:text-slate-800 focus:outline-hidden"
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Mobile Drawer menu list */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`md:hidden fixed top-[57px] left-0 w-full z-40 border-b p-4 shadow-lg space-y-1.5 transition-colors ${
              isDarkMode ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-slate-200'
            }`}
            id="mobile-navigation-drawer"
          >
            {tabs.map((tab) => {
              const IconComp = tab.icon;
              const isSelected = view === tab.id;
              const isNotif = tab.id === 'notifications';
              return (
                <button
                  key={tab.id}
                  onClick={() => navigateTab(tab.id)}
                  id={`m-lnk-${tab.id}`}
                  className={`w-full px-4 py-3 rounded-xl font-sans text-xs font-bold tracking-wide flex items-center justify-between transition cursor-pointer ${
                    isSelected 
                      ? 'bg-violet-600 text-white' 
                      : isDarkMode 
                        ? 'text-slate-400 hover:bg-slate-800'
                        : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <IconComp className="w-4 h-4 shrink-0" />
                    <span>{tab.label}</span>
                  </div>
                  {isNotif && unreadCount > 0 && (
                    <span className="bg-rose-500 text-white px-2 py-0.5 rounded-full text-[9px] font-mono font-bold mr-1">
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
            <div className="h-px bg-slate-100 my-3"></div>
            <button
              onClick={handleClearAuth}
              id="m-signout-btn"
              className="w-full px-4 py-3 rounded-xl font-sans text-xs font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-3.5 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Leave Wellness Space</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Main Workspace viewport */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto" id="applet-view-port">
        {/* Header bar stating current local streak status on top of workspace */}
        <div className="pb-6 mb-6 border-b border-slate-250 flex flex-wrap items-center justify-between gap-4" id="view-header">
          <div>
            <span className="text-[10px] font-mono font-bold text-violet-600 block uppercase tracking-wider">
              {view === 'dashboard' ? 'Daily check-in' : `Mind Mood / ${view}`}
            </span>
            <h1 className="font-sans font-black text-2xl text-slate-800 capitalize leading-none mt-1">
              {view === 'dashboard' ? 'Emotional Dashboard' 
                : view === 'chat' ? 'Empathetic Companion Chat' 
                : view === 'journal' ? 'Self-Reflective Journal' 
                : view === 'analytics' ? 'Trend Graphs & Reports' 
                : view === 'meditation' ? 'Guided Relaxation' 
                : view === 'community' ? 'Community Plaza'
                : view === 'wellness' ? 'Wellness Score Index'
                : view === 'notifications' ? 'Notifications Feed'
                : 'Profile Settings'}
            </h1>
          </div>
          
          {/* Calendar or status indicators */}
          <div className="flex items-center gap-2 bg-white/70 backdrop-blur-xs border border-slate-100/80 px-3.5 py-2 rounded-xl text-xs font-sans font-semibold text-slate-500" id="current-date">
            <span className="w-2.5 h-2.5 bg-[#22c55e] rounded-full animate-pulse"></span>
            <span>{new Date().toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</span>
          </div>
        </div>

        {/* PWA Direct Installation Assistant Banner */}
        {showInstallBanner && !isStandalone && (
          <div className={`mb-6 p-4 rounded-2xl border transition-all duration-300 ${
            isDarkMode 
              ? 'bg-slate-800/80 border-slate-700/80 text-slate-100' 
              : 'bg-[#6366f1]/5 border-[#6366f1]/15 text-indigo-950'
          }`} id="pwa-install-banner">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl shrink-0 ${isDarkMode ? 'bg-indigo-950/80 text-indigo-400' : 'bg-indigo-100/80 text-indigo-700'}`}>
                  <Smartphone className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight flex items-center gap-1.5">
                    Install Mind Mood AI on your Phone
                    <span className="bg-emerald-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider animate-bounce">PWA</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xl leading-relaxed">
                    Install this companion directly on your phone's home screen for seamless offline tracking, extremely fast loading times, and a full screen native app experience.
                  </p>
                  
                  {/* Action row */}
                  <div className="flex flex-wrap gap-2.5 mt-3">
                    {deferredPrompt ? (
                      <button
                        onClick={async () => {
                          deferredPrompt.prompt();
                          const choice = await deferredPrompt.userChoice;
                          if (choice.outcome === 'accepted') {
                            setDeferredPrompt(null);
                          }
                        }}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-sans font-bold text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                      >
                        <Download className="w-4 h-4" />
                        Install Automatically
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowManualGuide(!showManualGuide)}
                        className={`font-sans font-bold text-xs px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 transition cursor-pointer ${
                          isDarkMode 
                            ? 'bg-slate-705 bg-slate-700 hover:bg-slate-600 text-slate-200' 
                            : 'bg-white hover:bg-slate-100 border border-slate-200 text-slate-700'
                        }`}
                      >
                        <Info className="w-4 h-4 text-indigo-500" />
                        {showManualGuide ? 'Hide Guide' : 'How to Install on Mobile'}
                      </button>
                    )}
                    
                    {!deferredPrompt && (
                      <button
                        onClick={() => setShowManualGuide(!showManualGuide)}
                        className="text-xs text-indigo-600 hover:underline font-bold self-center px-1 py-1"
                      >
                        Learn more
                      </button>
                    )}
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  setShowInstallBanner(false);
                  localStorage.setItem('pwa_banner_closed', 'true');
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition shrink-0 cursor-pointer"
                title="Dismiss banner"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Step-by-step collapsible instructions */}
            {showManualGuide && (
              <div className={`mt-4 p-4 rounded-xl border border-dashed text-xs space-y-4 transition-all duration-300 ${
                isDarkMode ? 'bg-slate-900/60 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'
              }`}>
                {/* In-App Browser limitation explanation */}
                <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 p-3 rounded-lg flex gap-2.5 items-start">
                  <span className="text-base leading-none">⚠️</span>
                  <div>
                    <strong className="font-bold text-slate-800 dark:text-amber-300">Opening from WhatsApp or social media?</strong>
                    <p className="mt-0.5 leading-relaxed text-[11px]">
                      In-app browsers do not support downloading apps. To install this, copy your link and open it manually inside a real browser: <span className="font-semibold underline">Google Chrome</span> on Android or <span className="font-semibold underline">Safari</span> on iPhone.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Android Instruction Card */}
                  <div className="space-y-2">
                    <h4 className="font-bold flex items-center gap-1.5 text-slate-850 dark:text-white">
                      <span>🤖</span> Android Devices (Google Chrome)
                    </h4>
                    <ol className="list-decimal pl-4.5 space-y-1.5 text-slate-500 dark:text-slate-400 leading-relaxed">
                      <li>Copy your Shared App URL and open the <strong className="text-slate-700 dark:text-slate-300">Google Chrome</strong> browser.</li>
                      <li>Paste the URL and load the website.</li>
                      <li>Tap the Chrome menu button <strong className="text-slate-700 dark:text-slate-300">⋮ (three dots)</strong> in the top-right corner.</li>
                      <li>Select <strong className="text-indigo-600 dark:text-indigo-400">"Install app"</strong> or <strong className="text-indigo-600 dark:text-indigo-400">"Add to Home screen"</strong>.</li>
                    </ol>
                  </div>

                  {/* iOS Instruction Card */}
                  <div className="space-y-2">
                    <h4 className="font-bold flex items-center gap-1.5 text-slate-850 dark:text-white">
                      <span>🍏</span> iPhones & iPads (Apple Safari)
                    </h4>
                    <ol className="list-decimal pl-4.5 space-y-1.5 text-slate-500 dark:text-slate-400 leading-relaxed">
                      <li>Copy your Shared App URL and open the official <strong className="text-slate-700 dark:text-slate-300">Safari</strong> app.</li>
                      <li>Paste the URL and load the website.</li>
                      <li>Tap the <strong className="text-slate-700 dark:text-slate-300">Share</strong> icon (the square box with an arrow pointing up) in the bottom navigation.</li>
                      <li>Scroll down the list and select <strong className="text-indigo-600 dark:text-indigo-400">"Add to Home Screen"</strong>.</li>
                    </ol>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Custom Tab rendering */}
        <div id="subview-portal">
          {view === 'dashboard' && (
            <Dashboard 
              user={user} 
              todayMood={todayMood} 
              onRecordMood={recordMood} 
              onNavigate={navigateTab}
              token={token}
            />
          )}
          {view === 'chat' && <AIChat token={token} />}
          {view === 'journal' && <MoodJournal token={token} />}
          {view === 'analytics' && <Analytics token={token} />}
          {view === 'meditation' && <Meditation token={token} />}
          {view === 'community' && <Community token={token} />}
          {view === 'notifications' && <Notifications token={token} />}
          {view === 'wellness' && <WellnessScoreView token={token} onNavigate={navigateTab} />}
          {view === 'profile' && (
            <Profile 
              user={user} 
              token={token} 
              onLogout={handleClearAuth} 
              isDarkMode={isDarkMode} 
              onToggleTheme={handleToggleTheme}
            />
          )}
        </div>
      </main>
      </div>

      {/* 4. Mobile Bottom Navigation bar */}
      <nav className={`md:hidden fixed bottom-0 left-0 w-full border-t flex items-center justify-around py-2 z-30 transition-colors bg-white border-slate-150`} id="mobile-bottom-bar">
        {tabs.slice(0, 8).map((tab) => {
          const IconComp = tab.icon;
          const isSelected = view === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => navigateTab(tab.id)}
              id={`bn-${tab.id}`}
              className={`flex flex-col items-center p-1 rounded-xl cursor-pointer ${
                isSelected ? 'text-violet-600 font-extrabold' : 'text-slate-400'
              }`}
            >
              <IconComp className="w-4 h-4" />
              <span className="text-[8px] font-sans font-bold mt-0.5 max-w-[44px] truncate leading-none">
                {tab.id === 'dashboard' ? 'Home' : tab.id === 'chat' ? 'Chat' : tab.id === 'journal' ? 'Journal' : tab.id === 'analytics' ? 'Insights' : tab.id === 'meditation' ? 'Relax' : tab.id === 'community' ? 'Plaza' : tab.id === 'wellness' ? 'Core' : 'Alerts'}
              </span>
            </button>
          );
        })}
      </nav>

    </div>
  );
}
