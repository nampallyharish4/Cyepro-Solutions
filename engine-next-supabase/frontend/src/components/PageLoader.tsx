/* Reusable page-content skeleton / spinner loader */

/** Spinning triple-ring used inside pages while data loads */
export function PageLoader({ label = 'Loading data…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-24">
      {/* Triple-ring spinner */}
      <div className="relative h-14 w-14">
        <div
          className="absolute inset-0 rounded-full border-2 border-transparent"
          style={{
            borderTopColor: '#a855f7',
            borderRightColor: '#a855f7',
            animation: 'pr-spin 1.4s cubic-bezier(0.65,0,0.35,1) infinite',
          }}
        />
        <div
          className="absolute rounded-full border-2 border-transparent"
          style={{
            inset: '6px',
            borderBottomColor: '#10b981',
            borderLeftColor: '#10b981',
            animation: 'pr-spin 1.0s cubic-bezier(0.65,0,0.35,1) infinite reverse',
          }}
        />
        <div
          className="absolute rounded-full border-2 border-transparent"
          style={{
            inset: '12px',
            borderTopColor: 'rgba(168,85,247,0.45)',
            borderRightColor: 'rgba(16,185,129,0.45)',
            animation: 'pr-spin 0.7s linear infinite',
          }}
        />
      </div>

      {/* Pulsing dots */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="block h-1.5 w-1.5 rounded-full bg-purple-500"
            style={{ animation: `pr-dot 1.2s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>

      <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-600">
        {label}
      </span>

      <style>{`
        @keyframes pr-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes pr-dot {
          0%, 100% { opacity: 0.2; transform: scale(0.75); }
          50%       { opacity: 1;   transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}

/** Skeleton row used in tables / lists while data loads */
export function SkeletonRow({ cols = 4, rows = 5 }: { cols?: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, ri) => (
        <tr key={ri} className="border-b border-white/5">
          {Array.from({ length: cols }).map((_, ci) => (
            <td key={ci} className="px-6 py-4">
              <div
                className="h-4 rounded-lg bg-white/5"
                style={{
                  width: `${55 + ((ri * 3 + ci * 7) % 35)}%`,
                  animation: `skeleton-pulse 1.6s ease-in-out ${(ri * 0.1 + ci * 0.05).toFixed(2)}s infinite`,
                }}
              />
            </td>
          ))}
        </tr>
      ))}
      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.9; }
        }
      `}</style>
    </>
  );
}

/** Card skeleton for card-based layouts */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="glass-card p-4 space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-3 rounded-lg bg-white/5"
          style={{
            width: i === 0 ? '60%' : i === lines - 1 ? '40%' : '85%',
            animation: `skeleton-pulse 1.6s ease-in-out ${(i * 0.12).toFixed(2)}s infinite`,
          }}
        />
      ))}
      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
