import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy import func
from models import db, SleepRecord, Baseline, Trend, Insight

def calculate_sleep_score(sleep_record, user_baselines=None):
    """
    Calculate a sleep score based on sleep metrics using the five-component model

    Args:
        sleep_record: A SleepRecord object with sleep metrics
        user_baselines: Optional baseline metrics for the user

    Returns:
        dict: Sleep score and component scores
    """
    # Extract metrics
    total_sleep = sleep_record.total_sleep_duration  # in minutes
    deep_sleep = sleep_record.deep_sleep_duration  # in minutes
    rem_sleep = sleep_record.rem_sleep_duration  # in minutes
    efficiency = sleep_record.efficiency  # percentage (0-100)
    restless_periods = sleep_record.restless_periods or 0

    # 1. Duration Score (25%)
    optimal_sleep = 480  # 8 hours in minutes - could be personalized in the future
    duration_score = max(0, min(100, 100 - 15 * abs(optimal_sleep/60 - total_sleep/60)))

    # 2. Sleep Architecture Score (25%)
    if total_sleep > 0:
        deep_sleep_percentage = deep_sleep / total_sleep
        rem_sleep_percentage = rem_sleep / total_sleep

        # Score based on deviation from optimal percentages
        deep_score = max(0, min(100, 100 - 200 * abs(0.20 - deep_sleep_percentage)))
        rem_score = max(0, min(100, 100 - 200 * abs(0.23 - rem_sleep_percentage)))
        architecture_score = (deep_score * 0.5) + (rem_score * 0.5)
    else:
        architecture_score = 0

    # 3. Sleep Quality Score (20%)
    # Calculate efficiency score (target 85% or higher)
    efficiency_score = min(100, (efficiency / 85) * 100)

    # Apply penalty for restlessness
    restlessness_penalty = restless_periods * 5  # 5 points per restless period
    quality_score = max(0, efficiency_score - restlessness_penalty)

    # 4. Sleep Timing Score (15%)
    # If we have baselines, calculate timing score
    timing_score = 50  # Default middle score

    if user_baselines and hasattr(sleep_record, 'sleep_midpoint') and sleep_record.sleep_midpoint:
        if hasattr(user_baselines, 'avg_midpoint') and user_baselines.avg_midpoint:
            # Calculate minutes difference between this sleep midpoint and baseline
            baseline_midpoint = user_baselines.avg_midpoint
            current_midpoint = sleep_record.sleep_midpoint.time()

            # Convert times to minutes since midnight
            baseline_minutes = baseline_midpoint.hour * 60 + baseline_midpoint.minute
            current_minutes = current_midpoint.hour * 60 + current_midpoint.minute

            # Handle midnight crossing
            if abs(baseline_minutes - current_minutes) > 720:  # More than 12 hours difference
                if baseline_minutes > current_minutes:
                    current_minutes += 1440  # Add 24 hours
                else:
                    baseline_minutes += 1440

            time_from_baseline = abs(baseline_minutes - current_minutes)
            timing_score = max(0, 100 - (time_from_baseline / 30) * 100)

    # 5. Physiological Signals Score (15%)
    # This requires baseline data for heart rate and HRV
    physio_score = 50  # Default middle score

    if user_baselines and sleep_record.lowest_heart_rate and sleep_record.average_hrv:
        # Calculate heart rate dip score
        if hasattr(user_baselines, 'avg_resting_hr') and user_baselines.avg_resting_hr:
            baseline_rhr = user_baselines.avg_resting_hr
            hr_dip_score = min(100, max(0, 100 * (1 - (sleep_record.lowest_heart_rate / baseline_rhr))))
        else:
            hr_dip_score = 50

        # Calculate HRV score
        if hasattr(user_baselines, 'avg_hrv') and user_baselines.avg_hrv and user_baselines.avg_hrv > 0:
            baseline_hrv = user_baselines.avg_hrv
            hrv_ratio = sleep_record.average_hrv / baseline_hrv
            hrv_score = min(100, hrv_ratio * 100)
        else:
            hrv_score = 50

        physio_score = (hr_dip_score * 0.5) + (hrv_score * 0.5)

    # Calculate overall score (weighted average of components)
    overall_score = (
            duration_score * 0.25 +
            architecture_score * 0.25 +
            quality_score * 0.20 +
            timing_score * 0.15 +
            physio_score * 0.15
    )

    return {
        'total_score': round(overall_score, 1),
        'components': {
            'duration_score': round(duration_score, 1),
            'architecture_score': round(architecture_score, 1),
            'quality_score': round(quality_score, 1),
            'timing_score': round(timing_score, 1),
            'physiological_score': round(physio_score, 1)
        }
    }
