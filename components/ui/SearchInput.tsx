// ============================================
// 🔍 Reusable Search Input Component
// ============================================
'use client'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onClear?: () => void
}

export default function SearchInput({
  value,
  onChange,
  placeholder = 'ค้นหา...',
}: SearchInputProps) {
  return (
    <div className="relative max-w-md w-full">
      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-slate-400">
        🔍
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-[#f8f7ff] border border-[rgba(124,58,237,0.15)] hover:border-[rgba(124,58,237,0.3)] focus:border-[#7c3aed] rounded-xl pl-9 pr-4 py-2 text-sm focus:outline-none transition-colors text-[#2d2b3a]"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 text-xs font-bold"
        >
          ล้าง
        </button>
      )}
    </div>
  )
}
