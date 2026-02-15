'use client';

import { AlertTriangle, Zap, Loader2, Pizza, Salad, UtensilsCrossed, Apple, Beef, HeartCrack, X, Download, Share } from 'lucide-react';
import { useEffect, useState, useRef, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface MealDiagnosisResult {
  sermon: string;
  nickname: string;
  healthRisk: string;
  toxicityLevel: number;
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [splashDone, setSplashDone] = useState(false);
  const [meals, setMeals] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MealDiagnosisResult | null>(null);
  const [error, setError] = useState('');
  const [isStandalone, setIsStandalone] = useState(false);

  // PWA install states
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setMounted(true);

    // Check if running as standalone PWA
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || ('standalone' in window.navigator && (window.navigator as unknown as { standalone: boolean }).standalone);
    setIsStandalone(!!standalone);

    // Splash screen timer
    const splashTimer = setTimeout(() => setSplashDone(true), 1800);

    if (standalone) {
      return () => clearTimeout(splashTimer);
    }

    // Detect iOS Safari
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      const timer = setTimeout(() => setShowIOSGuide(true), 3000);
      return () => { clearTimeout(splashTimer); clearTimeout(timer); };
    }

    // Listen for beforeinstallprompt (Chrome/Edge/etc.)
    const handler = (e: Event) => {
      e.preventDefault();
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => { clearTimeout(splashTimer); window.removeEventListener('beforeinstallprompt', handler); };
  }, []);

  const handleInstallClick = useCallback(async () => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBanner(false);
    }
    deferredPromptRef.current = null;
  }, []);

  // Haptic feedback helper
  const haptic = useCallback((duration = 10) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  }, []);

  const toxicMessages = [
    "昨日、何食べたか覚えてる？",
    "栄養士が、あなたの食生活を診断します",
    "野菜、食べてないでしょ？",
    "揚げ物ばっかり食べてない？",
    "管理栄養士は見逃さない",
    "覚悟はいい？容赦しないから",
  ];

  const [currentMessage, setCurrentMessage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % toxicMessages.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [toxicMessages.length]);

  const handleDiagnose = async () => {
    if (!meals.trim()) {
      setError('昨日の献立を入力してください');
      return;
    }

    haptic(20);
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiBase}/api/diagnose-meal`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ meals }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '診断に失敗しました');
      }

      haptic(30);
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '診断に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  if (!mounted) return null;

  // ========== Splash Screen ==========
  if (!splashDone) {
    return (
      <div className="splash-screen fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
        <div className="splash-logo">
          <UtensilsCrossed className="w-20 h-20 text-orange-500" />
        </div>
        <h1 className="splash-title text-2xl font-bold text-orange-500 mt-6 tracking-wider">
          献立診断
        </h1>
        <p className="splash-subtitle text-xs text-orange-400/60 mt-2 font-mono">
          毒舌管理栄養士
        </p>
        <div className="mt-8">
          <div className="splash-loader w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full" />
        </div>
      </div>
    );
  }

  // ========== Main App Shell ==========
  return (
    <div className="app-shell fixed inset-0 bg-black flex flex-col overflow-hidden">
      {/* ===== Native Header Bar ===== */}
      <header className={`app-header shrink-0 bg-black/95 backdrop-blur-md border-b border-orange-500/30 z-40 ${isStandalone ? 'pt-[env(safe-area-inset-top)]' : ''}`}>
        <div className="flex items-center justify-center h-11 px-4 relative">
          <div className="flex items-center gap-2">
            <UtensilsCrossed className="w-4 h-4 text-orange-500" />
            <span className="text-sm font-bold text-orange-400 tracking-wide">献立診断</span>
          </div>
          {isStandalone && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            </div>
          )}
        </div>
      </header>

      {/* ===== Scrollable Content Area ===== */}
      <div className="app-content flex-1 overflow-y-auto overflow-x-hidden relative">
        {/* Scanline effect */}
        <div className="absolute inset-0 pointer-events-none z-30">
          <div className="absolute w-full h-32 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent animate-[scan_8s_linear_infinite]" />
        </div>

        {/* Grid background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="h-full w-full bg-[linear-gradient(to_right,#00ff8810_1px,transparent_1px),linear-gradient(to_bottom,#00ff8810_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        </div>

        {/* Main content */}
        <main className="relative z-10 flex flex-col items-center px-4 py-6 min-h-full">
          {/* Floating icons */}
          <div className="absolute top-8 left-8 float opacity-20">
            <Pizza className="w-8 h-8 text-orange-400" />
          </div>
          <div className="absolute top-16 right-16 float opacity-20" style={{ animationDelay: '1s' }}>
            <Beef className="w-10 h-10 text-red-400" />
          </div>
          <div className="absolute bottom-20 left-24 float opacity-20" style={{ animationDelay: '2s' }}>
            <Salad className="w-9 h-9 text-green-400" />
          </div>

          {/* Main title with glitch effect */}
          <div className="text-center space-y-2 mb-4 mt-2">
            <div className="relative inline-block">
              <UtensilsCrossed className="w-12 h-12 text-orange-500 mx-auto mb-1 animate-pulse" />
              <div className="absolute -inset-3 bg-orange-500/30 blur-lg animate-pulse" />
            </div>

            <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
              <span className="text-orange-500 inline-block drop-shadow-[0_0_15px_rgba(255,140,0,0.8)]">昨日の献立</span>
              <span className="text-neon-pink glitch inline-block text-3xl md:text-5xl ml-2">毒舌説教診断</span>
            </h1>

            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2 text-yellow-400 animate-pulse">
                <AlertTriangle className="w-4 h-4" />
                <p className="text-sm font-bold">管理栄養士が容赦なく説教</p>
                <AlertTriangle className="w-4 h-4" />
              </div>
              <p className="text-sm text-orange-300 font-bold">
                <span className="text-sm text-neon-cyan">昨日の食事から暴く健康リスク</span>
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-2 text-xs font-mono text-pink-400 mt-2">
              <span className="border border-orange-500/50 px-2 py-0.5 rounded bg-orange-500/10 text-[10px]">Claude AI</span>
              <span className="border border-red-500/50 px-2 py-0.5 rounded bg-red-500/10 text-[10px]">超・毒舌</span>
              <span className="border border-yellow-500/50 px-2 py-0.5 rounded bg-yellow-500/10 text-[10px]">容赦なし</span>
            </div>
          </div>

          {/* Rotating toxic messages */}
          {!result && (
            <div className="relative h-10 w-full max-w-2xl mb-4">
              <div className="absolute inset-0 flex items-center justify-center">
                {toxicMessages.map((message, index) => (
                  <p
                    key={index}
                    className={`absolute text-sm font-mono text-center px-4 transition-all duration-1000 ${
                      index === currentMessage
                        ? 'opacity-100 translate-y-0 text-neon-pink'
                        : 'opacity-0 translate-y-3'
                    }`}
                  >
                    &gt; {message}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Diagnosis Form */}
          {!result && (
            <div className="w-full max-w-2xl space-y-3 page-transition">
              <div className="relative">
                <div className="absolute inset-0 bg-orange-500/20 blur-xl animate-pulse" />
                <div className="relative bg-black/70 border-2 border-orange-500 rounded-2xl p-4 backdrop-blur-sm shadow-[0_0_20px_rgba(255,140,0,0.5)]">
                  <div className="flex items-center gap-2 mb-2 text-orange-400">
                    <Apple className="w-4 h-4 animate-pulse" />
                    <label className="font-bold text-xs">昨日食べたもの（朝・昼・晩）</label>
                  </div>
                  <textarea
                    value={meals}
                    onChange={(e) => setMeals(e.target.value)}
                    placeholder={"例：\n朝：菓子パン2個、缶コーヒー\n昼：カップラーメン、おにぎり\n晩：から揚げ弁当、ポテチ、ビール"}
                    className="w-full h-28 bg-black/50 text-orange-300 font-mono text-sm outline-none placeholder:text-orange-500/40 placeholder:font-normal border border-orange-500/30 rounded-xl p-3 resize-none"
                    disabled={loading}
                  />
                  <p className="text-[10px] text-orange-500/60 mt-1">※ 正直に書いてください。嘘は見抜きます。</p>
                </div>
              </div>

              <button
                onClick={handleDiagnose}
                disabled={loading}
                className="native-button group relative w-full px-5 py-3 bg-gradient-to-r from-orange-600 to-red-600 border-2 border-orange-400 text-white font-bold text-base rounded-2xl hover:from-orange-500 hover:to-red-500 transition-all duration-300 overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(255,140,0,0.6)]"
              >
                {loading ? (
                  <>
                    <Loader2 className="inline-block w-4 h-4 mr-2 animate-spin" />
                    <span className="relative z-10 text-sm">診断中... 栄養士が分析中</span>
                  </>
                ) : (
                  <>
                    <UtensilsCrossed className="inline-block w-4 h-4 mr-2 animate-pulse" />
                    <span className="relative z-10">毒舌診断を受ける</span>
                  </>
                )}
              </button>

              <p className="text-center text-[10px] text-gray-400 font-mono">
                ※ 耐性のない方、野菜嫌いな方はご遠慮ください
              </p>

              {error && (
                <div className="flex items-center gap-2 text-orange-300 font-bold text-xs border-2 border-orange-500 rounded-xl p-3 bg-orange-500/20 animate-pulse">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          )}

          {/* Diagnosis Result */}
          {result && (
            <div className="w-full max-w-4xl space-y-3 page-transition">
              {/* Header */}
              <div className="text-center mb-3">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Pizza className="w-5 h-5 text-orange-400" />
                  <h2 className="text-xl font-bold text-orange-400 font-mono">
                    診断完了
                  </h2>
                </div>
                <p className="text-yellow-400 font-mono text-xs">管理栄養士からの辛口メッセージ...</p>
              </div>

              {/* Nickname */}
              <div className="relative group">
                <div className="absolute inset-0 bg-orange-500/10 blur-lg" />
                <div className="relative bg-black/70 border-2 border-orange-500 rounded-2xl p-4 backdrop-blur-sm">
                  <h3 className="text-base font-bold text-orange-400 mb-1.5 flex items-center gap-2">
                    <Pizza className="w-4 h-4" />
                    あなたの二つ名
                  </h3>
                  <p className="text-orange-100 font-bold text-xl text-center py-2">
                    『{result.nickname}』
                  </p>
                </div>
              </div>

              {/* Sermon */}
              <div className="relative group">
                <div className="absolute inset-0 bg-red-500/10 blur-lg" />
                <div className="relative bg-black/70 border-2 border-red-500 rounded-2xl p-4 backdrop-blur-sm">
                  <h3 className="text-base font-bold text-red-400 mb-1.5 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    診断結果（説教）
                  </h3>
                  <p className="text-red-200 font-mono text-xs leading-relaxed">
                    {result.sermon}
                  </p>
                </div>
              </div>

              {/* Health Risk */}
              <div className="relative group">
                <div className="absolute inset-0 bg-purple-500/10 blur-lg" />
                <div className="relative bg-black/70 border-2 border-purple-500 rounded-2xl p-4 backdrop-blur-sm">
                  <h3 className="text-base font-bold text-purple-400 mb-1.5 flex items-center gap-2">
                    <HeartCrack className="w-4 h-4" />
                    10年後の健康リスク
                  </h3>
                  <p className="text-purple-200 font-mono text-xs leading-relaxed">
                    {result.healthRisk}
                  </p>
                </div>
              </div>

              {/* Toxicity Level */}
              <div className="relative group">
                <div className="absolute inset-0 bg-neon-pink/10 blur-lg" />
                <div className="relative bg-black/70 border-2 border-neon-pink rounded-2xl p-4 backdrop-blur-sm">
                  <h3 className="text-base font-bold text-neon-pink mb-1.5 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    毒性レベル
                  </h3>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-pink-200 font-mono text-sm">
                      <span>TOXICITY</span>
                      <span className="text-xl font-bold text-neon-pink">
                        {result.toxicityLevel}%
                      </span>
                    </div>
                    <div className="relative h-5 bg-black/50 rounded-full overflow-hidden border border-neon-pink/30">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-neon-pink to-red-600 transition-all duration-1000 ease-out"
                        style={{ width: `${result.toxicityLevel}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Reset Button */}
              <button
                onClick={() => {
                  haptic();
                  setResult(null);
                  setMeals('');
                }}
                className="native-button w-full px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 border-2 border-green-400 text-white font-bold text-sm rounded-2xl hover:from-green-500 hover:to-emerald-500 transition-all duration-300 shadow-[0_0_15px_rgba(34,197,94,0.5)]"
              >
                <Salad className="inline-block w-4 h-4 mr-2" />
                別の献立を診断する
              </button>

              {/* Bottom spacer for safe area */}
              <div className="h-6" />
            </div>
          )}
        </main>

        {/* Vignette effect */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,black_100%)] opacity-60 z-20" />
      </div>

      {/* ===== Bottom Safe Area Bar ===== */}
      {isStandalone && (
        <div className="shrink-0 bg-black/95 border-t border-orange-500/20 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-center h-6">
            <div className="w-32 h-1 bg-orange-500/30 rounded-full" />
          </div>
        </div>
      )}

      {/* PWA Install Banner (Chrome/Edge) */}
      {showInstallBanner && (
        <div className="install-banner fixed bottom-0 left-0 right-0 z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="max-w-md mx-auto bg-black/95 border-2 border-orange-500 rounded-2xl p-4 backdrop-blur-md shadow-[0_0_20px_rgba(255,140,0,0.4)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <Download className="w-8 h-8 text-orange-400 shrink-0" />
                <div>
                  <p className="text-orange-300 font-bold text-sm">アプリをインストール</p>
                  <p className="text-orange-400/70 text-xs mt-0.5">ホーム画面に追加してすぐ診断！</p>
                </div>
              </div>
              <button
                onClick={() => setShowInstallBanner(false)}
                className="text-orange-500/60 hover:text-orange-300 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <button
              onClick={handleInstallClick}
              className="native-button w-full mt-3 px-4 py-2.5 bg-gradient-to-r from-orange-600 to-red-600 border border-orange-400 text-white font-bold text-sm rounded-xl hover:from-orange-500 hover:to-red-500 transition-all shadow-[0_0_10px_rgba(255,140,0,0.4)]"
            >
              インストール
            </button>
          </div>
        </div>
      )}

      {/* iOS Install Guide */}
      {showIOSGuide && (
        <div className="install-banner fixed bottom-0 left-0 right-0 z-50 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="max-w-md mx-auto bg-black/95 border-2 border-orange-500 rounded-2xl p-4 backdrop-blur-md shadow-[0_0_20px_rgba(255,140,0,0.4)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 flex-1">
                <Share className="w-7 h-7 text-orange-400 shrink-0" />
                <div>
                  <p className="text-orange-300 font-bold text-sm">アプリとして使う</p>
                  <p className="text-orange-400/70 text-xs mt-1 leading-relaxed">
                    画面下の <span className="inline-block border border-orange-500/50 px-1 rounded text-orange-300">共有</span> ボタン →
                    「<span className="text-orange-300 font-bold">ホーム画面に追加</span>」をタップ
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="text-orange-500/60 hover:text-orange-300 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
