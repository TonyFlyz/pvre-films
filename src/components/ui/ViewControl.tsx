'use client';

import { useEffect, useRef, useState } from 'react';

interface ViewControlProps {
  columns: number;
  onChange: (columns: number) => void;
}

const OPTIONS = [1, 5, 10];

export default function ViewControl({ columns, onChange }: ViewControlProps) {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!expanded) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [expanded]);

  return (
    <div
      ref={containerRef}
      className="fixed right-3 top-1/2 -translate-y-1/2 z-30 flex flex-col items-end gap-1"
    >
      {expanded ? (
        OPTIONS.map((n, i) => (
          <button
            key={n}
            onClick={() => {
              onChange(n);
              setExpanded(false);
            }}
            className={`w-8 h-8 text-[10px] font-mono transition-all duration-200 ${
              columns === n
                ? 'bg-white text-black'
                : 'bg-zinc-900/80 text-zinc-500 hover:text-white hover:bg-zinc-800'
            }`}
            style={{
              animation: `viewControlSlideIn 150ms ${i * 40}ms both`,
            }}
            title={`${n} column${n > 1 ? 's' : ''}`}
          >
            {n}
          </button>
        ))
      ) : (
        <button
          onClick={() => setExpanded(true)}
          className="w-8 h-8 text-[10px] font-mono bg-white text-black transition-all duration-200 hover:bg-zinc-200"
          title="Change view"
        >
          {columns}
        </button>
      )}

      <style jsx>{`
        @keyframes viewControlSlideIn {
          from {
            opacity: 0;
            transform: translateX(8px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
