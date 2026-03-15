import React from 'react';
import { cn } from '../../utils/cn';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface TableProps {
  headers: { key: string; label: string; sortable?: boolean; width?: string }[];
  data: any[];
  onSort?: (key: string) => void;
  sortKey?: string;
  sortOrder?: 'asc' | 'desc';
  rowClassName?: (row: any) => string;
  renderCell?: (value: any, key: string, row: any) => React.ReactNode;
  onRowClick?: (row: any) => void;
  loading?: boolean;
  emptyMessage?: string;
}

const Table: React.FC<TableProps> = ({
  headers,
  data,
  onSort,
  sortKey,
  sortOrder,
  rowClassName,
  renderCell,
  onRowClick,
  loading,
  emptyMessage = 'No data available',
}) => {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-neutral-200 shadow-sm">
      <table className="w-full text-sm">
        <thead className="bg-neutral-50 border-b border-neutral-200">
          <tr>
            {headers.map((header) => (
              <th
                key={header.key}
                className={cn(
                  'px-4 py-3 text-left font-semibold text-neutral-700',
                  header.width && `w-[${header.width}]`,
                  header.sortable && 'cursor-pointer hover:bg-neutral-100 transition-colors'
                )}
                onClick={() => header.sortable && onSort?.(header.key)}
              >
                <div className="flex items-center gap-2">
                  {header.label}
                  {header.sortable && sortKey === header.key && (
                    sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-8 text-center">
                <div className="flex justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-primary-600" />
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={headers.length} className="px-4 py-8 text-center text-neutral-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, idx) => (
              <tr
                key={idx}
                className={cn(
                  'border-b border-neutral-200 hover:bg-neutral-50 transition-colors',
                  onRowClick && 'cursor-pointer',
                  rowClassName?.(row)
                )}
                onClick={() => onRowClick?.(row)}
              >
                {headers.map((header) => (
                  <td key={header.key} className="px-4 py-3 text-neutral-700">
                    {renderCell ? renderCell(row[header.key], header.key, row) : row[header.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export { Table };
