import os
import re
import sys
import warnings
from datetime import datetime

import pandas as pd

warnings.filterwarnings('ignore')

def list_user_directories():
    """List all directories in the Archive folder and let user select one"""
    archive_path = "Archive"

    # Check if Archive directory exists
    if not os.path.exists(archive_path):
        print(f"Error: {archive_path} directory not found.")
        sys.exit(1)

    # Get all directories in Archive
    user_dirs = [d for d in os.listdir(archive_path) if os.path.isdir(os.path.join(archive_path, d))]

    if not user_dirs:
        print(f"No user directories found in {archive_path}.")
        sys.exit(1)

    # Display directories to user
    print("\n=== Available User Profiles ===")
    for i, directory in enumerate(user_dirs, 1):
        print(f"{i}. {directory}")

    # Get user selection
    while True:
        try:
            selection = int(input("\nSelect a user profile (enter number): "))
            if 1 <= selection <= len(user_dirs):
                selected_dir = user_dirs[selection - 1]
                print(f"\nSelected profile: {selected_dir}")
                return os.path.join(archive_path, selected_dir)
            else:
                print(f"Please enter a number between 1 and {len(user_dirs)}")
        except ValueError:
            print("Please enter a valid number")

def find_latest_file(directory, pattern):
    """Find the latest file in directory matching the pattern"""
    matching_files = [f for f in os.listdir(directory) if re.match(pattern, f)]

    if not matching_files:
        return None

    # Sort by timestamp in filename (assuming format with timestamp at end)
    latest_file = sorted(matching_files, key=lambda x: re.search(r'(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})', x).group(1) if re.search(r'(\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2})', x) else "", reverse=True)[0]

    return os.path.join(directory, latest_file)

# Load data from selected user directory
def load_user_data(user_dir):
    """Load all data files for the selected user"""

    # Define file patterns to search for
    file_patterns = {
        'readiness': r'oura_daily-readiness_.*\.csv$',
        'sleep': r'oura_daily-sleep_.*\.csv$',
        'hr': r'oura_heart-rate_.*\.csv$',
        'spo2': r'oura_daily-spo2_.*\.csv$',
        'bedtime': r'oura_bedtime_.*\.csv$',
        'activity': r'oura_daily-activity_.*\.csv$',
        'sleep_full': r'oura_sleep_.*\.csv$'
    }

    # Find latest files
    file_paths = {}
    for key, pattern in file_patterns.items():
        file_path = find_latest_file(user_dir, pattern)
        if file_path:
            file_paths[key] = file_path
        else:
            print(f"Warning: No {key} file found for this user.")

    # Load data
    data = {}
    for key, path in file_paths.items():
        try:
            data[key] = pd.read_csv(path)
            print(f"Loaded {key} data: {path}")
        except Exception as e:
            print(f"Error loading {key} data: {e}")
            data[key] = None

    return data

