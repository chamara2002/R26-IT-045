import React from 'react';

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const baseClass = 'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';
  
  const variants = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 active:scale-[0.98]',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-800 active:scale-[0.98]',
    danger: 'bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20 active:scale-[0.98]',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20 active:scale-[0.98]',
    outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50 active:scale-[0.98]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-xs sm:text-sm',
    lg: 'px-5 py-2.5 text-sm sm:text-base',
  };

  return (
    <button 
      className={`${baseClass} ${variants[variant] || variants.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export const IconButton = ({ 
  icon: Icon, 
  onClick, 
  tooltip = '', 
  className = '',
  ...props 
}) => {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={`p-2 rounded-xl hover:bg-slate-100 transition-colors text-slate-600 hover:text-slate-900 ${className}`}
      {...props}
    >
      <Icon size={18} />
    </button>
  );
};

export default Button;
