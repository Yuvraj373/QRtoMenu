import { CloseIcon, SearchIcon } from './Icons';

export default function SearchBar({ value, onChange, placeholder = 'Search for pizzas, shakes...', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
        <SearchIcon className="w-[18px] h-[18px]" />
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label="Search"
        enterKeyHint="search"
        className="w-full h-12 pl-11 pr-11 bg-white text-stone-900 placeholder:text-stone-400 rounded-2xl border border-stone-200 shadow-sm outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15 text-sm font-medium [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-700"
        >
          <span className="grid place-items-center w-7 h-7 rounded-full bg-stone-100"><CloseIcon className="w-4 h-4" /></span>
        </button>
      )}
    </div>
  );
}
