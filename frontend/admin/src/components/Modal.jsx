import React from 'react';
import { X } from 'lucide-react';

export const Modal = ({ 
  isOpen = true, 
  onClose, 
  title, 
  children, 
  onConfirm, 
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  isDangerous = false,
  maxWidth = 'max-w-lg',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className={`relative bg-white rounded-3xl shadow-2xl border border-slate-200/90 ${maxWidth} w-full my-8 overflow-hidden z-10 flex flex-col max-h-[90vh]`}>
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4.5 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <h2 className="text-base font-extrabold text-slate-900 tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-200/60 p-1.5 transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Body (Scrollable) */}
        <div className="p-6 text-slate-700 overflow-y-auto flex-1 text-sm">
          {children}
        </div>
        
        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50 justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
          >
            {cancelText}
          </button>
          {onConfirm && (
            <button
              type="button"
              onClick={onConfirm}
              className={`px-4 py-2 rounded-xl text-white font-bold text-xs transition-all shadow-md ${
                isDangerous 
                  ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' 
                  : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
              }`}
            >
              {confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
