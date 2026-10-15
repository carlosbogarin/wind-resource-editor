import React, { useState } from 'react';
import {
  Download,
  FileCode,
  FileSpreadsheet,
  CheckCircle,
  Wind
} from 'lucide-react';
import type { LoadedDataset } from '../../types';
import { downloadWaspTab } from '../../services/api';

interface ExportTabProps {
  dataset: LoadedDataset | null;
}

export const ExportTab: React.FC<ExportTabProps> = ({ dataset }) => {
  const speedCols = dataset?.columns.filter((c) => c.role === 'speed') || [];
  const dirCols = dataset?.columns.filter((c) => c.role === 'direction') || [];

  const [mastName, setMastName] = useState<string>('Torre_Eolica_01');
  const [selectedSpeedCol, setSelectedSpeedCol] = useState<string>(speedCols[0]?.name || '');
  const [selectedDirCol, setSelectedDirCol] = useState<string>(dirCols[0]?.name || '');
  const [height, setHeight] = useState<number>(speedCols[0]?.height || 80);
  const [lat, setLat] = useState<number>(-5.1234);
  const [lon, setLon] = useState<number>(-37.5678);
  const [downloadingTab, setDownloadingTab] = useState<boolean>(false);

  const handleExportWasp = async () => {
    if (!selectedSpeedCol || !selectedDirCol) return;
    setDownloadingTab(true);
    try {
      await downloadWaspTab(selectedSpeedCol, selectedDirCol, height, mastName, lat, lon);
    } catch (err) {
      console.error('Failed to export WAsP file', err);
    } finally {
      setDownloadingTab(false);
    }
  };

  const handleDownloadCsv = () => {
    window.open('/api/export/clean-csv?apply_qc=true', '_blank');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* WAsP Export Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5">
        <div className="flex items-center space-x-3 border-b border-slate-800 pb-4">
          <div className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
            <FileCode className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-base">Exportar Arquivo .tab (WAsP)</h3>
            <p className="text-xs text-slate-400">Padrão da indústria para WAsP, Openwind e WindPRO</p>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="text-slate-400 font-semibold block mb-1">Identificador da Torre</label>
            <input
              type="text"
              value={mastName}
              onChange={(e) => setMastName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Canal de Velocidade</label>
              <select
                value={selectedSpeedCol}
                onChange={(e) => {
                  setSelectedSpeedCol(e.target.value);
                  const matched = speedCols.find((c) => c.name === e.target.value);
                  if (matched && matched.height) setHeight(matched.height);
                }}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 font-mono"
              >
                {speedCols.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-slate-400 font-semibold block mb-1">Canal de Direção</label>
              <select
                value={selectedDirCol}
                onChange={(e) => setSelectedDirCol(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 font-mono"
              >
                {dirCols.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-slate-400 font-semibold block mb-1">Altura do Anemômetro (m)</label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(parseFloat(e.target.value) || 0)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Latitude (°)</label>
              <input
                type="number"
                step="0.0001"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 font-mono"
              />
            </div>
            <div>
              <label className="text-slate-400 font-semibold block mb-1">Longitude (°)</label>
              <input
                type="number"
                step="0.0001"
                value={lon}
                onChange={(e) => setLon(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg p-2 font-mono"
              />
            </div>
          </div>

          <button
            onClick={handleExportWasp}
            disabled={downloadingTab}
            className="w-full mt-2 bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md shadow-sky-600/20 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>{downloadingTab ? 'Gerando arquivo .tab...' : 'Baixar Tabela WAsP (.tab)'}</span>
          </button>
        </div>
      </div>

      {/* CSV Export Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-5 flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-3 border-b border-slate-800 pb-4 mb-4">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Exportar Série Limpa (.csv)</h3>
              <p className="text-xs text-slate-400">Dados filtrados com flags aplicadas</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            Baixe o conjunto completo de dados pós-tratamento com as linhas anômalas (congelamento, limites extremos e sombra de torre) devidamente filtradas.
          </p>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-1.5 text-xs text-slate-400">
            <div className="flex items-center space-x-2 text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Compatível com Excel, Pandas, Polars e R</span>
            </div>
            <div className="flex items-center space-x-2 text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Timestamp ISO 8601 padronizado</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleDownloadCsv}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>Baixar Dados Limpos (CSV)</span>
        </button>
      </div>

      {/* Executive Summary Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h3 className="font-semibold text-white text-base border-b border-slate-800 pb-3 flex items-center space-x-2">
          <Wind className="w-4 h-4 text-sky-400" />
          <span>Ficha Técnica do Recurso</span>
        </h3>

        <div className="space-y-3 text-xs text-slate-300">
          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
            <span className="text-slate-400">Dataset Ativo</span>
            <span className="font-mono font-medium text-white">{dataset?.dataset_id}</span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
            <span className="text-slate-400">Período</span>
            <span className="font-mono text-slate-300">
              {dataset?.start_time.split(' ')[0]} até {dataset?.end_time.split(' ')[0]}
            </span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
            <span className="text-slate-400">Total de Linhas</span>
            <span className="font-mono text-slate-300">{dataset?.total_rows.toLocaleString()}</span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
            <span className="text-slate-400">Resolução Temporal</span>
            <span className="font-mono text-sky-400">{dataset?.sampling_interval_min} min</span>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex justify-between items-center">
            <span className="text-slate-400">Motor de Cálculo</span>
            <span className="font-mono text-emerald-400">BrightWind 2.7.0</span>
          </div>
        </div>
      </div>
    </div>
  );
};
