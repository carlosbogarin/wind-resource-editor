import type {
  DatasetItem,
  LoadedDataset,
  TimeseriesResponse,
  QCResult,
  WindRoseData,
  WindShearData,
  TurbulenceData,
  Matrix12x24Data,
  WeibullData
} from '../types';

const API_BASE = '/api';

export async function fetchDatasets(): Promise<DatasetItem[]> {
  const res = await fetch(`${API_BASE}/datasets`);
  if (!res.ok) throw new Error('Failed to fetch datasets');
  return res.json();
}

export async function loadDataset(datasetId: string): Promise<LoadedDataset> {
  const res = await fetch(`${API_BASE}/datasets/load`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataset_id: datasetId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to load dataset');
  }
  return res.json();
}

export async function uploadDataset(file: File): Promise<{ dataset_id: string; filename: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/datasets/upload`, {
    method: 'POST',
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to upload dataset');
  }
  return res.json();
}

export async function fetchTimeseries(
  columns: string[],
  maxPoints: number = 1500,
  startDate?: string,
  endDate?: string
): Promise<TimeseriesResponse> {
  const params = new URLSearchParams({
    columns: columns.join(','),
    max_points: maxPoints.toString(),
  });
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const res = await fetch(`${API_BASE}/timeseries?${params.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch timeseries');
  return res.json();
}

export interface QCRulesPayload {
  speed_col: string;
  min_speed?: number;
  max_speed?: number;
  direction_col?: string;
  shadow_sector_start?: number;
  shadow_sector_end?: number;
  temp_col?: string;
  min_temp_icing?: number;
  std_col?: string;
  min_std_frozen?: number;
}

export async function applyQCRules(rules: QCRulesPayload): Promise<QCResult> {
  const res = await fetch(`${API_BASE}/qc/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(rules),
  });
  if (!res.ok) throw new Error('Failed to apply QC rules');
  return res.json();
}

export async function fetchWindRose(
  speedCol: string,
  dirCol: string,
  sectors: number = 16,
  applyQC: boolean = true
): Promise<WindRoseData> {
  const params = new URLSearchParams({
    speed_col: speedCol,
    direction_col: dirCol,
    sectors: sectors.toString(),
    apply_qc: applyQC.toString(),
  });
  const res = await fetch(`${API_BASE}/analysis/wind-rose?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to calculate wind rose');
  }
  return res.json();
}

export async function fetchWindShear(
  anemometers: { column: string; height: number }[],
  hubHeights: number[] = [100, 120, 140, 160],
  minSpeed: number = 3.0,
  applyQC: boolean = true
): Promise<WindShearData> {
  const res = await fetch(`${API_BASE}/analysis/wind-shear`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      anemometers,
      hub_heights: hubHeights,
      min_speed: minSpeed,
      apply_qc: applyQC,
    }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to calculate wind shear');
  }
  return res.json();
}

export async function fetchTurbulence(
  speedCol: string,
  stdCol: string,
  minSpeed: number = 3.0,
  applyQC: boolean = true
): Promise<TurbulenceData> {
  const params = new URLSearchParams({
    speed_col: speedCol,
    std_col: stdCol,
    min_speed: minSpeed.toString(),
    apply_qc: applyQC.toString(),
  });
  const res = await fetch(`${API_BASE}/analysis/turbulence?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to calculate turbulence intensity');
  }
  return res.json();
}

export async function fetch12x24(speedCol: string, applyQC: boolean = true): Promise<Matrix12x24Data> {
  const params = new URLSearchParams({
    speed_col: speedCol,
    apply_qc: applyQC.toString(),
  });
  const res = await fetch(`${API_BASE}/analysis/12x24?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to calculate 12x24 distribution');
  }
  return res.json();
}

export async function fetchWeibull(speedCol: string, applyQC: boolean = true): Promise<WeibullData> {
  const params = new URLSearchParams({
    speed_col: speedCol,
    apply_qc: applyQC.toString(),
  });
  const res = await fetch(`${API_BASE}/analysis/weibull?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || 'Failed to calculate Weibull parameters');
  }
  return res.json();
}

export async function downloadWaspTab(
  speedCol: string,
  dirCol: string,
  height: number,
  mastName: string = 'MetMast',
  lat: number = -5.0,
  lon: number = -38.0
): Promise<void> {
  const res = await fetch(`${API_BASE}/export/wasp-tab`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      speed_col: speedCol,
      direction_col: dirCol,
      height,
      mast_name: mastName,
      lat,
      lon,
    }),
  });
  if (!res.ok) throw new Error('Failed to generate WAsP .tab');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${mastName}_${height}m.tab`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
