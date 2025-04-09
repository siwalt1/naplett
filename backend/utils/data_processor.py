import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def format_time_range(start_time, end_time):
    """Format a time range for display"""
    if not start_time or not end_time:
        return "Unknown"

    start_format = start_time.strftime("%I:%M %p")
    end_format = end_time.strftime("%I:%M %p")
    return f"{start_format} - {end_format}"

def calculate_sleep_midpoint(start_time, end_time):
    """Calculate the midpoint between sleep start and end times"""
    if not start_time or not end_time:
        return None

    duration = end_time - start_time
    midpoint = start_time + (duration / 2)
    return midpoint

def calculate_sleep_phase_percentages(total_duration, deep_duration, rem_duration, light_duration):
    """Calculate sleep phase percentages"""
    if total_duration == 0:
        return (0, 0, 0)

    deep_pct = (deep_duration / total_duration) * 100
    rem_pct = (rem_duration / total_duration) * 100
    light_pct = (light_duration / total_duration) * 100

    return (deep_pct, rem_pct, light_pct)

def normalize_hrv(hrv_value, age, gender):
    """Normalize HRV based on age and gender (simplified)"""
    if not hrv_value or not age:
        return hrv_value

    # Basic age normalization (simplified model)
    age_factor = 1.0
    if age < 30:
        age_factor = 1.2
    elif age < 40:
        age_factor = 1.1
    elif age < 50:
        age_factor = 1.0
    elif age < 60:
        age_factor = 0.9
    else:
        age_factor = 0.8

    # Gender normalization (simplified)
    gender_factor = 1.0 if gender == 'male' else 1.1

    # Return normalized value
    return hrv_value / (age_factor * gender_factor)

def calculate_moving_average(data_series, window=7):
    """Calculate moving average for a data series"""
    if len(data_series) < window:
        return data_series

    return data_series.rolling(window=window, min_periods=1).mean()

def detect_sleep_pattern_changes(sleep_records, threshold=0.15):
    """Detect significant changes in sleep patterns"""
    if len(sleep_records) < 14:  # Need at least 2 weeks of data
        return []

    # Extract key metrics
    dates = [record.record_date for record in sleep_records]
    total_sleep = np.array([record.total_sleep_duration for record in sleep_records])
    deep_sleep = np.array([record.deep_sleep_duration for record in sleep_records])
    rem_sleep = np.array([record.rem_sleep_duration for record in sleep_records])
    efficiency = np.array([record.efficiency for record in sleep_records])

    # Calculate 7-day moving averages
    df = pd.DataFrame({
        'date': dates,
        'total_sleep': total_sleep,
        'deep_sleep': deep_sleep,
        'rem_sleep': rem_sleep,
        'efficiency': efficiency
    })

    df.set_index('date', inplace=True)

    df['total_sleep_ma'] = calculate_moving_average(df['total_sleep'])
    df['deep_sleep_ma'] = calculate_moving_average(df['deep_sleep'])
    df['rem_sleep_ma'] = calculate_moving_average(df['rem_sleep'])
    df['efficiency_ma'] = calculate_moving_average(df['efficiency'])

    # Detect significant changes
    changes = []

    # Reset index to have date as a column again
    df = df.reset_index()

    # Skip the first 7 days (not enough data for baseline)
    for i in range(7, len(df) - 1):
        current_date = df.iloc[i]['date']

        # Check for significant changes in each metric
        for metric in ['total_sleep', 'deep_sleep', 'rem_sleep', 'efficiency']:
            current_value = df.iloc[i][metric]
            current_ma = df.iloc[i][f'{metric}_ma']
            previous_ma = df.iloc[i-7][f'{metric}_ma']  # Compare to MA from a week ago

            if previous_ma > 0:  # Avoid division by zero
                change_pct = (current_ma - previous_ma) / previous_ma

                if abs(change_pct) > threshold:
                    changes.append({
                        'date': current_date,
                        'metric': metric,
                        'change_pct': change_pct * 100,  # Convert to percentage
                        'direction': 'increase' if change_pct > 0 else 'decrease'
                    })

    return changes