import { useState, useEffect, useRef } from 'react';
import { Search, X, FileText, ListTodo } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n/I18nProvider';
import { globalSearch, type SearchResult } from '@/services/search';
import clsx from 'clsx';

export function GlobalSearch() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await globalSearch(query);
        setResults(res);
        setOpen(true);
      } catch (e) {
        console.error('Search error:', e);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (result: SearchResult) => {
    nav(result.link);
    setQuery('');
    setOpen(false);
  };

  const getIcon = (type: SearchResult['type']) => {
    return type === 'inquiry' ? <FileText size={14} /> : <ListTodo size={14} />;
  };

  return (
    <div ref={containerRef} className="relative flex-1 max-w-xs">
      <div className="relative">
        <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          placeholder={t('common.search')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setOpen(true)}
          className="input ps-9 pe-8 text-xs sm:text-sm"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); }}
            className="absolute end-2 top-1/2 -translate-y-1/2 text-muted hover:text-txt"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute top-full start-0 end-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
          {loading && (
            <div className="p-3 text-center text-xs text-muted">
              {t('common.loading')}
            </div>
          )}

          {!loading && results.length === 0 && query && (
            <div className="p-3 text-center text-xs text-muted">
              {t('common.noData')}
            </div>
          )}

          {results.map((result) => (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => handleSelect(result)}
              className="w-full text-start px-3 py-2 border-b border-border last:border-b-0 hover:bg-bg flex items-start gap-2"
            >
              <span className="text-muted mt-0.5 shrink-0">{getIcon(result.type)}</span>
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-sm font-medium truncate">{result.title}</div>
                {result.subtitle && <div className="text-[10px] text-muted truncate">{result.subtitle}</div>}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
