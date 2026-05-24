import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (maxPages: number, columns: number) => void;
}

export function PdfExportModal({ isOpen, onClose, onExport }: PdfExportModalProps) {
  const [maxPages, setMaxPages] = useState<number>(1);
  const [columns, setColumns] = useState<number>(1);

  // Reset values when modal opens
  useEffect(() => {
    if (isOpen) {
      setMaxPages(1);
      setColumns(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleExport = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid) {
      onExport(maxPages, columns);
    }
  };

  const isMaxPagesValid = maxPages >= 1 && !isNaN(maxPages);
  const isColumnsValid = columns >= 1 && columns <= 4 && !isNaN(columns);
  const isValid = isMaxPagesValid && isColumnsValid;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">Esporta Menu in PDF</h2>
          <button
            onClick={onClose}
            className="rounded-full rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Chiudi"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleExport}>
          <div className="space-y-4">
            <div>
              <label htmlFor="maxPages" className="mb-1 block text-sm font-medium text-gray-700">
                Numero massimo di pagine
              </label>
              <input
                id="maxPages"
                type="number"
                min="1"
                value={maxPages}
                onChange={(e) => setMaxPages(parseInt(e.target.value, 10))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              {!isMaxPagesValid && (
                <p className="mt-1 text-sm text-red-500">Il numero di pagine deve essere almeno 1.</p>
              )}
            </div>

            <div>
              <label htmlFor="columns" className="mb-1 block text-sm font-medium text-gray-700">
                Colonne per pagina (1-4)
              </label>
              <input
                id="columns"
                type="number"
                min="1"
                max="4"
                value={columns}
                onChange={(e) => setColumns(parseInt(e.target.value, 10))}
                className="w-full rounded-md border border-gray-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              {!isColumnsValid && (
                <p className="mt-1 text-sm text-red-500">Le colonne devono essere tra 1 e 4.</p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={!isValid}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Esporta PDF
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
