import pandas as pd
from utils import find_latest_file
import pandas as pd

from utils import find_latest_file


def load_user_data(user_dir):
    """Load all data files for the selected user"""
    file_patterns = {
        'readiness': r'oura_daily-readiness_.*\.csv$',
        'sleep': r'oura_daily-sleep_.*\.csv$',
        'hr': r'oura_heart-rate_.*\.csv$',
        'spo2': r'oura_daily-spo2_.*\.csv$',
        'bedtime': r'oura_bedtime_.*\.csv$',
        'activity': r'oura_daily-activity_.*\.csv$',
        'sleep_full': r'oura_sleep_.*\.csv$'
    }

    file_paths = {}
    for key, pattern in file_patterns.items():
        file_path = find_latest_file(user_dir, pattern)
        if file_path:
            file_paths[key] = file_path
        else:
            print(f"Warning: No {key} file found for this user.")

    data = {}
    for key, path in file_paths.items():
        try:
            data[key] = pd.read_csv(path)
            print(f"Loaded {key} data: {path}")
        except Exception as e:
            print(f"Error loading {key} data: {e}")
            data[key] = None

    return data

def preprocess_data(data):
    """Preprocess all data files"""
    processed = {}

    for key in ['readiness', 'sleep', 'activity', 'bedtime']:
        if key in data and data[key] is not None:
            df = data[key].copy()
            date_col = 'day' if key != 'bedtime' else 'date'
            df[date_col] = pd.to_datetime(df[date_col])
            processed[key] = df
        else:
            processed[key] = None

    if 'spo2' in data and data['spo2'] is not None:
        spo2_df = data['spo2'].copy()
        spo2_df['day'] = pd.to_datetime(spo2_df['day'])
        spo2_df = spo2_df.dropna(subset=['spo2_percentage'])
        processed['spo2'] = spo2_df.groupby('day')['spo2_percentage'].mean().reset_index() if not spo2_df.empty else None
    else:
        processed['spo2'] = None

    if 'hr' in data and data['hr'] is not None:
        hr_df = data['hr'].copy()
        hr_df['timestamp'] = pd.to_datetime(hr_df['timestamp'])
        hr_df['day'] = hr_df['timestamp'].dt.date
        hr_daily = hr_df.groupby('day').agg({'bpm': ['mean', 'min', 'max', 'std']}).reset_index()
        hr_daily.columns = ['day', 'avg_hr', 'min_hr', 'max_hr', 'hr_variability']
        hr_daily['day'] = pd.to_datetime(hr_daily['day'])
        processed['hr'] = hr_daily
    else:
        processed['hr'] = None

    if 'sleep_full' in data and data['sleep_full'] is not None:
        sleep_full_df = data['sleep_full'].copy()
        if 'day' in sleep_full_df.columns:
            sleep_full_df['day'] = pd.to_datetime(sleep_full_df['day'])
        processed['sleep_full'] = sleep_full_df
    else:
        processed['sleep_full'] = None

    return processed