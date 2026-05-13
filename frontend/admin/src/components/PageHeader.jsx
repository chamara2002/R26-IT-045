import React from 'react';

export const AdminPageHeader = ({ title, subtitle, actions = null, className = '' }) => {
  return (
    <div className={`mb-6 flex items-start justify-between gap-4 ${className}`.trim()}>
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-2">{title}</h1>
        {subtitle && <p className="text-slate-600 text-lg">{subtitle}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
};

export default AdminPageHeader;