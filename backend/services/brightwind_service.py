import os
import re
import io
import math
import matplotlib
matplotlib.use('Agg')
import numpy as np
import pandas as pd
import brightwind as bw
from typing import List, Dict, Any, Optional

UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class BrightwindService:
    def __init__(self):
        self.current_df: Optional[pd.DataFrame] = None
        self.current_dataset_name: Optional[str] = None
        self.flags_mask: Optional[pd.Series] = None  # True if valid, False if flagged

    def list_datasets(self) -> List[Dict[str, Any]]:
        """List built-in demo datasets and uploaded datasets."""
        datasets = [
            {
                "id": "demo_data",
                "name": "Demo Met Mast (BrightWind Standard)",
                "description": "Multi-height met mast with anemometers at 80m, 60m, 40m, vanes at 78m, 58m, 38m, T, RH, P.",
                "type": "builtin",
                "filename": "demo_data.csv"
            },
            {
                "id": "demo_campbell_scientific",
                "name": "Campbell Scientific CR1000 Logger",
                "description": "Raw logger output format typically used in field anemometer stations.",
                "type": "builtin",
                "filename": "demo_campbell_scientific.csv"
            },
            {
                "id": "demo_windographer_data",
                "name": "Windographer Export Format",
                "description": "Standard tabular format exported directly from Windographer software.",
                "type": "builtin",
                "filename": "demo_windographer_data.txt"
            }
        ]

        # Scan upload directory
        if os.path.exists(UPLOAD_DIR):
            for f in os.listdir(UPLOAD_DIR):
                if f.endswith(('.csv', '.txt', '.dat', '.tim')):
                    f_path = os.path.join(UPLOAD_DIR, f)
                    datasets.append({
                        "id": f"upload_{f}",
                        "name": f,
                        "description": f"Uploaded dataset ({round(os.path.getsize(f_path) / 1024, 1)} KB)",
                        "type": "uploaded",
                        "filename": f
                    })
        return datasets

    def detect_column_role(self, col_name: str) -> Dict[str, Any]:
        """Infers sensor type, orientation, and height from column name."""
        name_lower = col_name.lower()
        role = "other"
        unit = ""
        height = None
        orientation = ""

        # Extract height (e.g. 80m, 120m, 100m, _80, 80_m)
        height_match = re.search(r'(\d+(?:\.\d+)?)\s*m', col_name, re.IGNORECASE)
        if height_match:
            try:
                height = float(height_match.group(1))
            except ValueError:
                pass

        # Extract boom orientation (N, S, E, W, NE, NW, SE, SW)
        orient_match = re.search(r'([NSEW]{1,2})(?:$|Std|Max|Min|_)', col_name)
        if orient_match:
            orientation = orient_match.group(1)

        # Detect role
        if any(x in name_lower for x in ['std', 'sd']):
            role = "speed_std"
            unit = "m/s"
        elif any(x in name_lower for x in ['max', 'gust']):
            role = "speed_max"
            unit = "m/s"
        elif any(x in name_lower for x in ['min']):
            role = "speed_min"
            unit = "m/s"
        elif any(x in name_lower for x in ['spd', 'ws', 'speed', 'anem', 'velo']):
            role = "speed"
            unit = "m/s"
        elif any(x in name_lower for x in ['dir', 'wd', 'vane', 'dire']):
            role = "direction"
            unit = "deg"
        elif any(x in name_lower for x in ['temp', 't2m', 't_']):
            role = "temperature"
            unit = "°C"
        elif any(x in name_lower for x in ['rh', 'humid', 'ur']):
            role = "humidity"
            unit = "%"
        elif any(x in name_lower for x in ['press', 'p2m', 'baro', 'pa', 'hpa']):
            role = "pressure"
            unit = "hPa"
        elif any(x in name_lower for x in ['batt', 'volt', 'v_']):
            role = "battery"
            unit = "V"

        return {
            "name": col_name,
            "role": role,
            "height": height,
            "orientation": orientation,
            "unit": unit
        }

    def load_dataset(self, dataset_id: str) -> Dict[str, Any]:
        """Loads a dataset into memory and computes initial metadata."""
        if dataset_id == "demo_data":
            df = bw.load_csv(bw.demo_datasets.demo_data)
        elif dataset_id == "demo_campbell_scientific":
            df = bw.load_campbell_scientific(bw.demo_datasets.demo_campbell_scientific_data)
        elif dataset_id == "demo_windographer_data":
            df = bw.load_windographer_txt(bw.demo_datasets.demo_windographer_data)
        elif dataset_id.startswith("upload_"):
            filename = dataset_id.replace("upload_", "", 1)
            file_path = os.path.join(UPLOAD_DIR, filename)
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File {filename} not found.")
            try:
                df = bw.load_csv(file_path)
            except Exception:
                df = pd.read_csv(file_path, parse_dates=[0], index_col=0)
        else:
            raise ValueError(f"Unknown dataset ID: {dataset_id}")

        # Ensure index is datetime
        if not isinstance(df.index, pd.DatetimeIndex):
            df.index = pd.to_datetime(df.index)

        df.sort_index(inplace=True)
        self.current_df = df
        self.current_dataset_name = dataset_id
        self.flags_mask = pd.Series(True, index=df.index)

        # Analyze columns
        columns_info = [self.detect_column_role(col) for col in df.columns]

        # Calculate coverage and summary stats
        stats = {}
        for col in df.columns:
            series = df[col]
            valid_count = int(series.dropna().count())
            total_count = len(series)
            coverage_pct = round((valid_count / total_count * 100), 2) if total_count > 0 else 0
            
            stats[col] = {
                "coverage_pct": coverage_pct,
                "mean": round(float(series.mean()), 2) if valid_count > 0 and pd.api.types.is_numeric_dtype(series) else None,
                "min": round(float(series.min()), 2) if valid_count > 0 and pd.api.types.is_numeric_dtype(series) else None,
                "max": round(float(series.max()), 2) if valid_count > 0 and pd.api.types.is_numeric_dtype(series) else None,
                "std": round(float(series.std()), 2) if valid_count > 0 and pd.api.types.is_numeric_dtype(series) else None,
            }

        start_time = str(df.index.min())
        end_time = str(df.index.max())
        total_rows = len(df)

        # Calculate sampling interval
        if len(df.index) > 1:
            interval_minutes = round((df.index[1] - df.index[0]).total_seconds() / 60)
        else:
            interval_minutes = 10

        return {
            "dataset_id": dataset_id,
            "total_rows": total_rows,
            "start_time": start_time,
            "end_time": end_time,
            "sampling_interval_min": interval_minutes,
            "columns": columns_info,
            "stats": stats
        }

    def get_timeseries(
        self,
        columns: List[str],
        max_points: int = 1500,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Provides downsampled time series data for fast high-FPS charting."""
        if self.current_df is None:
            raise ValueError("No dataset loaded.")

        df = self.current_df

        # Filter by date range if provided
        if start_date:
            df = df[df.index >= pd.to_datetime(start_date)]
        if end_date:
            df = df[df.index <= pd.to_datetime(end_date)]

        if len(df) == 0:
            return {"timestamps": [], "series": {}}

        # Downsample if total points exceed max_points
        step = max(1, len(df) // max_points)
        sampled_df = df.iloc[::step]
        sampled_mask = self.flags_mask.loc[sampled_df.index] if self.flags_mask is not None else pd.Series(True, index=sampled_df.index)

        timestamps = [ts.strftime("%Y-%m-%d %H:%M") for ts in sampled_df.index]
        series_data = {}
        for col in columns:
            if col in sampled_df.columns:
                series_data[col] = [
                    None if pd.isna(val) else round(float(val), 2)
                    for val in sampled_df[col]
                ]

        flags = [bool(v) for v in sampled_mask]

        return {
            "timestamps": timestamps,
            "series": series_data,
            "valid_mask": flags,
            "total_raw_points": len(df),
            "sampled_points": len(sampled_df),
            "downsample_factor": step
        }

    def apply_qc_rules(
        self,
        speed_col: str,
        min_speed: float = 0.0,
        max_speed: float = 45.0,
        direction_col: Optional[str] = None,
        shadow_sector_start: Optional[float] = None,
        shadow_sector_end: Optional[float] = None,
        min_temp_icing: Optional[float] = None,
        min_std_frozen: Optional[float] = None,
        std_col: Optional[str] = None,
        temp_col: Optional[str] = None
    ) -> Dict[str, Any]:
        """Applies QC filtering rules and updates the validity mask."""
        if self.current_df is None:
            raise ValueError("No dataset loaded.")

        df = self.current_df
        mask = pd.Series(True, index=df.index)
        rule_counts = {}

        # 1. Min / Max speed range
        if speed_col in df.columns:
            speed_series = df[speed_col]
            speed_invalid = (speed_series < min_speed) | (speed_series > max_speed) | speed_series.isna()
            rule_counts["speed_out_of_bounds"] = int(speed_invalid.sum())
            mask = mask & (~speed_invalid)

        # 2. Mast shadow sector filter
        if direction_col and direction_col in df.columns and shadow_sector_start is not None and shadow_sector_end is not None:
            dir_series = df[direction_col]
            if shadow_sector_start <= shadow_sector_end:
                shadow = (dir_series >= shadow_sector_start) & (dir_series <= shadow_sector_end)
            else:  # crosses 0 deg / North (e.g. 350 to 20)
                shadow = (dir_series >= shadow_sector_start) | (dir_series <= shadow_sector_end)
            rule_counts["mast_shadow_sector"] = int(shadow.sum())
            mask = mask & (~shadow)

        # 3. Icing / Frozen sensor detection
        if temp_col and temp_col in df.columns and min_temp_icing is not None and std_col and std_col in df.columns and min_std_frozen is not None:
            temp_series = df[temp_col]
            std_series = df[std_col]
            frozen = (temp_series <= min_temp_icing) & (std_series <= min_std_frozen)
            rule_counts["icing_frozen_sensor"] = int(frozen.sum())
            mask = mask & (~frozen)

        self.flags_mask = mask
        total_valid = int(mask.sum())
        total_flagged = int((~mask).sum())

        return {
            "total_points": len(df),
            "valid_points": total_valid,
            "flagged_points": total_flagged,
            "valid_pct": round(total_valid / len(df) * 100, 2),
            "flagged_by_rule": rule_counts
        }

    def calculate_wind_rose(
        self,
        speed_col: str,
        direction_col: str,
        sectors: int = 16,
        apply_qc: bool = True
    ) -> Dict[str, Any]:
        """Calculates wind direction frequency and speed breakdown for wind rose."""
        if self.current_df is None:
            raise ValueError("No dataset loaded.")

        df = self.current_df
        if apply_qc and self.flags_mask is not None:
            df = df[self.flags_mask]

        speed_series = df[speed_col].dropna()
        dir_series = df[direction_col].dropna()
        common_idx = speed_series.index.intersection(dir_series.index)
        speed_series = speed_series.loc[common_idx]
        dir_series = dir_series.loc[common_idx]

        if len(common_idx) == 0:
            raise ValueError("No valid overlapping data for wind rose.")

        # Direction bin sector edges
        sector_width = 360.0 / sectors
        half_width = sector_width / 2.0

        # Speed bins (m/s)
        speed_bins = [0, 3, 6, 9, 12, 15, 25]
        speed_bin_labels = ["0-3 m/s", "3-6 m/s", "6-9 m/s", "9-12 m/s", "12-15 m/s", ">15 m/s"]

        # 16-sector standard cardinal names
        cardinal_16 = [
            "N", "NNE", "NE", "ENE",
            "E", "ESE", "SE", "SSE",
            "S", "SSW", "SW", "WSW",
            "W", "WNW", "NW", "NNW"
        ]
        cardinal_12 = [
            "0° (N)", "30°", "60° (ENE)", "90° (E)",
            "120° (ESE)", "150°", "180° (S)", "210°",
            "240° (WSW)", "270° (W)", "300° (WNW)", "330°"
        ]

        sector_names = cardinal_16 if sectors == 16 else (cardinal_12 if sectors == 12 else [f"Sec {i}" for i in range(sectors)])

        sector_data = []
        total_valid_records = len(common_idx)

        for i in range(sectors):
            center_angle = i * sector_width
            start_angle = (center_angle - half_width) % 360
            end_angle = (center_angle + half_width) % 360

            if start_angle < end_angle:
                sector_filter = (dir_series >= start_angle) & (dir_series < end_angle)
            else:
                sector_filter = (dir_series >= start_angle) | (dir_series < end_angle)

            sector_speeds = speed_series[sector_filter]
            count = len(sector_speeds)
            freq_pct = round((count / total_valid_records) * 100, 2)
            mean_spd = round(float(sector_speeds.mean()), 2) if count > 0 else 0.0

            # Calculate speed bins distribution within this sector
            bin_pcts = []
            for b_idx in range(len(speed_bins) - 1):
                b_min, b_max = speed_bins[b_idx], speed_bins[b_idx + 1]
                b_count = ((sector_speeds >= b_min) & (sector_speeds < b_max)).sum()
                b_pct = round((b_count / total_valid_records) * 100, 2)
                bin_pcts.append(b_pct)

            sector_data.append({
                "sector_index": i,
                "label": sector_names[i] if i < len(sector_names) else f"{int(center_angle)}°",
                "center_angle": center_angle,
                "frequency_pct": freq_pct,
                "mean_speed": mean_spd,
                "count": count,
                "speed_bins": bin_pcts
            })

        # Overall Weibull / Stats
        mean_overall_speed = round(float(speed_series.mean()), 2)

        return {
            "sectors": sectors,
            "sector_width": sector_width,
            "total_records": total_valid_records,
            "mean_speed": mean_overall_speed,
            "speed_bin_labels": speed_bin_labels,
            "sector_data": sector_data
        }

    def calculate_wind_shear(
        self,
        anemometers: List[Dict[str, Any]],
        hub_heights: List[float] = [100, 120, 140, 160],
        min_speed: float = 3.0,
        apply_qc: bool = True
    ) -> Dict[str, Any]:
        """Calculates Wind Shear profiles (Power Law and Log Law) and extrapolates to Hub Heights."""
        if self.current_df is None:
            raise ValueError("No dataset loaded.")

        df = self.current_df
        if apply_qc and self.flags_mask is not None:
            df = df[self.flags_mask]

        cols = [a["column"] for a in anemometers]
        heights = [float(a["height"]) for a in anemometers]

        # Order by height descending
        sorted_pairs = sorted(zip(cols, heights), key=lambda x: x[1], reverse=True)
        cols = [p[0] for p in sorted_pairs]
        heights = [p[1] for p in sorted_pairs]

        # Use brightwind Shear.Average
        shear_power = bw.Shear.Average(df[cols], heights, min_speed=min_speed, calc_method='power_law')
        alpha = round(float(shear_power.alpha), 4)

        try:
            shear_log = bw.Shear.Average(df[cols], heights, min_speed=min_speed, calc_method='log_law')
            roughness = round(float(shear_log.roughness), 5)
        except Exception:
            roughness = None

        # Mean measured wind speed at each height
        measured_points = []
        for col, h in zip(cols, heights):
            spd_mean = round(float(df[col][df[col] >= min_speed].mean()), 2)
            measured_points.append({"height": h, "speed": spd_mean, "column": col})

        # Reference anemometer (highest measured)
        ref_h = heights[0]
        ref_spd = measured_points[0]["speed"]

        # Generate smooth profile curve for plotting from 10m to max hub height + 20m
        max_h = max(hub_heights + heights) + 20
        curve_heights = list(range(10, int(max_h) + 5, 5))
        power_law_curve = [
            {"height": h, "speed": round(ref_spd * ((h / ref_h) ** alpha), 2)}
            for h in curve_heights
        ]

        # Extrapolate to specified hub heights
        extrapolated = []
        for hh in hub_heights:
            scaled_spd = round(ref_spd * ((hh / ref_h) ** alpha), 2)
            extrapolated.append({
                "hub_height": hh,
                "power_law_speed": scaled_spd,
                "speed_increase_pct": round(((scaled_spd - ref_spd) / ref_spd) * 100, 1)
            })

        return {
            "alpha": alpha,
            "roughness_z0": roughness,
            "reference_height": ref_h,
            "reference_speed": ref_spd,
            "measured_points": measured_points,
            "profile_curve": power_law_curve,
            "extrapolated_hub_heights": extrapolated
        }

    def calculate_turbulence(
        self,
        speed_col: str,
        std_col: str,
        min_speed: float = 3.0,
        apply_qc: bool = True
    ) -> Dict[str, Any]:
        """Calculates Turbulence Intensity (TI) vs Wind Speed with IEC 61400-1 Class A/B/C curves."""
        if self.current_df is None:
            raise ValueError("No dataset loaded.")

        df = self.current_df
        if apply_qc and self.flags_mask is not None:
            df = df[self.flags_mask]

        wspd = df[speed_col]
        wspd_std = df[std_col]

        # Use brightwind TI.by_speed
        _, ti_table = bw.TI.by_speed(wspd, wspd_std, min_speed=min_speed, return_data=True)

        speed_bins_data = []
        for bin_center, row in ti_table.iterrows():
            speed_val = float(bin_center)
            mean_ti = float(row.get('Mean_TI', 0))
            rep_ti = float(row.get('Rep_TI', 0))
            count = int(row.get('TI_Count', 0))

            # IEC 61400-1 Ed. 3 / Ed. 4 Normal Turbulence Model (NTM) curves:
            # TI_90 = I_ref * (0.75 + 5.6 / V)
            iec_a = 0.16 * (0.75 + 5.6 / speed_val) if speed_val > 0 else 0
            iec_b = 0.14 * (0.75 + 5.6 / speed_val) if speed_val > 0 else 0
            iec_c = 0.12 * (0.75 + 5.6 / speed_val) if speed_val > 0 else 0

            speed_bins_data.append({
                "speed_bin": round(speed_val, 1),
                "mean_ti": round(mean_ti, 3),
                "characteristic_ti_90": round(rep_ti, 3),
                "count": count,
                "iec_class_a": round(iec_a, 3),
                "iec_class_b": round(iec_b, 3),
                "iec_class_c": round(iec_c, 3)
            })

        # Overall Characteristic TI at 15 m/s (IEC reference speed for site suitability)
        ti_at_15 = next((b["characteristic_ti_90"] for b in speed_bins_data if 14.5 <= b["speed_bin"] <= 15.5), None)

        return {
            "speed_column": speed_col,
            "std_column": std_col,
            "speed_bins": speed_bins_data,
            "char_ti_at_15ms": ti_at_15
        }

    def calculate_12x24(
        self,
        speed_col: str,
        apply_qc: bool = True
    ) -> Dict[str, Any]:
        """Calculates 12x24 diurnal-seasonal matrix (12 months x 24 hours)."""
        if self.current_df is None:
            raise ValueError("No dataset loaded.")

        df = self.current_df
        if apply_qc and self.flags_mask is not None:
            df = df[self.flags_mask]

        _, table_12x24 = bw.dist_12x24(df[speed_col], return_data=True)

        months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
        hours = [f"{h:02d}:00" for h in range(24)]

        matrix = []
        for m_idx in range(1, 13):
            month_row = []
            for h in range(24):
                val = table_12x24.loc[h, m_idx] if (h in table_12x24.index and m_idx in table_12x24.columns) else np.nan
                month_row.append(round(float(val), 2) if not pd.isna(val) else None)
            matrix.append(month_row)

        return {
            "months": months,
            "hours": hours,
            "matrix": matrix
        }

    def calculate_weibull(
        self,
        speed_col: str,
        apply_qc: bool = True
    ) -> Dict[str, Any]:
        """Computes Weibull parameters (k, c), histogram frequencies, and fitted probability curve."""
        if self.current_df is None:
            raise ValueError("No dataset loaded.")

        df = self.current_df
        if apply_qc and self.flags_mask is not None:
            df = df[self.flags_mask]

        series = df[speed_col].dropna()
        series = series[series > 0]

        mean_spd = float(series.mean())
        std_spd = float(series.std())

        # Moment method approximation for Weibull shape factor k
        # (sigma / mean) ~= (gamma(1 + 2/k) / gamma(1 + 1/k)^2 - 1)^0.5
        # Empirical approximation: k = (sigma / mean) ^ -1.086
        if std_spd > 0 and mean_spd > 0:
            k = (std_spd / mean_spd) ** (-1.086)
            c = mean_spd / math.gamma(1.0 + 1.0 / k)
        else:
            k = 2.0
            c = mean_spd

        # Histogram bins (0 to 30 m/s with 1 m/s step)
        bins = np.arange(0, 26, 1)
        counts, _ = np.histogram(series, bins=bins, density=True)

        histogram = []
        fitted_curve = []
        for i in range(len(counts)):
            spd = (bins[i] + bins[i+1]) / 2.0
            # Weibull PDF: (k/c) * (v/c)^(k-1) * exp(-(v/c)^k)
            pdf = (k / c) * ((spd / c) ** (k - 1)) * math.exp(-((spd / c) ** k))
            histogram.append({
                "speed": spd,
                "bin_label": f"{bins[i]}-{bins[i+1]}",
                "empirical_freq_pct": round(float(counts[i] * 100), 2)
            })
            fitted_curve.append({
                "speed": round(spd, 1),
                "weibull_pdf_pct": round(float(pdf * 100), 2)
            })

        return {
            "k_shape": round(float(k), 2),
            "c_scale": round(float(c), 2),
            "mean_speed": round(mean_spd, 2),
            "histogram": histogram,
            "fitted_curve": fitted_curve
        }

    def export_wasp_tab(
        self,
        speed_col: str,
        direction_col: str,
        height: float,
        lat: float = -5.0,
        lon: float = -38.0,
        mast_name: str = "MetMast"
    ) -> str:
        """Exports WAsP .tab frequency table format string."""
        if self.current_df is None:
            raise ValueError("No dataset loaded.")

        df = self.current_df
        if self.flags_mask is not None:
            df = df[self.flags_mask]

        # Use brightwind freq_table and export_tab_file
        _, freq_tab = bw.freq_table(df[speed_col], df[direction_col], return_data=True)

        temp_folder = os.path.join(UPLOAD_DIR, "exports")
        os.makedirs(temp_folder, exist_ok=True)
        tab_filename = f"{mast_name}_{int(height)}m.tab"

        bw.export_tab_file(
            freq_tab=freq_tab,
            height=height,
            lat=lat,
            long=lon,
            file_name=tab_filename,
            folder_path=temp_folder
        )

        output_path = os.path.join(temp_folder, tab_filename)
        with open(output_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        return content
