import pandas as pd
import numpy as np
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone


class ASCIIAdapter:
    """
    Adapter for ingesting delimited text / CSV ocean observation files 
    (CTD casts, moorings, coastal stations).
    """

    def __init__(self, filepath_or_buffer: Any, delimiter: str = ","):
        self.filepath = filepath_or_buffer
        self.delimiter = delimiter
        self._df: Optional[pd.DataFrame] = None

    def load_data(self) -> pd.DataFrame:
        """Loads and cleans the CSV/text dataset."""
        df = pd.read_csv(self.filepath, sep=self.delimiter, skipinitialspace=True)
        # Normalize column names to lowercase stripped strings
        df.columns = [c.strip().lower() for c in df.columns]
        
        # Standardize column mapping aliases
        column_mapping = {
            "lat": "latitude",
            "lat_deg": "latitude",
            "lon": "longitude",
            "long": "longitude",
            "lon_deg": "longitude",
            "press": "depth",
            "pressure": "depth",
            "dep": "depth",
            "temp": "temperature",
            "temp_deg_c": "temperature",
            "psal": "salinity",
            "sal": "salinity",
            "qc": "qc_flag",
            "qc_flag": "qc_flag"
        }
        df = df.rename(columns={k: v for k, v in column_mapping.items() if k in df.columns})
        self._df = df
        return df

    def parse_observations(self) -> List[Dict[str, Any]]:
        """Parses the data into a list of unified observation profile dictionaries."""
        if self._df is None:
            self.load_data()

        df = self._df
        observations = []

        # Check required spatial columns
        has_coords = "latitude" in df.columns and "longitude" in df.columns
        if not has_coords:
            raise ValueError("CSV dataset missing latitude and longitude columns.")

        # Group by station/observation ID or timestamp if available, else treat as single profile/series
        group_cols = [c for c in ["station_id", "float_id", "time", "date"] if c in df.columns]
        
        if group_cols:
            grouped = df.groupby(group_cols, as_index=False)
            for group_keys, group_df in grouped:
                first_row = group_df.iloc[0]
                lat = float(first_row["latitude"])
                lon = float(first_row["longitude"])
                timestamp = str(first_row.get("time", first_row.get("date", datetime.now(timezone.utc).isoformat())))

                depths = group_df["depth"].tolist() if "depth" in group_df.columns else [0.0] * len(group_df)
                temps = group_df["temperature"].tolist() if "temperature" in group_df.columns else [None] * len(group_df)
                sals = group_df["salinity"].tolist() if "salinity" in group_df.columns else [None] * len(group_df)
                qc_flags = group_df["qc_flag"].tolist() if "qc_flag" in group_df.columns else [1] * len(group_df)

                obs = {
                    "source": "ascii_csv",
                    "latitude": lat,
                    "longitude": lon,
                    "time": timestamp,
                    "depths": [float(d) if pd.notnull(d) else None for d in depths],
                    "temperature": [float(t) if pd.notnull(t) else None for t in temps],
                    "salinity": [float(s) if pd.notnull(s) else None for s in sals],
                    "qc_flags": [int(q) if pd.notnull(q) else 1 for q in qc_flags]
                }
                observations.append(obs)
        else:
            # Entire file is one profile
            first_row = df.iloc[0]
            lat = float(first_row["latitude"])
            lon = float(first_row["longitude"])
            
            obs = {
                "source": "ascii_csv",
                "latitude": lat,
                "longitude": lon,
                "time": datetime.now(timezone.utc).isoformat(),
                "depths": [float(d) for d in df["depth"]] if "depth" in df.columns else [0.0],
                "temperature": [float(t) if pd.notnull(t) else None for t in df["temperature"]] if "temperature" in df.columns else [],
                "salinity": [float(s) if pd.notnull(s) else None for s in df["salinity"]] if "salinity" in df.columns else [],
                "qc_flags": [int(q) if pd.notnull(q) else 1 for q in df["qc_flag"]] if "qc_flag" in df.columns else []
            }
            observations.append(obs)

        return observations
