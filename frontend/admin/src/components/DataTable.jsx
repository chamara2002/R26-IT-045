import React from 'react';

export const DataTable = ({ 
  columns, 
  data, 
  onRowClick, 
  actions, 
  loading = false 
}) => {
  if (loading) {
    return (
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              {columns.map((col) => (
                <th key={col.key} className="text-left py-3 px-4 font-semibold text-slate-700">
                  {col.label}
                </th>
              ))}
              {actions && <th className="text-right py-3 px-4">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-slate-200 hover:bg-slate-50">
                {columns.map((col) => (
                  <td key={col.key} className="py-4 px-4">
                    <div className="h-4 bg-slate-200 rounded-lg animate-pulse"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500">
        No data available
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-xl">
      <table className="w-full">
        <thead className="bg-slate-50 border-b border-slate-200">
          <tr>
            {columns.map((col) => (
              <th 
                key={col.key} 
                className="text-left py-3 px-4 font-semibold text-slate-700"
              >
                {col.label}
              </th>
            ))}
            {actions && (
              <th className="text-right py-3 px-4 font-semibold text-slate-700">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr 
              key={row.id || idx} 
              className="border-b border-slate-200 hover:bg-slate-50 cursor-pointer transition"
              onClick={() => onRowClick && onRowClick(row)}
            >
              {columns.map((col) => (
                <td key={col.key} className="py-4 px-4 text-slate-800">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
              {actions && (
                <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-2 justify-end">
                    {actions.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => action.onClick(row)}
                        className={`px-3 py-1.5 rounded-lg text-white text-sm font-medium transition ${
                          action.className || 'bg-emerald-600 hover:bg-emerald-700'
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
  );
};

export default DataTable;
