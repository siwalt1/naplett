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
    date = db.Column(db.Date, nullable=False)
    sleep_score = db.Column(db.Float, nullable=False)
    hours_slept = db.Column(db.Float, nullable=False)
    # Add new fields to match user_model.py expectations
    spo2_percentage = db.Column(db.Float, nullable=True)
    readiness_score = db.Column(db.Float, nullable=True)
    deep_sleep_duration = db.Column(db.Integer, nullable=True)  # In seconds
    rem_sleep_duration = db.Column(db.Integer, nullable=True)  # In seconds
    light_sleep_duration = db.Column(db.Integer, nullable=True)  # In seconds
    average_heart_rate = db.Column(db.Float, nullable=True)
    average_hrv = db.Column(db.Float, nullable=True)
    active_calories = db.Column(db.Integer, nullable=True)
    steps = db.Column(db.Integer, nullable=True)
    sedentary_time = db.Column(db.Integer, nullable=True)  # In seconds