# Data preprocessing
def preprocess_data(data):
    """Preprocess all data files"""

    # Initialize processed dataframes
    processed = {}

    # Process readiness data
    if 'readiness' in data and data['readiness'] is not None:
        readiness_df = data['readiness'].copy()
        readiness_df['day'] = pd.to_datetime(readiness_df['day'])
        processed['readiness'] = readiness_df
    else:
        processed['readiness'] = None

    # Process sleep data
    if 'sleep' in data and data['sleep'] is not None:
        sleep_df = data['sleep'].copy()
        sleep_df['day'] = pd.to_datetime(sleep_df['day'])
        processed['sleep'] = sleep_df
    else:
        processed['sleep'] = None

    # Process activity data
    if 'activity' in data and data['activity'] is not None:
        activity_df = data['activity'].copy()
        activity_df['day'] = pd.to_datetime(activity_df['day'])
        processed['activity'] = activity_df
    else:
        processed['activity'] = None

    # Process SpO2 data - average multiple readings per day
    if 'spo2' in data and data['spo2'] is not None:
        spo2_df = data['spo2'].copy()
        spo2_df['day'] = pd.to_datetime(spo2_df['day'])
        # Remove rows with missing spo2_percentage
        spo2_df = spo2_df.dropna(subset=['spo2_percentage'])
        if not spo2_df.empty:
            spo2_daily = spo2_df.groupby('day')['spo2_percentage'].mean().reset_index()
            processed['spo2'] = spo2_daily
        else:
            processed['spo2'] = None
    else:
        processed['spo2'] = None

    # Process heart rate data
    if 'hr' in data and data['hr'] is not None:
        hr_df = data['hr'].copy()
        hr_df['timestamp'] = pd.to_datetime(hr_df['timestamp'])
        hr_df['day'] = hr_df['timestamp'].dt.date

        # Group by day and calculate statistics
        hr_daily = hr_df.groupby('day').agg({
            'bpm': ['mean', 'min', 'max', 'std']
        }).reset_index()

        # Flatten multi-level columns
        hr_daily.columns = ['day', 'avg_hr', 'min_hr', 'max_hr', 'hr_variability']
        hr_daily['day'] = pd.to_datetime(hr_daily['day'])
        processed['hr'] = hr_daily
    else:
        processed['hr'] = None

    # Process bedtime data
    if 'bedtime' in data and data['bedtime'] is not None:
        bedtime_df = data['bedtime'].copy()
        bedtime_df['date'] = pd.to_datetime(bedtime_df['date'])
        processed['bedtime'] = bedtime_df
    else:
        processed['bedtime'] = None

    # Process full sleep data
    if 'sleep_full' in data and data['sleep_full'] is not None:
        sleep_full_df = data['sleep_full'].copy()
        if 'day' in sleep_full_df.columns:
            sleep_full_df['day'] = pd.to_datetime(sleep_full_df['day'])
        processed['sleep_full'] = sleep_full_df
    else:
        processed['sleep_full'] = None

    return processed

# Analyze trends and establish baselines
def analyze_data(processed_data):
    """Analyze data and establish baselines"""

    readiness_df = processed_data['readiness']
    sleep_df = processed_data['sleep']
    activity_df = processed_data['activity']
    spo2_df = processed_data['spo2']
    hr_df = processed_data['hr']

    # Start with readiness data as base
    if readiness_df is not None:
        merged_df = readiness_df.copy()
    elif sleep_df is not None:
        merged_df = sleep_df.copy()
    elif activity_df is not None:
        merged_df = activity_df.copy()
    else:
        print("Error: No daily data available for analysis.")
        return None, None

    # Merge sleep data
    if sleep_df is not None:
        merged_df = pd.merge(merged_df, sleep_df, on='day', how='outer', suffixes=('', '_sleep'))

    # Merge activity data
    if activity_df is not None:
        activity_cols = ['day', 'score', 'steps', 'average_met_minutes', 'total_calories',
                         'high_activity_time', 'medium_activity_time', 'low_activity_time',
                         'sedentary_time', 'resting_time', 'non_wear_time']
        activity_cols = [col for col in activity_cols if col in activity_df.columns]
        merged_df = pd.merge(merged_df, activity_df[activity_cols],
                            on='day', how='outer', suffixes=('', '_activity'))

    # Merge SpO2 data
    if spo2_df is not None:
        merged_df = pd.merge(merged_df, spo2_df, on='day', how='left')

    # Merge heart rate data
    if hr_df is not None:
        merged_df = pd.merge(merged_df, hr_df, on='day', how='left')

    # Sort by date
    merged_df = merged_df.sort_values('day')

    # Calculate 7-day rolling averages for baseline
    if 'score' in merged_df.columns:
        merged_df['readiness_7d_avg'] = merged_df['score'].rolling(7, min_periods=1).mean()

    if 'score_sleep' in merged_df.columns:
        merged_df['sleep_score_7d_avg'] = merged_df['score_sleep'].rolling(7, min_periods=1).mean()

    if 'score_activity' in merged_df.columns:
        merged_df['activity_score_7d_avg'] = merged_df['score_activity'].rolling(7, min_periods=1).mean()

    if 'steps' in merged_df.columns:
        merged_df['steps_7d_avg'] = merged_df['steps'].rolling(7, min_periods=1).mean()

    # Calculate 14-day rolling averages for longer-term baseline
    if 'score' in merged_df.columns:
        merged_df['readiness_14d_avg'] = merged_df['score'].rolling(14, min_periods=7).mean()

    if 'score_sleep' in merged_df.columns:
        merged_df['sleep_score_14d_avg'] = merged_df['score_sleep'].rolling(14, min_periods=7).mean()

    # Calculate trends (percent change from baseline)
    if 'score' in merged_df.columns and 'readiness_7d_avg' in merged_df.columns:
        merged_df['readiness_trend'] = (merged_df['score'] / merged_df['readiness_7d_avg'] - 1) * 100

    if 'score_sleep' in merged_df.columns and 'sleep_score_7d_avg' in merged_df.columns:
        merged_df['sleep_trend'] = (merged_df['score_sleep'] / merged_df['sleep_score_7d_avg'] - 1) * 100

    if 'score_activity' in merged_df.columns and 'activity_score_7d_avg' in merged_df.columns:
        merged_df['activity_trend'] = (merged_df['score_activity'] / merged_df['activity_score_7d_avg'] - 1) * 100

    # Calculate HRV trend if available
    if 'contributors_hrv_balance' in merged_df.columns:
        merged_df['hrv_7d_avg'] = merged_df['contributors_hrv_balance'].rolling(7, min_periods=1).mean()
        merged_df['hrv_trend'] = (merged_df['contributors_hrv_balance'] / merged_df['hrv_7d_avg'] - 1) * 100

    # Calculate resting heart rate trend if available
    if 'contributors_resting_heart_rate' in merged_df.columns:
        merged_df['rhr_7d_avg'] = merged_df['contributors_resting_heart_rate'].rolling(7, min_periods=1).mean()
        merged_df['rhr_trend'] = (merged_df['contributors_resting_heart_rate'] / merged_df['rhr_7d_avg'] - 1) * 100

    # Identify recent data (last 7 days)
    last_date = merged_df['day'].max()
    week_ago = last_date - pd.Timedelta(days=7)
    recent_df = merged_df[merged_df['day'] >= week_ago]

    return merged_df, recent_df

