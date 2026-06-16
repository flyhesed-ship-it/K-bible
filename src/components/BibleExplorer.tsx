import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BookOpen, 
  Search, 
  Sparkles, 
  Bookmark, 
  Highlighter, 
  ChevronLeft, 
  ChevronRight, 
  Type as FontIcon, 
  Check, 
  Trash2, 
  Share2, 
  Volume2, 
  Compass, 
  Menu, 
  X, 
  CheckCircle,
  HelpCircle,
  BookMarked
} from "lucide-react";
import { BIBLE_BOOKS } from "../data/bible-meta";
import { BibleBook, Verse, ChapterData } from "../types";

export default function BibleExplorer() {
  // Reading States
  const [selectedBook, setSelectedBook] = useState<BibleBook>(BIBLE_BOOKS[0]);
  const [selectedChapter, setSelectedChapter] = useState<number>(1);
  const [testamentFilter, setTestamentFilter] = useState<"all" | "old" | "new">("all");
  const [bookSearchQuery, setBookSearchQuery] = useState<string>("");
  
  // Loaded Chapter State
  const [versesDetail, setVersesDetail] = useState<ChapterData | null>(null);
  const [fetchingVerses, setFetchingVerses] = useState<boolean>(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Layout / Personalization Options
  const [fontSize, setFontSize] = useState<"sm" | "base" | "lg" | "xl" | "2xl">("lg");
  const [themeMode, setThemeMode] = useState<"ivory" | "sepia" | "dark">("ivory");
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);

  // Interactive Verses States (Persistent)
  const [bookmarks, setBookmarks] = useState<any[]>([]);
  const [highlights, setHighlights] = useState<{ [key: string]: string }>({}); // key format: book_chapter_verse -> color class
  const [selectedVerseForPanel, setSelectedVerseForPanel] = useState<Verse | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Meditation State
  const [meditation, setMeditation] = useState<string>("");
  const [loadingMeditation, setLoadingMeditation] = useState<boolean>(false);
  
  // Search Overlay State
  const [activeTab, setActiveTab] = useState<"read" | "search" | "bookmarks">("read");
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>("");
  const [globalSearchResults, setGlobalSearchResults] = useState<any[]>([]);
  const [searchingGlobal, setSearchingGlobal] = useState<boolean>(false);

  // Daily Verse (randomized / date-based)
  const [dailyVerse, setDailyVerse] = useState<any>(null);

  // Load Initial Persistent State
  useEffect(() => {
    try {
      const persistedBookmarks = localStorage.getItem("bible_bookmarks_v1");
      if (persistedBookmarks) setBookmarks(JSON.parse(persistedBookmarks));

      const persistedHighlights = localStorage.getItem("bible_highlights_v1");
      if (persistedHighlights) setHighlights(JSON.parse(persistedHighlights));

      // Theme
      const persistedTheme = localStorage.getItem("bible_theme_v1");
      if (persistedTheme) setThemeMode(persistedTheme as any);

      // Font size
      const persistedSize = localStorage.getItem("bible_fontsize_v1");
      if (persistedSize) setFontSize(persistedSize as any);
    } catch (e) {
      console.error("Failed to load local storage state", e);
    }

    // Set a static beautiful Daily Verse
    const dailyVersesList = [
      { book: "시편", chapter: 23, verse: 1, text: "여호와는 나의 목자시니 내게 부족함이 없으리로다." },
      { book: "이사야", chapter: 41, verse: 10, text: "두려워하지 말라 내가 너와 함께 함이라 놀라지 말라 나는 네 하나님이 됨이라 내가 너를 굳세게 하리라 참으로 너를 도와 주리라 참으로 나의 의로운 오른손으로 너를 붙들리라." },
      { book: "빌립보서", chapter: 4, verse: 13, text: "내게 능력 주시는 자 안에서 내가 모든 것을 할 수 있느니라." },
      { book: "요한복음", chapter: 3, verse: 16, text: "하나님이 세상을 이처럼 사랑하사 독생자를 주셨으니 이는 그를 믿는 자마다 멸망하지 않고 영생을 얻게 하려 하심이라." },
      { book: "로마서", chapter: 8, verse: 28, text: "우리가 알거니와 하나님을 사랑하는 자 곧 그의 뜻대로 부르심을 입은 자들에게는 모든 것이 합력하여 선을 이루느니라." },
      { book: "데살로니가전서", chapter: 5, verse: 16, text: "항상 기뻐하라 쉬지 말고 기도하라 범사에 감사하라 이것이 그리스도 예수 안에서 너희를 향하신 하나님의 뜻이니라." }
    ];
    const todayIndex = new Date().getDate() % dailyVersesList.length;
    setDailyVerse(dailyVersesList[todayIndex]);
  }, []);

  // Save Bookmarks to localStorage
  const saveBookmarks = (newBookmarks: any[]) => {
    setBookmarks(newBookmarks);
    localStorage.setItem("bible_bookmarks_v1", JSON.stringify(newBookmarks));
  };

  // Save Highlights to localStorage
  const saveHighlights = (newHighlights: { [key: string]: string }) => {
    setHighlights(newHighlights);
    localStorage.setItem("bible_highlights_v1", JSON.stringify(newHighlights));
  };

  // Toast Helper
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Load Bible Verses from Server API
  useEffect(() => {
    let active = true;
    const fetchVerses = async () => {
      setFetchingVerses(true);
      setFetchError(null);
      setVersesDetail(null);
      setMeditation(""); // Clear old meditation when chapter changes

      try {
        const response = await fetch(`/api/bible/${encodeURIComponent(selectedBook.name)}/${selectedChapter}`);
        if (!response.ok) {
          throw new Error("성경 말씀을 받아오는 중 서버 오류가 발생했습니다.");
        }
        const data = await response.json();
        if (active) {
          setVersesDetail(data);
        }
      } catch (err: any) {
        console.error("Fetch Error:", err);
        if (active) {
          setFetchError(err.message || "알 수 없는 전송 실패가 일어났습니다.");
        }
      } finally {
        if (active) {
          setFetchingVerses(false);
        }
      }
    };

    fetchVerses();
    return () => {
      active = false;
    };
  }, [selectedBook, selectedChapter]);

  // AI-powered Meditation Fetch
  const handleMeditationLoad = async () => {
    if (!versesDetail) return;
    setLoadingMeditation(true);
    setMeditation("");

    try {
      const response = await fetch("/api/bible/meditate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookName: selectedBook.name,
          chapter: selectedChapter,
          verses: versesDetail.verses
        })
      });
      if (!response.ok) throw new Error("서버에서 말씀 묵상을 불러오지 못했습니다.");
      const data = await response.json();
      setMeditation(data.meditation);
    } catch (err: any) {
      console.error(err);
      setMeditation("### 묵상 로드 오류\n\n죄송합니다. 실시간 말씀 묵상을 가져오는 도중 네트워크 통신 에러가 생겼습니다.");
    } finally {
      setLoadingMeditation(false);
    }
  };

  // AISearch Topic / Free Search
  const handleGlobalSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalSearchQuery.trim()) return;

    setSearchingGlobal(true);
    setGlobalSearchResults([]);

    try {
      const response = await fetch("/api/bible/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: globalSearchQuery })
      });
      if (!response.ok) throw new Error("검색 오류가 발생했습니다.");
      const data = await response.json();
      setGlobalSearchResults(data.results || []);
    } catch (err) {
      console.error(err);
      triggerToast("실시간 검색 중 오류가 발생했습니다.");
    } finally {
      setSearchingGlobal(false);
    }
  };

  // Chapter Navigation Helpers
  const handlePrevChapter = () => {
    if (selectedChapter > 1) {
      setSelectedChapter(selectedChapter - 1);
    } else {
      // Find previous book
      const currentIdx = BIBLE_BOOKS.findIndex(b => b.id === selectedBook.id);
      if (currentIdx > 0) {
        const prevBook = BIBLE_BOOKS[currentIdx - 1];
        setSelectedBook(prevBook);
        setSelectedChapter(prevBook.chapterCount);
      } else {
        triggerToast("첫 장입니다.");
      }
    }
    setSelectedVerseForPanel(null);
  };

  const handleNextChapter = () => {
    if (selectedChapter < selectedBook.chapterCount) {
      setSelectedChapter(selectedChapter + 1);
    } else {
      // Find next book
      const currentIdx = BIBLE_BOOKS.findIndex(b => b.id === selectedBook.id);
      if (currentIdx < BIBLE_BOOKS.length - 1) {
        const nextBook = BIBLE_BOOKS[currentIdx + 1];
        setSelectedBook(nextBook);
        setSelectedChapter(1);
      } else {
        triggerToast("마지막 장입니다.");
      }
    }
    setSelectedVerseForPanel(null);
  };

  // Highlight action
  const applyHighlight = (color: string) => {
    if (!selectedVerseForPanel) return;
    const key = `${selectedBook.id}_${selectedChapter}_${selectedVerseForPanel.verse}`;
    const newHighlights = { ...highlights };
    
    if (color === "clear") {
      delete newHighlights[key];
      triggerToast("형광펜 표시가 지워졌습니다.");
    } else {
      newHighlights[key] = color;
      triggerToast("구절에 형광펜을 칠했습니다.");
    }
    
    saveHighlights(newHighlights);
    setSelectedVerseForPanel(null);
  };

  // Toggle bookmark action
  const toggleBookmark = (verseObj: Verse) => {
    const key = `${selectedBook.name} ${selectedChapter}:${verseObj.verse}`;
    const exists = bookmarks.find(b => b.key === key);

    if (exists) {
      const filtered = bookmarks.filter(b => b.key !== key);
      saveBookmarks(filtered);
      triggerToast("북마크를 해제했습니다.");
    } else {
      const newB = [
        ...bookmarks,
        {
          key,
          bookName: selectedBook.name,
          bookId: selectedBook.id,
          chapter: selectedChapter,
          verse: verseObj.verse,
          text: verseObj.text,
          date: new Date().toLocaleDateString("ko-KR")
        }
      ];
      saveBookmarks(newB);
      triggerToast("북마크에 저장되었습니다.");
    }
    setSelectedVerseForPanel(null);
  };

  const removeBookmarkByKey = (key: string) => {
    const filtered = bookmarks.filter(b => b.key !== key);
    saveBookmarks(filtered);
    triggerToast("북마크를 해제했습니다.");
  };

  // Navigate directly via Search Result or Bookmark
  const navigateToScripture = (bookName: string, chapter: number) => {
    const matchedBook = BIBLE_BOOKS.find(b => b.name === bookName || b.englishName === bookName);
    if (matchedBook) {
      setSelectedBook(matchedBook);
      setSelectedChapter(Math.min(chapter, matchedBook.chapterCount));
      setActiveTab("read");
      // Scroll to top
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      triggerToast("해당 성경 책을 찾을 수 없습니다.");
    }
  };

  // Font sizing Tailwind classes mapping
  const getFontSizeClass = () => {
    switch (fontSize) {
      case "sm": return "text-sm leading-relaxed";
      case "base": return "text-base leading-relaxed";
      case "lg": return "text-lg leading-relaxed md:text-xl md:leading-loose";
      case "xl": return "text-xl leading-loose md:text-2xl md:leading-loose";
      case "2xl": return "text-2xl leading-loose md:text-3xl md:leading-loose";
    }
  };

  // Filter books list
  const filteredBooks = BIBLE_BOOKS.filter(book => {
    const matchesSearch = 
      book.name.includes(bookSearchQuery) || 
      book.englishName.toLowerCase().includes(bookSearchQuery.toLowerCase()) ||
      book.abbreviation.includes(bookSearchQuery);
      
    if (testamentFilter === "all") return matchesSearch;
    return matchesSearch && book.testament === testamentFilter;
  });

  // Highlight colors configuration
  const highlightColors = [
    { name: "노랑", bgClass: "bg-yellow-200/80 dark:bg-yellow-950/70 border-b border-yellow-400 text-yellow-950 dark:text-yellow-100", dotClass: "bg-yellow-300" },
    { name: "초록", bgClass: "bg-green-200/80 dark:bg-green-950/70 border-b border-green-400 text-green-950 dark:text-green-100", dotClass: "bg-green-300" },
    { name: "분홍", bgClass: "bg-pink-200/80 dark:bg-pink-950/70 border-b border-pink-400 text-pink-950 dark:text-pink-100", dotClass: "bg-pink-300" },
    { name: "하늘", bgClass: "bg-blue-200/80 dark:bg-blue-950/70 border-b border-blue-400 text-blue-950 dark:text-blue-100", dotClass: "bg-blue-300" }
  ];

  const bgClass = 
    themeMode === "dark" 
      ? "bg-zinc-950 text-zinc-100" 
      : themeMode === "sepia" 
        ? "bg-[#faf6ed] text-[#433422]" 
        : "bg-brand-bg text-brand-charcoal";

  const borderClass = 
    themeMode === "dark" 
      ? "border-zinc-800" 
      : themeMode === "sepia" 
        ? "border-[#ebdcc5]" 
        : "border-brand-border";

  const sidebarBgClass = 
    themeMode === "dark" 
      ? "bg-zinc-900/50" 
      : themeMode === "sepia" 
        ? "bg-[#faf6ed]" 
        : "bg-brand-sidebar";

  const activeBgClass = 
    themeMode === "dark" 
      ? "bg-zinc-800 text-white border-l-4 border-amber-500" 
      : themeMode === "sepia" 
        ? "bg-[#ebdcc5] text-[#433422] border-l-4 border-amber-700" 
        : "bg-brand-active text-brand-offblack border-l-4 border-brand-gold";

  const accentTextClass = 
    themeMode === "dark" 
      ? "text-amber-500" 
      : themeMode === "sepia" 
        ? "text-amber-700" 
        : "text-brand-gold";

  const accentBgClass = 
    themeMode === "dark" 
      ? "bg-amber-600 hover:bg-amber-700" 
      : themeMode === "sepia" 
        ? "bg-[#8C7851]/80 hover:bg-[#8C7851]" 
        : "bg-brand-gold hover:bg-[#766340]";

  return (
    <div className={`min-h-screen transition-all duration-300 flex flex-col font-sans ${bgClass}`}>
      
      {/* Toast Alert */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-24 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-sm border shadow-sm text-xs font-semibold uppercase tracking-widest flex items-center space-x-2 transition-all ${
              themeMode === "dark"
                ? "bg-zinc-900 border-zinc-800 text-white"
                : "bg-white border-brand-border text-brand-offblack"
            }`}
          >
            <CheckCircle className="w-3.5 h-3.5 text-brand-gold" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Primary Header */}
      <header className={`sticky top-0 z-40 border-b flex items-center transition-all h-20 ${
        themeMode === "dark" 
          ? "border-zinc-800 bg-zinc-950/90" 
          : themeMode === "sepia"
            ? "border-[#ebdcc5] bg-[#faf6ed]/90"
            : "border-brand-border bg-white"
      }`}>
        <div className="max-w-7xl w-full mx-auto px-6 md:px-10 flex items-center justify-between h-full">
          <div className="flex items-center space-x-3">
            <button 
              id="sidebar-toggle-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-2 rounded-sm transition-colors border ${borderClass} hover:bg-black/5 dark:hover:bg-white/5`}
              title="성경 목록 보기"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 border-2 border-brand-gold flex items-center justify-center rotate-45 shrink-0 select-none">
                <span className="-rotate-45 font-bold text-brand-gold text-lg">†</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg md:text-xl tracking-widest uppercase font-serif leading-none">Holy Bible</span>
                <span className="text-[10px] md:text-xs tracking-normal opacity-60 font-semibold font-sans leading-none mt-1">개역개정 성경</span>
              </div>
            </div>
          </div>

          {/* Quick Tabs: Reading, Topical AI Search, Saved Passages */}
          <nav className="hidden sm:flex gap-8 text-sm font-sans uppercase tracking-widest font-semibold">
            <button
              id="tab-read"
              onClick={() => setActiveTab("read")}
              className={`pb-1 transition-all ${
                activeTab === "read" 
                  ? "border-b-2 border-brand-gold text-brand-gold font-bold" 
                  : "opacity-45 hover:opacity-100"
              }`}
            >
              Study
            </button>
            <button
              id="tab-search"
              onClick={() => setActiveTab("search")}
              className={`pb-1 transition-all ${
                activeTab === "search" 
                  ? "border-b-2 border-brand-gold text-brand-gold font-bold" 
                  : "opacity-45 hover:opacity-100"
              }`}
            >
              Search
            </button>
            <button
              id="tab-bookmarks"
              onClick={() => setActiveTab("bookmarks")}
              className={`pb-1 transition-all ${
                activeTab === "bookmarks" 
                  ? "border-b-2 border-brand-gold text-brand-gold font-bold" 
                  : "opacity-45 hover:opacity-100"
              }`}
            >
              Bookmark ({bookmarks.length})
            </button>
          </nav>

          {/* Comfort Styling Selector */}
          <div className="flex items-center space-x-3">
            {/* Visual Presets */}
            <div className={`flex items-center space-x-1.5 border p-1 rounded-sm ${borderClass} bg-white/40 dark:bg-black/20`}>
              <button
                id="preset-ivory"
                onClick={() => { setThemeMode("ivory"); localStorage.setItem("bible_theme_v1", "ivory"); }}
                className={`w-5 h-5 rounded-sm bg-brand-bg border transition-all ${
                  themeMode === "ivory" ? "ring-2 ring-brand-gold border-transparent scale-105" : "border-brand-border"
                }`}
                title="밝게"
              />
              <button
                id="preset-sepia"
                onClick={() => { setThemeMode("sepia"); localStorage.setItem("bible_theme_v1", "sepia"); }}
                className={`w-5 h-5 rounded-sm bg-[#faf6ed] border transition-all ${
                  themeMode === "sepia" ? "ring-2 ring-amber-700 border-transparent scale-105" : "border-[#ebdcc5]"
                }`}
                title="구풍 (세피아)"
              />
              <button
                id="preset-dark"
                onClick={() => { setThemeMode("dark"); localStorage.setItem("bible_theme_v1", "dark"); }}
                className={`w-5 h-5 rounded-sm bg-zinc-900 border transition-all ${
                  themeMode === "dark" ? "ring-1 ring-amber-500 border-zinc-700 scale-105" : "border-[#ebdcc5]/20"
                }`}
                title="어둡게"
              />
            </div>

            {/* Font Scaler */}
            <div className={`flex items-center space-x-1 border p-1 rounded-sm ${borderClass} bg-white/40 dark:bg-black/20 font-sans`}>
              <button
                id="font-decrease"
                onClick={() => {
                  const sizes: ("sm" | "base" | "lg" | "xl" | "2xl")[] = ["sm", "base", "lg", "xl", "2xl"];
                  const curIdx = sizes.indexOf(fontSize);
                  if (curIdx > 0) {
                    setFontSize(sizes[curIdx - 1]);
                    localStorage.setItem("bible_fontsize_v1", sizes[curIdx - 1]);
                  }
                }}
                className={`p-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-30`}
                disabled={fontSize === "sm"}
                title="글씨 축소"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider">A-</span>
              </button>
              <button
                id="font-increase"
                onClick={() => {
                  const sizes: ("sm" | "base" | "lg" | "xl" | "2xl")[] = ["sm", "base", "lg", "xl", "2xl"];
                  const curIdx = sizes.indexOf(fontSize);
                  if (curIdx < sizes.length - 1) {
                    setFontSize(sizes[curIdx + 1]);
                    localStorage.setItem("bible_fontsize_v1", sizes[curIdx + 1]);
                  }
                }}
                className={`p-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-30`}
                disabled={fontSize === "2xl"}
                title="글씨 확대"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider">A+</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Subtabs */}
        <div className={`sm:hidden grid grid-cols-3 border-t p-1 text-center bg-white/40 dark:bg-zinc-950/20 ${borderClass}`}>
          <button
            onClick={() => setActiveTab("read")}
            className={`py-2 text-xs font-bold transition-all ${
              activeTab === "read" ? "text-brand-gold underline underline-offset-4 font-bold" : "opacity-60"
            }`}
          >
            Study
          </button>
          <button
            onClick={() => setActiveTab("search")}
            className={`py-2 text-xs font-bold transition-all ${
              activeTab === "search" ? "text-brand-gold underline underline-offset-4 font-bold" : "opacity-60"
            }`}
          >
            Search
          </button>
          <button
            onClick={() => setActiveTab("bookmarks")}
            className={`py-2 text-xs font-bold transition-all ${
              activeTab === "bookmarks" ? "text-brand-gold underline underline-offset-4 font-bold" : "opacity-60"
            }`}
          >
            Bookmark
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row relative">
        
        {/* SIDEBAR: Books & Testament Catalog */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "288px", opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className={`shrink-0 overflow-hidden border-r flex flex-col transition-all h-[calc(100vh-5rem)] md:sticky md:top-20 z-30 ${
                themeMode === "dark" 
                  ? "border-zinc-800 bg-zinc-950 text-zinc-300" 
                  : themeMode === "sepia"
                    ? "border-[#ebdcc5] bg-[#faf6ed] text-[#5c4a35]"
                    : "border-brand-border bg-brand-sidebar text-brand-charcoal"
              }`}
            >
              <div className={`p-4 border-b space-y-3 shrink-0 bg-black/5 dark:bg-white/5 ${borderClass}`}>
                {/* Search in Books */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-brand-gold">
                    <Search className="w-3.5 h-3.5" />
                  </span>
                  <input
                    id="book-catalog-search"
                    type="text"
                    value={bookSearchQuery}
                    onChange={(e) => setBookSearchQuery(e.target.value)}
                    placeholder="성경 검색 (예: 창세기, 마태)"
                    className={`w-full text-xs pl-9 pr-8 py-2 border rounded-sm focus:outline-none focus:ring-1 focus:ring-brand-gold bg-white dark:bg-zinc-900 dark:text-white ${borderClass}`}
                  />
                  {bookSearchQuery && (
                    <button 
                      onClick={() => setBookSearchQuery("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Filter Old vs New */}
                <div className="grid grid-cols-3 gap-[1px] p-[2px] bg-brand-border dark:bg-zinc-800 rounded-sm">
                  <button
                    id="filter-all"
                    onClick={() => setTestamentFilter("all")}
                    className={`text-[10px] py-1.5 rounded-sm font-bold uppercase tracking-widest transition-all ${
                      testamentFilter === "all" 
                        ? "bg-[#8C7851] text-white" 
                        : "opacity-60 hover:opacity-100 bg-transparent text-current"
                    }`}
                  >
                    All
                  </button>
                  <button
                    id="filter-old"
                    onClick={() => setTestamentFilter("old")}
                    className={`text-[10px] py-1.5 rounded-sm font-bold uppercase tracking-widest transition-all ${
                      testamentFilter === "old" 
                        ? "bg-[#8C7851] text-white" 
                        : "opacity-60 hover:opacity-100 bg-transparent text-current"
                    }`}
                  >
                    구약
                  </button>
                  <button
                    id="filter-new"
                    onClick={() => setTestamentFilter("new")}
                    className={`text-[10px] py-1.5 rounded-sm font-bold uppercase tracking-widest transition-all ${
                      testamentFilter === "new" 
                        ? "bg-[#8C7851] text-white" 
                        : "opacity-60 hover:opacity-100 bg-transparent text-current"
                    }`}
                  >
                    신약
                  </button>
                </div>
              </div>

              {/* List of Books */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 font-serif">
                {/* Old Testament */}
                {(testamentFilter === "all" || testamentFilter === "old") && (
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-sans font-bold text-brand-gold tracking-[0.2em] uppercase px-1">구약성경 (Old Testament)</h3>
                    <div className="grid grid-cols-2 gap-1.5">
                      {filteredBooks.filter(b => b.testament === "old").map(book => {
                        const isCurrentBook = selectedBook.id === book.id;
                        return (
                          <button
                            key={book.id}
                            onClick={() => {
                              setSelectedBook(book);
                              setSelectedChapter(1);
                            }}
                            className={`text-left text-xs px-2.5 py-1.5 rounded-sm border transition-all flex items-center justify-between ${
                              isCurrentBook 
                                ? "bg-[#8C7851] text-white border-transparent font-bold" 
                                : `bg-white/40 dark:bg-black/10 border-transparent hover:border-brand-gold/45 hover:bg-white/60 text-current`
                            }`}
                          >
                            <span className="truncate">{book.name}</span>
                            <span className={`text-[9px] font-sans font-semibold shrink-0 ml-1 opacity-70 ${isCurrentBook ? 'text-white' : 'text-brand-gold'}`}>
                              {book.abbreviation}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* New Testament */}
                {(testamentFilter === "all" || testamentFilter === "new") && (
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-sans font-bold text-brand-gold tracking-[0.2em] uppercase px-1">신약성경 (New Testament)</h3>
                    <div className="grid grid-cols-2 gap-1.5">
                      {filteredBooks.filter(b => b.testament === "new").map(book => {
                        const isCurrentBook = selectedBook.id === book.id;
                        return (
                          <button
                            key={book.id}
                            onClick={() => {
                              setSelectedBook(book);
                              setSelectedChapter(1);
                            }}
                            className={`text-left text-xs px-2.5 py-1.5 rounded-sm border transition-all flex items-center justify-between ${
                              isCurrentBook 
                                ? "bg-[#8C7851] text-white border-transparent font-bold" 
                                : `bg-white/40 dark:bg-black/10 border-transparent hover:border-brand-gold/45 hover:bg-white/60 text-current`
                            }`}
                          >
                            <span className="truncate">{book.name}</span>
                            <span className={`text-[9px] font-sans font-semibold shrink-0 ml-1 opacity-70 ${isCurrentBook ? 'text-white' : 'text-brand-gold'}`}>
                              {book.abbreviation}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {filteredBooks.length === 0 && (
                  <div className="text-center py-8 text-stone-400 font-sans text-xs">
                    목록 검색 결과가 없습니다.
                  </div>
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* CONTROLLER SECTION & MAIN CONTENT CONTAINER */}
        <main className="flex-1 flex flex-col min-w-0">
          
          {/* Active Tab rendering */}
          {activeTab === "read" && (
            <div className="flex-1 flex flex-col lg:flex-row">
              
              {/* PRIMARY READ VIEW AND NAVIGATION */}
              <div className="flex-1 p-4 md:p-8 space-y-6 flex flex-col justify-between">
                
                <div className="space-y-6">
                  {/* Book & Chapter Navigation Header */}
                  <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b ${borderClass}`}>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] font-sans font-bold tracking-[0.25em] uppercase px-2 py-0.5 border ${
                          selectedBook.testament === "old" 
                            ? "border-[#8C7851]/30 text-[#8C7851]" 
                            : "border-[#8C7851]/35 text-teal-800 dark:text-teal-400"
                        }`}>
                          {selectedBook.testament === "old" ? "구약 (Old)" : "신약 (New)"}
                        </span>
                        <span className="text-xs font-sans tracking-widest text-stone-500 font-bold uppercase">{selectedBook.englishName}</span>
                      </div>
                      <h2 className="text-3xl font-bold tracking-widest font-serif text-brand-gold dark:text-brand-gold">
                        {selectedBook.name} <span className="font-sans font-medium text-2xl">{selectedChapter}</span>장
                      </h2>
                    </div>

                    {/* Chapter selector list inside secondary top tab */}
                    <div className="flex items-center space-x-2 font-sans text-xs">
                      <button 
                        onClick={handlePrevChapter}
                        className={`p-2 border rounded-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${borderClass}`}
                        title="이전 장"
                      >
                        <ChevronLeft className="w-4 h-4 text-brand-gold" />
                      </button>

                      {/* Select Chapter Dropdown */}
                      <div className="relative">
                        <select
                          id="chapter-dropdown"
                          value={selectedChapter}
                          onChange={(e) => {
                            setSelectedChapter(parseInt(e.target.value, 10));
                            setSelectedVerseForPanel(null);
                          }}
                          className={`appearance-none py-2 pl-4 pr-10 border rounded-sm font-bold tracking-wider uppercase bg-white dark:bg-zinc-900 text-black dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-brand-gold ${borderClass}`}
                        >
                          {Array.from({ length: selectedBook.chapterCount }, (_, i) => i + 1).map(num => (
                            <option key={num} value={num}>
                              Chapter {num.toString().padStart(2, "0")}
                            </option>
                          ))}
                        </select>
                        <span className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-brand-gold">
                          ▼
                        </span>
                      </div>

                      <button 
                        onClick={handleNextChapter}
                        className={`p-2 border rounded-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors ${borderClass}`}
                        title="다음 장"
                      >
                        <ChevronRight className="w-4 h-4 text-brand-gold" />
                      </button>
                    </div>
                  </div>

                  {/* LOADING STATE OR SCRIPTURE TEXT */}
                  {fetchingVerses ? (
                    <div className="py-24 text-center space-y-4">
                      <div className="w-10 h-10 border-2 border-brand-gold border-t-transparent animate-spin mx-auto rotate-45" />
                      <p className="text-stone-400 font-medium font-sans text-xs uppercase tracking-widest">Loading Scripture...</p>
                    </div>
                  ) : fetchError ? (
                    <div className={`py-20 text-center space-y-4 border rounded-sm p-6 bg-red-50/10 dark:bg-red-950/10 ${borderClass}`}>
                      <span className="text-red-500 font-bold block text-sm uppercase tracking-widest font-sans">Scripture Error</span>
                      <p className="text-stone-500 text-xs font-sans">{fetchError}</p>
                      <button 
                        onClick={() => setSelectedChapter(selectedChapter)}
                        className="px-4 py-2 bg-brand-gold hover:bg-[#766340] text-white rounded-sm text-xs font-bold tracking-widest uppercase shadow transition"
                      >
                        Retry
                      </button>
                    </div>
                  ) : versesDetail ? (
                    <div className={`bible-text selection:bg-brand-gold/25 relative ${getFontSizeClass()}`}>
                      
                      {/* Chapter separator visual line from Geometric Balance theme */}
                      <div className={`flex items-center gap-4 mb-10 opacity-30 ${accentTextClass}`}>
                        <div className="h-[1px] flex-1 bg-current"></div>
                        <span className="text-xs font-sans font-bold tracking-[0.3em] uppercase">
                          Chapter {selectedChapter.toString().padStart(2, "0")}
                        </span>
                        <div className="h-[1px] flex-1 bg-current"></div>
                      </div>

                      <div className="flex flex-col gap-8 md:gap-10 font-serif">
                        {versesDetail.verses.map((v) => {
                          const verseKey = `${selectedBook.id}_${selectedChapter}_${v.verse}`;
                          const customHighlight = highlights[verseKey];
                          const isBookmarked = bookmarks.some(b => b.bookName === selectedBook.name && b.chapter === selectedChapter && b.verse === v.verse);

                          // Find the matching color class
                          let highlightBg = "";
                          if (customHighlight) {
                            const config = highlightColors.find(c => c.name === customHighlight);
                            if (config) highlightBg = config.bgClass;
                          }

                          return (
                            <div 
                              key={v.verse}
                              onClick={() => {
                                setSelectedVerseForPanel(selectedVerseForPanel?.verse === v.verse ? null : v);
                              }}
                              className={`group relative flex gap-6 p-4 rounded-sm transition-all duration-200 cursor-pointer ${highlightBg} ${
                                selectedVerseForPanel?.verse === v.verse 
                                  ? "bg-brand-gold/10 ring-1 ring-brand-gold/35" 
                                  : "hover:bg-black/5 dark:hover:bg-white/5"
                              }`}
                            >
                              <span className={`font-sans font-bold text-brand-gold text-sm shrink-0 select-none text-right w-6 ${accentTextClass}`}>
                                {v.verse}
                              </span>
                              <p className="flex-1 text-black dark:text-zinc-100 tracking-normal leading-relaxed">
                                {v.text}
                              </p>

                              {/* Hover / Small Indicators for Highlight & Bookmark */}
                              <div className="absolute right-3 top-4 hidden md:flex items-center space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                {isBookmarked && (
                                  <Bookmark className="w-3.5 h-3.5 text-brand-gold shrink-0 fill-current" />
                                )}
                                {customHighlight && (
                                  <Highlighter className="w-3.5 h-3.5 text-brand-gold shrink-0" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Floating Micro-Controller Panel when a verse is tapped */}
                      <AnimatePresence>
                        {selectedVerseForPanel && (
                          <motion.div
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 15 }}
                            className="sticky bottom-6 left-1/2 -translate-x-1/2 z-30 max-w-lg w-full bg-brand-charcoal border border-stone-850 text-white rounded-sm shadow-xl p-4 space-y-3"
                          >
                            <div className="flex justify-between items-center text-xs text-stone-400">
                              <span className="font-serif tracking-widest text-[#8C7851] font-bold uppercase">
                                {selectedBook.englishName} {selectedChapter} : {selectedVerseForPanel.verse}
                              </span>
                              <button 
                                onClick={() => setSelectedVerseForPanel(null)}
                                className="p-1 hover:bg-stone-800 rounded-sm"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                            
                            <p className="text-xs italic line-clamp-2 text-stone-200 font-serif leading-relaxed">
                              "{selectedVerseForPanel.text}"
                            </p>

                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-stone-800 font-sans">
                              {/* Highlight Picker */}
                              <div className="flex items-center space-x-2">
                                <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">Highlight:</span>
                                <div className="flex items-center space-x-1">
                                  {highlightColors.map((color) => (
                                    <button
                                      key={color.name}
                                      onClick={() => applyHighlight(color.name)}
                                      className={`w-4 h-4 rounded-sm border border-stone-700 ${color.dotClass} hover:scale-110 transition-transform`}
                                      title={color.name}
                                    />
                                  ))}
                                </div>
                                <button
                                  onClick={() => applyHighlight("clear")}
                                  className="text-[9px] bg-stone-800 hover:bg-stone-700 text-stone-300 px-1.5 py-0.5 rounded-sm uppercase tracking-wider font-bold transition"
                                  title="형광펜 지우기"
                                >
                                  Clear
                                </button>
                              </div>

                              {/* Toggle Bookmark */}
                              <button
                                onClick={() => toggleBookmark(selectedVerseForPanel)}
                                className="flex items-center space-x-1 px-3 py-1 bg-stone-800 hover:bg-stone-700 text-white text-xs font-bold rounded-sm uppercase tracking-wider transition"
                              >
                                <Bookmark className={`w-3 h-3 ${
                                  bookmarks.some(b => b.bookName === selectedBook.name && b.chapter === selectedChapter && b.verse === selectedVerseForPanel.verse)
                                    ? "fill-current text-brand-gold"
                                    : ""
                                }`} />
                                <span>Bookmark</span>
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : null}
                </div>

                {/* Reading Controls - perfectly matching Geometric Balance footer navigation */}
                <div className={`mt-16 flex justify-between items-center pt-8 border-t ${borderClass}`}>
                  <button
                    onClick={handlePrevChapter}
                    className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-60 font-sans font-bold hover:opacity-100 transition-all"
                  >
                    <span>←</span> Previous
                  </button>
                  <div className="w-1.5 h-1.5 rounded-full bg-brand-gold animate-pulse"></div>
                  <button
                    onClick={handleNextChapter}
                    className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-60 font-sans font-bold hover:opacity-100 transition-all"
                  >
                    Next <span>→</span>
                  </button>
                </div>

              </div>

              {/* RIGHT PANEL: AI Scripture Companion panel */}
              <div className={`w-full lg:w-[420px] shrink-0 border-t lg:border-t-0 lg:border-l p-6 transition-colors space-y-6 lg:sticky lg:top-20 lg:h-[calc(100vh-5rem)] lg:overflow-y-auto ${
                themeMode === "dark" 
                  ? "border-zinc-800 bg-zinc-900/30 text-zinc-300" 
                  : themeMode === "sepia"
                    ? "border-[#ebdcc5] bg-[#faf6ed]/50 text-[#5c4a35]"
                    : "border-brand-border bg-brand-sidebar text-brand-charcoal"
              }`}>
                
                {/* AI Devotional Title header */}
                <div className={`p-5 border rounded-sm space-y-3 ${
                  themeMode === "dark"
                    ? "bg-zinc-900/50 border-zinc-800"
                    : "bg-[#8C7851]/10 border-brand-border"
                }`}>
                  <div className="flex items-center space-x-2 text-brand-gold">
                    <Sparkles className="w-4 h-4" />
                    <h3 className="font-bold text-xs uppercase tracking-widest font-sans">AI 말씀 묵상 도우미</h3>
                  </div>
                  <p className="text-xs leading-relaxed opacity-85">
                    현재 보고 계시는 성경 말씀({selectedBook.name} {selectedChapter}장)에 어울리는 영적 배경 강해, 묵상글 및 따뜻한 기도문을 AI가 실시간으로 분석하여 생성해 줍니다.
                  </p>
                  
                  <button
                    onClick={handleMeditationLoad}
                    disabled={loadingMeditation || fetchingVerses}
                    className="w-full flex items-center justify-center space-x-2 py-2.5 bg-brand-gold hover:bg-[#766340] disabled:opacity-40 text-white rounded-sm text-xs font-bold uppercase tracking-widest transition duration-200"
                  >
                    {loadingMeditation ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent animate-spin rotate-45" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>은혜로운 묵상 생성하기</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Devotion Content Panel */}
                <div className="space-y-4">
                  {loadingMeditation && (
                    <div className="space-y-3 py-12 text-center">
                      <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent animate-spin rotate-45 mx-auto" />
                      <p className="text-xs text-stone-400 font-sans tracking-wide">
                        묵상 에세이와 기도문을 정성껏 작성 중입니다...
                      </p>
                    </div>
                  )}

                  {!loadingMeditation && meditation && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`p-5 border text-sm font-serif whitespace-pre-line space-y-4 text-brand-charcoal dark:text-zinc-200 leading-relaxed bg-white/50 dark:bg-zinc-950/20 ${borderClass}`}
                    >
                      <h4 className="font-bold text-brand-gold italic pb-1 uppercase tracking-widest text-xs font-sans">
                        † {selectedBook.englishName} Chapter {selectedChapter} Devotion
                      </h4>
                      <div className="text-xs leading-relaxed">
                        {meditation}
                      </div>
                    </motion.div>
                  )}

                  {!loadingMeditation && !meditation && (
                    <div className={`text-center py-10 border border-dashed rounded-sm ${borderClass}`}>
                      <p className="text-xs text-stone-400 font-sans leading-relaxed px-4">
                        상단의 백그라운드 해설 & 묵상 에세이 생성 버튼을 가볍게 탭해보세요.
                      </p>
                    </div>
                  )}
                </div>

                {/* Daily Blessing Verse block */}
                {dailyVerse && (
                  <div className={`p-4 border rounded-sm space-y-2 bg-white/40 dark:bg-zinc-900/10 ${borderClass}`}>
                    <span className="text-[9px] font-bold text-brand-gold uppercase tracking-[0.2em] block font-sans">오늘의 묵상 구절 (Daily Verse)</span>
                    <p className="text-xs font-serif italic text-stone-700 dark:text-zinc-300 leading-relaxed">
                      "{dailyVerse.text}"
                    </p>
                    <button 
                      onClick={() => navigateToScripture(dailyVerse.book, dailyVerse.chapter)}
                      className="text-[10px] font-bold text-brand-gold uppercase tracking-wider hover:underline block font-sans"
                    >
                      {dailyVerse.book} {dailyVerse.chapter}장 {dailyVerse.verse}절 전체 읽기 →
                    </button>
                  </div>
                )}

              </div>

            </div>
          )}

          {/* Tab: Real-Time Topical AI Verse Search */}
          {activeTab === "search" && (
            <div className="p-4 md:p-8 space-y-6 max-w-4xl w-full mx-auto font-sans">
              <div className="space-y-2 text-center md:text-left">
                <h2 className="text-3xl font-bold tracking-widest font-serif text-brand-gold">AI 주제별 성경 구절 검색</h2>
                <p className="text-xs text-stone-500 max-w-xl font-sans tracking-wide leading-relaxed">
                  불안함, 가족, 위로, 약함 등 극복하고 싶은 상황이나 원하는 신앙의 키워드를 마음껏 입력해보세요. 마음을 위로하는 구절과 가이드를 은혜롭게 제공합니다.
                </p>
              </div>

              {/* Form Input Container */}
              <form onSubmit={handleGlobalSearch} className="flex gap-2">
                <input
                  id="global-search-query-input"
                  type="text"
                  value={globalSearchQuery}
                  onChange={(e) => setGlobalSearchQuery(e.target.value)}
                  placeholder="예시: 위로의 말씀, 힘들고 지칠 때, 사랑, 용서 등"
                  className={`flex-1 py-3 px-4 border rounded-sm focus:outline-none focus:ring-1 focus:ring-brand-gold bg-white dark:bg-zinc-900 dark:text-white font-sans text-xs ${borderClass}`}
                />
                <button
                  id="global-search-submit"
                  type="submit"
                  disabled={searchingGlobal}
                  className="px-6 py-2.5 bg-brand-gold hover:bg-[#766340] disabled:opacity-40 text-white rounded-sm font-bold uppercase tracking-widest flex items-center space-x-2 transition text-xs font-sans shrink-0"
                >
                  {searchingGlobal ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin rotate-45" />
                  ) : (
                    <>
                      <Search className="w-3.5 h-3.5" />
                      <span>Search</span>
                    </>
                  )}
                </button>
              </form>

              {/* Results Area */}
              <div className="space-y-4">
                {searchingGlobal && (
                  <div className="py-20 text-center space-y-3">
                    <div className="w-8 h-8 border-2 border-brand-gold border-t-transparent animate-spin rotate-45 mx-auto" />
                    <p className="text-xs text-stone-400 font-sans uppercase tracking-widest">Searching Scriptures...</p>
                  </div>
                )}

                {!searchingGlobal && globalSearchResults.length > 0 && (
                  <div className="grid gap-6">
                    {globalSearchResults.map((result, idx) => (
                      <div 
                        key={idx}
                        className={`p-6 rounded-sm border bg-white/60 dark:bg-zinc-950/10 space-y-4 hover:border-brand-gold/75 transition-colors ${borderClass}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-brand-gold font-serif">
                            {result.book} {result.chapter}장 {result.verse}절
                          </span>
                          <button
                            onClick={() => navigateToScripture(result.book, result.chapter)}
                            className="text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 bg-[#8C7851] text-white rounded-sm hover:-translate-y-0.5 transition duration-150"
                          >
                            Read Scripture →
                          </button>
                        </div>
                        
                        <p className="text-base text-black dark:text-zinc-100 font-serif leading-relaxed italic pl-4 border-l-2 border-brand-gold">
                          "{result.text}"
                        </p>

                        <div className="text-xs text-stone-700 dark:text-zinc-300 p-4 rounded-sm flex items-start space-x-2 bg-black/5 dark:bg-white/5">
                          <Sparkles className="w-3.5 h-3.5 text-brand-gold shrink-0 mt-0.5" />
                          <span><strong>묵상 가이드:</strong> {result.reason}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!searchingGlobal && globalSearchResults.length === 0 && (
                  <div className={`text-center py-20 border border-dashed rounded-sm ${borderClass} text-stone-400 flex flex-col justify-center items-center gap-3`}>
                    <Compass className="w-8 h-8 text-[#8C7851] opacity-70" />
                    <p className="text-xs font-sans leading-relaxed max-w-sm">
                      예시: "두려움", "안식", "기도" 등의 신앙 키워드를 검색창에 편안하게 넣어 영원을 담은 말씀을 만나보세요.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Saved Bookmarks & Highlights Cabinet */}
          {activeTab === "bookmarks" && (
            <div className="p-4 md:p-8 space-y-6 max-w-4xl w-full mx-auto font-sans">
              <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-widest font-serif text-brand-gold">저장한 북마크 ({bookmarks.length})</h2>
                <p className="text-xs text-stone-500 font-sans tracking-wide leading-relaxed">
                  성경을 읽어내리며 마음을 깊이 울린 말씀들을 소중히 기록해 보존하는 서재 공간입니다.
                </p>
              </div>

              {/* Bookmark List */}
              <div className="space-y-4">
                {bookmarks.map((bookmark) => (
                  <div
                    key={bookmark.key}
                    className={`p-6 rounded-sm border bg-white/60 dark:bg-zinc-950/10 space-y-3 hover:border-brand-gold/70 transition-all flex justify-between gap-4 ${borderClass}`}
                  >
                    <div className="space-y-2 flex-1 font-serif">
                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-bold text-brand-gold font-serif font-sans">
                          {bookmark.bookName} {bookmark.chapter}장 {bookmark.verse}절
                        </span>
                        <span className="text-[9px] font-sans text-stone-400 uppercase tracking-wider">Saved On: {bookmark.date}</span>
                      </div>
                      
                      <p className="text-base text-black dark:text-zinc-100 font-serif leading-relaxed italic border-l-2 border-stone-300 dark:border-zinc-700 pl-4">
                        "{bookmark.text}"
                      </p>

                      <button
                        onClick={() => navigateToScripture(bookmark.bookName, bookmark.chapter)}
                        className="text-[10px] font-bold text-brand-gold uppercase tracking-wider hover:underline font-sans inline-block"
                      >
                        이 성경 말씀으로 바로가기 →
                      </button>
                    </div>

                    <button
                      onClick={() => removeBookmarkByKey(bookmark.key)}
                      className="p-2 text-stone-400 hover:text-red-500 rounded-sm hover:bg-black/5 dark:hover:bg-white/5 shrink-0 self-start transition-all"
                      title="북마크 지우기"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                {bookmarks.length === 0 && (
                  <div className={`text-center py-20 border border-dashed rounded-sm ${borderClass} text-stone-400 flex flex-col justify-center items-center gap-3`}>
                    <BookMarked className="w-8 h-8 text-[#8C7851] opacity-70" />
                    <p className="text-xs font-sans">저장된 북마크가 없습니다. 성경 정독 중 말씀 구절을 가볍게 클릭하여 저장해두실 수 있습니다.</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </main>

      </div>

      {/* Dynamic Slate Footer bar from Geometric Balance theme */}
      <footer className="h-12 shrink-0 bg-brand-charcoal text-stone-400 border-t border-brand-border/10 flex items-center justify-between px-6 md:px-10 text-[9px] font-sans uppercase tracking-[0.25em] z-40">
        <div className="flex items-center space-x-1.5">
          <span className="text-brand-gold font-bold">†</span>
          <span>{selectedBook.englishName} Chapter {selectedChapter} — Revised Version 2026</span>
        </div>
        <div className="hidden sm:flex gap-6 italic">
          <span>Solemn Word of Grace</span>
          <span>개역개정 성경</span>
        </div>
      </footer>

    </div>
  );
}
