import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DatasetModal } from './components/DatasetModal';
import { DataTab } from './components/tabs/DataTab';
import { QCTab } from './components/tabs/QCTab';
import { AnalysisTab } from './components/tabs/AnalysisTab';
import { ExportTab } from './components/tabs/ExportTab';
import type { DatasetItem, LoadedDataset } from './types';
import { fetchDatasets, loadDataset } from './services/api';
import { Loader2, AlertCircle } from 'lucide-react';

export function App() {
  const [currentTab, setCurrentTab] = useState<'data' | 'qc' | 'analysis' | 'export'>('data');
  const [datasets, setDatasets] = useState<DatasetItem[]>([]);
  const [dataset, setDataset] = useState<LoadedDataset | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initial load
  const loadInitialData = async () => {
    setLoading(true);
    setError(null);
    try {
      const available = await fetchDatasets();
      setDatasets(available);

      // Auto-load demo_data as default
      const defaultId = available[0]?.id || 'demo_data';
      const loaded = await loadDataset(defaultId);
      setDataset(loaded);
    } catch (err: any) {
      console.error('Failed to initialize app', err);
      setError(err.message || 'Erro ao conectar ao servidor backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const handleSelectDataset = async (datasetId: string) => {
    setLoading(true);
    setError(null);
    try {
      const loaded = await loadDataset(datasetId);
      setDataset(loaded);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar o dataset selecionado.');
    } finally {
      setLoading(false);
    }
  };

  const handleDatasetUploaded = async () => {
    const available = await fetchDatasets();
    setDatasets(available);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        dataset={dataset}
        onOpenDatasetModal={() => setIsModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 flex items-center space-x-3 text-rose-400 bg-rose-950/40 border border-rose-800/60 p-4 rounded-2xl text-sm">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <div className="flex-1">
              <span className="font-semibold">Atenção: </span>
              <span>{error}</span>
            </div>
            <button
              onClick={loadInitialData}
              className="text-xs font-semibold bg-rose-900/60 hover:bg-rose-800 px-3 py-1.5 rounded-lg border border-rose-700/60 transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center h-96 space-y-4 text-slate-400">
            <Loader2 className="w-10 h-10 text-sky-400 animate-spin" />
            <span className="text-sm font-medium">Carregando dados da torre e inicializando motor BrightWind...</span>
          </div>
        ) : (
          <>
            {currentTab === 'data' && (
              <DataTab
                dataset={dataset}
                onNavigateToQC={() => setCurrentTab('qc')}
                onNavigateToAnalysis={() => setCurrentTab('analysis')}
              />
            )}

            {currentTab === 'qc' && <QCTab dataset={dataset} />}

            {currentTab === 'analysis' && <AnalysisTab dataset={dataset} />}

            {currentTab === 'export' && <ExportTab dataset={dataset} />}
          </>
        )}
      </main>

      {/* Dataset Selection Modal */}
      <DatasetModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        datasets={datasets}
        currentDatasetId={dataset?.dataset_id}
        onSelectDataset={handleSelectDataset}
        onDatasetUploaded={handleDatasetUploaded}
      />
    </div>
  );
}

export default App;
