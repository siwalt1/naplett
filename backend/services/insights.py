from datetime import datetime, timedelta
from models import db, Insight, SleepRecord, Baseline

# def generate_insights(user_id):
#     """Generate personalized insights based on sleep data analysis"""
#     # Clear old insights (keep calibration messages)
#     old_insights = Insight.query.filter(
#         Insight.user_id == user_id,
#         Insight.insight_type != 'calibration'
#     ).all()
#
#     for insight in old_insights:
#         db.session.delete(insight)
#
#     # Get baseline and latest sleep record
#     baseline = Baseline.query.filter_by(user_id=user_id).order_by(Baseline.updated_at.desc()).first()
#     latest_record = SleepRecord.query.filter_by(user_id=user_id).order_by(SleepRecord.record_date.desc()).first()
#
#     # Get recent records for trend analysis
#     recent_records = SleepRecord.query.filter_by(user_id=user_id).order_by(SleepRecord.record_date.desc()).limit(14).all()
#
#     # Check if we have enough data
#     record_count = SleepRecord.query.filter_by(user_id=user_id).count()
#
#     if record_count < 7:
#         calibration_insight = Insight(
#             user_id=user_id,
#             insight_type='calibration',
#             title='Building your sleep profile',
#             description=f'We need at least 14 days of sleep data to establish your personal baseline. You currently have {record_count} days of data. Keep tracking your sleep to unlock personalized insights!',
#             importance=5
#         )
#         db.session.add(calibration_insight)
#         db.session.commit()
#         return [calibration_insight]
#
#     insights = []
#
#     # If we don't have a baseline yet, return only calibration message
#     if not baseline or not latest_record or not recent_records:
#         return insights
#
#     # Get sleep score components if available
#     score_components = latest_record.sleep_score_components
#
#     # 1. Sleep Duration Insights
#     if latest_record.total_sleep_duration < 360:  # Less than 6 hours
#         duration_insight = Insight(
#             user_id=user_id,
#             insight_type='recommendation',
#             title='Sleep duration below recommended levels',
#             description=f'Your recent sleep duration of {round(latest_record.total_sleep_duration/60, 1)} hours is below the recommended minimum of 6 hours. Aim to go to bed earlier to increase your total sleep time.',
#             importance=4,
#             related_metric='total_sleep_duration'
#         )
#         db.session.add(duration_insight)
#         insights.append(duration_insight)
#
#     if score_components and 'duration_score' in score_components and score_components['duration_score'] < 70:
#         duration_insight = Insight(
#             user_id=user_id,
#             insight_type='recommendation',
#             title='Optimize your sleep duration',
#             description=f'Your sleep duration score is {round(score_components["duration_score"])}. Try to aim for 7-9 hours of sleep consistently to improve this score.',
#             importance=3,
#             related_metric='duration_score'
#         )
#         db.session.add(duration_insight)
#         insights.append(duration_insight)
#
#     # 2. Sleep Architecture Insights
#     if score_components and 'architecture_score' in score_components and score_components['architecture_score'] < 70:
#         # Check if it's more of a deep sleep or REM sleep issue
#         if latest_record.deep_sleep_duration / latest_record.total_sleep_duration < 0.15:
#             architecture_insight = Insight(
#                 user_id=user_id,
#                 insight_type='recommendation',
#                 title='Deep sleep opportunity',
#                 description='Your deep sleep percentage is lower than optimal. To improve deep sleep, consider avoiding alcohol before bed, exercising regularly (but not too close to bedtime), and keeping your bedroom cool.',
#                 importance=3,
#                 related_metric='deep_sleep_duration'
#             )
#             db.session.add(architecture_insight)
#             insights.append(architecture_insight)
#
#         if latest_record.rem_sleep_duration / latest_record.total_sleep_duration < 0.18:
#             architecture_insight = Insight(
#                 user_id=user_id,
#                 insight_type='recommendation',
#                 title='REM sleep opportunity',
#                 description='Your REM sleep percentage is lower than optimal. To improve REM sleep, maintain a consistent sleep schedule, manage stress levels, and avoid caffeine and alcohol before bed.',
#                 importance=3,
#                 related_metric='rem_sleep_duration'
#             )
#             db.session.add(architecture_insight)
#             insights.append(architecture_insight)
#
#     # 3. Sleep Quality (Efficiency & Continuity) Insights
#     if score_components and 'quality_score' in score_components and score_components['quality_score'] < 70:
#         if latest_record.efficiency < 85:
#             efficiency_insight = Insight(
#                 user_id=user_id,
#                 insight_type='recommendation',
#                 title='Improve sleep efficiency',
#                 description=f'Your sleep efficiency of {round(latest_record.efficiency)}% is below the optimal 85%. Consider going to bed only when you feel sleepy and creating a relaxing bedtime routine.',
#                 importance=3,
#                 related_metric='efficiency'
#             )
#             db.session.add(efficiency_insight)
#             insights.append(efficiency_insight)
#
#         if latest_record.restless_periods > 3:
#             restless_insight = Insight(
#                 user_id=user_id,
#                 insight_type='recommendation',
#                 title='Reduce sleep disruptions',
#                 description=f'You had {latest_record.restless_periods} restless periods during your sleep. Consider checking your mattress comfort, room temperature, and reducing noise and light disturbances.',
#                 importance=3,
#                 related_metric='restless_periods'
#             )
#             db.session.add(restless_insight)
#             insights.append(restless_insight)
#
#     # 4. Physiological Insights
#     if latest_record.resting_heart_rate and baseline.avg_resting_hr:
#         if latest_record.resting_heart_rate > baseline.avg_resting_hr * 1.1:
#             hr_insight = Insight(
#                 user_id=user_id,
#                 insight_type='pattern',
#                 title='Rising resting heart rate',
#                 description='Your resting heart rate has increased compared to your baseline. This could indicate incomplete recovery or increased stress. Consider prioritizing rest and stress management.',
#                 importance=4,
#                 related_metric='resting_heart_rate'
#             )
#             db.session.add(hr_insight)
#             insights.append(hr_insight)
#
#     if latest_record.average_hrv and baseline.avg_hrv:
#         if latest_record.average_hrv < baseline.avg_hrv * 0.85:
#             hrv_insight = Insight(
#                 user_id=user_id,
#                 insight_type='recommendation',
#                 title='HRV decrease detected',
#                 description='Your heart rate variability (HRV) is lower than your baseline. Lower HRV can indicate stress or incomplete recovery. Consider gentle exercise, relaxation techniques, and ensuring adequate hydration.',
#                 importance=3,
#                 related_metric='average_hrv'
#             )
#             db.session.add(hrv_insight)
#             insights.append(hrv_insight)
#
#     # 5. Positive reinforcement for good sleep
#     if latest_record.sleep_score and latest_record.sleep_score > 85:
#         positive_insight = Insight(
#             user_id=user_id,
#             insight_type='pattern',
#             title='Excellent sleep quality',
#             description=f'Your sleep score of {round(latest_record.sleep_score)} indicates excellent sleep quality. Keep maintaining your current sleep habits!',
#             importance=2,
#             related_metric='sleep_score'
#         )
#         db.session.add(positive_insight)
#         insights.append(positive_insight)
#
#     db.session.commit()
#     return insights

