export const LoadingSkeleton = ({ rows = 5 }) => (
  <div className="space-y-4">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="h-12 bg-slate-200 rounded-lg animate-pulse"></div>
    ))}
  </div>
);

export const TableSkeleton = ({ rows = 5, cols = 5 }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex gap-4">
        {Array.from({ length: cols }).map((_, j) => (
          <div key={j} className="flex-1 h-8 bg-slate-200 rounded-lg animate-pulse"></div>
        ))}
      </div>
    ))}
  </div>
);
