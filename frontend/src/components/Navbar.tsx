import React from 'react';
import { Wind, Database, ShieldCheck, Compass, Download, FolderOpen } from 'lucide-react';
import type { LoadedDataset } from '../types';

interface NavbarProps {
  currentTab: 'data' | 'qc' | 'analysis' | 'export';
  setCurrentTab: (tab: 'data' | 'qc' | 'analysis' | 'export') => void;
  dataset: LoadedDataset | null;
  onOpenDatasetModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  dataset,
  onOpenDatasetModal,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-slate-100 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-sky-500/20">
              <Wind className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg tracking-tight text-white">Wind Resource Editor</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800">
                  Powered by BrightWind
                </span>
              </div>
              <p className="text-xs text-slate-400">Desktop & Web Wind Data Studio</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setCurrentTab('data')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'data'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Database className="w-4 h-4" />
              <span>Dados & Torre</span>
            </button>

            <button
              onClick={() => setCurrentTab('qc')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'qc'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Controle de Qualidade (QC)</span>
            </button>

            <button
              onClick={() => setCurrentTab('analysis')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'analysis'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>Análises Eólicas</span>
            </button>

            <button
              onClick={() => setCurrentTab('export')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currentTab === 'export'
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Download className="w-4 h-4" />
              <span>Exportar (WAsP)</span>
            </button>
          </nav>

          {/* Dataset Status / Switcher */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenDatasetModal}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors shadow-sm cursor-pointer"
              title="Trocar ou carregar dataset"
            >
              <FolderOpen className="w-4 h-4 text-sky-400" />
              <span className="max-w-[140px] truncate text-xs">
                {dataset ? dataset.dataset_id : 'Carregar Torre...'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
