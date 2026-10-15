import React, { useState, useEffect } from 'react';
import ReactECharts from 'echarts-for-react';
import {
  Compass,
  TrendingUp,
  Activity,
  Calendar,
  BarChart3
} from 'lucide-react';
import type {
  LoadedDataset,
  WindRoseData,
  WindShearData,
  TurbulenceData,
  Matrix12x24Data,
  WeibullData
} from '../../types';
import {
  fetchWindRose,
  fetchWindShear,
  fetchTurbulence,
  fetch12x24,
  fetchWeibull
} from '../../services/api';

interface AnalysisTabProps {
  dataset: LoadedDataset | null;
}

export const AnalysisTab: React.FC<AnalysisTabProps> = ({ dataset }) => {
  const [subTab, setSubTab] = useState<'rose' | 'shear' | 'ti' | '12x24' | 'weibull'>('rose');

  // Channel selections
  const speedCols = dataset?.columns.filter((c) => c.role === 'speed') || [];
  const dirCols = dataset?.columns.filter((c) => c.role === 'direction') || [];
  const stdCols = dataset?.columns.filter((c) => c.role === 'speed_std') || [];

  const [selectedSpeedCol, setSelectedSpeedCol] = useState<string>(speedCols[0]?.name || '');
  const [selectedDirCol, setSelectedDirCol] = useState<string>(dirCols[0]?.name || '');
  const [selectedStdCol, setSelectedStdCol] = useState<string>(stdCols[0]?.name || '');

  // Analysis Results State
  const [roseData, setRoseData] = useState<WindRoseData | null>(null);
  const [shearData, setShearData] = useState<WindShearData | null>(null);
  const [tiData, setTiData] = useState<TurbulenceData | null>(null);
  const [matrixData, setMatrixData] = useState<Matrix12x24Data | null>(null);
  const [weibullData, setWeibullData] = useState<WeibullData | null>(null);

  const [sectors, setSectors] = useState<number>(16);

  useEffect(() => {
    if (speedCols.length > 0 && !selectedSpeedCol) {
      setSelectedSpeedCol(speedCols[0].name);
    }
    if (dirCols.length > 0 && !selectedDirCol) {
      setSelectedDirCol(dirCols[0].name);
    }
    if (stdCols.length > 0 && !selectedStdCol) {
      setSelectedStdCol(stdCols[0].name);
    }
  }, [dataset]);

  // Load active subtab data
  useEffect(() => {
    if (!selectedSpeedCol) return;

    const loadData = async () => {
      try {
        if (subTab === 'rose' && selectedDirCol) {
          const res = await fetchWindRose(selectedSpeedCol, selectedDirCol, sectors);
          setRoseData(res);
        } else if (subTab === 'shear') {
          // Gather speed columns that have heights
          const anemometers = speedCols
            .filter((c) => c.height !== null)
            .map((c) => ({ column: c.name, height: c.height! }));
          if (anemometers.length >= 2) {
            const res = await fetchWindShear(anemometers);
            setShearData(res);
          }
        } else if (subTab === 'ti' && selectedStdCol) {
          const res = await fetchTurbulence(selectedSpeedCol, selectedStdCol);
          setTiData(res);
        } else if (subTab === '12x24') {
          const res = await fetch12x24(selectedSpeedCol);
          setMatrixData(res);
        } else if (subTab === 'weibull') {
          const res = await fetchWeibull(selectedSpeedCol);
          setWeibullData(res);
        }
      } catch (err) {
        console.error('Failed to load analysis data', err);
      }
    };

    loadData();
  }, [subTab, selectedSpeedCol, selectedDirCol, selectedStdCol, sectors]);

  // --- ECharts Options ---

  // 1. Wind Rose Chart Option (Polar Stacked Bar)
  const getWindRoseOption = () => {
    if (!roseData) return {};

    const speedBinColors = ['#38bdf8', '#0284c7', '#22c55e', '#eab308', '#f97316', '#ef4444'];
    const angles = roseData.sector_data.map((s) => s.label);

    const series = roseData.speed_bin_labels.map((binLabel, binIdx) => ({
      type: 'bar',
      name: binLabel,
      coordinateSystem: 'polar',
      stack: 'wind_speed',
      color: speedBinColors[binIdx % speedBinColors.length],
      data: roseData.sector_data.map((s) => s.speed_bins[binIdx] || 0),
    }));

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc', fontSize: 12 },
      },
      legend: {
        data: roseData.speed_bin_labels,
        textStyle: { color: '#94a3b8' },
        bottom: 0,
      },
      polar: {
        radius: ['10%', '75%'],
      },
      angleAxis: {
        type: 'category',
        data: angles,
        boundaryGap: false,
        splitLine: { show: true, lineStyle: { color: '#1e293b' } },
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
        startAngle: 90, // North at top
      },
      radiusAxis: {
        min: 0,
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLabel: {
          color: '#64748b',
          fontSize: 10,
          formatter: '{value}%',
        },
      },
      series,
    };
  };

  // 2. Wind Shear Profile Option
  const getWindShearOption = () => {
    if (!shearData) return {};

    const profileData = shearData.profile_curve.map((p) => [p.speed, p.height]);
    const measuredData = shearData.measured_points.map((p) => [p.speed, p.height, p.column]);
    const extrapData = shearData.extrapolated_hub_heights.map((p) => [p.power_law_speed, p.hub_height]);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          if (params.seriesName === 'Medições da Torre') {
            return `<b>${params.data[2]}</b><br/>Altura: ${params.data[1]}m<br/>Velocidade: ${params.data[0]} m/s`;
          }
          return `Altura: ${params.data[1]}m<br/>Velocidade: ${params.data[0]} m/s`;
        },
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc', fontSize: 12 },
      },
      legend: {
        data: ['Perfil Ajustado (Power Law)', 'Medições da Torre', 'Extrapolação Hub Height'],
        textStyle: { color: '#94a3b8' },
        top: 0,
      },
      grid: {
        left: '5%',
        right: '5%',
        bottom: '10%',
        top: '12%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: 'Velocidade do Vento (m/s)',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLabel: { color: '#94a3b8' },
      },
      yAxis: {
        type: 'value',
        name: 'Altura do Solo (m)',
        nameTextStyle: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLabel: { color: '#94a3b8' },
      },
      series: [
        {
          name: 'Perfil Ajustado (Power Law)',
          type: 'line',
          smooth: true,
          data: profileData,
          lineStyle: { color: '#38bdf8', width: 2.5 },
          showSymbol: false,
        },
        {
          name: 'Medições da Torre',
          type: 'scatter',
          data: measuredData,
          symbolSize: 12,
          itemStyle: { color: '#22c55e', borderColor: '#ffffff', borderWidth: 1.5 },
        },
        {
          name: 'Extrapolação Hub Height',
          type: 'scatter',
          data: extrapData,
          symbolSize: 10,
          itemStyle: { color: '#f59e0b' },
        },
      ],
    };
  };

  // 3. Turbulence Intensity (TI vs Speed with IEC 61400-1 curves)
  const getTurbulenceOption = () => {
    if (!tiData) return {};

    const meanTi = tiData.speed_bins.map((b) => [b.speed_bin, b.mean_ti]);
    const charTi = tiData.speed_bins.map((b) => [b.speed_bin, b.characteristic_ti_90]);
    const iecA = tiData.speed_bins.map((b) => [b.speed_bin, b.iec_class_a]);
    const iecB = tiData.speed_bins.map((b) => [b.speed_bin, b.iec_class_b]);
    const iecC = tiData.speed_bins.map((b) => [b.speed_bin, b.iec_class_c]);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc', fontSize: 12 },
      },
      legend: {
        data: ['TI Característica (90%)', 'TI Média', 'IEC 61400-1 Classe A', 'IEC 61400-1 Classe B', 'IEC 61400-1 Classe C'],
        textStyle: { color: '#94a3b8', fontSize: 11 },
        top: 0,
      },
      grid: {
        left: '5%',
        right: '5%',
        bottom: '10%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: 'Velocidade do Vento (m/s)',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLabel: { color: '#94a3b8' },
      },
      yAxis: {
        type: 'value',
        name: 'Intensidade de Turbulência (TI)',
        nameTextStyle: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLabel: { color: '#94a3b8' },
      },
      series: [
        {
          name: 'TI Característica (90%)',
          type: 'line',
          data: charTi,
          symbolSize: 8,
          lineStyle: { color: '#38bdf8', width: 2.5 },
          itemStyle: { color: '#38bdf8' },
        },
        {
          name: 'TI Média',
          type: 'line',
          data: meanTi,
          lineStyle: { color: '#94a3b8', type: 'dashed' },
          itemStyle: { color: '#94a3b8' },
        },
        {
          name: 'IEC 61400-1 Classe A',
          type: 'line',
          data: iecA,
          showSymbol: false,
          lineStyle: { color: '#ef4444', width: 1.5 },
        },
        {
          name: 'IEC 61400-1 Classe B',
          type: 'line',
          data: iecB,
          showSymbol: false,
          lineStyle: { color: '#f97316', width: 1.5 },
        },
        {
          name: 'IEC 61400-1 Classe C',
          type: 'line',
          data: iecC,
          showSymbol: false,
          lineStyle: { color: '#22c55e', width: 1.5 },
        },
      ],
    };
  };

  // 4. 12x24 Heatmap Option
  const getMatrix12x24Option = () => {
    if (!matrixData) return {};

    const data: [number, number, number | null][] = [];
    matrixData.matrix.forEach((row, mIdx) => {
      row.forEach((val, hIdx) => {
        data.push([hIdx, mIdx, val]);
      });
    });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        position: 'top',
        formatter: (p: any) => {
          return `${matrixData.months[p.data[1]]} às ${matrixData.hours[p.data[0]]}<br/><b>${p.data[2]} m/s</b>`;
        },
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc', fontSize: 12 },
      },
      grid: {
        left: '5%',
        right: '8%',
        bottom: '10%',
        top: '8%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: matrixData.hours,
        splitArea: { show: true },
        axisLabel: { color: '#94a3b8', interval: 1, fontSize: 11 },
        axisLine: { lineStyle: { color: '#334155' } },
      },
      yAxis: {
        type: 'category',
        data: matrixData.months,
        splitArea: { show: true },
        axisLabel: { color: '#94a3b8', fontSize: 11 },
        axisLine: { lineStyle: { color: '#334155' } },
      },
      visualMap: {
        min: 4,
        max: 12,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '0%',
        inRange: {
          color: ['#0369a1', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'],
        },
        textStyle: { color: '#94a3b8' },
      },
      series: [
        {
          name: 'Velocidade Média',
          type: 'heatmap',
          data,
          label: { show: false },
          emphasis: {
            itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' },
          },
        },
      ],
    };
  };

  // 5. Weibull Histogram & Curve Option
  const getWeibullOption = () => {
    if (!weibullData) return {};

    const histFreqs = weibullData.histogram.map((h) => [h.speed, h.empirical_freq_pct]);
    const pdfCurve = weibullData.fitted_curve.map((c) => [c.speed, c.weibull_pdf_pct]);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#0f172a',
        borderColor: '#334155',
        textStyle: { color: '#f8fafc', fontSize: 12 },
      },
      legend: {
        data: ['Frequência Medida', 'Ajuste de Weibull (PDF)'],
        textStyle: { color: '#94a3b8' },
        top: 0,
      },
      grid: {
        left: '5%',
        right: '5%',
        bottom: '10%',
        top: '12%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: 'Velocidade do Vento (m/s)',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLabel: { color: '#94a3b8' },
      },
      yAxis: {
        type: 'value',
        name: 'Frequência (%)',
        nameTextStyle: { color: '#94a3b8' },
        splitLine: { lineStyle: { color: '#1e293b' } },
        axisLabel: { color: '#94a3b8' },
      },
      series: [
        {
          name: 'Frequência Medida',
          type: 'bar',
          barWidth: '90%',
          data: histFreqs,
          itemStyle: { color: 'rgba(56, 189, 248, 0.5)', borderColor: '#38bdf8' },
        },
        {
          name: 'Ajuste de Weibull (PDF)',
          type: 'line',
          smooth: true,
          data: pdfCurve,
          lineStyle: { color: '#f59e0b', width: 2.5 },
          showSymbol: false,
        },
      ],
    };
  };

  return (
    <div className="space-y-6">
      {/* Subtab Navigation Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-2 rounded-2xl shadow-sm">
        <div className="flex space-x-1">
          <button
            onClick={() => setSubTab('rose')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              subTab === 'rose'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Rosa dos Ventos</span>
          </button>

          <button
            onClick={() => setSubTab('shear')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              subTab === 'shear'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Cisalhamento (Shear)</span>
          </button>

          <button
            onClick={() => setSubTab('ti')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              subTab === 'ti'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Turbulência (TI & IEC)</span>
          </button>

          <button
            onClick={() => setSubTab('12x24')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              subTab === '12x24'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Matriz 12x24</span>
          </button>

          <button
            onClick={() => setSubTab('weibull')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              subTab === 'weibull'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Ajuste Weibull</span>
          </button>
        </div>

        {/* Global Controls for current tab */}
        <div className="flex items-center space-x-3 text-xs">
          <div className="flex items-center space-x-1.5">
            <span className="text-slate-400">Anemômetro:</span>
            <select
              value={selectedSpeedCol}
              onChange={(e) => setSelectedSpeedCol(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-1.5 font-mono"
            >
              {speedCols.map((c) => (
                <option key={c.name} value={c.name}>{c.name} ({c.height}m)</option>
              ))}
            </select>
          </div>

          {subTab === 'rose' && (
            <>
              <div className="flex items-center space-x-1.5">
                <span className="text-slate-400">Palheta:</span>
                <select
                  value={selectedDirCol}
                  onChange={(e) => setSelectedDirCol(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-1.5 font-mono"
                >
                  {dirCols.map((c) => (
                    <option key={c.name} value={c.name}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center space-x-1.5">
                <span className="text-slate-400">Setores:</span>
                <select
                  value={sectors}
                  onChange={(e) => setSectors(parseInt(e.target.value))}
                  className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-1.5 font-mono"
                >
                  <option value={12}>12 setores</option>
                  <option value={16}>16 setores</option>
                </select>
              </div>
            </>
          )}

          {subTab === 'ti' && (
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-400">Desvio Padrão:</span>
              <select
                value={selectedStdCol}
                onChange={(e) => setSelectedStdCol(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-lg p-1.5 font-mono"
              >
                {stdCols.map((c) => (
                  <option key={c.name} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {subTab === 'rose' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-white mb-2">Rosa dos Ventos Direcional & Distribuição por Velocidade</h4>
            <div className="h-[480px]">
              {roseData ? (
                <ReactECharts
                  option={getWindRoseOption()}
                  style={{ height: '100%', width: '100%' }}
                  notMerge={true}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500">Calculando Rosa dos Ventos...</div>
              )}
            </div>
          </div>

          {/* Sector Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm overflow-hidden flex flex-col">
            <h4 className="text-sm font-semibold text-white mb-3">Tabela Setorial de Vento</h4>
            <div className="overflow-y-auto flex-1 max-h-[460px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 sticky top-0 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">Setor</th>
                    <th className="py-2 px-3 text-right">Frequência</th>
                    <th className="py-2 px-3 text-right">Vel. Média</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-slate-300">
                  {roseData?.sector_data.map((s) => (
                    <tr key={s.sector_index} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-semibold text-sky-400">{s.label}</td>
                      <td className="py-2 px-3 text-right">{s.frequency_pct}%</td>
                      <td className="py-2 px-3 text-right">{s.mean_speed} m/s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subTab === 'shear' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-white mb-2">Perfil de Cisalhamento Vertical (Wind Shear)</h4>
            <div className="h-[480px]">
              {shearData ? (
                <ReactECharts
                  option={getWindShearOption()}
                  style={{ height: '100%', width: '100%' }}
                  notMerge={true}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500">Calculando Shear Profile...</div>
              )}
            </div>
          </div>

          {/* Shear Stats & Extrapolations */}
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
              <h4 className="text-sm font-semibold text-white border-b border-slate-800 pb-2">Parâmetros de Perfil</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Expoente Alfa (α)</div>
                  <div className="text-xl font-bold font-mono text-sky-400 mt-1">{shearData?.alpha ?? '—'}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Power Law Fit</div>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                  <div className="text-[11px] text-slate-400 uppercase font-semibold">Rugosidade (z₀)</div>
                  <div className="text-xl font-bold font-mono text-emerald-400 mt-1">{shearData?.roughness_z0 ?? '—'} m</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Log Law Fit</div>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
              <h4 className="text-sm font-semibold text-white mb-3">Extrapolação para Altura do Cubo (Hub Height)</h4>
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-2 px-3">Altura</th>
                    <th className="py-2 px-3 text-right">Vel. Extrapolada</th>
                    <th className="py-2 px-3 text-right">Ganho (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {shearData?.extrapolated_hub_heights.map((e) => (
                    <tr key={e.hub_height} className="hover:bg-slate-800/40">
                      <td className="py-2 px-3 font-semibold text-white">{e.hub_height} m</td>
                      <td className="py-2 px-3 text-right text-sky-400 font-bold">{e.power_law_speed} m/s</td>
                      <td className="py-2 px-3 text-right text-emerald-400">+{e.speed_increase_pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {subTab === 'ti' && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-white">Intensidade de Turbulência (TI) vs Velocidade (IEC 61400-1)</h4>
              {tiData?.char_ti_at_15ms && (
                <div className="text-xs bg-slate-950 border border-slate-800 px-3 py-1 rounded-lg">
                  <span className="text-slate-400">TI Característica a 15 m/s:</span>{' '}
                  <span className="font-mono font-bold text-sky-400">{(tiData.char_ti_at_15ms * 100).toFixed(1)}%</span>
                </div>
              )}
            </div>
            <div className="h-[480px]">
              {tiData ? (
                <ReactECharts
                  option={getTurbulenceOption()}
                  style={{ height: '100%', width: '100%' }}
                  notMerge={true}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500">Calculando Turbulência IEC...</div>
              )}
            </div>
          </div>
        </div>
      )}

      {subTab === '12x24' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-white mb-2">Matriz Diurna-Sazonal (12 Meses x 24 Horas)</h4>
          <p className="text-xs text-slate-400 mb-3">Velocidade média do vento agrupada pela hora do dia e mês do ano (m/s)</p>
          <div className="h-[480px]">
            {matrixData ? (
              <ReactECharts
                option={getMatrix12x24Option()}
                style={{ height: '100%', width: '100%' }}
                notMerge={true}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">Gerando matriz 12x24...</div>
            )}
          </div>
        </div>
      )}

      {subTab === 'weibull' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-white mb-2">Histograma de Frequências & Curva de Weibull</h4>
            <div className="h-[480px]">
              {weibullData ? (
                <ReactECharts
                  option={getWeibullOption()}
                  style={{ height: '100%', width: '100%' }}
                  notMerge={true}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-slate-500">Ajustando parâmetros de Weibull...</div>
              )}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
            <h4 className="text-sm font-semibold text-white border-b border-slate-800 pb-2">Parâmetros Estimados</h4>
            <div className="space-y-3 font-mono">
              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Fator de Forma (k)</div>
                <div className="text-2xl font-bold text-sky-400 mt-1">{weibullData?.k_shape ?? '—'}</div>
                <div className="text-[10px] text-slate-500 font-sans mt-0.5">Largura da distribuição de velocidade</div>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Fator de Escala (c)</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">{weibullData?.c_scale ?? '—'} m/s</div>
                <div className="text-[10px] text-slate-500 font-sans mt-0.5">Escala característica de vento</div>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl">
                <div className="text-[11px] text-slate-400 uppercase font-semibold">Velocidade Média</div>
                <div className="text-2xl font-bold text-amber-400 mt-1">{weibullData?.mean_speed ?? '—'} m/s</div>
                <div className="text-[10px] text-slate-500 font-sans mt-0.5">Média aritmética do período analisado</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
