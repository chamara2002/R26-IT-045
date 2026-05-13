import React, { useState } from 'react';
import clsx from 'clsx';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function Modal({ isOpen, onClose, title, children, size = 'md' }) {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={clsx(
              'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2',
              'bg-white dark:bg-slate-800 rounded-xl shadow-xl',
              'max-h-[90vh] overflow-y-auto',
              'z-50 w-full mx-4',
              sizes[size]
            )}
          >
            {title && (
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 p-6">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>
            )}
            <div className="p-6">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function Alert({ variant = 'info', title, message, onClose, action }) {
  const variants = {
    info: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
    success: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
    warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
    error: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
  };

  const textVariants = {
    info: 'text-blue-900 dark:text-blue-100',
    success: 'text-green-900 dark:text-green-100',
    warning: 'text-yellow-900 dark:text-yellow-100',
    error: 'text-red-900 dark:text-red-100',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={clsx(
        'rounded-lg border p-4',
        variants[variant]
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {title && (
            <h3 className={clsx('font-semibold', textVariants[variant])}>
              {title}
            </h3>
          )}
          {message && (
            <p className={clsx('text-sm mt-1', textVariants[variant])}>
              {message}
            </p>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className={clsx(
              'ml-2 flex-shrink-0 opacity-70 hover:opacity-100 transition-opacity',
              textVariants[variant]
            )}
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>
      {action && (
        <div className="mt-3 flex gap-2">
          {action}
        </div>
      )}
    </motion.div>
  );
}

export function Tabs({ tabs, defaultTab = 0, onChange }) {
  const [active, setActive] = useState(defaultTab);

  const handleChange = (index) => {
    setActive(index);
    onChange?.(index);
  };

  return (
    <div className="w-full">
      <div className="flex border-b border-slate-200 dark:border-slate-700 gap-1">
        {tabs.map((tab, index) => (
          <button
            key={index}
            onClick={() => handleChange(index)}
            className={clsx(
              'px-4 py-3 text-sm font-medium transition-all duration-200 relative',
              active === index
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-300'
            )}
          >
            {tab.label}
            {active === index && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 dark:bg-emerald-400"
              />
            )}
          </button>
        ))}
      </div>
      <div className="mt-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {tabs[active].content}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="rounded-full bg-slate-100 dark:bg-slate-700 p-4 mb-4">
        <Icon className="h-8 w-8 text-slate-600 dark:text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 max-w-sm">
        {message}
      </p>
      {action && <div className="flex gap-2">{action}</div>}
    </div>
  );
}