# def calculate_baseline(user_id):
#     """
#     Calculate baseline metrics from the last 14 days of sleep data
#
#     Args:
#         user_id: The user ID to calculate baseline for
#
#     Returns:
#         Baseline: The calculated baseline object
#     """
#     # Get the last 14 days of sleep records
#     end_date = db.session.query(func.max(SleepRecord.record_date)).filter_by(user_id=user_id).scalar()
#
#     if not end_date:
#         return None
#
#     start_date = end_date - timedelta(days=13)  # 14 days including end_date
#
#     records = SleepRecord.query.filter(
#         SleepRecord.user_id == user_id,
#         SleepRecord.record_date >= start_date,
#         SleepRecord.record_date <= end_date
#     ).order_by(SleepRecord.record_date.asc()).all()
#
#     # Need at least 7 days for a meaningful baseline
#     if len(records) < 7:
#         return None
#
#     # Calculate averages
#     avg_total_sleep = sum(r.total_sleep_duration for r in records) / len(records)
#     avg_deep_sleep = sum(r.deep_sleep_duration for r in records) / len(records)
#     avg_rem_sleep = sum(r.rem_sleep_duration for r in records) / len(records)
#     avg_light_sleep = sum(r.light_sleep_duration for r in records) / len(records)
#     avg_efficiency = sum(r.efficiency for r in records) / len(records)
#
#     # Calculate physiological baselines if data exists
#     hrv_values = [r.average_hrv for r in records if r.average_hrv is not None]
#     rhr_values = [r.resting_heart_rate for r in records if r.resting_heart_rate is not None]
#     resp_values = [r.respiratory_rate for r in records if r.respiratory_rate is not None]
#
#     avg_hrv = sum(hrv_values) / len(hrv_values) if hrv_values else None
#     avg_rhr = sum(rhr_values) / len(rhr_values) if rhr_values else None
#     avg_resp = sum(resp_values) / len(resp_values) if resp_values else None
#
#     # Calculate average bedtime (convert to time only)
#     start_times = [r.bedtime_start.time() for r in records]
#     end_times = [r.bedtime_end.time() for r in records]
#
#     # Convert to minutes since midnight for averaging
#     start_minutes = [(t.hour * 60 + t.minute) for t in start_times]
#     end_minutes = [(t.hour * 60 + t.minute) for t in end_times]
#
#     # Adjust for bed times that cross midnight
#     for i in range(len(start_minutes)):
#         if start_minutes[i] > 1080:  # After 6 PM (18 * 60)
#             start_minutes[i] = start_minutes[i] - 1440  # Convert to negative minutes from midnight
#
#     for i in range(len(end_minutes)):
#         if end_minutes[i] < 360:  # Before 6 AM
#             end_minutes[i] = end_minutes[i] + 1440  # Add 24 hours
#
#     avg_start_minutes = sum(start_minutes) / len(start_minutes)
#     avg_end_minutes = sum(end_minutes) / len(end_minutes)
#
#     # Calculate average midpoint
#     midpoints = []
#     for record in records:
#         if record.sleep_midpoint:
#             midpoint = record.sleep_midpoint.time()
#             midpoint_minutes = midpoint.hour * 60 + midpoint.minute
#
#             # Adjust for midnight crossing
#             if midpoint.hour < 12:  # If midnight is after midpoint
#                 midpoint_minutes += 1440
#
#             midpoints.append(midpoint_minutes)
#
#     avg_midpoint_minutes = sum(midpoints) / len(midpoints) if midpoints else None
#
#     # Convert back to time objects
#     if avg_start_minutes < 0:
#         avg_start_minutes += 1440
#
#     avg_start_time = (datetime.min + timedelta(minutes=avg_start_minutes)).time()
#     avg_end_time = (datetime.min + timedelta(minutes=avg_end_minutes % 1440)).time()
#
#     avg_midpoint_time = None
#     if avg_midpoint_minutes:
#         avg_midpoint_minutes = avg_midpoint_minutes % 1440  # Ensure within 24-hour range
#         avg_midpoint_time = (datetime.min + timedelta(minutes=avg_midpoint_minutes)).time()
#
#     # Create or update baseline object
#     baseline = Baseline.query.filter_by(
#         user_id=user_id,
#         baseline_type='14-day'
#     ).first()
#
#     if not baseline:
#         baseline = Baseline(
#             user_id=user_id,
#             baseline_type='14-day',
#             start_date=start_date,
#             end_date=end_date
#         )
#         db.session.add(baseline)
#     else:
#         baseline.start_date = start_date
#         baseline.end_date = end_date
#         baseline.updated_at = datetime.utcnow()
#
#     # Update baseline metrics
#     baseline.avg_total_sleep = avg_total_sleep
#     baseline.avg_deep_sleep = avg_deep_sleep
#     baseline.avg_rem_sleep = avg_rem_sleep
#     baseline.avg_light_sleep = avg_light_sleep
#     baseline.avg_efficiency = avg_efficiency
#     baseline.avg_hrv = avg_hrv
#     baseline.avg_resting_hr = avg_rhr
#     baseline.avg_respiratory_rate = avg_resp
#     baseline.avg_bedtime_start = avg_start_time
#     baseline.avg_bedtime_end = avg_end_time
#     baseline.avg_midpoint = avg_midpoint_time
#
#     db.session.commit()
#
#     return baseline
def calculate_baseline(user_id):
    """
    Calculate baseline metrics from the last 14 days of sleep data

    Args:
        user_id: The user ID to calculate baseline for

    Returns:
        Baseline: The calculated baseline object
    """
    # Get the last 14 days of sleep records
    end_date = db.session.query(func.max(SleepRecord.record_date)).filter_by(user_id=user_id).scalar()

    if not end_date:
        return None

    start_date = end_date - timedelta(days=13)  # 14 days including end_date

    records = SleepRecord.query.filter(
        SleepRecord.user_id == user_id,
        SleepRecord.record_date >= start_date,
        SleepRecord.record_date <= end_date
    ).order_by(SleepRecord.record_date.asc()).all()

    # Need at least 7 days for a meaningful baseline
    if len(records) < 7:
        return None

    # Calculate averages
    avg_total_sleep = sum(r.total_sleep_duration for r in records) / len(records)
    avg_deep_sleep = sum(r.deep_sleep_duration for r in records) / len(records)
    avg_rem_sleep = sum(r.rem_sleep_duration for r in records) / len(records)
    avg_light_sleep = sum(r.light_sleep_duration for r in records) / len(records)
    avg_efficiency = sum(r.efficiency for r in records) / len(records)

    # Calculate physiological baselines if data exists
    hrv_values = [r.average_hrv for r in records if r.average_hrv is not None]
    rhr_values = [r.resting_heart_rate for r in records if r.resting_heart_rate is not None]
    resp_values = [r.respiratory_rate for r in records if r.respiratory_rate is not None]

    avg_hrv = sum(hrv_values) / len(hrv_values) if hrv_values else None
    avg_rhr = sum(rhr_values) / len(rhr_values) if rhr_values else None
    avg_resp = sum(resp_values) / len(resp_values) if resp_values else None

    # Calculate average bedtime (convert to time only)
    start_times = [r.bedtime_start.time() for r in records]
    end_times = [r.bedtime_end.time() for r in records]

    # Convert to minutes since midnight for averaging
    start_minutes = [(t.hour * 60 + t.minute) for t in start_times]
    end_minutes = [(t.hour * 60 + t.minute) for t in end_times]

    # Adjust for bed times that cross midnight
    for i in range(len(start_minutes)):
        if start_minutes[i] > 1080:  # After 6 PM (18 * 60)
            start_minutes[i] = start_minutes[i] - 1440  # Convert to negative minutes from midnight

    for i in range(len(end_minutes)):
        if end_minutes[i] < 360:  # Before 6 AM
            end_minutes[i] = end_minutes[i] + 1440  # Add 24 hours

    avg_start_minutes = sum(start_minutes) / len(start_minutes)
    avg_end_minutes = sum(end_minutes) / len(end_minutes)

    # Calculate average midpoint
    midpoints = []
    for record in records:
        if record.sleep_midpoint:
            midpoint = record.sleep_midpoint.time()
            midpoint_minutes = midpoint.hour * 60 + midpoint.minute

            # Adjust for midnight crossing
            if midpoint.hour < 12:  # If midnight is after midpoint
                midpoint_minutes += 1440

            midpoints.append(midpoint_minutes)

    avg_midpoint_minutes = sum(midpoints) / len(midpoints) if midpoints else None

    # Convert back to time objects
    if avg_start_minutes < 0:
        avg_start_minutes += 1440

    avg_start_time = (datetime.min + timedelta(minutes=avg_start_minutes)).time()
    avg_end_time = (datetime.min + timedelta(minutes=avg_end_minutes % 1440)).time()

    avg_midpoint_time = None
    if avg_midpoint_minutes:
        avg_midpoint_minutes = avg_midpoint_minutes % 1440  # Ensure within 24-hour range
        avg_midpoint_time = (datetime.min + timedelta(minutes=avg_midpoint_minutes)).time()

    # Create or update baseline object
    baseline = Baseline.query.filter_by(
        user_id=user_id,
        baseline_type='14-day'
    ).first()

    if not baseline:
        baseline = Baseline(
            user_id=user_id,
            baseline_type='14-day',
            start_date=start_date,
            end_date=end_date
        )
        db.session.add(baseline)
    else:
        baseline.start_date = start_date
        baseline.end_date = end_date
        baseline.updated_at = datetime.utcnow()

    # Update baseline metrics
    baseline.avg_total_sleep = avg_total_sleep
    baseline.avg_deep_sleep = avg_deep_sleep
    baseline.avg_rem_sleep = avg_rem_sleep
    baseline.avg_light_sleep = avg_light_sleep
    baseline.avg_efficiency = avg_efficiency
    baseline.avg_hrv = avg_hrv
    baseline.avg_resting_hr = avg_rhr
    baseline.avg_respiratory_rate = avg_resp
    baseline.avg_bedtime_start = avg_start_time
    baseline.avg_bedtime_end = avg_end_time
    baseline.avg_midpoint = avg_midpoint_time

    db.session.commit()

    return baseline