# Generate personalized recommendations
def generate_recommendations(merged_df, recent_df, processed_data):
    """Generate personalized recommendations based on data analysis"""

    recommendations = {
        'sleep': [],
        'activity': [],
        'recovery': [],
        'general': []
    }

    alerts = []
    insights = []

    # Get the most recent data point
    if recent_df is not None and not recent_df.empty:
        latest = recent_df.iloc[-1]
    else:
        print("No recent data available for recommendations.")
        return recommendations, alerts, insights

    # Get user profile info from directory name
    user_profile = {}
    if 'MALE' in os.path.basename(os.path.dirname(os.path.abspath('.'))):
        user_profile['gender'] = 'male'
    elif 'FEMALE' in os.path.basename(os.path.dirname(os.path.abspath('.'))):
        user_profile['gender'] = 'female'

    # Extract height and weight if available in directory name
    dir_name = os.path.basename(os.path.dirname(os.path.abspath('.')))
    height_match = re.search(r'(\d+)_FT', dir_name)
    weight_match = re.search(r'(\d+)_LB', dir_name)

    if height_match:
        user_profile['height_ft'] = int(height_match.group(1))
    if weight_match:
        user_profile['weight_lb'] = int(weight_match.group(1))

    # ===== SLEEP RECOMMENDATIONS =====
    if 'score_sleep' in latest and not pd.isna(latest['score_sleep']):
        # Add sleep score insight
        if latest['score_sleep'] >= 85:
            insights.append(f"Your sleep score of {latest['score_sleep']} is excellent. Keep maintaining your current sleep habits.")
        elif latest['score_sleep'] >= 70:
            insights.append(f"Your sleep score of {latest['score_sleep']} is good. With some minor adjustments, you could optimize your sleep further.")
        elif latest['score_sleep'] >= 50:
            insights.append(f"Your sleep score of {latest['score_sleep']} is moderate. There's room for improvement in your sleep quality.")
        else:
            insights.append(f"Your sleep score of {latest['score_sleep']} is low. Prioritizing sleep improvements could significantly benefit your overall health.")

        # Generate sleep recommendations based on score
        if latest['score_sleep'] < 60:
            recommendations['sleep'].append("Establish a consistent sleep schedule by going to bed and waking up at the same time every day, even on weekends.")
            recommendations['sleep'].append("Create a relaxing bedtime routine that signals to your body it's time to wind down (reading, gentle stretching, or meditation).")

            # Check specific sleep contributors if available
            if 'contributors_deep_sleep' in latest and not pd.isna(latest['contributors_deep_sleep']):
                if latest['contributors_deep_sleep'] < 70:
                    recommendations['sleep'].append("To improve deep sleep: avoid alcohol and caffeine at least 6 hours before bedtime, and consider taking a warm bath 1-2 hours before sleep.")
                    recommendations['sleep'].append("Regular exercise (but not within 2 hours of bedtime) can help increase your deep sleep quality.")

            if 'contributors_rem_sleep' in latest and not pd.isna(latest['contributors_rem_sleep']):
                if latest['contributors_rem_sleep'] < 70:
                    recommendations['sleep'].append("To improve REM sleep: practice stress-reduction techniques like meditation or deep breathing before bed.")
                    recommendations['sleep'].append("Avoid using electronic devices 1 hour before bedtime as blue light can suppress melatonin production and reduce REM sleep.")

            if 'contributors_efficiency' in latest and not pd.isna(latest['contributors_efficiency']):
                if latest['contributors_efficiency'] < 70:
                    recommendations['sleep'].append("To improve sleep efficiency: ensure your bedroom is cool (65-68°F/18-20°C), dark, and quiet.")
                    recommendations['sleep'].append("Consider using blackout curtains, white noise machines, or earplugs if environmental factors are disrupting your sleep.")

            if 'contributors_latency' in latest and not pd.isna(latest['contributors_latency']):
                if latest['contributors_latency'] < 70:
                    recommendations['sleep'].append("To reduce the time it takes to fall asleep: practice progressive muscle relaxation or guided imagery before bed.")
                    recommendations['sleep'].append("Avoid large meals, intense exercise, and stressful activities close to bedtime.")

            if 'contributors_timing' in latest and not pd.isna(latest['contributors_timing']):
                if latest['contributors_timing'] < 70:
                    recommendations['sleep'].append("Your sleep timing is irregular. Try to go to bed within the same 30-minute window each night to regulate your circadian rhythm.")

        # Check for sleep trend
        if 'sleep_trend' in latest and not pd.isna(latest['sleep_trend']):
            if latest['sleep_trend'] < -10:
                alerts.append(f"⚠️ Your sleep quality has decreased by {abs(round(latest['sleep_trend']))}% compared to your baseline.")
                recommendations['sleep'].append("Your sleep quality has been declining. Consider tracking potential disruptors like stress, late meals, or screen time.")

    # ===== READINESS & RECOVERY RECOMMENDATIONS =====
    if 'score' in latest and not pd.isna(latest['score']):
        # Add readiness insight
        if latest['score'] >= 85:
            insights.append(f"Your readiness score of {latest['score']} is excellent. Your body is well-recovered and prepared for challenging activities.")
        elif latest['score'] >= 70:
            insights.append(f"Your readiness score of {latest['score']} is good. You're ready for moderate to high-intensity activities.")
        elif latest['score'] >= 50:
            insights.append(f"Your readiness score of {latest['score']} is moderate. Consider moderate-intensity activities today.")
        else:
            insights.append(f"Your readiness score of {latest['score']} is low. Your body is signaling a need for recovery.")

        # Generate recovery recommendations based on readiness score
        if latest['score'] < 60:
            recommendations['recovery'].append("Your body is showing signs of needing recovery. Consider a rest day or light activity like walking or gentle yoga.")
            recommendations['recovery'].append("Focus on proper nutrition with emphasis on protein intake to support recovery and anti-inflammatory foods like berries, fatty fish, and leafy greens.")

            # Check specific readiness contributors
            if 'contributors_hrv_balance' in latest and not pd.isna(latest['contributors_hrv_balance']):
                if latest['contributors_hrv_balance'] < 70:
                    recommendations['recovery'].append("Your HRV balance is low, indicating potential stress or incomplete recovery. Practice stress management techniques like box breathing (4 counts in, 4 counts hold, 4 counts out, 4 counts hold).")
                    recommendations['recovery'].append("Consider adding mindfulness meditation to your routine - even 5-10 minutes daily can help improve HRV and stress resilience.")

            if 'contributors_recovery_index' in latest and not pd.isna(latest['contributors_recovery_index']):
                if latest['contributors_recovery_index'] < 70:
                    recommendations['recovery'].append("Your recovery index is low. Ensure you're getting adequate rest and consider reducing training intensity for 1-2 days.")
                    recommendations['recovery'].append("Try active recovery techniques like foam rolling, gentle stretching, or a light walk to promote blood flow without adding stress.")

            if 'contributors_resting_heart_rate' in latest and not pd.isna(latest['contributors_resting_heart_rate']):
                if latest['contributors_resting_heart_rate'] < 70:
                    recommendations['recovery'].append("Your resting heart rate is elevated compared to your baseline. This may indicate incomplete recovery or potential illness.")
                    recommendations['recovery'].append("Stay well-hydrated and consider increasing your electrolyte intake, as dehydration can elevate resting heart rate.")

            if 'contributors_body_temperature' in latest and not pd.isna(latest['contributors_body_temperature']):
                if latest['contributors_body_temperature'] < 70:
                    recommendations['recovery'].append("Your body temperature is elevated. Monitor for other signs of illness and prioritize rest and hydration.")

        # Check for readiness trend
        if 'readiness_trend' in latest and not pd.isna(latest['readiness_trend']):
            if latest['readiness_trend'] < -15:
                alerts.append(f"⚠️ Your readiness has decreased by {abs(round(latest['readiness_trend']))}% compared to your baseline.")
                recommendations['recovery'].append("Your readiness has been declining significantly. Consider taking a recovery week with reduced training volume and intensity.")

    # ===== ACTIVITY RECOMMENDATIONS =====
    if 'score_activity' in latest and not pd.isna(latest['score_activity']):
        # Add activity insight
        if latest['score_activity'] >= 85:
            insights.append(f"Your activity score of {latest['score_activity']} is excellent. You're maintaining a high level of physical activity.")
        elif latest['score_activity'] >= 70:
            insights.append(f"Your activity score of {latest['score_activity']} is good. You're meeting recommended activity levels.")
        elif latest['score_activity'] >= 50:
            insights.append(f"Your activity score of {latest['score_activity']} is moderate. Increasing your daily movement would be beneficial.")
        else:
            insights.append(f"Your activity score of {latest['score_activity']} is low. Finding ways to incorporate more movement into your day could improve your health.")

        # Generate activity recommendations
        if latest['score_activity'] < 60:
            recommendations['activity'].append("Try to incorporate more movement throughout your day - take the stairs, park farther away, or schedule short walking breaks every hour.")
            recommendations['activity'].append("Set a goal to achieve at least 7,500 steps daily, gradually increasing to 10,000 steps as your fitness improves.")

            if 'steps' in latest and not pd.isna(latest['steps']):
                if latest['steps'] < 5000:
                    recommendations['activity'].append(f"Your step count of {int(latest['steps'])} is below recommended levels. Aim to add 1,000 more steps each day this week.")

            # Check specific activity contributors if available
            if 'contributors_meet_daily_targets' in latest and not pd.isna(latest['contributors_meet_daily_targets']):
                if latest['contributors_meet_daily_targets'] < 70:
                    recommendations['activity'].append("You're not consistently meeting your daily activity targets. Consider setting reminders or scheduling specific times for movement breaks.")

            if 'contributors_move_every_hour' in latest and not pd.isna(latest['contributors_move_every_hour']):
                if latest['contributors_move_every_hour'] < 70:
                    recommendations['activity'].append("You're spending too much time sedentary. Set a timer to stand up and move for at least 2-3 minutes every hour.")

            if 'contributors_training_frequency' in latest and not pd.isna(latest['contributors_training_frequency']):
                if latest['contributors_training_frequency'] < 70:
                    recommendations['activity'].append("Your training frequency is low. Aim for at least 3-4 days of structured exercise per week, including both cardio and strength training.")

        elif latest['score_activity'] > 90 and 'score' in latest and not pd.isna(latest['score']) and latest['score'] < 70:
            recommendations['activity'].append("Your activity level is high but your readiness is moderate. Consider balancing intense workouts with adequate recovery.")
            recommendations['activity'].append("Incorporate active recovery days with light activities like walking, swimming, or yoga between high-intensity training days.")

    # ===== BALANCE & CORRELATION RECOMMENDATIONS =====

    # Check for sleep-activity balance
    if 'score_sleep' in latest and 'score_activity' in latest and not pd.isna(latest['score_sleep']) and not pd.isna(latest['score_activity']):
        sleep_activity_diff = abs(latest['score_sleep'] - latest['score_activity'])

        if sleep_activity_diff > 30:
            if latest['score_sleep'] > latest['score_activity']:
                insights.append("Your sleep quality is significantly better than your activity level. This suggests you have a good foundation for increasing your physical activity.")
                recommendations['general'].append("You have good sleep quality but lower activity. This is an opportunity to gradually increase your physical activity while maintaining your good sleep habits.")
            else:
                insights.append("Your activity level is significantly higher than your sleep quality. This imbalance might affect your recovery and performance.")
                recommendations['general'].append("Your high activity level isn't matched by adequate sleep quality. Prioritize sleep improvements to support your active lifestyle and enhance recovery.")

    # Check for HRV and sleep correlation
    if 'contributors_hrv_balance' in recent_df.columns and 'score_sleep' in recent_df.columns:
        recent_hrv = recent_df['contributors_hrv_balance'].dropna()
        recent_sleep = recent_df['score_sleep'].dropna()

        if len(recent_hrv) >= 3 and len(recent_sleep) >= 3:
            # Check if low HRV days correlate with poor sleep
            low_hrv_days = recent_df[recent_df['contributors_hrv_balance'] < 70]['day'].tolist()
            next_day_sleep = recent_df[recent_df['day'].isin([d + pd.Timedelta(days=1) for d in low_hrv_days])]['score_sleep'].tolist()

            if len(next_day_sleep) >= 2 and all(score < 70 for score in next_day_sleep):
                insights.append("There appears to be a correlation between your low HRV days and poor sleep quality the following night.")
                recommendations['general'].append("Your low HRV days are often followed by poor sleep. On days with low HRV, consider extra stress management techniques and earlier bedtimes.")

    # ===== PATTERN DETECTION =====

    # Check for sleep patterns
    recent_sleep_scores = recent_df['score_sleep'].dropna().tolist() if 'score_sleep' in recent_df.columns else []
    if len(recent_sleep_scores) >= 3:
        if all(score < 60 for score in recent_sleep_scores[-3:]):
            alerts.append("⚠️ You've had consistently poor sleep for the past 3 days. This pattern may impact your overall health and performance.")
            recommendations['sleep'].append("You're experiencing a pattern of poor sleep. Consider consulting a healthcare provider if this persists despite implementing sleep hygiene improvements.")

    # Check for overtraining signs
    if 'steps' in recent_df.columns and 'score' in recent_df.columns:
        high_activity_days = recent_df[recent_df['steps'] > recent_df['steps'].mean() + recent_df['steps'].std()].shape[0]
        low_readiness_days = recent_df[recent_df['score'] < 60].shape[0]

        if high_activity_days >= 3 and low_readiness_days >= 2:
            alerts.append("⚠️ Potential overtraining detected. You've had several high activity days combined with low readiness scores.")
            recommendations['recovery'].append("Signs of overtraining detected. Implement a recovery week with 40-50% reduction in training volume and focus on sleep, nutrition, and stress management.")

    # Check for HRV trends
    if 'contributors_hrv_balance' in recent_df.columns:
        recent_hrv = recent_df['contributors_hrv_balance'].dropna().tolist()
        if len(recent_hrv) >= 5:
            if all(recent_hrv[i] < recent_hrv[i-1] for i in range(1, min(5, len(recent_hrv)))):
                alerts.append("⚠️ Your HRV has been consistently declining over the past several days, indicating increasing stress or incomplete recovery.")
                recommendations['recovery'].append("Your HRV is showing a consistent downward trend. This is a strong signal to prioritize recovery through reduced training intensity, stress management, and optimal sleep.")

    # ===== SPECIFIC HEALTH METRICS =====

    # SpO2 recommendations
    if 'spo2_percentage' in latest and not pd.isna(latest['spo2_percentage']):
        if latest['spo2_percentage'] < 95:
            alerts.append(f"⚠️ Your blood oxygen level of {latest['spo2_percentage']}% is below the optimal range.")
            recommendations['general'].append("Your blood oxygen levels are below optimal. Consider breathing exercises, reducing altitude if applicable, and consulting a healthcare provider if levels remain low.")
        else:
            insights.append(f"Your blood oxygen level of {latest['spo2_percentage']}% is within the healthy range.")

    # Heart rate variability insights
    if 'contributors_hrv_balance' in latest and not pd.isna(latest['contributors_hrv_balance']):
        if latest['contributors_hrv_balance'] >= 85:
            insights.append("Your HRV balance is excellent, indicating good autonomic nervous system function and stress resilience.")
        elif latest['contributors_hrv_balance'] >= 70:
            insights.append("Your HRV balance is good, suggesting adequate recovery and stress management.")
        elif latest['contributors_hrv_balance'] >= 50:
            insights.append("Your HRV balance is moderate. There's room for improvement in recovery and stress management.")
        else:
            insights.append("Your HRV balance is low, indicating potential stress, fatigue, or incomplete recovery.")

    # ===== LIFESTYLE RECOMMENDATIONS =====

    # Add general lifestyle recommendations based on overall patterns
    if 'score' in latest and 'score_sleep' in latest and 'score_activity' in latest:
        if not pd.isna(latest['score']) and not pd.isna(latest['score_sleep']) and not pd.isna(latest['score_activity']):
            avg_score = (latest['score'] + latest['score_sleep'] + latest['score_activity']) / 3

            if avg_score < 60:
                recommendations['general'].append("Your overall health metrics are below optimal levels. Focus on the fundamentals: consistent sleep schedule, balanced nutrition, stress management, and appropriate physical activity.")
                recommendations['general'].append("Consider tracking your nutrition and water intake, as these can significantly impact your sleep quality, recovery, and energy levels.")

            # Add hydration recommendation
            if 'score' in latest and not pd.isna(latest['score']) and latest['score'] < 70:
                recommendations['general'].append("Ensure adequate hydration by drinking at least half your body weight (in pounds) in ounces of water daily, especially on active days and during recovery.")

    # ===== PERSONALIZED RECOMMENDATIONS BASED ON USER PROFILE =====

    # Add gender-specific recommendations if available
    if 'gender' in user_profile:
        if user_profile['gender'] == 'male':
            if 'contributors_deep_sleep' in latest and not pd.isna(latest['contributors_deep_sleep']) and latest['contributors_deep_sleep'] < 70:
                recommendations['sleep'].append("Men typically need slightly more deep sleep. Consider limiting alcohol consumption which can particularly impact male sleep architecture.")
        elif user_profile['gender'] == 'female':
            if 'contributors_hrv_balance' in latest and not pd.isna(latest['contributors_hrv_balance']) and latest['contributors_hrv_balance'] < 70:
                recommendations['recovery'].append("Female HRV can fluctuate with hormonal cycles. Consider tracking your menstrual cycle alongside your health metrics to identify patterns.")

    # Add weight-specific recommendations if available
    if 'weight_lb' in user_profile and 'height_ft' in user_profile:
        # Calculate BMI (rough estimate)
        height_in = user_profile['height_ft'] * 12
        bmi = (user_profile['weight_lb'] * 703) / (height_in * height_in)

        if bmi > 25:
            recommendations['general'].append("Based on your height and weight profile, focusing on consistent physical activity and nutrition could provide health benefits beyond just performance improvements.")

    return recommendations, alerts, insights

