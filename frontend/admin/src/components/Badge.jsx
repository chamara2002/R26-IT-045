import React from 'react';

export const Badge = ({ 
  text,
  label,
  variant = 'default',
  color,
  size = 'md' 
}) => {
  const variants = {
    default: 'bg-slate-100 text-slate-800',
    success: 'bg-emerald-100 text-emerald-800',
    warning: 'bg-amber-100 text-amber-800',
    danger: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    gray: 'bg-slate-100 text-slate-800',
    green: 'bg-emerald-100 text-emerald-800',
    yellow: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
    emerald: 'bg-emerald-100 text-emerald-800',
  };

  const sizes = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2',
  };

  const resolvedVariant = color || variant;

  return (
    <span className={`rounded-full font-medium ${variants[resolvedVariant] || variants.default} ${sizes[size] || sizes.md}`}>
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
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    error: 'bg-red-50 border-red-200 text-red-800',
  };

  return (
    <div className={`border-l-4 p-4 mb-4 rounded ${types[type]}`}>
      <div className="flex justify-between items-start">
        <div>
          {title && <p className="font-semibold">{title}</p>}
          <p className="text-sm">{message}</p>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-xl">&times;</button>
        )}
      </div>
    </div>
  );
};

export default Badge;
