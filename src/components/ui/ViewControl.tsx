'use client';

interface ViewControlProps {
  columns: number;
  onChange: (columns: number) => void;
}

const OPTIONS = [1, 5, 10, 50];

export default function ViewControl({ columns, onChange }: ViewControlProps) {
  return (
    <div className="fixed right-3 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-1">
      {OPTIONS.map((n) => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className={`w-8 h-8 text-[10px] font-mono transition-colors ${
            columns === n
              ? 'bg-white text-black'
              : 'bg-zinc-900/80 text-zinc-500 hover:text-white hover:bg-zinc-800'
          }`}
          title={`${n} column${n > 1 ? 's' : ''}`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
