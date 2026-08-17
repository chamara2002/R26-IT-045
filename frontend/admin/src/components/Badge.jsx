import React from 'react';

export const Badge = ({ 
  text,
  label,
  variant = 'default',
  color,
  size = 'sm' 
}) => {
  const variants = {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-700 border-amber-200/80',
    danger: 'bg-red-50 text-red-700 border-red-200/80',
    info: 'bg-blue-50 text-blue-700 border-blue-200/80',
    purple: 'bg-purple-50 text-purple-700 border-purple-200/80',
  };

  const sizes = {
    xs: 'text-[10px] px-2 py-0.5 font-bold',
    sm: 'text-xs px-2.5 py-0.5 font-semibold',
    md: 'text-sm px-3 py-1 font-semibold',
  };

  const resolved = color || variant;
  const style = variants[resolved] || variants.default;

  return (
    <span className={`inline-flex items-center rounded-full border ${style} ${sizes[size] || sizes.sm}`}>
      {text ?? label}
    </span>
  );
};

export const AlertBox = ({ 
  type = 'info', 
  title, 
  message, 
  onClose = null 
}) => {
  const types = {
    info: 'bg-blue-50/90 border-blue-200 text-blue-800',
    success: 'bg-emerald-50/90 border-emerald-200 text-emerald-800',
    warning: 'bg-amber-50/90 border-amber-200 text-amber-800',
    error: 'bg-red-50/90 border-red-200 text-red-800',
  };

  return (
    <div className={`p-4 rounded-2xl border ${types[type] || types.info} shadow-sm text-xs`}>
      <div className="flex justify-between items-start">
        <div>
          {title && <p className="font-bold text-sm mb-0.5">{title}</p>}
          <p className="font-medium leading-relaxed">{message}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-lg leading-none hover:opacity-70">&times;</button>
        )}
      </div>
    </div>
  );
};

export default Badge;