def calculate_trends(user_id):
    """
    Calculate weekly and monthly trends compared to previous periods

    Args:
        user_id: The user ID to calculate trends for

    Returns:
        dict: Calculated trend objects
    """
    # Get the most recent date with data
    latest_date = db.session.query(func.max(SleepRecord.record_date)).filter_by(user_id=user_id).scalar()

    if not latest_date:
        return None

    # Calculate weekly trend
    weekly_end = latest_date
    weekly_start = weekly_end - timedelta(days=6)  # Last 7 days including end date
    prev_weekly_end = weekly_start - timedelta(days=1)
    prev_weekly_start = prev_weekly_end - timedelta(days=6)

    # Only calculate if we have enough data
    if SleepRecord.query.filter(
            SleepRecord.user_id == user_id,
            SleepRecord.record_date >= prev_weekly_start
    ).count() >= 7:
        weekly_trend = calculate_period_trend(
            user_id,
            'weekly',
            weekly_start,
            weekly_end,
            prev_weekly_start,
            prev_weekly_end
        )
    else:
        weekly_trend = None

    # Calculate monthly trend
    monthly_end = latest_date
    monthly_start = monthly_end - timedelta(days=29)  # Last 30 days including end date
    prev_monthly_end = monthly_start - timedelta(days=1)
    prev_monthly_start = prev_monthly_end - timedelta(days=29)

    # Only calculate if we have enough data
    if SleepRecord.query.filter(
            SleepRecord.user_id == user_id,
            SleepRecord.record_date >= prev_monthly_start
    ).count() >= 30:
        monthly_trend = calculate_period_trend(
            user_id,
            'monthly',
            monthly_start,
            monthly_end,
            prev_monthly_start,
            prev_monthly_end
        )
    else:
        monthly_trend = None

    return {
        'weekly': weekly_trend,
        'monthly': monthly_trend
    }

