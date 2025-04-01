from datetime import datetime, timedelta
import pandas as pd

class SleepUserModel:
    def __init__(self, user_id):
        self.user_id = user_id
        self.sleep_metrics = {'current_score': None, 'avg_7d': None}
        self.trends = {'sleep_trend': None}
        self.goals = {'sleep_score': 85}  # Default goal
        self.recommendations = []

    def update_from_db(self, sleep_data: list):
        """Update model from database records."""
        if not sleep_data:
            return
        df = pd.DataFrame([(d.date, d.sleep_score) for d in sleep_data], columns=['date', 'score'])
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date')

        # Current score
        self.sleep_metrics['current_score'] = df['score'].iloc[-1]

        # 7-day average and trend
        last_7_days = df[df['date'] >= df['date'].max() - timedelta(days=7)]
        if not last_7_days.empty:
            self.sleep_metrics['avg_7d'] = last_7_days['score'].mean()
            self.trends['sleep_trend'] = ((self.sleep_metrics['current_score'] / self.sleep_metrics['avg_7d']) - 1) * 100

    def set_goal(self, goal_score: float):
        """Set sleep score goal."""
        self.goals['sleep_score'] = goal_score

    def generate_recommendations(self):
        """Generate adaptive recommendations."""
        self.recommendations = []
        score = self.sleep_metrics['current_score']
        trend = self.trends['sleep_trend']

        if score is None:
            self.recommendations.append("Add sleep data to get personalized recommendations.")
            return

        if score < self.goals['sleep_score']:
            self.recommendations.append("Your sleep score is below your goal. Try establishing a consistent bedtime routine.")
        if score < 60:
            self.recommendations.append("Low sleep score detected. Avoid caffeine 6 hours before bed.")
        if trend and trend < -10:
            self.recommendations.append(f"Sleep quality dropped by {abs(round(trend))}% recently. Reduce screen time before bed.")
        if not self.recommendations:
            self.recommendations.append("Your sleep is on track. Keep up the good work!")

    def to_dict(self):
        return {
            'sleep_metrics': self.sleep_metrics,
            'trends': self.trends,
            'goals': self.goals,
            'recommendations': self.recommendations
        }