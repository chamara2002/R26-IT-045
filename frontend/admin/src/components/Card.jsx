import React from 'react';

export const Card = ({ 
  title, 
  subtitle = null,
  children, 
  className = '', 
  headerAction = null,
  loading = false,
}) => {
  return (
    <div className={`rounded-2xl border border-slate-200/90 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden ${className}`}>
      {title && (
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 px-6 py-4.5 border-b border-slate-100 bg-slate-50/40">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">{title}</h3>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      <div className="p-6">
        {loading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-slate-100 rounded w-3/4"></div>
            <div className="h-4 bg-slate-100 rounded w-1/2"></div>
            <div className="h-4 bg-slate-100 rounded w-5/6"></div>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

export const StatCard = ({ 
  label, 
  value, 
  icon: Icon, 
  color = 'emerald',
  trend = null,
  subtitle = null,
}) => {
  const colorSchemes = {
    emerald: {
      bg: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
      badge: 'bg-emerald-50 text-emerald-700',
    },
    blue: {
      bg: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
      badge: 'bg-blue-50 text-blue-700',
    },
    amber: {
      bg: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
      badge: 'bg-amber-50 text-amber-700',
    },
    red: {
      bg: 'bg-red-500/10 text-red-700 border-red-500/20',
      badge: 'bg-red-50 text-red-700',
    },
    purple: {
      bg: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
      badge: 'bg-purple-50 text-purple-700',
    },
  };

  const scheme = colorSchemes[color] || colorSchemes.emerald;

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm hover:shadow-md transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500 tracking-wide mb-1 uppercase">{label}</p>
          <h4 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{value}</h4>
          {subtitle && <p className="text-xs text-slate-500 mt-1">{subtitle}</p>}
          {trend && (
            <span className={`inline-flex items-center text-[11px] font-bold px-2 py-0.5 mt-2 rounded-md ${scheme.badge}`}>
              {trend}
            </span>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl border ${scheme.bg} flex items-center justify-center`}>
            <Icon size={24} />
          </div>
        )}
      </div>
    </div>
  );
};

Card.Stat = StatCard;

export default Card;
