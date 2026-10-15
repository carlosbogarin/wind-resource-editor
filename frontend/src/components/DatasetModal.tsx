import React, { useState } from 'react';
import { X, Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import type { DatasetItem } from '../types';
import { uploadDataset } from '../services/api';

interface DatasetModalProps {
  isOpen: boolean;
  onClose: () => void;
  datasets: DatasetItem[];
  currentDatasetId?: string;
  onSelectDataset: (id: string) => void;
  onDatasetUploaded: () => void;
}

export const DatasetModal: React.FC<DatasetModalProps> = ({
  isOpen,
  onClose,
  datasets,
  currentDatasetId,
  onSelectDataset,
  onDatasetUploaded,
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    try {
      const res = await uploadDataset(file);
      onDatasetUploaded();
      onSelectDataset(res.dataset_id);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar arquivo.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-semibold text-white">Carregar Dados de Medição</h3>
            <p className="text-xs text-slate-400">
              Selecione um dataset padrão do BrightWind ou envie seu arquivo de torre (.csv, .txt, .dat)
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="flex items-center space-x-2 text-rose-400 bg-rose-950/40 border border-rose-800/50 p-3 rounded-xl text-sm">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Upload Area */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
              Enviar Arquivo de Torre Anemométrica
            </label>
            <label className="border-2 border-dashed border-slate-700 hover:border-sky-500/50 bg-slate-950/50 rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-colors group">
              <input
                type="file"
                accept=".csv,.txt,.dat,.tim"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              {uploading ? (
                <div className="flex flex-col items-center space-y-2 text-sky-400">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <span className="text-sm font-medium">Processando arquivo...</span>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-2 text-slate-400 group-hover:text-sky-400 transition-colors">
                  <Upload className="w-8 h-8" />
                  <span className="text-sm font-medium">Clique para escolher ou arraste o arquivo</span>
                  <span className="text-xs text-slate-500">Formatos compatíveis: CSV, Campbell Scientific, Windographer TXT</span>
                </div>
              )}
            </label>
          </div>

          {/* Built-in Datasets */}
          <div>
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
              Datasets de Referência (Prontos para Uso)
            </label>
            <div className="space-y-2">
              {datasets.map((item) => {
                const isSelected = item.id === currentDatasetId;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelectDataset(item.id);
                      onClose();
                    }}
                    className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-sky-950/30 border-sky-500/60 ring-1 ring-sky-500/30'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${isSelected ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-400'}`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white flex items-center space-x-2">
                          <span>{item.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {item.type}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                      </div>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-sky-400 flex-shrink-0" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