def generate_insights(user_id):
    """Generate personalized insights based on sleep data analysis"""
    # Clear old insights (keep calibration messages)
    old_insights = Insight.query.filter(
        Insight.user_id == user_id,
        Insight.insight_type != 'calibration'
    ).all()

    for insight in old_insights:
        db.session.delete(insight)

    # Get baseline and latest sleep record
    baseline = Baseline.query.filter_by(user_id=user_id).order_by(Baseline.updated_at.desc()).first()
    latest_record = SleepRecord.query.filter_by(user_id=user_id).order_by(SleepRecord.record_date.desc()).first()

    # Get recent records for trend analysis
    recent_records = SleepRecord.query.filter_by(user_id=user_id).order_by(SleepRecord.record_date.desc()).limit(14).all()

    # Check if we have enough data
    record_count = SleepRecord.query.filter_by(user_id=user_id).count()

    if record_count < 7:
        calibration_insight = Insight(
            user_id=user_id,
            insight_type='calibration',
            title='Building your sleep profile',
            description=f'We need at least 14 days of sleep data to establish your personal baseline. You currently have {record_count} days of data. Keep tracking your sleep to unlock personalized insights!',
            importance=5
        )
        db.session.add(calibration_insight)
        db.session.commit()
        return [calibration_insight]

    insights = []

    # If we don't have a baseline yet, return only calibration message
    if not baseline or not latest_record or not recent_records:
        return insights

    # Get sleep score components if available
    score_components = latest_record.sleep_score_components

    # 1. Sleep Duration Insights
    if latest_record.total_sleep_duration < 360:  # Less than 6 hours
        duration_insight = Insight(
            user_id=user_id,
            insight_type='recommendation',
            title='Sleep duration below recommended levels',
            description=f'Your recent sleep duration of {round(latest_record.total_sleep_duration/60, 1)} hours is below the recommended minimum of 6 hours. Aim to go to bed earlier to increase your total sleep time.',
            importance=4,
            related_metric='total_sleep_duration'
        )
        db.session.add(duration_insight)
        insights.append(duration_insight)

    if score_components and 'duration_score' in score_components and score_components['duration_score'] < 70:
        duration_insight = Insight(
            user_id=user_id,
            insight_type='recommendation',
            title='Optimize your sleep duration',
            description=f'Your sleep duration score is {round(score_components["duration_score"])}. Try to aim for 7-9 hours of sleep consistently to improve this score.',
            importance=3,
            related_metric='duration_score'
        )
        db.session.add(duration_insight)
        insights.append(duration_insight)

    # 2. Sleep Architecture Insights
    if score_components and 'architecture_score' in score_components and score_components['architecture_score'] < 70:
        # Check if it's more of a deep sleep or REM sleep issue
        if latest_record.deep_sleep_duration / latest_record.total_sleep_duration < 0.15:
            architecture_insight = Insight(
                user_id=user_id,
                insight_type='recommendation',
                title='Deep sleep opportunity',
                description='Your deep sleep percentage is lower than optimal. To improve deep sleep, consider avoiding alcohol before bed, exercising regularly (but not too close to bedtime), and keeping your bedroom cool.',
                importance=3,
                related_metric='deep_sleep_duration'
            )
            db.session.add(architecture_insight)
            insights.append(architecture_insight)

        if latest_record.rem_sleep_duration / latest_record.total_sleep_duration < 0.18:
            architecture_insight = Insight(
                user_id=user_id,
                insight_type='recommendation',
                title='REM sleep opportunity',
                description='Your REM sleep percentage is lower than optimal. To improve REM sleep, maintain a consistent sleep schedule, manage stress levels, and avoid caffeine and alcohol before bed.',
                importance=3,
                related_metric='rem_sleep_duration'
            )
            db.session.add(architecture_insight)
            insights.append(architecture_insight)

    # 3. Sleep Quality (Efficiency & Continuity) Insights
    if score_components and 'quality_score' in score_components and score_components['quality_score'] < 70:
        if latest_record.efficiency < 85:
            efficiency_insight = Insight(
                user_id=user_id,
                insight_type='recommendation',
                title='Improve sleep efficiency',
                description=f'Your sleep efficiency of {round(latest_record.efficiency)}% is below the optimal 85%. Consider going to bed only when you feel sleepy and creating a relaxing bedtime routine.',
                importance=3,
                related_metric='efficiency'
            )
            db.session.add(efficiency_insight)
            insights.append(efficiency_insight)

        if latest_record.restless_periods > 3:
            restless_insight = Insight(
                user_id=user_id,
                insight_type='recommendation',
                title='Reduce sleep disruptions',
                description=f'You had {latest_record.restless_periods} restless periods during your sleep. Consider checking your mattress comfort, room temperature, and reducing noise and light disturbances.',
                importance=3,
                related_metric='restless_periods'
            )
            db.session.add(restless_insight)
            insights.append(restless_insight)

    # 4. Physiological Insights
    if latest_record.resting_heart_rate and baseline.avg_resting_hr:
        if latest_record.resting_heart_rate > baseline.avg_resting_hr * 1.1:
            hr_insight = Insight(
                user_id=user_id,
                insight_type='pattern',
                title='Rising resting heart rate',
                description='Your resting heart rate has increased compared to your baseline. This could indicate incomplete recovery or increased stress. Consider prioritizing rest and stress management.',
                importance=4,
                related_metric='resting_heart_rate'
            )
            db.session.add(hr_insight)
            insights.append(hr_insight)

    if latest_record.average_hrv and baseline.avg_hrv:
        if latest_record.average_hrv < baseline.avg_hrv * 0.85:
            hrv_insight = Insight(
                user_id=user_id,
                insight_type='recommendation',
                title='HRV decrease detected',
                description='Your heart rate variability (HRV) is lower than your baseline. Lower HRV can indicate stress or incomplete recovery. Consider gentle exercise, relaxation techniques, and ensuring adequate hydration.',
                importance=3,
                related_metric='average_hrv'
            )
            db.session.add(hrv_insight)
            insights.append(hrv_insight)

    # 5. Positive reinforcement for good sleep
    if latest_record.sleep_score and latest_record.sleep_score > 85:
        positive_insight = Insight(
            user_id=user_id,
            insight_type='pattern',
            title='Excellent sleep quality',
            description=f'Your sleep score of {round(latest_record.sleep_score)} indicates excellent sleep quality. Keep maintaining your current sleep habits!',
            importance=2,
            related_metric='sleep_score'
        )
        db.session.add(positive_insight)
        insights.append(positive_insight)

    db.session.commit()
    return insights