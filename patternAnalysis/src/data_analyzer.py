import pandas as pd


def analyze_data(processed_data):
    """Analyze data and establish baselines"""
    base_dfs = [processed_data.get(key) for key in ['readiness', 'sleep', 'activity']]
    base_df = next((df for df in base_dfs if df is not None), None)

    if base_df is None:
        print("Error: No daily data available for analysis.")
        return None, None

    merged_df = base_df.copy()

    if processed_data['sleep'] is not None and merged_df is not base_df:
        merged_df = pd.merge(merged_df, processed_data['sleep'], on='day', how='outer', suffixes=('', '_sleep'))

    if processed_data['activity'] is not None:
        activity_cols = ['day', 'score', 'steps', 'average_met_minutes', 'total_calories',
                         'high_activity_time', 'medium_activity_time', 'low_activity_time',
                         'sedentary_time', 'resting_time', 'non_wear_time']
        activity_cols = [col for col in activity_cols if col in processed_data['activity'].columns]
        merged_df = pd.merge(merged_df, processed_data['activity'][activity_cols],
                             on='day', how='outer', suffixes=('', '_activity'))

    for key in ['spo2', 'hr']:
        if processed_data[key] is not None:
            merged_df = pd.merge(merged_df, processed_data[key], on='day', how='left')

    merged_df = merged_df.sort_values('day')

    for col, avg_col in [('score', 'readiness'), ('score_sleep', 'sleep'), ('score_activity', 'activity')]:
        if col in merged_df.columns:
            merged_df[f'{avg_col}_7d_avg'] = merged_df[col].rolling(7, min_periods=1).mean()
            merged_df[f'{avg_col}_14d_avg'] = merged_df[col].rolling(14, min_periods=7).mean()
            merged_df[f'{avg_col}_trend'] = (merged_df[col] / merged_df[f'{avg_col}_7d_avg'] - 1) * 100

    for col, avg_col in [('contributors_hrv_balance', 'hrv'), ('contributors_resting_heart_rate', 'rhr')]:
        if col in merged_df.columns:
            merged_df[f'{avg_col}_7d_avg'] = merged_df[col].rolling(7, min_periods=1).mean()
            merged_df[f'{avg_col}_trend'] = (merged_df[col] / merged_df[f'{avg_col}_7d_avg'] - 1) * 100

    last_date = merged_df['day'].max()
    recent_df = merged_df[merged_df['day'] >= last_date - pd.Timedelta(days=7)]

    return merged_df, recent_df