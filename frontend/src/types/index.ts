export interface DatasetItem {
  id: string;
  name: string;
  description: string;
  type: 'builtin' | 'uploaded';
  filename: string;
}

export interface ColumnInfo {
  name: string;
  role: 'speed' | 'direction' | 'speed_std' | 'speed_max' | 'speed_min' | 'temperature' | 'humidity' | 'pressure' | 'battery' | 'other';
  height: number | null;
  orientation: string;
  unit: string;
}

export interface ColumnStat {
  coverage_pct: number;
  mean: number | null;
  min: number | null;
  max: number | null;
  std: number | null;
}

export interface LoadedDataset {
  dataset_id: string;
  total_rows: number;
  start_time: string;
  end_time: string;
  sampling_interval_min: number;
  columns: ColumnInfo[];
  stats: Record<string, ColumnStat>;
}

export interface TimeseriesResponse {
  timestamps: string[];
  series: Record<string, (number | null)[]>;
  valid_mask: boolean[];
  total_raw_points: number;
  sampled_points: number;
  downsample_factor: number;
}

export interface QCResult {
  total_points: number;
  valid_points: number;
  flagged_points: number;
  valid_pct: number;
  flagged_by_rule: Record<string, number>;
}

export interface WindRoseSector {
  sector_index: number;
  label: string;
  center_angle: number;
  frequency_pct: number;
  mean_speed: number;
  count: number;
  speed_bins: number[];
}

export interface WindRoseData {
  sectors: number;
  sector_width: number;
  total_records: number;
  mean_speed: number;
  speed_bin_labels: string[];
  sector_data: WindRoseSector[];
}

export interface ShearMeasuredPoint {
  height: number;
  speed: number;
  column: string;
}

export interface ShearExtrapolated {
  hub_height: number;
  power_law_speed: number;
  speed_increase_pct: number;
}

export interface WindShearData {
  alpha: number;
  roughness_z0: number | null;
  reference_height: number;
  reference_speed: number;
  measured_points: ShearMeasuredPoint[];
  profile_curve: { height: number; speed: number }[];
  extrapolated_hub_heights: ShearExtrapolated[];
}

export interface TurbulenceBin {
  speed_bin: number;
  mean_ti: number;
  characteristic_ti_90: number;
  count: number;
  iec_class_a: number;
  iec_class_b: number;
  iec_class_c: number;
}

export interface TurbulenceData {
  speed_column: string;
  std_column: string;
  speed_bins: TurbulenceBin[];
  char_ti_at_15ms: number | null;
}

export interface Matrix12x24Data {
  months: string[];
  hours: string[];
  matrix: (number | null)[][];
}

export interface WeibullData {
  k_shape: number;
  c_scale: number;
  mean_speed: number;
  histogram: { speed: number; bin_label: string; empirical_freq_pct: number }[];
  fitted_curve: { speed: number; weibull_pdf_pct: number }[];
}
