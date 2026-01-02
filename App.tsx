
import React, { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { AppView, Hymn, FlipcardContent, Devotional, ChurchEvent } from './types';
import { 
  NAV_ITEMS, MOCK_EVENTS, THEMATIC_STUDIES, BIBLE_BOOKS, 
  CATECHISM_CARDS, CATECHISM_SECTIONS, CHURCH_NAME, 
  MANUAL_RESEARCH_QUESTIONS, MONTHS, WEEKDAYS,
  ALL_DEVOTIONALS, DEVOTIONALS_JAN_2026
} from './constants';
import { 
  searchBibleKeywords,
  getBibleChapter,
  generateVerseAudio,
  checkCache,
  searchCatechism,
  queryManualPresbiteriano,
  analyzeStudyDocument
} from './services/gemini';
import { 
  X, Heart, Youtube, Volume2, 
  Calendar as CalendarIcon, Send, BookOpen, Music, Sparkles, ShieldCheck, 
  Search, ArrowLeft, ChevronLeft, ChevronRight, Loader2, Play, 
  Mic, Share2, BookMarked, Menu, History, Copy, CheckCircle2,
  ListMusic, Mic2, ChevronDown, Book, Hash, AlertCircle, RefreshCcw,
  Music2, Filter, Settings, Moon, Sun, Type as TypeIcon, AlignJustify,
  Maximize2, Minimize2, Eye, EyeOff, Palette, RotateCcw, Plus, Minus,
  ChevronRight as ChevronRightIcon, Layers, Info, List, GraduationCap,
  Lightbulb, FileText, Scale, Tag, ExternalLink, Globe, Upload, FileUp,
  FileSearch, CheckCircle, Clock, MapPin, Quote, MessageCircle, Save, Trash2, CalendarPlus, Lock, Unlock, KeyRound,
  DownloadCloud, Check, Database, Library
} from 'lucide-react';

/**
 * URLs para o "Banco de Dados" no GitHub
 */
const GITHUB_DB = {
  DEVOTIONALS: "https://raw.githubusercontent.com/seu-usuario/seu-repo/main/devocionais.json",
  AGENDA: "https://raw.githubusercontent.com/seu-usuario/seu-repo/main/agenda.json",
  CATECHISM: "https://raw.githubusercontent.com/seu-usuario/seu-repo/main/catecismo.json",
  MANUAL: "https://raw.githubusercontent.com/petruccisergio-stp/ManualIPB/main/",
  BIBLE_BASE: "https://raw.githubusercontent.com/petruccisergio-stp/Bible/main/",
  PDF_API: "https://api.github.com/repos/petruccisergio-stp/PDF/contents/",
  // Correção: A URL de arquivos brutos (raw) não deve conter "/tree/". Deve ser /main/
  PDF_RAW_BASE: "https://raw.githubusercontent.com/petruccisergio-stp/PDF/main/"
};

interface ReaderSettings {
  fontSize: number;
  lineHeight: number;
  useSerif: boolean;
  theme: 'light' | 'dark' | 'sepia';
  focusMode: boolean;
  verseSpacing: number;
}

const STORAGE_KEY = 'ipsc_reader_settings_v4';
const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 18,
  lineHeight: 1.6,
  useSerif: true,
  theme: 'light',
  focusMode: false,
  verseSpacing: 16
};

const SearchBar = ({ value, onChange, onSearch, placeholder, theme }: { 
  value: string, 
  onChange: (v: string) => void, 
  onSearch: (v: string) => void, 
  placeholder: string, 
  theme: 'light' | 'dark' | 'sepia' 
}) => (
  <div className={`relative flex items-center gap-2 p-1 rounded-2xl border transition-all ${
    theme === 'dark' ? 'bg-zinc-800 border-zinc-700' : theme === 'sepia' ? 'bg-[#ebe3cf] border-[#d4cbb3]' : 'bg-slate-50 border-slate-200'
  }`}>
    <Search size={18} className="ml-3 opacity-30" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && onSearch(value)}
      placeholder={placeholder}
      className="flex-1 bg-transparent border-none outline-none py-2 text-sm font-bold placeholder:font-black placeholder:uppercase placeholder:text-[10px] placeholder:tracking-widest"
    />
    <button 
      onClick={() => onSearch(value)}
      className="px-4 py-2 rounded-xl bg-amber-500 text-white text-[10px] font-black uppercase hover:bg-amber-600 transition-colors"
    >
      Buscar
    </button>
  </div>
);

