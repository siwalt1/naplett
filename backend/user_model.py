import numpy as np
from datetime import datetime, timedelta

class SleepUserModel:
    def __init__(self, user_id):
        self.user_id = user_id
        self.sleep_data = []
        self.sleep_metrics = {
            'current_score': None,
            'avg_7d': None,
            'avg_30d': None,
            'current_hours': None,
            'avg_hours_7d': None,
            'avg_hours_30d': None,
            'current_spo2': None,
            'avg_spo2_7d': None,
            'avg_spo2_30d': None,
            'current_readiness': None,
            'avg_readiness_7d': None,
            'avg_readiness_30d': None,
            'current_deep_sleep': None,
            'avg_deep_sleep_7d': None,
            'avg_deep_sleep_30d': None,
            'current_rem_sleep': None,
            'avg_rem_sleep_7d': None,
            'avg_rem_sleep_30d': None,
            'current_heart_rate': None,
            'avg_heart_rate_7d': None,
            'avg_heart_rate_30d': None,
            'current_hrv': None,
            'avg_hrv_7d': None,
            'avg_hrv_30d': None,
            'current_steps': None,
            'avg_steps_7d': None,
            'avg_steps_30d': None,
            'current_sedentary_time': None,
            'avg_sedentary_time_7d': None,
            'avg_sedentary_time_30d': None
        }
        self.trends = {
            'sleep_trend': None,
            'hours_trend': None,
            'spo2_trend': None,
            'readiness_trend': None,
            'deep_sleep_trend': None,
            'rem_sleep_trend': None,
            'heart_rate_trend': None,
            'hrv_trend': None,
            'steps_trend': None,
            'sedentary_time_trend': None
        }
        self.recommendations = []

    def update_from_db(self, sleep_data):
        self.sleep_data = sorted(sleep_data, key=lambda x: x.date)
        if not self.sleep_data:
            return

        # Get the most recent data
        latest = self.sleep_data[-1]
        self.sleep_metrics['current_score'] = latest.sleep_score
        self.sleep_metrics['current_hours'] = latest.hours_slept
        self.sleep_metrics['current_spo2'] = latest.spo2_percentage
        self.sleep_metrics['current_readiness'] = latest.readiness_score
        self.sleep_metrics['current_deep_sleep'] = (latest.deep_sleep_duration or 0) / 3600  # Convert to hours
        self.sleep_metrics['current_rem_sleep'] = (latest.rem_sleep_duration or 0) / 3600  # Convert to hours
        self.sleep_metrics['current_heart_rate'] = latest.average_heart_rate
        self.sleep_metrics['current_hrv'] = latest.average_hrv
        self.sleep_metrics['current_steps'] = latest.steps
        self.sleep_metrics['current_sedentary_time'] = (latest.sedentary_time or 0) / 3600  # Convert to hours

        # Calculate 7-day and 30-day averages
        today = datetime.now().date()
        seven_days_ago = today - timedelta(days=7)
        thirty_days_ago = today - timedelta(days=30)

        recent_7d = [d for d in self.sleep_data if d.date >= seven_days_ago]
        recent_30d = [d for d in self.sleep_data if d.date >= thirty_days_ago]

        def safe_mean(data, attr=None):
            if attr is not None:
                # Case 1: Data is a list of objects, extract the attribute
                values = [getattr(d, attr) for d in data if getattr(d, attr) is not None]
            else:
                # Case 2: Data is already a list of values
                values = [d for d in data if d is not None]
            return np.mean(values) if values else None

        # Sleep score averages
        self.sleep_metrics['avg_7d'] = safe_mean(recent_7d, 'sleep_score')
        self.sleep_metrics['avg_30d'] = safe_mean(recent_30d, 'sleep_score')

        # Hours slept averages
        self.sleep_metrics['avg_hours_7d'] = safe_mean(recent_7d, 'hours_slept')
        self.sleep_metrics['avg_hours_30d'] = safe_mean(recent_30d, 'hours_slept')

        # SpO2 averages
        self.sleep_metrics['avg_spo2_7d'] = safe_mean(recent_7d, 'spo2_percentage')
        self.sleep_metrics['avg_spo2_30d'] = safe_mean(recent_30d, 'spo2_percentage')

        # Readiness score averages
        self.sleep_metrics['avg_readiness_7d'] = safe_mean(recent_7d, 'readiness_score')
        self.sleep_metrics['avg_readiness_30d'] = safe_mean(recent_30d, 'readiness_score')

        # Deep sleep averages (in hours)
        self.sleep_metrics['avg_deep_sleep_7d'] = safe_mean([(d.deep_sleep_duration or 0) / 3600 for d in recent_7d])
        self.sleep_metrics['avg_deep_sleep_30d'] = safe_mean([(d.deep_sleep_duration or 0) / 3600 for d in recent_30d])

        # REM sleep averages (in hours)
        self.sleep_metrics['avg_rem_sleep_7d'] = safe_mean([(d.rem_sleep_duration or 0) / 3600 for d in recent_7d])
        self.sleep_metrics['avg_rem_sleep_30d'] = safe_mean([(d.rem_sleep_duration or 0) / 3600 for d in recent_30d])

        # Heart rate averages
        self.sleep_metrics['avg_heart_rate_7d'] = safe_mean(recent_7d, 'average_heart_rate')
        self.sleep_metrics['avg_heart_rate_30d'] = safe_mean(recent_30d, 'average_heart_rate')

        # HRV averages
        self.sleep_metrics['avg_hrv_7d'] = safe_mean(recent_7d, 'average_hrv')
        self.sleep_metrics['avg_hrv_30d'] = safe_mean(recent_30d, 'average_hrv')

        # Steps averages
        self.sleep_metrics['avg_steps_7d'] = safe_mean(recent_7d, 'steps')
        self.sleep_metrics['avg_steps_30d'] = safe_mean(recent_30d, 'steps')

        # Sedentary time averages (in hours)
        self.sleep_metrics['avg_sedentary_time_7d'] = safe_mean([(d.sedentary_time or 0) / 3600 for d in recent_7d])
        self.sleep_metrics['avg_sedentary_time_30d'] = safe_mean([(d.sedentary_time or 0) / 3600 for d in recent_30d])

        # Calculate trends (percentage change over the last 7 days compared to the previous 7 days)
        previous_7d = [d for d in self.sleep_data if thirty_days_ago <= d.date < seven_days_ago]

        def calculate_trend(current_avg, previous_avg):
            if current_avg and previous_avg and previous_avg != 0:
                return ((current_avg - previous_avg) / previous_avg) * 100
            return None

        self.trends['sleep_trend'] = calculate_trend(self.sleep_metrics['avg_7d'], safe_mean(previous_7d, 'sleep_score'))
        self.trends['hours_trend'] = calculate_trend(self.sleep_metrics['avg_hours_7d'], safe_mean(previous_7d, 'hours_slept'))
        self.trends['spo2_trend'] = calculate_trend(self.sleep_metrics['avg_spo2_7d'], safe_mean(previous_7d, 'spo2_percentage'))
        self.trends['readiness_trend'] = calculate_trend(self.sleep_metrics['avg_readiness_7d'], safe_mean(previous_7d, 'readiness_score'))
        self.trends['deep_sleep_trend'] = calculate_trend(self.sleep_metrics['avg_deep_sleep_7d'], safe_mean([(d.deep_sleep_duration or 0) / 3600 for d in previous_7d]))
        self.trends['rem_sleep_trend'] = calculate_trend(self.sleep_metrics['avg_rem_sleep_7d'], safe_mean([(d.rem_sleep_duration or 0) / 3600 for d in previous_7d]))
        self.trends['heart_rate_trend'] = calculate_trend(self.sleep_metrics['avg_heart_rate_7d'], safe_mean(previous_7d, 'average_heart_rate'))
        self.trends['hrv_trend'] = calculate_trend(self.sleep_metrics['avg_hrv_7d'], safe_mean(previous_7d, 'average_hrv'))
        self.trends['steps_trend'] = calculate_trend(self.sleep_metrics['avg_steps_7d'], safe_mean(previous_7d, 'steps'))
        self.trends['sedentary_time_trend'] = calculate_trend(self.sleep_metrics['avg_sedentary_time_7d'], safe_mean([(d.sedentary_time or 0) / 3600 for d in previous_7d]))

    def generate_recommendations(self):
        self.recommendations = []

        # Sleep score recommendations
        if self.sleep_metrics['current_score'] and self.sleep_metrics['current_score'] < 80:
            self.recommendations.append("Your sleep score is low. Try to maintain a consistent sleep schedule and avoid caffeine close to bedtime.")
        if self.sleep_metrics['avg_7d'] and self.sleep_metrics['avg_7d'] < 80 and self.trends['sleep_trend'] and self.trends['sleep_trend'] < 0:
            self.recommendations.append("Your sleep score has been declining. Consider reducing screen time before bed and creating a relaxing bedtime routine.")

        # Hours slept recommendations
        if self.sleep_metrics['current_hours'] and self.sleep_metrics['current_hours'] < 7:
            self.recommendations.append("You're sleeping less than 7 hours. Aim for 7-9 hours of sleep per night for optimal health.")
        if self.sleep_metrics['avg_hours_7d'] and self.sleep_metrics['avg_hours_7d'] < 7:
            self.recommendations.append("Your average sleep duration over the past week is low. Try going to bed earlier to get more rest.")

        # SpO2 recommendations
        if self.sleep_metrics['current_spo2'] and self.sleep_metrics['current_spo2'] < 95:
            self.recommendations.append("Your SpO2 level is below 95%. This could indicate poor oxygenation during sleep. Consider consulting a doctor if this persists.")
        if self.sleep_metrics['avg_spo2_7d'] and self.sleep_metrics['avg_spo2_7d'] < 95 and self.trends['spo2_trend'] and self.trends['spo2_trend'] < 0:
            self.recommendations.append("Your SpO2 levels have been declining. Ensure your sleeping environment is well-ventilated and avoid sleeping in a prone position.")

        # Readiness score recommendations
        if self.sleep_metrics['current_readiness'] and self.sleep_metrics['current_readiness'] < 80:
            self.recommendations.append("Your readiness score is low. Take it easy today and focus on recovery activities like light stretching or meditation.")
        if self.sleep_metrics['avg_readiness_7d'] and self.sleep_metrics['avg_readiness_7d'] < 80:
            self.recommendations.append("Your readiness has been consistently low this week. Ensure you're getting enough rest and managing stress effectively.")

        # Deep sleep recommendations
        if self.sleep_metrics['current_deep_sleep'] and self.sleep_metrics['current_deep_sleep'] < 1:
            self.recommendations.append("Your deep sleep duration is low. Deep sleep is crucial for physical restoration. Avoid alcohol and heavy meals before bed.")
        if self.sleep_metrics['avg_deep_sleep_7d'] and self.sleep_metrics['avg_deep_sleep_7d'] < 1 and self.trends['deep_sleep_trend'] and self.trends['deep_sleep_trend'] < 0:
            self.recommendations.append("Your deep sleep has been decreasing. Try to reduce stress and maintain a cool, dark sleeping environment.")

        # REM sleep recommendations
        if self.sleep_metrics['current_rem_sleep'] and self.sleep_metrics['current_rem_sleep'] < 1.5:
            self.recommendations.append("Your REM sleep duration is low. REM sleep is important for cognitive function. Ensure you're getting enough total sleep.")
        if self.sleep_metrics['avg_rem_sleep_7d'] and self.sleep_metrics['avg_rem_sleep_7d'] < 1.5:
            self.recommendations.append("Your REM sleep has been consistently low. Avoid disruptions during the later part of your sleep cycle.")

        # Heart rate recommendations
        if self.sleep_metrics['current_heart_rate'] and self.sleep_metrics['current_heart_rate'] > 70:
            self.recommendations.append("Your average heart rate during sleep is elevated. This could indicate stress or poor sleep quality. Try relaxation techniques before bed.")
        if self.sleep_metrics['avg_heart_rate_7d'] and self.sleep_metrics['avg_heart_rate_7d'] > 70 and self.trends['heart_rate_trend'] and self.trends['heart_rate_trend'] > 0:
            self.recommendations.append("Your heart rate during sleep has been increasing. Monitor for signs of stress or overtraining, and consider consulting a doctor.")

        # HRV recommendations
        if self.sleep_metrics['current_hrv'] and self.sleep_metrics['current_hrv'] < 40:
            self.recommendations.append("Your HRV is low, indicating potential stress or fatigue. Focus on recovery and avoid intense activities today.")
        if self.sleep_metrics['avg_hrv_7d'] and self.sleep_metrics['avg_hrv_7d'] < 40 and self.trends['hrv_trend'] and self.trends['hrv_trend'] < 0:
            self.recommendations.append("Your HRV has been declining. Prioritize rest and stress management techniques like meditation or deep breathing.")

        # Steps and activity recommendations
        if self.sleep_metrics['current_steps'] and self.sleep_metrics['current_steps'] < 5000:
            self.recommendations.append("Your step count is low. Aim for at least 10,000 steps per day to improve overall health and sleep quality.")
        if self.sleep_metrics['avg_steps_7d'] and self.sleep_metrics['avg_steps_7d'] < 5000 and self.trends['steps_trend'] and self.trends['steps_trend'] < 0:
            self.recommendations.append("Your activity level has been decreasing. Try to incorporate more movement into your daily routine, such as a short walk.")

        # Sedentary time recommendations
        if self.sleep_metrics['current_sedentary_time'] and self.sleep_metrics['current_sedentary_time'] > 10:
            self.recommendations.append("You're spending a lot of time sedentary. Try to take breaks and move around every hour to improve circulation and sleep quality.")
        if self.sleep_metrics['avg_sedentary_time_7d'] and self.sleep_metrics['avg_sedentary_time_7d'] > 10 and self.trends['sedentary_time_trend'] and self.trends['sedentary_time_trend'] > 0:
            self.recommendations.append("Your sedentary time has been increasing. Reduce sitting time by standing or walking periodically throughout the day.")

    def to_dict(self):
        return {
            'sleep_metrics': self.sleep_metrics,
            'trends': self.trends,
            'recommendations': self.recommendations
        }