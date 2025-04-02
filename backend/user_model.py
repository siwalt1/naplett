from datetime import datetime, timedelta

class SleepUserModel:
    def __init__(self, user_id):
        self.user_id = user_id
        self.sleep_data = []
        self.sleep_metrics = {
            'current_score': None,
            'avg_7d_score': None,
            'current_total_sleep': None,
            'avg_7d_total_sleep': None,
            'current_efficiency': None,
            'avg_7d_efficiency': None
        }
        self.trends = {
            'score_trend': None,
            'total_sleep_trend': None,
            'efficiency_trend': None
        }
        self.recommendations = []

    def update_from_db(self, sleep_data):
        self.sleep_data = sorted(sleep_data, key=lambda x: x.date)
        if not self.sleep_data:
            return

        latest = self.sleep_data[-1]
        self.sleep_metrics['current_score'] = latest.sleep_score
        self.sleep_metrics['current_total_sleep'] = latest.total_sleep_duration / 60  # Convert to hours
        self.sleep_metrics['current_efficiency'] = latest.efficiency

        today = datetime.now().date()
        seven_days_ago = today - timedelta(days=7)
        recent_7d = [d for d in self.sleep_data if d.date >= seven_days_ago]
        previous_7d = [d for d in self.sleep_data if d.date < seven_days_ago and d.date >= today - timedelta(days=14)]

        def safe_mean(data, attr):
            values = [getattr(d, attr) for d in data if getattr(d, attr) is not None]
            return sum(values) / len(values) if values else None

        self.sleep_metrics['avg_7d_score'] = safe_mean(recent_7d, 'sleep_score')
        self.sleep_metrics['avg_7d_total_sleep'] = safe_mean(recent_7d, 'total_sleep_duration') / 60 if recent_7d else None
        self.sleep_metrics['avg_7d_efficiency'] = safe_mean(recent_7d, 'efficiency')

        def calculate_trend(current, previous):
            if current and previous and previous != 0:
                return ((current - previous) / previous) * 100
            return None

        self.trends['score_trend'] = calculate_trend(self.sleep_metrics['avg_7d_score'], safe_mean(previous_7d, 'sleep_score'))
        self.trends['total_sleep_trend'] = calculate_trend(self.sleep_metrics['avg_7d_total_sleep'], safe_mean(previous_7d, 'total_sleep_duration') / 60)
        self.trends['efficiency_trend'] = calculate_trend(self.sleep_metrics['avg_7d_efficiency'], safe_mean(previous_7d, 'efficiency'))

    def generate_recommendations(self):
        self.recommendations = []
        if self.sleep_metrics['current_score'] and self.sleep_metrics['current_score'] < 80:
            self.recommendations.append("Your sleep score is low. Aim for a consistent sleep schedule.")
        if self.sleep_metrics['current_total_sleep'] and self.sleep_metrics['current_total_sleep'] < 7:
            self.recommendations.append("You’re sleeping less than 7 hours. Aim for 7-9 hours.")
        if self.sleep_metrics['current_efficiency'] and self.sleep_metrics['current_efficiency'] < 85:
            self.recommendations.append("Your sleep efficiency is low. Reduce disturbances.")

    def to_dict(self):
        return {
            'sleep_metrics': self.sleep_metrics,
            'trends': self.trends,
            'recommendations': self.recommendations
        }