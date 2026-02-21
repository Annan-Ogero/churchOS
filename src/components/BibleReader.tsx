import React, { useState, useEffect } from 'react';
import { BookOpen, X, Search, ChevronLeft, ChevronRight, Sparkles, Minimize2, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { bibleService, BibleResponse } from '../services/bibleService';
import { aiService } from '../services/aiService';

interface BibleReaderProps {
  context: string;
}

export const BibleReader: React.FC<BibleReaderProps> = ({ context }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [query, setQuery] = useState('John 3');
  const [passage, setPassage] = useState<BibleResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const fetchPassage = async (ref: string) => {
    setIsLoading(true);
    const result = await bibleService.getPassage(ref);
    if (result) {
      setPassage(result);
      setQuery(result.reference);
    }
    setIsLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      fetchPassage(query);
    }
  };

  const getSmartSuggestion = async () => {
    setIsLoading(true);
    try {
      const ref = await aiService.getVerseSuggestion(context);
      if (ref) {
        setSuggestion(ref.trim());
        fetchPassage(ref.trim());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !passage) {
      fetchPassage('John 1');
    }
  }, [isOpen]);

  return (
    <>
      {/* Floating Toggle Button */}
      <button 
        onClick={() => {
          setIsOpen(true);
          setIsMinimized(false);
        }}
        className={`fixed bottom-24 md:bottom-8 left-8 h-14 bg-slate-900 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-slate-800 transition-all z-50 group ${isOpen && !isMinimized ? 'scale-0 opacity-0' : 'scale-100 opacity-100'} ${isMinimized && passage ? 'px-6 w-auto' : 'w-14'}`}
      >
        <BookOpen size={24} className={isMinimized && passage ? 'mr-2' : ''} />
        {isMinimized && passage && (
          <span className="text-sm font-bold truncate max-w-[120px]">{passage.reference}</span>
        )}
        <span className="absolute left-full ml-4 bg-slate-900 text-white px-3 py-1 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          {isMinimized ? 'Restore Bible' : 'Open Bible'}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && !isMinimized && (
          <motion.div 
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            className="fixed bottom-24 md:bottom-8 left-8 w-80 md:w-96 h-[600px] bg-white rounded-3xl shadow-2xl border border-slate-200 flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-emerald-400" />
                <span className="font-bold">Scripture Reader</span>
              </div>
              <div className="flex items-center gap-1">
                <button 
                  onClick={getSmartSuggestion}
                  title="Smart Suggestion"
                  className="p-1.5 hover:bg-white/10 rounded-lg text-emerald-400"
                >
                  <Sparkles size={18} />
                </button>
                <button 
                  onClick={() => setIsMinimized(true)}
                  className="p-1.5 hover:bg-white/10 rounded-lg"
                >
                  <Minimize2 size={18} />
                </button>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="p-3 border-b border-slate-100 bg-slate-50">
              <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter reference (e.g. John 3:16)"
                  className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </form>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {isLoading ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-6 bg-slate-100 rounded w-1/2 mx-auto"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-100 rounded w-full"></div>
                    <div className="h-4 bg-slate-100 rounded w-full"></div>
                    <div className="h-4 bg-slate-100 rounded w-3/4"></div>
                  </div>
                </div>
              ) : passage ? (
                <div className="prose prose-slate max-w-none">
                  <h3 className="text-center text-xl font-bold text-slate-900 mb-6">{passage.reference}</h3>
                  <div className="space-y-4 text-slate-700 leading-relaxed text-lg">
                    {passage.verses.map((v, i) => (
                      <p key={i}>
                        <sup className="text-emerald-600 font-bold mr-2">{v.verse}</sup>
                        {v.text}
                      </p>
                    ))}
                  </div>
                  <div className="mt-8 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
                    Translation: {passage.translation_name}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <BookOpen size={48} className="mx-auto mb-4 opacity-10" />
                  <p>Search for a passage to begin reading.</p>
                </div>
              )}
            </div>

            {/* Footer / Navigation */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <button className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
                <ChevronLeft size={18} />
                Prev
              </button>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">KJV</span>
              <button className="flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
                Next
                <ChevronRight size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