const CatechismItemCard = ({ card, settings }: { card: any, settings: any }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  return (
    <div 
      onClick={() => setIsRevealed(!isRevealed)}
      className={`p-10 rounded-[50px] border shadow-sm transition-all duration-500 cursor-pointer relative overflow-hidden group ${
        settings.theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : settings.theme === 'sepia' ? 'bg-[#fcf5e3] border-[#e6dec9]' : 'bg-white border-slate-100'
      } ${!isRevealed ? 'hover:border-amber-500/50' : 'ring-2 ring-amber-500/10'}`}
    >
      <div className="flex justify-between items-center mb-6">
        <span className="text-amber-500 font-black text-[9px] uppercase tracking-widest">{card.title}</span>
        {!isRevealed && <span className="text-[8px] font-black text-amber-500 bg-amber-100 dark:bg-amber-900/30 px-3 py-1 rounded-full animate-pulse uppercase tracking-tighter">Clique para ver a resposta</span>}
      </div>
      <h4 className="text-xl font-black serif-italic italic leading-snug mb-8">"{card.question}"</h4>
      <div className="pt-8 border-t border-black/5 relative min-h-[100px]">
        <div className={`transition-all duration-700 ease-out-expo ${isRevealed ? 'opacity-100 blur-none scale-100' : 'opacity-10 blur-xl scale-95 select-none'}`}>
          <p className="text-sm md:text-base leading-relaxed font-medium">{card.answer}</p>
        </div>
        {!isRevealed && <div className="absolute inset-0 pt-8 flex flex-col items-center justify-center text-amber-500/40 group-hover:text-amber-500/60 transition-colors pointer-events-none"><Eye size={32} className="mb-2" /><span className="text-[10px] font-black uppercase tracking-widest">Pense na resposta...</span></div>}
      </div>
      {card.biblicalRef && <div className={`mt-8 transition-all duration-700 ${isRevealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'}`}><div className="bg-amber-50 dark:bg-zinc-800/50 p-4 rounded-3xl border border-amber-100/50 dark:border-zinc-700/50"><h5 className="text-[9px] font-black uppercase text-amber-600 mb-2 tracking-widest flex items-center gap-2"><Book size={10} /> Referências Bíblicas</h5><p className="text-[11px] font-bold leading-relaxed opacity-70">{card.biblicalRef}</p></div></div>}
    </div>
  );
};

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('home');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtra os itens de navegação para remover a Agenda Semanal do menu lateral
  const filteredNavItems = useMemo(() => NAV_ITEMS.filter(item => item.id !== 'agenda'), []);

  // Lógica para obter a devocional do dia real
  const todayDevotional = useMemo(() => {
    const d = new Date();
    const dayOfMonth = d.getDate();
    const monthName = MONTHS[d.getMonth()];
    const yearNum = d.getFullYear();
    const monthKey = `${monthName}-${yearNum}`;
    
    // Tenta encontrar a devocional do mês/ano atual, caso contrário usa Janeiro-2026 como fallback (demo)
    const list = ALL_DEVOTIONALS[monthKey] || ALL_DEVOTIONALS['Janeiro-2026'];
    return list.find(item => item.day === dayOfMonth) || list[0];
  }, []);

  // Settings State
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  // Manual States - Exclusively local based on GitHub JSON
  const [manualQuery, setManualQuery] = useState("");
  const [manualData, setManualData] = useState<any>(null);
  const [manualResults, setManualResults] = useState<any[]>([]);
  const [selectedManualDoc, setSelectedManualDoc] = useState<any>(null);
  const [selectedManualChapter, setSelectedManualChapter] = useState<any>(null);

  // Fetch Manual Data from GitHub on component mount
  useEffect(() => {
    const fetchManual = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${GITHUB_DB.MANUAL}manual_presbiteriano.json`);
        if (res.ok) {
          const data = await res.json();
          setManualData(data);
        }
      } catch (e) {
        console.error("Erro ao carregar o Manual Presbiteriano:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchManual();
  }, []);

  // Local Search function for the Manual
  const handleManualSearch = (q: string) => {
    if (!q.trim() || !manualData) {
      setManualResults([]);
      return;
    }
    
    const results: any[] = [];
    const searchTerms = q.toLowerCase().split(' ');
    
    manualData.conteudo.forEach((doc: any) => {
      doc.capitulos.forEach((cap: any) => {
        // Search in preambulo if exists
        if (cap.texto_original && searchTerms.every(term => cap.texto_original.toLowerCase().includes(term))) {
           results.push({
             type: 'PREÂMBULO',
             docTitle: doc.tipo_documento_legal,
             title: cap.titulo,
             text: cap.texto_original,
             doc, cap
           });
        }

        // Search in articles
        const processArtigos = (artigos: any[]) => {
          artigos.forEach((art: any) => {
            const matchInText = searchTerms.every(term => art.texto_original.toLowerCase().includes(term));
            const matchInResumo = art.analise_ia?.resumo_simples && searchTerms.every(term => art.analise_ia.resumo_simples.toLowerCase().includes(term));
            
            if (matchInText || matchInResumo) {
              results.push({
                type: `ARTIGO ${art.artigo}`,
                docTitle: doc.tipo_documento_legal,
                title: cap.titulo,
                text: art.texto_original,
                analise: art.analise_ia,
                doc, cap, art
              });
            }
          });
        };

        if (cap.artigos) processArtigos(cap.artigos);
        if (cap.secoes) {
          cap.secoes.forEach((sec: any) => {
            if (sec.artigos) processArtigos(sec.artigos);
          });
        }
      });
    });
    
    setManualResults(results);
    setSelectedManualDoc(null);
    setSelectedManualChapter(null);
  };

  // Devotional States
  const [selectedMonth, setSelectedMonth] = useState<string>(Object.keys(ALL_DEVOTIONALS)[0] || 'Janeiro-2026');
  const [selectedDevotional, setSelectedDevotional] = useState<Devotional | null>(null);

  // Lógica de compartilhamento de devocional
  const handleShareDevotional = (dev: Devotional) => {
    const shareText = `✨ *Devocional Diária - IP São Caetano* ✨\n\n` +
                      `📅 *${dev.day} de ${dev.month} de ${dev.year}*\n` +
                      `📖 *${dev.title.toUpperCase()}*\n\n` +
                      `"${dev.verse}"\n— _${dev.reference}_\n\n` +
                      `${dev.content}\n\n` +
                      `💡 *VERDADE CENTRAL:* ${dev.truthCentral}\n\n` +
                      `🙏 *ORAÇÃO:* ${dev.prayer}\n\n` +
                      `🙌 *IGREJA PRESBITERIANA DE SÃO CAETANO DO SUL*`;

    if (navigator.share) {
      navigator.share({
        title: `Devocional: ${dev.title}`,
        text: shareText
      }).catch(err => console.error("Erro ao compartilhar:", err));
    } else {
      // Fallback para WhatsApp
      const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(url, '_blank');
    }
  };

  // Bible States
  const [bibleVerses, setBibleVerses] = useState<any[]>([]);
  const [bibleSource, setBibleSource] = useState<'github' | 'gemini' | null>(null);
  const fullBibleRef = useRef<any>(null);
  const [bibleSearch, setBibleSearch] = useState("");
  const [isShowingSearchResults, setIsShowingSearchResults] = useState(false);
  const [selectedBook, setSelectedBook] = useState<any>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [selectedVerse, setSelectedVerse] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [showBookSelector, setShowBookSelector] = useState(false);
  const [showChapterSelector, setShowChapterSelector] = useState(false);
  const [showVerseSelector, setShowVerseSelector] = useState(false);

  // PDF / Library States
  const [pdfFiles, setPdfFiles] = useState<any[]>([]);
  const [selectedPdf, setSelectedPdf] = useState<string | null>(null);
  const [librarySearch, setLibrarySearch] = useState("");

  // Refs for auto-scrolling to selected verse
  const verseRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // Filtered PDFs based on search
  const filteredPdfs = useMemo(() => {
    if (!librarySearch.trim()) return pdfFiles;
    return pdfFiles.filter(file => 
      file.name.toLowerCase().includes(librarySearch.toLowerCase())
    );
  }, [pdfFiles, librarySearch]);

  // Fetch PDFs from GitHub API
  useEffect(() => {
    const fetchPdfs = async () => {
      try {
        const response = await fetch(GITHUB_DB.PDF_API);
        if (response.ok) {
          const data = await response.json();
          const pdfs = data.filter((file: any) => file.name.toLowerCase().endsWith('.pdf'));
          setPdfFiles(pdfs);
        }
      } catch (e) {
        console.error("Erro ao listar PDFs:", e);
      }
    };
    fetchPdfs();
  }, []);

  useEffect(() => {
    const loadChapter = async () => {
      if (!selectedBook || !selectedChapter) return;
      setLoading(true);
      setBibleSource(null);
      setIsShowingSearchResults(false);
      
      const bookNameNorm = selectedBook.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

      try {
        const chapterUrl = `${GITHUB_DB.BIBLE_BASE}${bookNameNorm}/${selectedChapter}.json`;
        const chapterRes = await fetch(chapterUrl);
        
        if (chapterRes.ok) {
          const data = await chapterRes.json();
          setBibleVerses(data.verses || data);
          setBibleSource('github');
          setLoading(false);
          return;
        }

        if (!fullBibleRef.current) {
          const fullRes = await fetch(`${GITHUB_DB.BIBLE_BASE}ARC.json`);
          if (fullRes.ok) fullBibleRef.current = await fullRes.json();
        }

        if (fullBibleRef.current) {
          const bookData = fullBibleRef.current.find((b: any) => 
            b.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === bookNameNorm
          );
          
          if (bookData && bookData.chapters[selectedChapter - 1]) {
            const verses = bookData.chapters[selectedChapter - 1].map((text: string, idx: number) => ({
              verse: idx + 1,
              text: text
            }));
            setBibleVerses(verses);
            setBibleSource('github');
            setLoading(false);
            return;
          }
        }

        const aiData = await getBibleChapter(selectedBook.name, selectedChapter);
        setBibleVerses(aiData);
        setBibleSource('gemini');
      } catch (e) {
        console.error("Erro ao carregar Bíblia:", e);
        const aiData = await getBibleChapter(selectedBook.name, selectedChapter);
        setBibleVerses(aiData);
        setBibleSource('gemini');
      } finally {
        setLoading(false);
      }
    };

    loadChapter();
  }, [selectedBook, selectedChapter]);

  // Scroll to verse when selectedVerse changes
  useEffect(() => {
    if (selectedVerse && verseRefs.current[selectedVerse]) {
      verseRefs.current[selectedVerse]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [selectedVerse, bibleVerses]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const handleCopy = (text: string, id: number, ref: string) => {
    navigator.clipboard.writeText(`${ref} - ${text} (${CHURCH_NAME})`).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleShare = (text: string, ref: string) => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${ref} - ${text} (${CHURCH_NAME})`)}`, '_blank');
  };

  const resetBible = () => {
    setSelectedBook(null); 
    setSelectedChapter(null); 
    setSelectedVerse(null);
    setBibleVerses([]); 
    setBibleSearch("");
    setIsShowingSearchResults(false);
  };

  const handleBibleSearchAction = async (q: string) => {
    if (!q.trim() || loading) return;
    setLoading(true);
    try {
      const results = await searchBibleKeywords(q);
      setBibleVerses(results);
      setIsShowingSearchResults(true);
      setSelectedBook(null);
      setSelectedChapter(null);
      setSelectedVerse(null);
    } catch (e) { 
      setError("Erro na busca."); 
    } finally { 
      setLoading(false); 
    }
  };

  const handleChapterSelect = (book: any, chapter: number) => {
    setSelectedBook(book);
    setSelectedChapter(chapter);
    setSelectedVerse(null);
    setIsShowingSearchResults(false);
    setShowChapterSelector(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleVerseSelect = (verseNum: number) => {
    setSelectedVerse(verseNum);
    setShowVerseSelector(false);
  };

  const navigateChapter = (dir: 'next' | 'prev') => {
    if (!selectedBook || !selectedChapter) return;
    const newCap = dir === 'next' ? selectedChapter + 1 : selectedChapter - 1;
    if (newCap >= 1 && newCap <= selectedBook.chapters) handleChapterSelect(selectedBook, newCap);
  };

  const updateSetting = (key: keyof ReaderSettings, val: any) => setSettings(p => ({ ...p, [key]: val }));

  return (
    <div className={`min-h-screen flex flex-col lg:flex-row relative ${settings.theme === 'dark' ? 'bg-zinc-950 text-zinc-100' : settings.theme === 'sepia' ? 'bg-[#f4ecd8] text-[#5b4636]' : 'bg-[#fdfdfc] text-slate-800'}`}>
      
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-4 border-b bg-ipbGreen-500 text-white sticky top-0 z-[200]">
        <h1 className="font-black text-lg tracking-tighter">IP São Caetano</h1>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2"><Menu size={24} /></button>
      </header>

      {/* Sidebar Mobile Content */}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-ipbGreen-500 z-[260] p-8 flex flex-col lg:hidden transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-10 px-6 flex justify-between items-center">
           <h1 className="text-white font-black text-xl tracking-tighter">IPSC</h1>
           <button onClick={() => setIsMobileMenuOpen(false)} className="text-white/70"><X size={20}/></button>
        </div>
        <nav className="flex-1 space-y-2">
          {filteredNavItems.map(item => (
            <button key={item.id} onClick={() => { setActiveView(item.id as AppView); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-5 px-6 py-4 rounded-3xl transition-all duration-300 group ${activeView === item.id ? 'bg-white/10 text-white border-r-4 border-amber-500 shadow-lg' : 'hover:text-white hover:bg-white/5'}`}>
              <span className={activeView === item.id ? 'text-amber-500' : 'group-hover:text-amber-500'}>{item.icon}</span>
              <span className="text-[11px] font-black uppercase tracking-[0.1em]">{item.label}</span>
            </button>
          ))}
          <button onClick={() => { setActiveView('library'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-5 px-6 py-4 rounded-3xl transition-all duration-300 group ${activeView === 'library' ? 'bg-white/10 text-white border-r-4 border-amber-500 shadow-lg' : 'hover:text-white hover:bg-white/5'}`}>
            <span className={activeView === 'library' ? 'text-amber-500' : 'group-hover:text-amber-500'}><Library size={20} /></span>
            <span className="text-[11px] font-black uppercase tracking-[0.1em]">Biblioteca PDF</span>
          </button>
        </nav>
      </aside>

      {/* Sidebar Desktop */}
      <aside className={`fixed top-0 left-0 h-full w-72 bg-ipbGreen-500 text-white/80 z-50 p-8 shadow-2xl transition-transform duration-500 hidden lg:flex flex-col ${(!settings.focusMode || activeView !== 'bible') ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-10 px-6">
           <h1 className="text-white font-black text-xl tracking-tighter"> </h1>
           <p className="text-[9px] text-amber-500 font-bold uppercase tracking-[0.3em] mt-2"> </p>
        </div>
        <nav className="flex-1 space-y-2">
          {filteredNavItems.map(item => (
            <button key={item.id} onClick={() => { setActiveView(item.id as AppView); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-5 px-6 py-4 rounded-3xl transition-all duration-300 group ${activeView === item.id ? 'bg-white/10 text-white border-r-4 border-amber-500 shadow-lg' : 'hover:text-white hover:bg-white/5'}`}>
              <span className={activeView === item.id ? 'text-amber-500' : 'group-hover:text-amber-500'}>{item.icon}</span>
              <span className="text-[11px] font-black uppercase tracking-[0.1em]">{item.label}</span>
            </button>
          ))}
          <button onClick={() => { setActiveView('library'); setIsMobileMenuOpen(false); }} className={`w-full flex items-center gap-5 px-6 py-4 rounded-3xl transition-all duration-300 group ${activeView === 'library' ? 'bg-white/10 text-white border-r-4 border-amber-500 shadow-lg' : 'hover:text-white hover:bg-white/5'}`}>
            <span className={activeView === 'library' ? 'text-amber-500' : 'group-hover:text-amber-500'}><Library size={20} /></span>
            <span className="text-[11px] font-black uppercase tracking-[0.1em]">Biblioteca PDF</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 transition-all duration-500 ${(!settings.focusMode || activeView !== 'bible') ? 'lg:ml-72' : 'lg:ml-0'} p-4 md:p-8 lg:p-12 relative`}>
        {loading && <div className="fixed top-0 left-0 right-0 h-1 bg-amber-500/30 z-[300] pointer-events-none"><div className="h-full bg-amber-500 animate-progress w-full origin-left"></div></div>}

        <div className="max-w-6xl mx-auto">
          {/* HOME VIEW */}
          {activeView === 'home' && (
            <div className="space-y-10 animate-in fade-in">
              {/* Header Banner */}
              <section className="relative w-full h-80 rounded-[60px] overflow-hidden bg-ipbGreen-50 flex flex-col items-center justify-center text-center p-8 shadow-sm">
                <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-ipbGreen-100/50 pointer-events-none"></div>
                <span className="text-ipbGreen-600 font-black text-[10px] uppercase tracking-[0.5em] mb-4 relative z-10">IGREJA PRESBITERIANA DO BRASIL</span>
                <h1 className="text-6xl md:text-8xl font-medium tracking-tighter uppercase relative z-10 text-ipbGreen-800 leading-[0.8]">IGREJA<br/>PRESBITERIANA</h1>
                <h2 className="serif-italic text-5xl md:text-7xl text-amber-500 relative z-10 -mt-2">de São Caetano do Sul</h2>
                <div className="flex gap-12 mt-10 relative z-10">
                   <div className="flex flex-col items-center gap-2">
                      <div className="w-16 h-16 rounded-full bg-ipbGreen-500/10 flex items-center justify-center"><Library size={28} className="text-ipbGreen-600"/></div>
                      <span className="text-[8px] font-black uppercase tracking-widest opacity-40">INSTITUCIONAL</span>
                   </div>
                   <div className="flex flex-col items-center gap-2">
                      <div className="w-16 h-16 rounded-full bg-ipbGreen-500/10 flex items-center justify-center"><Heart size={28} className="text-ipbGreen-600"/></div>
                      <span className="text-[8px] font-black uppercase tracking-widest opacity-40">MEMBRESIA</span>
                   </div>
                </div>
              </section>

              {/* Grid Section - Ajustado para 2 colunas após remoção da Agenda */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Devocional do Dia Card - Agora vinculado à data real */}
                <div className="p-8 rounded-[50px] bg-white border border-ipbGreen-50 shadow-2xl flex flex-col justify-between h-[450px]">
                   <div className="space-y-6">
                      <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-500 shadow-sm"><Sparkles size={24}/></div>
                      <h3 className="text-3xl font-black uppercase tracking-tight leading-tight">Devocional<br/>do Dia</h3>
                      <p className="text-lg serif-italic italic opacity-60 leading-tight">"{todayDevotional.title}"</p>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-30">{todayDevotional.day} de {todayDevotional.month}</p>
                   </div>
                   <button 
                    onClick={() => {
                      setSelectedDevotional(todayDevotional);
                      setActiveView('devotionals');
                    }}
                    className="flex items-center gap-2 text-amber-500 font-black uppercase text-[11px] tracking-widest group"
                   >
                     LER COMPLETO <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform"/>
                   </button>
                </div>

                {/* Links Úteis Card */}
                <div className="p-8 rounded-[50px] bg-white border border-ipbGreen-50 shadow-2xl flex flex-col h-[450px]">
                   <div className="flex items-center gap-3 mb-10 text-amber-500">
                      <ExternalLink size={24}/>
                      <h3 className="text-xl font-black uppercase tracking-tight text-slate-800">Links Úteis</h3>
                   </div>
                   <div className="space-y-4">
                      <button 
                        onClick={() => window.open('https://www.youtube.com/@ipsaocaetanodosul', '_blank')}
                        className="w-full p-6 rounded-[30px] bg-rose-50 border border-rose-100 flex items-center justify-between group"
                      >
                         <div className="flex items-center gap-4 text-rose-600">
                            <Youtube size={20}/>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">YOUTUBE</span>
                         </div>
                         <ChevronRightIcon size={16} className="text-rose-300 opacity-0 group-hover:opacity-100 transition-all"/>
                      </button>
                      <button 
                        onClick={() => window.open('https://ipb.org.br', '_blank')}
                        className="w-full p-6 rounded-[30px] bg-emerald-50 border border-emerald-100 flex items-center justify-between group"
                      >
                         <div className="flex items-center gap-4 text-emerald-600">
                            <Globe size={20}/>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">SITE IPB</span>
                         </div>
                         <ChevronRightIcon size={16} className="text-emerald-300 opacity-0 group-hover:opacity-100 transition-all"/>
                      </button>
                   </div>
                </div>

              </div>
            </div>
          )}

          {/* LIBRARY / PDF VIEW */}
          {activeView === 'library' && (
            <div className="space-y-12 animate-in fade-in">
              <section className="text-center space-y-4">
                <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">Biblioteca Digital</h2>
                <p className="text-sm font-bold opacity-40 uppercase tracking-[0.2em]">Materiais e Estudos da Igreja</p>
              </section>

              {!selectedPdf ? (
                <>
                  <div className="max-w-md mx-auto mb-10">
                    <SearchBar 
                      value={librarySearch} 
                      onChange={setLibrarySearch} 
                      onSearch={() => {}} 
                      placeholder="Pesquisar documento..." 
                      theme={settings.theme} 
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredPdfs.length > 0 ? filteredPdfs.map((file, idx) => (
                      <div key={idx} className={`p-8 rounded-[40px] border transition-all hover:border-amber-400 group flex flex-col justify-between h-64 ${settings.theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 mb-6 group-hover:scale-110 transition-transform">
                          <FileText size={24} />
                        </div>
                        <div>
                          <h3 className="font-black uppercase text-sm tracking-tight mb-4 line-clamp-2">{file.name.replace('.pdf', '').replace(/-/g, ' ')}</h3>
                          <button 
                            onClick={() => setSelectedPdf(file.name)}
                            className="w-full py-4 rounded-2xl bg-ipbGreen-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-black transition-all"
                          >
                            Abrir Documento
                          </button>
                        </div>
                      </div>
                    )) : (
                      <div className="col-span-full py-20 text-center opacity-30">
                        {pdfFiles.length === 0 ? (
                          <>
                            <Loader2 className="animate-spin mx-auto mb-4" />
                            <p className="text-[10px] font-black uppercase">Sincronizando com GitHub...</p>
                          </>
                        ) : (
                          <>
                            <Search size={40} className="mx-auto mb-4 opacity-20" />
                            <p className="text-[10px] font-black uppercase">Nenhum documento encontrado para "{librarySearch}"</p>
                            <button 
                              onClick={() => setLibrarySearch("")}
                              className="mt-4 text-amber-500 font-black uppercase text-[9px] underline"
                            >
                              Limpar Pesquisa
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col h-[80vh] animate-in slide-in-from-bottom-6">
                   <div className="flex items-center justify-between mb-6">
                      <button onClick={() => setSelectedPdf(null)} className="flex items-center gap-2 text-[10px] font-black uppercase opacity-40 hover:opacity-100 transition-opacity">
                        <ArrowLeft size={16}/> Voltar para a lista
                      </button>
                      <h3 className="text-xs font-black uppercase text-amber-500 truncate px-4">{selectedPdf.replace('.pdf', '')}</h3>
                      <a 
                        href={`${GITHUB_DB.PDF_RAW_BASE}${selectedPdf}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="p-2 bg-black/5 rounded-xl hover:bg-amber-400 transition-all"
                      >
                        <ExternalLink size={18}/>
                      </a>
                   </div>
                   <div className="flex-1 bg-zinc-200 rounded-[35px] overflow-hidden border-4 border-black/5 shadow-2xl relative">
                      <iframe 
                        src={`https://docs.google.com/viewer?url=${encodeURIComponent(GITHUB_DB.PDF_RAW_BASE + selectedPdf)}&embedded=true`}
                        className="w-full h-full"
                        frameBorder="0"
                      />
                      <div className="absolute bottom-4 right-4 bg-black/80 text-white text-[8px] font-bold px-3 py-1 rounded-full pointer-events-none">
                        IPSC Digital Viewer
                      </div>
                   </div>
                </div>
              )}
            </div>
          )}

          {/* BIBLE VIEW */}
          {activeView === 'bible' && (
            <div className="space-y-8 animate-in fade-in pb-20">
              <div className={`p-4 md:p-6 rounded-[35px] border sticky top-2 z-[90] backdrop-blur-md ${settings.theme === 'dark' ? 'bg-zinc-900/80 border-zinc-800' : 'bg-white/80 border-slate-100'}`}>
                <div className="flex flex-wrap items-center gap-4">
                  <button onClick={resetBible} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${(!selectedBook && !isShowingSearchResults) ? 'text-amber-500' : 'opacity-40'}`}>BIBLIOTECA</button>
                  {selectedBook && (
                    <div className="flex items-center gap-2">
                      <ChevronRight size={14} className="opacity-20" />
                      <div className="relative">
                        <button onClick={() => setShowBookSelector(!showBookSelector)} className="px-4 py-2 rounded-2xl bg-amber-400 text-white text-[10px] font-black uppercase flex items-center gap-2">{selectedBook.name} <ChevronDown size={14}/></button>
                        {showBookSelector && (
                          <div className={`absolute top-full left-0 mt-3 w-80 max-h-96 overflow-y-auto border shadow-2xl rounded-[30px] p-6 z-[300] ${settings.theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100'}`}>
                            <div className="grid grid-cols-1 gap-2">
                              {BIBLE_BOOKS.map(b => (
                                <button key={b.name} onClick={() => { setSelectedBook(b); setSelectedChapter(null); setSelectedVerse(null); setShowBookSelector(false); }} className="text-left px-4 py-2 rounded-xl hover:bg-amber-400 hover:text-black font-bold text-sm transition-colors">{b.name}</button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <ChevronRight size={14} className="opacity-20" />
                      <div className="relative">
                        <button onClick={() => setShowChapterSelector(!showChapterSelector)} className="px-4 py-2 rounded-2xl bg-amber-500 text-white text-[10px] font-black uppercase flex items-center gap-2">{selectedChapter ? `Cap. ${selectedChapter}` : 'Cap.'} <ChevronDown size={14}/></button>
                        {showChapterSelector && (
                          <div className={`absolute top-full right-0 md:left-0 mt-3 w-64 max-h-96 overflow-y-auto border shadow-2xl rounded-[30px] p-6 z-[300] ${settings.theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100'}`}>
                             <div className="grid grid-cols-5 gap-2">
                               {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(num => (
                                 <button key={num} onClick={() => handleChapterSelect(selectedBook, num)} className={`aspect-square flex items-center justify-center rounded-xl text-xs font-black ${selectedChapter === num ? 'bg-amber-500 text-white' : 'bg-black/5'}`}>{num}</button>
                               ))}
                             </div>
                          </div>
                        )}
                      </div>
                      {selectedChapter && bibleVerses.length > 0 && (
                        <>
                          <ChevronRight size={14} className="opacity-20" />
                          <div className="relative">
                            <button onClick={() => setShowVerseSelector(!showVerseSelector)} className="px-4 py-2 rounded-2xl bg-amber-500 text-white text-[10px] font-black uppercase flex items-center gap-2">{selectedVerse ? `Ver. ${selectedVerse}` : 'Ver.'} <ChevronDown size={14}/></button>
                            {showVerseSelector && (
                              <div className={`absolute top-full right-0 md:left-0 mt-3 w-64 max-h-96 overflow-y-auto border shadow-2xl rounded-[30px] p-6 z-[300] ${settings.theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100'}`}>
                                 <div className="grid grid-cols-5 gap-2">
                                   {bibleVerses.map((v, i) => (
                                     <button key={i} onClick={() => handleVerseSelect(v.verse || (i+1))} className={`aspect-square flex items-center justify-center rounded-xl text-xs font-black ${(selectedVerse === (v.verse || (i+1))) ? 'bg-amber-500 text-white' : 'bg-black/5'}`}>{v.verse || (i+1)}</button>
                                   ))}
                                 </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {isShowingSearchResults && (
                     <div className="flex items-center gap-2">
                        <ChevronRight size={14} className="opacity-20" />
                        <span className="px-4 py-2 rounded-2xl bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase">Resultados da Busca</span>
                     </div>
                  )}
                  <div className="flex-1 min-w-[200px]">
                    <SearchBar value={bibleSearch} onChange={setBibleSearch} onSearch={handleBibleSearchAction} placeholder="Buscar versículo..." theme={settings.theme} />
                  </div>
                </div>
              </div>

              <div className={`min-h-[500px] rounded-[50px] border p-8 md:p-16 ${settings.theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                {isShowingSearchResults ? (
                  <div className="max-w-2xl mx-auto space-y-10">
                    <div className="flex justify-between items-center border-b border-black/5 pb-8">
                       <h2 className="text-4xl font-black tracking-tight uppercase">Resultados para "{bibleSearch}"</h2>
                       <button onClick={resetBible} className="text-[10px] font-black uppercase text-amber-500 underline">Voltar</button>
                    </div>
                    <div className="flex flex-col gap-8">
                      {bibleVerses.length > 0 ? bibleVerses.map((v, i) => (
                        <div key={i} className="space-y-2 group">
                          <div className="flex items-center gap-3">
                            <span className="text-amber-500 font-black text-xs uppercase tracking-widest">{v.book} {v.chapter}:{v.verse}</span>
                            <button 
                              onClick={() => {
                                const b = BIBLE_BOOKS.find(book => book.name === v.book);
                                if (b) handleChapterSelect(b, v.chapter);
                              }}
                              className="text-[8px] font-black uppercase opacity-0 group-hover:opacity-40 hover:opacity-100 transition-opacity bg-black/5 px-2 py-1 rounded-full"
                            >
                              Ver Capítulo
                            </button>
                          </div>
                          <p style={{ fontSize: `${settings.fontSize}px`, lineHeight: settings.lineHeight }} className={`transition-all duration-300 ${settings.useSerif ? 'serif-italic italic text-xl' : 'font-medium'}`}>{v.text}</p>
                          <div className="flex gap-4 opacity-0 group-hover:opacity-40 transition-opacity">
                            <button onClick={() => handleCopy(v.text, i, `${v.book} ${v.chapter}:${v.verse}`)} className="text-[9px] font-black uppercase hover:text-amber-500 flex items-center gap-1"><Copy size={12}/> COPIAR</button>
                            <button onClick={() => handleShare(v.text, `${v.book} ${v.chapter}:${v.verse}`)} className="text-[9px] font-black uppercase hover:text-amber-500 flex items-center gap-1"><Share2 size={12}/> WHATSAPP</button>
                          </div>
                        </div>
                      )) : (
                        <div className="text-center py-20 opacity-30">
                          <Search size={40} className="mx-auto mb-4" />
                          <p className="text-[10px] font-black uppercase">Nenhum resultado encontrado.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : !selectedBook ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {BIBLE_BOOKS.map(b => (
                      <button key={b.name} onClick={() => { setSelectedBook(b); setSelectedChapter(null); setSelectedVerse(null); }} className="group p-6 rounded-3xl border border-black/5 hover:border-amber-500 hover:shadow-xl transition-all text-left">
                        <span className="text-amber-500 font-black text-xs block mb-1 opacity-40">{b.abbr[0]}</span>
                        <span className="font-bold text-sm group-hover:text-amber-600 transition-colors uppercase">{b.name}</span>
                      </button>
                    ))}
                  </div>
                ) : selectedChapter ? (
                  <div className="max-w-2xl mx-auto space-y-10">
                    <div className="flex justify-between items-start border-b border-black/5 pb-8">
                       <div>
                         <div className="flex items-center gap-3 mb-2">
                           <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-500">{selectedBook.name}</h3>
                           {bibleSource && (
                             <span className={`text-[7px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${bibleSource === 'github' ? 'bg-ipbGreen-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                               {bibleSource === 'github' ? <Database size={8}/> : <Sparkles size={8}/>}
                               {bibleSource === 'github' ? 'VIA GITHUB' : 'VIA IA'}
                             </span>
                           )}
                         </div>
                         <h2 className="text-6xl font-black serif-italic leading-none">Capítulo {selectedChapter}</h2>
                       </div>
                    </div>
                    <div className="flex flex-col gap-6">
                      {bibleVerses.map((v, i) => (
                        <div 
                          key={i} 
                          ref={(el) => { verseRefs.current[v.verse || (i + 1)] = el; }}
                          className={`flex gap-6 group p-4 rounded-3xl transition-colors ${selectedVerse === (v.verse || (i + 1)) ? 'bg-amber-500/10 ring-1 ring-amber-500/20' : ''}`}
                        >
                          <span className="text-amber-500 font-black text-sm shrink-0 mt-2 italic opacity-50">{v.verse || (i+1)}</span>
                          <div className="flex-1 space-y-3">
                            <p style={{ fontSize: `${settings.fontSize}px`, lineHeight: settings.lineHeight }} className={`transition-all duration-300 ${settings.useSerif ? 'serif-italic italic text-xl' : 'font-medium'}`}>{v.text}</p>
                            <div className="flex gap-4 opacity-0 group-hover:opacity-40 transition-opacity">
                              <button onClick={() => handleCopy(v.text, i, `${selectedBook.name} ${selectedChapter}:${v.verse || i+1}`)} className="text-[9px] font-black uppercase hover:text-amber-500 flex items-center gap-1"><Copy size={12}/> COPIAR</button>
                              <button onClick={() => handleShare(v.text, `${selectedBook.name} ${selectedChapter}:${v.verse || i+1}`)} className="text-[9px] font-black uppercase hover:text-amber-500 flex items-center gap-1"><Share2 size={12}/> WHATSAPP</button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-12 border-t border-black/5">
                       <button onClick={() => navigateChapter('prev')} disabled={selectedChapter === 1} className="flex items-center gap-3 px-8 py-4 rounded-3xl bg-black/5 hover:bg-amber-400 hover:text-black font-black text-[10px] uppercase transition-all disabled:opacity-20"><ChevronLeft size={16}/> Anterior</button>
                       <button onClick={() => navigateChapter('next')} disabled={selectedChapter === selectedBook.chapters} className="flex items-center gap-3 px-8 py-4 rounded-3xl bg-black/5 hover:bg-amber-500 hover:text-black font-black text-[10px] uppercase transition-all disabled:opacity-20">Próximo <ChevronRight size={16}/></button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-20">
                    <h2 className="text-4xl font-black uppercase tracking-tighter mb-4">{selectedBook.name}</h2>
                    <p className="text-xs opacity-40 uppercase tracking-widest mb-10">Selecione o capítulo</p>
                    <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-3">
                      {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(num => (
                        <button key={num} onClick={() => handleChapterSelect(selectedBook, num)} className="aspect-square flex items-center justify-center rounded-2xl bg-black/5 hover:bg-amber-400 hover:text-white font-black transition-all">{num}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeView === 'devotionals' && (
            <div className="space-y-12 animate-in fade-in">
              {!selectedDevotional ? (
                <>
                  <section className="text-center space-y-4">
                    <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">Devocionais</h2>
                    <div className="flex justify-center gap-4 mt-4">
                       <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-ipbGreen-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase outline-none">
                         {Object.keys(ALL_DEVOTIONALS).map(m => <option key={m} value={m}>{m}</option>)}
                       </select>
                    </div>
                  </section>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
                    {ALL_DEVOTIONALS[selectedMonth]?.map(dev => (
                      <button key={dev.id} onClick={() => setSelectedDevotional(dev)} className={`aspect-square flex flex-col items-center justify-center rounded-[30px] border transition-all hover:scale-105 hover:border-amber-400 ${settings.theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100 shadow-sm'}`}>
                        <span className="text-3xl font-black leading-none mb-1">{dev.day}</span>
                        <span className="text-[9px] font-black uppercase opacity-40 tracking-tighter">{dev.month}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="max-w-2xl mx-auto space-y-10 pb-20 animate-in slide-in-from-bottom">
                  <div className="flex items-center justify-between">
                    <button onClick={() => setSelectedDevotional(null)} className="flex items-center gap-2 text-[10px] font-black uppercase opacity-40 hover:opacity-100 transition-opacity"><ArrowLeft size={14}/> Voltar para o mês</button>
                    <button onClick={() => handleShareDevotional(selectedDevotional)} className="flex items-center gap-2 text-[10px] font-black uppercase text-amber-500 hover:opacity-70 transition-opacity"><Share2 size={16}/> Compartilhar</button>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-amber-500 font-black text-xs uppercase tracking-widest">{selectedDevotional.month} {selectedDevotional.day}, {selectedDevotional.year}</h3>
                    <h2 className="text-6xl font-black tracking-tighter leading-[0.9] uppercase">{selectedDevotional.title}</h2>
                  </div>
                  <div className="p-8 bg-amber-500 rounded-[40px] text-white">
                     <Quote size={24} className="mb-4 opacity-30" />
                     <p className="text-xl font-black serif-italic italic leading-tight mb-4">"{selectedDevotional.verse}"</p>
                     <p className="text-[11px] font-black uppercase tracking-widest opacity-60">— {selectedDevotional.reference}</p>
                  </div>
                  <div className="space-y-8">
                     <p className="text-lg leading-relaxed font-medium opacity-80 whitespace-pre-wrap">{selectedDevotional.content}</p>
                     <div className="pt-8 border-t border-black/5 space-y-6">
                        <div>
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-2">Verdade Central</h4>
                          <p className="font-bold italic">{selectedDevotional.truthCentral}</p>
                        </div>
                        <div>
                          <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-2">Oração Sugerida</h4>
                          <p className="font-medium text-sm opacity-70">{selectedDevotional.prayer}</p>
                        </div>
                     </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeView === 'catechism' && (
            <div className="space-y-12 animate-in fade-in">
              <section className="text-center space-y-4">
                <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">Catecismo Maior</h2>
                <p className="text-sm font-bold opacity-40 uppercase tracking-[0.2em]">Instrução para a fé e prática</p>
              </section>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {CATECHISM_CARDS.map(card => <CatechismItemCard key={card.id} card={card} settings={settings} />)}
              </div>
            </div>
          )}

          {activeView === 'manual' && (
            <div className="space-y-12 animate-in fade-in pb-20">
              <section className="text-center space-y-4">
                <h2 className="text-4xl font-black tracking-tighter uppercase leading-none">Manual Presbiteriano</h2>
                <p className="text-sm font-bold opacity-40 uppercase tracking-[0.2em]">Normas e Princípios da IPB</p>
              </section>

              <div className="max-w-4xl mx-auto space-y-8">
                <SearchBar 
                  value={manualQuery} 
                  onChange={setManualQuery} 
                  onSearch={handleManualSearch} 
                  placeholder="Pesquisar no Manual..." 
                  theme={settings.theme} 
                />

                {manualResults.length > 0 ? (
                  <div className="space-y-6 animate-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-center px-4">
                      <h3 className="text-[10px] font-black uppercase opacity-40">{manualResults.length} resultados encontrados</h3>
                      <button onClick={() => setManualResults([])} className="text-[10px] font-black uppercase text-amber-500 underline">Limpar</button>
                    </div>
                    {manualResults.map((res, i) => (
                      <div key={i} className={`p-8 rounded-[40px] border ${settings.theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100 shadow-md'}`}>
                        <div className="flex items-center gap-3 mb-3">
                           <span className="text-[9px] font-black uppercase text-amber-500 tracking-widest">{res.docTitle}</span>
                           <ChevronRightIcon size={10} className="opacity-20" />
                           <span className="text-[9px] font-black uppercase opacity-40">{res.type}</span>
                        </div>
                        <h4 className="font-black uppercase text-sm mb-4">{res.title}</h4>
                        <p className="text-sm leading-relaxed opacity-80 italic">"{res.text}"</p>
                        {res.analise && (
                          <div className="mt-6 pt-6 border-t border-black/5 space-y-4">
                             <p className="text-xs font-medium leading-relaxed opacity-70"><strong className="uppercase text-[9px] text-amber-600 block mb-1">Contexto:</strong> {res.analise.resumo_simples}</p>
                             <div className="flex flex-wrap gap-2">
                               {res.analise.conceitos_chave?.map((tag: string) => (
                                 <span key={tag} className="px-2 py-1 bg-black/5 rounded-lg text-[8px] font-black uppercase tracking-tighter opacity-40">{tag}</span>
                               ))}
                             </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : manualData ? (
                  <div className="space-y-8">
                    {/* Capa de Rosto Introdutória */}
                    {!selectedManualDoc && !selectedManualChapter && (
                      <div className={`p-12 rounded-[60px] border shadow-2xl text-center space-y-8 animate-in fade-in zoom-in-95 ${settings.theme === 'dark' ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-slate-100'}`}>
                        <div className="space-y-2">
                          <p className="text-amber-500 font-black text-[10px] uppercase tracking-[0.4em]">{manualData.metadados.organizacao}</p>
                          <h1 className="text-5xl md:text-7xl font-black serif-italic leading-none tracking-tighter uppercase">{manualData.metadados.titulo_documento}</h1>
                          <div className="w-24 h-1 bg-amber-400 mx-auto my-6"></div>
                        </div>
                        <div className="flex justify-center gap-12 text-[10px] font-black uppercase tracking-widest opacity-60">
                          <div className="flex flex-col gap-1"><span>Edição</span><span className="text-amber-500 text-lg">{manualData.metadados.edicao}</span></div>
                          <div className="w-px h-10 bg-black/10 self-center" />
                          <div className="flex flex-col gap-1"><span>Editora</span><span className="text-amber-500 text-lg">{manualData.metadados.editora}</span></div>
                        </div>
                        <p className="max-w-xl mx-auto text-sm md:text-base leading-relaxed font-medium opacity-70 italic">
                          "{manualData.metadados.proposito_manual}"
                        </p>
                      </div>
                    )}

                    {/* Navigation Breadcrumbs */}
                    {(selectedManualDoc || selectedManualChapter) && (
                      <div className="flex items-center gap-2 mb-4 animate-in fade-in">
                        <button onClick={() => {setSelectedManualDoc(null); setSelectedManualChapter(null);}} className="text-[10px] font-black uppercase opacity-40 hover:opacity-100">Índice</button>
                        {selectedManualDoc && (
                          <>
                            <ChevronRightIcon size={12} className="opacity-20" />
                            <button onClick={() => setSelectedManualChapter(null)} className="text-[10px] font-black uppercase opacity-40 hover:opacity-100 max-w-[200px] truncate">{selectedManualDoc.tipo_documento_legal}</button>
                          </>
                        )}
                        {selectedManualChapter && (
                          <>
                            <ChevronRightIcon size={12} className="opacity-20" />
                            <span className="text-[10px] font-black uppercase text-amber-500 max-w-[200px] truncate">{selectedManualChapter.titulo}</span>
                          </>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 gap-4">
                      {!selectedManualDoc ? manualData.conteudo.map((doc: any, i: number) => (
                        <button key={i} onClick={() => setSelectedManualDoc(doc)} className={`p-8 rounded-[50px] border shadow-sm text-left hover:border-amber-500 transition-all flex justify-between items-center group ${settings.theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-slate-100'}`}>
                           <div className="flex items-center gap-6">
                             <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center group-hover:scale-110 transition-transform"><Layers size={24}/></div>
                             <h4 className="font-black uppercase text-base">{doc.tipo_documento_legal}</h4>
                           </div>
                           <ChevronRightIcon size={24} className="opacity-20 group-hover:opacity-100 transition-all" />
                        </button>
                      )) : !selectedManualChapter ? selectedManualDoc.capitulos.map((cap: any, i: number) => (
                        <button key={i} onClick={() => setSelectedManualChapter(cap)} className={`p-8 rounded-[40px] border shadow-sm text-left hover:border-amber-500 transition-all flex justify-between items-center group ${settings.theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-slate-100'}`}>
                           <div className="flex items-center gap-6">
                             <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center font-black text-xs">{i+1}</div>
                             <h4 className="font-black uppercase text-sm leading-tight">{cap.titulo}</h4>
                           </div>
                           <ChevronRightIcon size={18} className="opacity-20 group-hover:opacity-100 transition-all" />
                        </button>
                      )) : (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                          {selectedManualChapter.texto_original && (
                            <div className={`p-10 rounded-[50px] border ${settings.theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-slate-100 shadow-lg'}`}>
                               <span className="text-[10px] font-black uppercase text-amber-500 mb-4 block">Texto Geral</span>
                               <p className="text-sm md:text-base leading-relaxed opacity-80 whitespace-pre-wrap">{selectedManualChapter.texto_original}</p>
                            </div>
                          )}
                          
                          {selectedManualChapter.artigos?.map((art: any, i: number) => (
                            <div key={i} className={`p-10 rounded-[50px] border ${settings.theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-slate-100 shadow-md'}`}>
                               <div className="flex justify-between items-start mb-6">
                                  <span className="px-4 py-1.5 rounded-full bg-amber-500 text-white text-[10px] font-black uppercase tracking-widest">Artigo {art.artigo}</span>
                               </div>
                               <p className="text-sm md:text-base leading-relaxed font-medium italic opacity-90 mb-8">"{art.texto_original}"</p>
                               
                               {art.analise_ia && (
                                 <div className="pt-8 border-t border-black/5 space-y-6">
                                    <div>
                                      <h5 className="text-[9px] font-black uppercase text-amber-600 mb-2 tracking-widest flex items-center gap-2"><Lightbulb size={12}/> Resumo Simples</h5>
                                      <p className="text-xs md:text-sm leading-relaxed opacity-70">{art.analise_ia.resumo_simple || art.analise_ia.resumo_simples}</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                       <div>
                                         <h5 className="text-[9px] font-black uppercase text-amber-600 mb-2 tracking-widest">Conceitos-Chave</h5>
                                         <div className="flex flex-wrap gap-2">
                                           {art.analise_ia.conceitos_chave?.map((tag: string) => (
                                             <span key={tag} className="px-3 py-1 bg-black/5 rounded-lg text-[9px] font-bold opacity-60">{tag}</span>
                                           ))}
                                         </div>
                                       </div>
                                       {art.analise_ia.contexto_teologico && (
                                         <div>
                                            <h5 className="text-[9px] font-black uppercase text-amber-600 mb-2 tracking-widest">Contexto Teológico</h5>
                                            <p className="text-[11px] leading-relaxed opacity-60">{art.analise_ia.contexto_teologico}</p>
                                         </div>
                                       )}
                                    </div>
                                 </div>
                               )}
                            </div>
                          ))}

                          {selectedManualChapter.secoes?.map((sec: any, i: number) => (
                            <div key={i} className="space-y-4">
                               <div className="bg-amber-500 text-white px-6 py-3 rounded-2xl flex items-center gap-3">
                                 <span className="font-black text-xs uppercase">Seção {sec.numero}</span>
                                 <div className="w-1 h-4 bg-black/20" />
                                 <span className="font-black text-[10px] uppercase tracking-widest">{sec.titulo}</span>
                               </div>
                               {sec.artigos?.map((art: any, j: number) => (
                                 <div key={j} className={`p-10 rounded-[50px] border ${settings.theme === 'dark' ? 'bg-zinc-900 border-zinc-800 text-white' : 'bg-white border-slate-100 shadow-md'}`}>
                                    <span className="text-amber-500 font-black text-[10px] uppercase tracking-widest mb-4 block">Artigo {art.artigo}</span>
                                    <p className="text-sm md:text-base leading-relaxed opacity-80 italic mb-6">"{art.texto_original}"</p>
                                    {art.analise_ia && (
                                       <div className="pt-6 border-t border-black/5 opacity-70">
                                         <p className="text-xs leading-relaxed"><strong className="text-amber-600 uppercase text-[9px]">Resumo:</strong> {art.analise_ia.resumo_simples}</p>
                                       </div>
                                    )}
                                 </div>
                               ))}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-20 text-center opacity-30 animate-pulse">
                    <Loader2 className="animate-spin mx-auto mb-4" size={40} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Sincronizando com GitHub...</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Floating Settings Toggle */}
      <div className="fixed bottom-6 right-6 z-[250] flex flex-col gap-3">
         <button onClick={() => setIsSettingsOpen(true)} className="w-14 h-14 bg-amber-500 text-white rounded-full shadow-2xl flex items-center justify-center border-2 border-amber-400 hover:scale-110 transition-all"><Settings size={24}/></button>
      </div>

      {/* Settings Panel */}
      {isSettingsOpen && <div onClick={() => setIsSettingsOpen(false)} className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[300]" />}
      <div className={`fixed inset-y-0 right-0 w-80 z-[310] transform transition-transform duration-500 ease-out-expo ${isSettingsOpen ? 'translate-x-0' : 'translate-x-full'} ${settings.theme === 'dark' ? 'bg-zinc-900 text-zinc-100 border-l border-zinc-800' : settings.theme === 'sepia' ? 'bg-[#f4ecd8] text-[#5b4636]' : 'bg-white text-slate-800 border-l border-slate-100'} shadow-2xl p-8 overflow-y-auto`}>
        <div className="flex items-center justify-between mb-8"><h3 className="text-xs font-black uppercase tracking-widest">Leitura</h3><button onClick={() => setIsSettingsOpen(false)}><X size={20}/></button></div>
        <div className="space-y-10">
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase opacity-50 flex items-center gap-2"><Palette size={12}/> Tema</label>
            <div className="grid grid-cols-3 gap-2">
              {(['light', 'sepia', 'dark'] as const).map(t => (
                <button key={t} onClick={() => updateSetting('theme', t)} className={`py-4 rounded-xl border text-[9px] font-black uppercase ${settings.theme === t ? 'bg-amber-400 text-black border-amber-500 shadow-md' : 'bg-black/5 border-transparent'}`}>{t}</button>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase opacity-50">Fonte</label>
            <div className="flex items-center gap-4">
              <button onClick={() => updateSetting('fontSize', Math.max(14, settings.fontSize - 2))} className="p-3 border rounded-xl"><Minus size={16}/></button>
              <span className="flex-1 text-center font-bold text-sm">{settings.fontSize}px</span>
              <button onClick={() => updateSetting('fontSize', Math.min(42, settings.fontSize + 2))} className="p-3 border rounded-xl"><Plus size={16}/></button>
            </div>
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase opacity-50">Estilo</label>
            <button onClick={() => updateSetting('useSerif', !settings.useSerif)} className={`w-full py-4 rounded-xl border text-[9px] font-black uppercase ${settings.useSerif ? 'bg-amber-500 text-white border-amber-500' : 'bg-black/5 border-transparent'}`}>{settings.useSerif ? 'Com Serifa (Clássico)' : 'Sem Serifa (Moderno)'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
