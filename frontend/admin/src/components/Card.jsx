import React from 'react';

export const Card = ({ 
  title, 
  children, 
  className = '', 
  headerAction = null 
}) => {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {title && (
        <div className="flex justify-between items-center p-6 pb-0 mb-4">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          {headerAction}
        </div>
      )}
      <div className="p-6 pt-0">
        {children}
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
}) => {
  const colorClasses = {
    emerald: 'bg-emerald-50 text-emerald-600',
    slate: 'bg-slate-50 text-slate-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500 text-sm mb-1">{label}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
          {trend && (
            <p className={`text-xs mt-2 ${trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {trend >= 0 ? '+' : ''}{trend}% vs last month
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-3 rounded-2xl ${colorClasses[color]}`}>
            <Icon size={32} />
          </div>
        )}
      </div>
    </div>
  );
};

Card.Stat = StatCard;

export default Card;
