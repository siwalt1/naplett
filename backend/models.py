from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    sleep_data = db.relationship('SleepData', backref='user', lazy=True)

class SleepData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    date = db.Column(db.Date, nullable=False)  # Still useful for tracking
    sleep_score = db.Column(db.Float, nullable=False)  # Calculated
    total_sleep_duration = db.Column(db.Integer, nullable=False)  # In minutes
    deep_sleep_duration = db.Column(db.Integer, nullable=False)  # In minutes
    rem_sleep_duration = db.Column(db.Integer, nullable=False)  # In minutes
    efficiency = db.Column(db.Float, nullable=False)  # Percentage (0-100)
    restless_periods = db.Column(db.Integer, nullable=False)
    sleep_midpoint = db.Column(db.DateTime, nullable=False)
    bedtime_start = db.Column(db.DateTime, nullable=False)
    bedtime_end = db.Column(db.DateTime, nullable=False)
    lowest_heart_rate = db.Column(db.Integer, nullable=True)  # In bpm
    average_hrv = db.Column(db.Float, nullable=True)  # In ms
    resting_heart_rate = db.Column(db.Integer, nullable=True)  # In bpm
    respiratory_rate = db.Column(db.Float, nullable=True)  # Breaths per minute