from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime
import uuid

db = SQLAlchemy()

class User(UserMixin, db.Model):
    """User model for authentication and profile information"""
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)

    # User profile information
    first_name = db.Column(db.String(50), nullable=True)
    last_name = db.Column(db.String(50), nullable=True)
    birth_date = db.Column(db.Date, nullable=True)
    gender = db.Column(db.String(20), nullable=True)

    # Relationship with sleep data
    sleep_records = db.relationship('SleepRecord', backref='user', lazy=True)
    baselines = db.relationship('Baseline', backref='user', lazy=True)

    def __repr__(self):
        return f'<User {self.email}>'

class SleepRecord(db.Model):
    """Daily sleep record with all metrics"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    record_date = db.Column(db.Date, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    source = db.Column(db.String(50), default='oura')  # Data source (oura, whoop, etc.)

    # Sleep duration metrics (in minutes)
    total_sleep_duration = db.Column(db.Integer, nullable=False)
    deep_sleep_duration = db.Column(db.Integer, nullable=False)
    rem_sleep_duration = db.Column(db.Integer, nullable=False)
    light_sleep_duration = db.Column(db.Integer, nullable=False)
    awake_duration = db.Column(db.Integer, nullable=False)

    # Sleep timing metrics
    bedtime_start = db.Column(db.DateTime, nullable=False)
    bedtime_end = db.Column(db.DateTime, nullable=False)
    sleep_midpoint = db.Column(db.DateTime, nullable=True)

    # Sleep quality metrics
    efficiency = db.Column(db.Float, nullable=False)  # Percentage (0-100)
    latency = db.Column(db.Integer, nullable=True)  # Time to fall asleep in minutes
    restless_periods = db.Column(db.Integer, nullable=True)

    # Physiological metrics
    lowest_heart_rate = db.Column(db.Integer, nullable=True)
    average_hrv = db.Column(db.Float, nullable=True)
    resting_heart_rate = db.Column(db.Integer, nullable=True)
    respiratory_rate = db.Column(db.Float, nullable=True)
    body_temperature = db.Column(db.Float, nullable=True)

    # Calculated sleep score
    sleep_score = db.Column(db.Float, nullable=True)
    sleep_score_components = db.Column(db.JSON, nullable=True)

    def __repr__(self):
        return f'<SleepRecord {self.user_id} {self.record_date}>'

    class Meta:
        # Ensure a user can only have one sleep record per date
        constraints = [
            db.UniqueConstraint('user_id', 'record_date', name='unique_user_date')
        ]

class Baseline(db.Model):
    """User baseline metrics calculated from historical data"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Baseline type and period
    baseline_type = db.Column(db.String(20), default='14-day')  # 14-day, 30-day, etc.
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)

    # Sleep duration baselines
    avg_total_sleep = db.Column(db.Float, nullable=True)
    avg_deep_sleep = db.Column(db.Float, nullable=True)
    avg_rem_sleep = db.Column(db.Float, nullable=True)
    avg_light_sleep = db.Column(db.Float, nullable=True)

    # Sleep quality baselines
    avg_efficiency = db.Column(db.Float, nullable=True)
    avg_latency = db.Column(db.Float, nullable=True)
    avg_restless_periods = db.Column(db.Float, nullable=True)

    # Physiological baselines
    avg_lowest_hr = db.Column(db.Float, nullable=True)
    avg_hrv = db.Column(db.Float, nullable=True)
    avg_resting_hr = db.Column(db.Float, nullable=True)
    avg_respiratory_rate = db.Column(db.Float, nullable=True)

    # Sleep timing baselines
    avg_bedtime_start = db.Column(db.Time, nullable=True)
    avg_bedtime_end = db.Column(db.Time, nullable=True)
    avg_midpoint = db.Column(db.Time, nullable=True)

    def __repr__(self):
        return f'<Baseline {self.user_id} {self.baseline_type}>'

class Trend(db.Model):
    """Sleep trends calculated for different time periods"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Trend period details
    trend_type = db.Column(db.String(20), nullable=False)  # weekly, monthly
    period_start = db.Column(db.Date, nullable=False)
    period_end = db.Column(db.Date, nullable=False)
    comparison_start = db.Column(db.Date, nullable=False)
    comparison_end = db.Column(db.Date, nullable=False)

    # Trend percentages (positive = improvement, negative = decline)
    total_sleep_trend = db.Column(db.Float, nullable=True)
    deep_sleep_trend = db.Column(db.Float, nullable=True)
    rem_sleep_trend = db.Column(db.Float, nullable=True)
    efficiency_trend = db.Column(db.Float, nullable=True)
    hrv_trend = db.Column(db.Float, nullable=True)
    resting_hr_trend = db.Column(db.Float, nullable=True)

    # Overall sleep score trend
    sleep_score_trend = db.Column(db.Float, nullable=True)

    def __repr__(self):
        return f'<Trend {self.user_id} {self.trend_type} {self.period_end}>'

class Insight(db.Model):
    """Generated insights and recommendations for users"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Insight details
    # Update the insight_type comment to include new types
    insight_type = db.Column(db.String(50), nullable=False)  # pattern, anomaly, recommendation, calibration, baseline_change
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    importance = db.Column(db.Integer, default=1)  # 1-5 scale

    # Related data points
    related_metric = db.Column(db.String(50), nullable=True)
    related_date_start = db.Column(db.Date, nullable=True)
    related_date_end = db.Column(db.Date, nullable=True)

    # User interaction
    read = db.Column(db.Boolean, default=False)
    dismissed = db.Column(db.Boolean, default=False)

    def __repr__(self):
        return f'<Insight {self.id} {self.insight_type}>'