def calculate_period_trend(user_id, trend_type, period_start, period_end, comparison_start, comparison_end):
    """
    Calculate trends by comparing two time periods

    Args:
        user_id: User ID to calculate trends for
        trend_type: Type of trend (weekly, monthly)
        period_start: Start date of current period
        period_end: End date of current period
        comparison_start: Start date of comparison period
        comparison_end: End date of comparison period

    Returns:
        Trend: The calculated trend object
    """
    # Get data for current period
    current_records = SleepRecord.query.filter(
        SleepRecord.user_id == user_id,
        SleepRecord.record_date >= period_start,
        SleepRecord.record_date <= period_end
    ).all()

    # Get data for comparison period
    comparison_records = SleepRecord.query.filter(
        SleepRecord.user_id == user_id,
        SleepRecord.record_date >= comparison_start,
        SleepRecord.record_date <= comparison_end
    ).all()

    # Only proceed if we have records in both periods
    if not current_records or not comparison_records:
        return None

    # Calculate averages for both periods
    current_avg_total_sleep = sum(r.total_sleep_duration for r in current_records) / len(current_records)
    comparison_avg_total_sleep = sum(r.total_sleep_duration for r in comparison_records) / len(comparison_records)

    current_avg_deep_sleep = sum(r.deep_sleep_duration for r in current_records) / len(current_records)
    comparison_avg_deep_sleep = sum(r.deep_sleep_duration for r in comparison_records) / len(comparison_records)

    current_avg_rem_sleep = sum(r.rem_sleep_duration for r in current_records) / len(current_records)
    comparison_avg_rem_sleep = sum(r.rem_sleep_duration for r in comparison_records) / len(comparison_records)

    current_avg_efficiency = sum(r.efficiency for r in current_records) / len(current_records)
    comparison_avg_efficiency = sum(r.efficiency for r in comparison_records) / len(comparison_records)

    # Calculate sleep score averages
    current_avg_sleep_score = sum(r.sleep_score for r in current_records if r.sleep_score) / len([r for r in current_records if r.sleep_score])
    comparison_avg_sleep_score = sum(r.sleep_score for r in comparison_records if r.sleep_score) / len([r for r in comparison_records if r.sleep_score])

    # Calculate physiological metrics if available
    current_hrv_values = [r.average_hrv for r in current_records if r.average_hrv is not None]
    comparison_hrv_values = [r.average_hrv for r in comparison_records if r.average_hrv is not None]

    current_rhr_values = [r.resting_heart_rate for r in current_records if r.resting_heart_rate is not None]
    comparison_rhr_values = [r.resting_heart_rate for r in comparison_records if r.resting_heart_rate is not None]

    # Calculate percentage changes
    def calc_percentage_change(current, comparison):
        if comparison == 0:
            return 0
        return ((current - comparison) / comparison) * 100

    total_sleep_trend = calc_percentage_change(current_avg_total_sleep, comparison_avg_total_sleep)
    deep_sleep_trend = calc_percentage_change(current_avg_deep_sleep, comparison_avg_deep_sleep)
    rem_sleep_trend = calc_percentage_change(current_avg_rem_sleep, comparison_avg_rem_sleep)
    efficiency_trend = calc_percentage_change(current_avg_efficiency, comparison_avg_efficiency)
    sleep_score_trend = calc_percentage_change(current_avg_sleep_score, comparison_avg_sleep_score)

    # Calculate HRV and RHR trends if data exists
    hrv_trend = None
    rhr_trend = None

    if current_hrv_values and comparison_hrv_values:
        current_avg_hrv = sum(current_hrv_values) / len(current_hrv_values)
        comparison_avg_hrv = sum(comparison_hrv_values) / len(comparison_hrv_values)
        hrv_trend = calc_percentage_change(current_avg_hrv, comparison_avg_hrv)

    if current_rhr_values and comparison_rhr_values:
        current_avg_rhr = sum(current_rhr_values) / len(current_rhr_values)
        comparison_avg_rhr = sum(comparison_rhr_values) / len(comparison_rhr_values)
        # For RHR, lower is better, so invert the trend
        rhr_trend = -calc_percentage_change(current_avg_rhr, comparison_avg_rhr)

    # Create or update trend record
    trend = Trend.query.filter_by(
        user_id=user_id,
        trend_type=trend_type,
        period_end=period_end
    ).first()

    if not trend:
        trend = Trend(
            user_id=user_id,
            trend_type=trend_type,
            period_start=period_start,
            period_end=period_end,
            comparison_start=comparison_start,
            comparison_end=comparison_end
        )
        db.session.add(trend)
    else:
        trend.period_start = period_start
        trend.comparison_start = comparison_start
        trend.comparison_end = comparison_end
        trend.created_at = datetime.utcnow()

    # Update trend metrics
    trend.total_sleep_trend = round(total_sleep_trend, 1)
    trend.deep_sleep_trend = round(deep_sleep_trend, 1)
    trend.rem_sleep_trend = round(rem_sleep_trend, 1)
    trend.efficiency_trend = round(efficiency_trend, 1)
    trend.sleep_score_trend = round(sleep_score_trend, 1)
    trend.hrv_trend = round(hrv_trend, 1) if hrv_trend is not None else None
    trend.resting_hr_trend = round(rhr_trend, 1) if rhr_trend is not None else None

    db.session.commit()

    return trend

