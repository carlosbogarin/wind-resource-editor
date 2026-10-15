import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Sliders,
  CheckCircle2,
  Play,
  Info
} from 'lucide-react';
import type { LoadedDataset, QCResult, TimeseriesResponse } from '../../types';
import { applyQCRules, fetchTimeseries } from '../../services/api';

interface QCTabProps {
  dataset: LoadedDataset | null;
}

export const QCTab: React.FC<QCTabProps> = ({ dataset }) => {
  // Available speed and direction channels
  const speedCols = dataset?.columns.filter((c) => c.role === 'speed').map((c) => c.name) || [];
  const dirCols = dataset?.columns.filter((c) => c.role === 'direction').map((c) => c.name) || [];
  const tempCols = dataset?.columns.filter((c) => c.role === 'temperature').map((c) => c.name) || [];
  const stdCols = dataset?.columns.filter((c) => c.role === 'speed_std').map((c) => c.name) || [];

  // QC Form State
  const [selectedSpeedCol, setSelectedSpeedCol] = useState<string>(speedCols[0] || '');
  const [selectedSecondaryCol, setSelectedSecondaryCol] = useState<string>(speedCols[1] || '');
  const [selectedDirCol, setSelectedDirCol] = useState<string>(dirCols[0] || '');
  const [selectedTempCol, setSelectedTempCol] = useState<string>(tempCols[0] || '');
  const [selectedStdCol, setSelectedStdCol] = useState<string>(stdCols[0] || '');

  // Filter thresholds
  const [minSpeed, setMinSpeed] = useState<number>(0.2);
  const [maxSpeed, setMaxSpeed] = useState<number>(45.0);
  const [enableMastShadow, setEnableMastShadow] = useState<boolean>(true);
  const [shadowStart, setShadowStart] = useState<number>(160);
  const [shadowEnd, setShadowEnd] = useState<number>(200);
  const [enableIcing, setEnableIcing] = useState<boolean>(false);
  const [minTempIcing, setMinTempIcing] = useState<number>(0.0);
  const [minStdFrozen, setMinStdFrozen] = useState<number>(0.05);

  // Results & Chart Data
  const [qcResult, setQcResult] = useState<QCResult | null>(null);
  const [timeseriesData, setTimeseriesData] = useState<TimeseriesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Sync default columns when dataset changes
  useEffect(() => {
    if (speedCols.length > 0 && !selectedSpeedCol) {
      setSelectedSpeedCol(speedCols[0]);
    }
    if (speedCols.length > 1 && !selectedSecondaryCol) {
      setSelectedSecondaryCol(speedCols[1]);
    }
    if (dirCols.length > 0 && !selectedDirCol) {
      setSelectedDirCol(dirCols[0]);
    }
    if (tempCols.length > 0 && !selectedTempCol) {
      setSelectedTempCol(tempCols[0]);
    }
    if (stdCols.length > 0 && !selectedStdCol) {
      setSelectedStdCol(stdCols[0]);
    }
  }, [dataset]);

  // Load timeseries data
  const loadChartData = async () => {
    if (!selectedSpeedCol) return;
    setLoading(true);
    try {
      const activeCols = [selectedSpeedCol];
      if (selectedSecondaryCol && selectedSecondaryCol !== selectedSpeedCol) {
        activeCols.push(selectedSecondaryCol);
      }
      const data = await fetchTimeseries(activeCols, 1800);
      setTimeseriesData(data);
    } catch (err) {
      console.error('Failed to load timeseries data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChartData();
  }, [selectedSpeedCol, selectedSecondaryCol]);

  // Handle Apply QC Rules
  const handleApplyQC = async () => {
    if (!selectedSpeedCol) return;
    setLoading(true);
    try {
      const res = await applyQCRules({
        speed_col: selectedSpeedCol,
        min_speed: minSpeed,
        max_speed: maxSpeed,
        direction_col: enableMastShadow ? selectedDirCol : undefined,
        shadow_sector_start: enableMastShadow ? shadowStart : undefined,
        shadow_sector_end: enableMastShadow ? shadowEnd : undefined,
        temp_col: enableIcing ? selectedTempCol : undefined,
        min_temp_icing: enableIcing ? minTempIcing : undefined,
        std_col: enableIcing ? selectedStdCol : undefined,
        min_std_frozen: enableIcing ? minStdFrozen : undefined,
      });
      setQcResult(res);
      await loadChartData();
    } catch (err) {
      console.error('Failed to apply QC rules', err);
    } finally {
      setLoading(false);
    }
  };

  // ECharts Option for Timeseries
  const getEChartsOption = () => {
    if (!timeseriesData) return {};

    const seriesList: any[] = [];

    // Primary speed
    if (timeseriesData.series[selectedSpeedCol]) {
      seriesList.push({
        name: selectedSpeedCol,
        type: 'line',
        showSymbol: false,
        sampling: 'lttb',
        lineStyle: { width: 1.5, color: '#38bdf8' },
        itemStyle: { color: '#38bdf8' },
        data: timeseriesData.series[selectedSpeedCol],
      });
    }

    // Secondary speed (comparison boom)
    if (selectedSecondaryCol && timeseriesData.series[selectedSecondaryCol]) {
      seriesList.push({
        name: selectedSecondaryCol,
        type: 'line',
        showSymbol: false,
        sampling: 'lttb',
        lineStyle: { width: 1.2, color: '#a855f7', type: 'dashed' },
        itemStyle: { color: '#a855f7' },
        data: timeseriesData.series[selectedSecondaryCol],
      });
    }

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross', label: { backgroundColor: '#1e293b' } },
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc', fontSize: 12 },
      },
      legend: {
        data: [selectedSpeedCol, selectedSecondaryCol].filter(Boolean),
        textStyle: { color: '#94a3b8' },
        top: 0,
        right: 20,
      },
      grid: {
        left: '3%',
        right: '3%',
        bottom: '16%',
        top: '10%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: timeseriesData.timestamps,
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        name: 'Velocidade (m/s)',
        nameTextStyle: { color: '#94a3b8', fontSize: 11 },
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
      },
      dataZoom: [
        {
          type: 'slider',
          show: true,
          xAxisIndex: [0],
          bottom: 10,
          borderColor: '#334155',
          fillerColor: 'rgba(56, 189, 248, 0.15)',
          textStyle: { color: '#94a3b8' },
          handleStyle: { color: '#38bdf8' },
        },
        {
          type: 'inside',
          xAxisIndex: [0],
        },
      ],
      series: seriesList,
    };
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Sidebar: QC Rules Engine */}
      <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-5 shadow-sm">
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <Sliders className="w-5 h-5 text-sky-400" />
          <h3 className="font-semibold text-white text-sm">Filtros & Regras de Limpeza</h3>
        </div>

        {/* Channel Selection */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Anemômetro Principal</label>
            <select
              value={selectedSpeedCol}
              onChange={(e) => setSelectedSpeedCol(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-2 focus:ring-1 focus:ring-sky-500 focus:outline-none"
            >
              {speedCols.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Anemômetro de Comparação</label>
            <select
              value={selectedSecondaryCol}
              onChange={(e) => setSelectedSecondaryCol(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-2 focus:ring-1 focus:ring-sky-500 focus:outline-none"
            >
              <option value="">(Nenhum)</option>
              {speedCols.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Palheta de Direção</label>
            <select
              value={selectedDirCol}
              onChange={(e) => setSelectedDirCol(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-2 focus:ring-1 focus:ring-sky-500 focus:outline-none"
            >
              {dirCols.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Rule 1: Min/Max Speed */}
        <div className="border-t border-slate-800/80 pt-3 space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">Limites de Velocidade (m/s)</label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-slate-500">Mínimo</span>
              <input
                type="number"
                step="0.1"
                value={minSpeed}
                onChange={(e) => setMinSpeed(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-1.5 font-mono"
              />
            </div>
            <div>
              <span className="text-[10px] text-slate-500">Máximo</span>
              <input
                type="number"
                step="1"
                value={maxSpeed}
                onChange={(e) => setMaxSpeed(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-1.5 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Rule 2: Mast Shadow */}
        <div className="border-t border-slate-800/80 pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">Sombra de Torre (Mast Shadow)</label>
            <input
              type="checkbox"
              checked={enableMastShadow}
              onChange={(e) => setEnableMastShadow(e.target.checked)}
              className="accent-sky-500 cursor-pointer"
            />
          </div>
          {enableMastShadow && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-[10px] text-slate-500">Setor Início (°)</span>
                <input
                  type="number"
                  value={shadowStart}
                  onChange={(e) => setShadowStart(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-1.5 font-mono"
                />
              </div>
              <div>
                <span className="text-[10px] text-slate-500">Setor Fim (°)</span>
                <input
                  type="number"
                  value={shadowEnd}
                  onChange={(e) => setShadowEnd(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-1.5 font-mono"
                />
              </div>
            </div>
          )}
        </div>

        {/* Rule 3: Icing & Frozen Sensor */}
        <div className="border-t border-slate-800/80 pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-300">Gelo / Sensor Travado</label>
            <input
              type="checkbox"
              checked={enableIcing}
              onChange={(e) => setEnableIcing(e.target.checked)}
              className="accent-sky-500 cursor-pointer"
            />
          </div>
          {enableIcing && (
            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500">Temp Máx (°C)</span>
                  <input
                    type="number"
                    value={minTempIcing}
                    onChange={(e) => setMinTempIcing(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-1.5 font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500">Std Mín (m/s)</span>
                  <input
                    type="number"
                    step="0.01"
                    value={minStdFrozen}
                    onChange={(e) => setMinStdFrozen(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-1.5 font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            onClick={handleApplyQC}
            disabled={loading}
            className="w-full bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 text-white text-xs font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-md shadow-sky-600/20 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{loading ? 'Calculando...' : 'Aplicar Regras de QC'}</span>
          </button>
        </div>
      </div>

      {/* Main Area: Timeseries Chart & QC Summary */}
      <div className="lg:col-span-3 space-y-4">
        {/* QC Results Header Banner */}
        {qcResult && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-white">
                  Controle de Qualidade Aplicado
                </div>
                <div className="text-xs text-slate-400">
                  {qcResult.valid_points.toLocaleString()} registros válidos ({qcResult.valid_pct}%) de {qcResult.total_points.toLocaleString()}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4 text-xs">
              <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg">
                <span className="text-slate-500">Limites Velocidade:</span>{' '}
                <span className="text-rose-400 font-mono font-medium">
                  {qcResult.flagged_by_rule.speed_out_of_bounds ?? 0}
                </span>
              </div>

              {qcResult.flagged_by_rule.mast_shadow_sector !== undefined && (
                <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg">
                  <span className="text-slate-500">Sombra de Torre:</span>{' '}
                  <span className="text-amber-400 font-mono font-medium">
                    {qcResult.flagged_by_rule.mast_shadow_sector}
                  </span>
                </div>
              )}

              {qcResult.flagged_by_rule.icing_frozen_sensor !== undefined && (
                <div className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg">
                  <span className="text-slate-500">Gelo/Travamento:</span>{' '}
                  <span className="text-cyan-400 font-mono font-medium">
                    {qcResult.flagged_by_rule.icing_frozen_sensor}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timeseries ECharts Container */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3 px-2">
            <div className="flex items-center space-x-2">
              <h4 className="text-sm font-semibold text-white">Série Temporal Interativa</h4>
              {timeseriesData && (
                <span className="text-[11px] text-slate-500">
                  ({timeseriesData.total_raw_points.toLocaleString()} pontos brutos • renderizando {timeseriesData.sampled_points} pontos)
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <Info className="w-3.5 h-3.5 text-sky-400" />
              <span>Use o slider inferior ou o scroll do mouse para aproximar</span>
            </div>
          </div>

          <div className="h-[460px] w-full">
            {timeseriesData ? (
              <ReactECharts
                option={getEChartsOption()}
                style={{ height: '100%', width: '100%' }}
                notMerge={true}
                lazyUpdate={true}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 text-sm">
                Carregando série temporal...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
