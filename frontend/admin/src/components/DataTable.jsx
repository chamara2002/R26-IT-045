import React from 'react';

export const DataTable = ({ 
  columns, 
  data, 
  onRowClick, 
  actions, 
  loading = false,
  emptyMessage = 'No records found',
}) => {
  if (loading) {
    return (
      <div className="overflow-hidden border border-slate-200 rounded-2xl bg-white shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="h-4 bg-slate-200 rounded w-1/4 animate-pulse"></div>
        </div>
        <div className="p-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 bg-slate-100 rounded w-1/3 animate-pulse"></div>
              <div className="h-4 bg-slate-100 rounded w-1/4 animate-pulse"></div>
              <div className="h-4 bg-slate-100 rounded w-1/4 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50">
        <p className="text-sm font-semibold text-slate-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
              {columns.map((col) => (
                <th key={col.key} className="py-3.5 px-4">
                  {col.label}
                </th>
              ))}
              {actions && <th className="text-right py-3.5 px-4">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, idx) => (
              <tr 
                key={row.id || idx} 
                className={`hover:bg-emerald-50/40 transition-colors ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {columns.map((col) => (
                  <td key={col.key} className="py-3.5 px-4 text-slate-800 align-middle">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
                {actions && (
                  <td className="py-3.5 px-4 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1.5 justify-end items-center">
                      {actions.map((action, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => action.onClick(row)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shadow-sm ${
                            action.className || 'bg-emerald-600 hover:bg-emerald-700 text-white'
                          }`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