def generate_insights(user_id):
    """
    Generate personalized insights based on sleep data analysis

    Args:
        user_id: User ID to generate insights for

    Returns:
        list: Generated insights
    """
    insights = []

    # Get baseline and trends
    baseline = Baseline.query.filter_by(user_id=user_id).order_by(Baseline.updated_at.desc()).first()
    weekly_trend = Trend.query.filter_by(user_id=user_id, trend_type='weekly').order_by(Trend.period_end.desc()).first()

    # Get latest record
    latest_record = SleepRecord.query.filter_by(user_id=user_id).order_by(SleepRecord.record_date.desc()).first()

    # Only proceed if we have baseline data
    if not baseline or not latest_record:
        # If user has some data but not enough for a baseline, create a calibration insight
        record_count = SleepRecord.query.filter_by(user_id=user_id).count()
        if record_count > 0 and record_count < 14:
            calibration_insight = Insight(
                user_id=user_id,
                insight_type='calibration',
                title='Building your sleep profile',
                description=f'We need at least 14 days of sleep data to establish your personal baseline. You currently have {record_count} days of data. Keep tracking your sleep to unlock personalized insights!',
                importance=5
            )
            db.session.add(calibration_insight)
            db.session.commit()
            insights.append(calibration_insight)

        return insights

    # Clear old insights (keep calibration messages)
    old_insights = Insight.query.filter(
        Insight.user_id == user_id,
        Insight.insight_type != 'calibration'
    ).all()

    for insight in old_insights:
        db.session.delete(insight)

    # Check for significant drops in sleep quality
    if weekly_trend and weekly_trend.sleep_score_trend < -10:
        quality_insight = Insight(
            user_id=user_id,
            insight_type='pattern',
            title='Declining sleep quality',
            description=f'Your overall sleep quality has decreased by {abs(round(weekly_trend.sleep_score_trend))}% compared to last week. This might be affecting your daily energy and focus.',
            importance=4,
            related_metric='sleep_score'
        )
        db.session.add(quality_insight)
        insights.append(quality_insight)

    # Check for sleep duration issues
    if latest_record.total_sleep_duration < baseline.avg_total_sleep * 0.85:
        duration_insight = Insight(
            user_id=user_id,
            insight_type='recommendation',
            title='Sleep duration below your baseline',
            description=f'Your recent sleep duration of {round(latest_record.total_sleep_duration/60, 1)} hours is significantly below your baseline of {round(baseline.avg_total_sleep/60, 1)} hours. Aim for consistent sleep duration by maintaining regular bedtimes.',
            importance=4,
            related_metric='total_sleep_duration'
        )
        db.session.add(duration_insight)
        insights.append(duration_insight)

    # Check for deep sleep changes
    if latest_record.deep_sleep_duration < baseline.avg_deep_sleep * 0.8:
        deep_sleep_insight = Insight(
            user_id=user_id,
            insight_type='recommendation',
            title='Deep sleep decrease',
            description='Your deep sleep is lower than usual. Deep sleep is essential for physical recovery. Consider limiting alcohol before bed and ensuring your room is cool and dark.',
            importance=3,
            related_metric='deep_sleep_duration'
        )
        db.session.add(deep_sleep_insight)
        insights.append(deep_sleep_insight)

    # Check for REM sleep changes
    if latest_record.rem_sleep_duration < baseline.avg_rem_sleep * 0.8:
        rem_sleep_insight = Insight(
            user_id=user_id,
            insight_type='recommendation',
            title='REM sleep decrease',
            description='Your REM sleep is lower than usual. REM sleep supports learning and emotional regulation. Try reducing screen time before bed and manage stress with relaxation techniques.',
            importance=3,
            related_metric='rem_sleep_duration'
        )
        db.session.add(rem_sleep_insight)
        insights.append(rem_sleep_insight)

    # Check for improved HRV
    if weekly_trend and weekly_trend.hrv_trend and weekly_trend.hrv_trend > 10:
        hrv_insight = Insight(
            user_id=user_id,
            insight_type='pattern',
            title='Improved heart rate variability',
            description=f'Your heart rate variability (HRV) has increased by {round(weekly_trend.hrv_trend)}% compared to last week. Higher HRV often indicates better recovery and stress resilience.',
            importance=3,
            related_metric='average_hrv'
        )
        db.session.add(hrv_insight)
        insights.append(hrv_insight)

    # Check for concerning resting heart rate trends
    if weekly_trend and weekly_trend.resting_hr_trend and weekly_trend.resting_hr_trend < -10:
        rhr_insight = Insight(
            user_id=user_id,
            insight_type='pattern',
            title='Rising resting heart rate',
            description=f'Your resting heart rate has increased compared to last week. This could indicate incomplete recovery or increased stress. Consider prioritizing rest and stress management.',
            importance=4,
            related_metric='resting_heart_rate'
        )
        db.session.add(rhr_insight)
        insights.append(rhr_insight)

    # Positive trend insight
    if weekly_trend and weekly_trend.sleep_score_trend > 10:
        positive_insight = Insight(
            user_id=user_id,
            insight_type='pattern',
            title='Improving sleep quality',
            description=f'Your sleep quality has improved by {round(weekly_trend.sleep_score_trend)}% compared to last week. Great job! Continue with your current sleep routine to maintain these gains.',
            importance=2,
            related_metric='sleep_score'
        )
        db.session.add(positive_insight)
        insights.append(positive_insight)

    # Sleep efficiency insight
    if latest_record.efficiency < baseline.avg_efficiency * 0.9:
        efficiency_insight = Insight(
            user_id=user_id,
            insight_type='recommendation',
            title='Sleep efficiency decrease',
            description=f'Your sleep efficiency of {round(latest_record.efficiency)}% is below your baseline of {round(baseline.avg_efficiency)}%. This means you\'re spending more time awake in bed. Consider going to bed only when sleepy and maintaining a consistent wake time.',
            importance=3,
            related_metric='efficiency'
        )
        db.session.add(efficiency_insight)
        insights.append(efficiency_insight)

    db.session.commit()
    return insights