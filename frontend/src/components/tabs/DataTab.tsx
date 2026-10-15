import React from 'react';
import type { LoadedDataset } from '../../types';
import {
  Calendar,
  Layers,
  Gauge,
  Compass,
  Thermometer,
  Activity,
  CheckCircle,
  HelpCircle,
  ArrowUpRight
} from 'lucide-react';

interface DataTabProps {
  dataset: LoadedDataset | null;
  onNavigateToQC: () => void;
  onNavigateToAnalysis: () => void;
}

export const DataTab: React.FC<DataTabProps> = ({
  dataset,
  onNavigateToQC,
  onNavigateToAnalysis,
}) => {
  if (!dataset) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <Layers className="w-12 h-12 text-slate-600 mb-3 animate-pulse" />
        <p className="text-base font-medium text-slate-300">Nenhum dataset carregado</p>
        <p className="text-xs text-slate-500 mt-1">Carregue um dataset no menu superior para começar.</p>
      </div>
    );
  }

  // Count sensors
  const speedSensors = dataset.columns.filter((c) => c.role === 'speed');
  const dirSensors = dataset.columns.filter((c) => c.role === 'direction');
  const tempSensors = dataset.columns.filter((c) => c.role === 'temperature');

  // Overall primary anemometer (highest speed sensor)
  const primaryAnemometer = [...speedSensors].sort((a, b) => (b.height || 0) - (a.height || 0))[0];
  const primaryStats = primaryAnemometer ? dataset.stats[primaryAnemometer.name] : null;

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* KPI 1: Total Records & Resolution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Período de Medição</span>
            <Calendar className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {dataset.total_rows.toLocaleString()} <span className="text-xs font-normal text-slate-400">registros</span>
          </div>
          <div className="text-xs text-slate-400 mt-2 flex flex-col space-y-0.5">
            <div><span className="text-slate-500">Início:</span> {dataset.start_time.split(' ')[0]}</div>
            <div><span className="text-slate-500">Fim:</span> {dataset.end_time.split(' ')[0]}</div>
            <div className="text-sky-400 font-medium">Intervalo: {dataset.sampling_interval_min} minutos</div>
          </div>
        </div>

        {/* KPI 2: Primary Anemometer Speed */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Velocidade Média Topo</span>
            <Gauge className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 tracking-tight">
            {primaryStats?.mean ?? '—'} <span className="text-xs font-normal text-slate-400">m/s</span>
          </div>
          <div className="text-xs text-slate-400 mt-2 flex flex-col space-y-0.5">
            <div><span className="text-slate-500">Sensor:</span> {primaryAnemometer?.name ?? '—'}</div>
            <div><span className="text-slate-500">Altura:</span> {primaryAnemometer?.height ? `${primaryAnemometer.height}m` : 'N/A'}</div>
            <div><span className="text-slate-500">Máx / Mín:</span> {primaryStats?.max ?? '—'} / {primaryStats?.min ?? '—'} m/s</div>
          </div>
        </div>

        {/* KPI 3: Tower Equipment */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Sensores Instalados</span>
            <Layers className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-white tracking-tight">
            {dataset.columns.length} <span className="text-xs font-normal text-slate-400">canais</span>
          </div>
          <div className="text-xs text-slate-400 mt-2 flex flex-col space-y-0.5">
            <div><span className="text-slate-500">Anemômetros:</span> {speedSensors.length} canais</div>
            <div><span className="text-slate-500">Palhetas (Direção):</span> {dirSensors.length} canais</div>
            <div><span className="text-slate-500">Termômetros/Pressão:</span> {tempSensors.length} canais</div>
          </div>
        </div>

        {/* KPI 4: Quick Action Panel */}
        <div className="bg-gradient-to-br from-sky-950/40 via-slate-900 to-slate-900 border border-sky-900/40 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-sky-400 mb-1 flex items-center space-x-1">
              <Activity className="w-3.5 h-3.5" />
              <span>Fluxo de Trabalho</span>
            </div>
            <p className="text-xs text-slate-300">
              Dados importados e mapeados com sucesso. Próximo passo: aplicar regras de controle de qualidade.
            </p>
          </div>
          <div className="flex space-x-2 mt-3">
            <button
              onClick={onNavigateToQC}
              className="flex-1 bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium py-1.5 px-3 rounded-lg flex items-center justify-center space-x-1 transition-colors shadow-sm cursor-pointer"
            >
              <span>Ir para QC</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onNavigateToAnalysis}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium py-1.5 px-3 rounded-lg flex items-center justify-center transition-colors border border-slate-700 cursor-pointer"
            >
              Análises
            </button>
          </div>
        </div>
      </div>

      {/* Sensor Mapping & Quality Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-white">Mapeamento de Sensores e Disponibilidade</h3>
            <p className="text-xs text-slate-400">
              Associação de alturas e orientações identificadas automaticamente pelo BrightWind
            </p>
          </div>
          <span className="text-xs font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-full flex items-center space-x-1">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Mapeamento Ativo</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 uppercase tracking-wider border-b border-slate-800 font-semibold">
              <tr>
                <th className="px-6 py-3">Canal / Sensor</th>
                <th className="px-4 py-3">Classificação</th>
                <th className="px-4 py-3">Altura</th>
                <th className="px-4 py-3">Orientação</th>
                <th className="px-6 py-3 w-48">Disponibilidade (Coverage)</th>
                <th className="px-4 py-3 text-right">Média</th>
                <th className="px-4 py-3 text-right">Mínimo</th>
                <th className="px-4 py-3 text-right">Máximo</th>
                <th className="px-4 py-3 text-right">Desvio Padrão</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {dataset.columns.map((col) => {
                const stat = dataset.stats[col.name];
                const coverage = stat?.coverage_pct ?? 0;

                // Role badge colors & icon
                let roleColor = 'bg-slate-800 text-slate-300 border-slate-700';
                let RoleIcon = HelpCircle;
                if (col.role === 'speed') {
                  roleColor = 'bg-sky-950/60 text-sky-400 border-sky-800';
                  RoleIcon = Gauge;
                } else if (col.role === 'direction') {
                  roleColor = 'bg-amber-950/60 text-amber-400 border-amber-800';
                  RoleIcon = Compass;
                } else if (col.role === 'temperature') {
                  roleColor = 'bg-rose-950/60 text-rose-400 border-rose-800';
                  RoleIcon = Thermometer;
                } else if (col.role === 'speed_std') {
                  roleColor = 'bg-indigo-950/60 text-indigo-400 border-indigo-800';
                  RoleIcon = Activity;
                }

                return (
                  <tr key={col.name} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-white flex items-center space-x-2">
                      <span className="font-mono">{col.name}</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] border ${roleColor}`}>
                        <RoleIcon className="w-3 h-3" />
                        <span className="capitalize">{col.role.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-200">
                      {col.height !== null ? (
                        <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono">
                          {col.height} m
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-slate-400">
                      {col.orientation ? (
                        <span className="px-2 py-0.5 rounded bg-slate-800/80 text-slate-300 font-mono text-[11px]">
                          {col.orientation}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              coverage >= 90
                                ? 'bg-emerald-500'
                                : coverage >= 70
                                ? 'bg-amber-500'
                                : 'bg-rose-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, coverage))}%` }}
                          />
                        </div>
                        <span className="font-mono text-[11px] text-slate-300 w-10 text-right">
                          {coverage}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-200">
                      {stat?.mean !== null && stat?.mean !== undefined ? `${stat.mean} ${col.unit}` : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-400">
                      {stat?.min !== null && stat?.min !== undefined ? `${stat.min} ${col.unit}` : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-400">
                      {stat?.max !== null && stat?.max !== undefined ? `${stat.max} ${col.unit}` : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-400">
                      {stat?.std !== null && stat?.std !== undefined ? `${stat.std} ${col.unit}` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
