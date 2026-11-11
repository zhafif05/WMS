import React, { useMemo, useState } from 'react';
import { Check, Search, X } from 'lucide-react';

const MultiSelectTreatment = ({
  options = [],
  value = [],
  onChange,
  label,
  placeholder = 'Cari jenis Treatment...',
  loading = false,
}) => {
  const [query, setQuery] = useState('');
  const selectedIds = value.map(Number);
  const selectedOptions = options.filter((option) => selectedIds.includes(Number(option.id)));
  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((option) =>
      option.treatment_name.toLowerCase().includes(normalizedQuery)
    );
  }, [options, query]);

  const toggleOption = (id) => {
    const numericId = Number(id);
    onChange(
      selectedIds.includes(numericId)
        ? selectedIds.filter((selectedId) => selectedId !== numericId)
        : [...selectedIds, numericId]
    );
  };

  return (
    <div>
      {label && (
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <div className="rounded-xl border border-slate-300 bg-white overflow-hidden">
        <div className="relative border-b border-slate-200">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            className="w-full pl-9 pr-3 py-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/20"
          />
        </div>

        <div className="max-h-40 overflow-y-auto p-1.5">
          {loading && <p className="px-3 py-4 text-xs text-slate-500">Memuat treatment...</p>}
          {!loading && filteredOptions.length === 0 && (
            <p className="px-3 py-4 text-xs text-slate-500">
              {options.length === 0 ? 'Belum ada treatment.' : 'Treatment tidak ditemukan.'}
            </p>
          )}
          {!loading &&
            filteredOptions.map((option) => {
              const isSelected = selectedIds.includes(Number(option.id));
              return (
                <button
                  type="button"
                  key={option.id}
                  onClick={() => toggleOption(option.id)}
                  className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-colors ${
                    isSelected
                      ? 'bg-blue-50 text-blue-800'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-300 bg-white'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </span>
                  <span className="truncate">{option.treatment_name}</span>
                </button>
              );
            })}
        </div>

        <div className="border-t border-slate-200 bg-slate-50/70 px-2.5 py-2">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Kompetensi terpilih
            </span>
            <span className="text-[10px] font-semibold text-blue-700">
              {selectedOptions.length} dipilih
            </span>
          </div>
          {selectedOptions.length === 0 ? (
            <p className="text-[11px] text-slate-400">Belum ada kompetensi dipilih.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {selectedOptions.map((option) => (
                <span
                  key={option.id}
                  className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-100 px-2 py-1 text-[11px] text-blue-800"
                >
                  <span className="max-w-48 truncate">{option.treatment_name}</span>
                  <button
                    type="button"
                    onClick={() => toggleOption(option.id)}
                    aria-label={`Hapus ${option.treatment_name}`}
                    className="rounded-full hover:bg-blue-200"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MultiSelectTreatment;
