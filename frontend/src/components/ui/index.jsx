import React, { useState } from 'react';
import clsx from 'clsx';

export function Button({
  variant = 'primary',
  size = 'md',
  disabled = false,
  isLoading = false,
  children,
  className = '',
  ...props
}) {
  const variants = {
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white dark:bg-emerald-500 dark:hover:bg-emerald-600',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100',
    outline: 'border border-slate-300 hover:bg-slate-50 text-slate-900 dark:border-slate-600 dark:hover:bg-slate-800 dark:text-slate-100',
    danger: 'bg-red-600 hover:bg-red-700 text-white dark:bg-red-500 dark:hover:bg-red-600',
    ghost: 'text-slate-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-slate-800',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900',
        'disabled:opacity-60 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </>
      ) : null}
      {children}
    </button>
  );
}

export function Card({ children, className = '', hover = false, ...props }) {
  return (
    <div
      className={clsx(
        'rounded-xl border bg-white dark:bg-slate-800 dark:border-slate-700 border-slate-200 shadow-sm',
        hover && 'transition-all duration-300 hover:shadow-md hover:-translate-y-1',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function Input({
  label,
  error,
  icon: Icon,
  className = '',
  ...props
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        )}
        <input
          className={clsx(
            'w-full rounded-xl border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 dark:focus:ring-offset-slate-900',
            Icon ? 'pl-9 pr-3.5' : 'px-3.5',
            'py-2 text-xs sm:text-sm h-10',
            error
              ? 'border-red-300 dark:border-red-700 focus:ring-red-500'
              : 'border-slate-200 dark:border-slate-700',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

export function Label({ children, className = '', ...props }) {
  return (
    <label
      className={clsx(
        'block text-sm font-semibold text-slate-700 dark:text-slate-300',
        className
      )}
      {...props}
    >
      {children}
    </label>
  );
}

export function Badge({ variant = 'default', children, className = '' }) {
  const variants = {
    default: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-100',
    success: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100',
  };

  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className = '' }) {
  return (
    <div
      className={clsx(
        'bg-slate-200 dark:bg-slate-700 animate-pulse rounded-lg',
        className
      )}
    />
  );
}

export function Alert({ variant = 'info', message, title, className = '' }) {
  const variants = {
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-100',
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-100',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-100',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-100',
  };

  return (
    <div className={clsx('rounded-lg border p-4', variants[variant], className)}>
      {title && <p className="font-semibold mb-1">{title}</p>}
      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message, action, className = '' }) {
  return (
    <div className={clsx('text-center py-12 px-6', className)}>
      {Icon && (
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Icon className="h-8 w-8 text-slate-400 dark:text-slate-500" />
          </div>
        </div>
      )}
      {title && (
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          {title}
        </h3>
      )}
      {message && (
        <p className="text-slate-600 dark:text-slate-400 max-w-sm mx-auto mb-6">
          {message}
        </p>
      )}
      {action && <div className="flex justify-center">{action}</div>}
    </div>
  );
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  className = '',
}) {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70"
        onClick={onClose}
      />
      <div
        className={clsx(
          'relative bg-white dark:bg-slate-800 rounded-xl shadow-xl p-6 mx-4',
          sizes[size],
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
        <div>{children}</div>
      </div>
    </div>
  );
}

export function Tabs({ tabs, defaultTab = 0, onChange }) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabChange = (index) => {
    setActiveTab(index);
    onChange?.(index);
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => handleTabChange(index)}
            className={clsx(
              'px-4 py-2 font-medium transition-all duration-200 border-b-2',
              activeTab === index
                ? 'border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400'
                : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div>{tabs[activeTab]?.content}</div>
    </div>
  );
}