# Generate a health report
def generate_health_report(merged_df, recent_df, recommendations, alerts, insights):
    """Generate a comprehensive health report with insights and recommendations"""

    if recent_df is None or recent_df.empty:
        return "No data available to generate health report."

    latest = recent_df.iloc[-1]
    report = []

    # Header
    report.append("=" * 80)
    report.append("PERSONALIZED HEALTH INSIGHTS & RECOMMENDATIONS")
    report.append("=" * 80)
    report.append(f"Report Date: {latest['day'].strftime('%Y-%m-%d')}")
    report.append("")

    # Current Status
    report.append("-" * 80)
    report.append("CURRENT STATUS")
    report.append("-" * 80)

    if 'score' in latest and not pd.isna(latest['score']):
        report.append(f"Readiness Score: {latest['score']}/100")

    if 'score_sleep' in latest and not pd.isna(latest['score_sleep']):
        report.append(f"Sleep Score: {latest['score_sleep']}/100")

    if 'score_activity' in latest and not pd.isna(latest['score_activity']):
        report.append(f"Activity Score: {latest['score_activity']}/100")

    if 'steps' in latest and not pd.isna(latest['steps']):
        report.append(f"Steps: {int(latest['steps'])}")

    if 'total_calories' in latest and not pd.isna(latest['total_calories']):
        report.append(f"Total Calories: {int(latest['total_calories'])}")

    if 'spo2_percentage' in latest and not pd.isna(latest['spo2_percentage']):
        report.append(f"Blood Oxygen: {latest['spo2_percentage']}%")

    report.append("")

    # Insights
    if insights:
        report.append("-" * 80)
        report.append("INSIGHTS")
        report.append("-" * 80)
        for insight in insights:
            report.append(f"• {insight}")
        report.append("")

    # Alerts
    if alerts:
        report.append("-" * 80)
        report.append("ALERTS")
        report.append("-" * 80)
        for alert in alerts:
            report.append(alert)
        report.append("")

    # Recommendations
    if any(recommendations.values()):
        report.append("-" * 80)
        report.append("RECOMMENDATIONS")
        report.append("-" * 80)

        # Sleep recommendations
        if recommendations['sleep']:
            report.append("\nSLEEP OPTIMIZATION:")
            for i, rec in enumerate(recommendations['sleep'], 1):
                report.append(f"{i}. {rec}")

        # Activity recommendations
        if recommendations['activity']:
            report.append("\nACTIVITY GUIDANCE:")
            for i, rec in enumerate(recommendations['activity'], 1):
                report.append(f"{i}. {rec}")

        # Recovery recommendations
        if recommendations['recovery']:
            report.append("\nRECOVERY STRATEGIES:")
            for i, rec in enumerate(recommendations['recovery'], 1):
                report.append(f"{i}. {rec}")

        # General recommendations
        if recommendations['general']:
            report.append("\nGENERAL HEALTH:")
            for i, rec in enumerate(recommendations['general'], 1):
                report.append(f"{i}. {rec}")

        report.append("")

    # Weekly Trends
    report.append("-" * 80)
    report.append("WEEKLY TRENDS")
    report.append("-" * 80)

    if 'readiness_trend' in latest and not pd.isna(latest['readiness_trend']):
        trend = "↑" if latest['readiness_trend'] > 0 else "↓"
        report.append(f"Readiness: {trend} {abs(round(latest['readiness_trend']))}% compared to your baseline")

    if 'sleep_trend' in latest and not pd.isna(latest['sleep_trend']):
        trend = "↑" if latest['sleep_trend'] > 0 else "↓"
        report.append(f"Sleep: {trend} {abs(round(latest['sleep_trend']))}% compared to your baseline")

    if 'activity_trend' in latest and not pd.isna(latest['activity_trend']):
        trend = "↑" if latest['activity_trend'] > 0 else "↓"
        report.append(f"Activity: {trend} {abs(round(latest['activity_trend']))}% compared to your baseline")

    if 'hrv_trend' in latest and not pd.isna(latest['hrv_trend']):
        trend = "↑" if latest['hrv_trend'] > 0 else "↓"
        report.append(f"HRV Balance: {trend} {abs(round(latest['hrv_trend']))}% compared to your baseline")

    report.append("")
    report.append("=" * 80)
    report.append("This report is based on your personal health data and is intended for informational purposes only.")
    report.append("Always consult with healthcare professionals before making significant changes to your health routine.")
    report.append("=" * 80)

    return "\n".join(report)

# Main function
def main():
    """Main function to run the health monitoring system"""

    print("\n" + "=" * 80)
    print("HEALTH MONITORING SYSTEM")
    print("=" * 80)

    # List and select user directory
    user_dir = list_user_directories()

    # Load data for selected user
    data = load_user_data(user_dir)

    # Preprocess data
    processed_data = preprocess_data(data)

    # Analyze data
    merged_df, recent_df = analyze_data(processed_data)

    if merged_df is None or recent_df is None or recent_df.empty:
        print("Error: Insufficient data for analysis.")
        return

    # Generate recommendations
    recommendations, alerts, insights = generate_recommendations(merged_df, recent_df, processed_data)

    # Generate health report
    report = generate_health_report(merged_df, recent_df, recommendations, alerts, insights)

    # Print report
    print("\n" + report)

    # Save report to file
    reports_dir = "reports"

    # Check if reports directory exists and create if it doesn't
    if not os.path.exists(reports_dir):
        os.makedirs(reports_dir)

    report_filename = os.path.join(reports_dir, f"health_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt")
    with open(report_filename, "w") as f:
        f.write(report)

    print(f"\nHealth report saved to {report_filename}")

if __name__ == "__main__":
    main()
