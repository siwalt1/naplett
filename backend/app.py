import os
import time
from datetime import datetime
import numpy as np

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from sqlalchemy.exc import OperationalError
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
from flask_migrate import Migrate

from models import db, User, SleepData

load_dotenv()
app = Flask(__name__)
database_url = os.getenv('DATABASE_URL')
if not database_url:
    raise ValueError("DATABASE_URL environment variable is not set")

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key')
CORS(app, supports_credentials=True)
db.init_app(app)
migrate = Migrate(app, db)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))

@app.route('/')
def health_check():
    return jsonify({'status': 'ok'}), 200

with app.app_context():
    retries = 5
    while retries > 0:
        try:
            db.create_all()
            break
        except OperationalError as e:
            print(f"Failed to connect to database: {e}")
            retries -= 1
            if retries == 0:
                raise
            print(f"Retrying in 5 seconds... ({retries} attempts left)")
            time.sleep(5)

def calculate_sleep_score(data):
    # Extract data
    total_sleep = data['total_sleep_duration']
    deep_sleep = data['deep_sleep_duration']
    rem_sleep = data['rem_sleep_duration']
    efficiency = data['efficiency']
    restless_periods = data['restless_periods']
    sleep_midpoint = datetime.fromisoformat(data['sleep_midpoint'].replace('Z', '+00:00'))
    lowest_hr = data['lowest_heart_rate']
    average_hrv = data['average_hrv']
    resting_hr = data['resting_heart_rate']

    # 1. Sleep Duration Score (25%)
    optimal_sleep = 480  # 8 hours in minutes
    duration_score = min(100, max(0, 100 - (abs(total_sleep - optimal_sleep) / optimal_sleep) * 100))

    # 2. Sleep Architecture Score (25%)
    if total_sleep > 0:
        deep_pct = deep_sleep / total_sleep
        rem_pct = rem_sleep / total_sleep
        deep_score = max(0, min(100, 100 - 200 * abs(0.20 - deep_pct)))
        rem_score = max(0, min(100, 100 - 200 * abs(0.23 - rem_pct)))
        architecture_score = (deep_score * 0.5) + (rem_score * 0.5)
    else:
        architecture_score = 0

    # 3. Sleep Efficiency & Continuity Score (20%)
    efficiency_score = min(100, max(0, efficiency))
    continuity_penalty = min(50, restless_periods * 5)  # Up to 50% penalty
    efficiency_continuity_score = max(0, efficiency_score - continuity_penalty)

    # 4. Sleep Timing & Consistency Score (15%) - Simplified
    optimal_midpoint = sleep_midpoint.replace(hour=3, minute=0, second=0)
    time_diff = abs((sleep_midpoint - optimal_midpoint).total_seconds()) / 3600  # Hours
    timing_score = max(0, 100 - (time_diff * 20))  # Lose 20 points per hour deviation

    # 5. Physiological Signals Score (15%) - Simplified
    hr_dip = resting_hr - lowest_hr if resting_hr and lowest_hr else 0
    hr_score = min(100, max(0, hr_dip * 5))  # 5 points per bpm dip, max 100
    hrv_score = min(100, average_hrv or 0) if average_hrv else 50  # Default 50 if null
    physiological_score = (hr_score * 0.6) + (hrv_score * 0.4)

    # Total Sleep Score
    total_score = (
        0.25 * duration_score +
        0.25 * architecture_score +
        0.20 * efficiency_continuity_score +
        0.15 * timing_score +
        0.15 * physiological_score
    )

    return {
        'total_score': round(total_score, 2),
        'components': {
            'duration_score': round(duration_score, 2),
            'architecture_score': round(architecture_score, 2),
            'efficiency_continuity_score': round(efficiency_continuity_score, 2),
            'timing_score': round(timing_score, 2),
            'physiological_score': round(physiological_score, 2)
        }
    }

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'Username exists'}), 400
    user = User(username=data['username'], password=generate_password_hash(data['password']))
    db.session.add(user)
    db.session.commit()
    login_user(user)
    return jsonify({'message': 'Registered successfully'})

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.json
        user = User.query.filter_by(username=data['username']).first()
        if user and check_password_hash(user.password, data['password']):
            login_user(user)
            return jsonify({'message': 'Logged in'})
        return jsonify({'error': 'Invalid credentials'}), 401
    return jsonify({'error': 'Use POST to login'}), 405

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out'})

@app.route('/sleep', methods=['POST'])
@login_required
def add_sleep():
    data = request.json
    try:
        date_obj = datetime.strptime(data['sleep_metrics']['bedtime_start'][:10], '%Y-%m-%d').date()
        sleep_midpoint = datetime.fromisoformat(data['sleep_metrics']['sleep_midpoint'].replace('Z', '+00:00'))
        bedtime_start = datetime.fromisoformat(data['sleep_metrics']['bedtime_start'].replace('Z', '+00:00'))
        bedtime_end = datetime.fromisoformat(data['sleep_metrics']['bedtime_end'].replace('Z', '+00:00'))
    except (ValueError, KeyError) as e:
        return jsonify({'error': 'Invalid date format or missing fields'}), 400

    sleep_data = {**data['sleep_metrics'], **data['physiological_metrics']}
    score_data = calculate_sleep_score(sleep_data)

    sleep = SleepData(
        user_id=current_user.id,
        date=date_obj,
        sleep_score=score_data['total_score'],
        total_sleep_duration=sleep_data['total_sleep_duration'],
        deep_sleep_duration=sleep_data['deep_sleep_duration'],
        rem_sleep_duration=sleep_data['rem_sleep_duration'],
        efficiency=sleep_data['efficiency'],
        restless_periods=sleep_data['restless_periods'],
        sleep_midpoint=sleep_midpoint,
        bedtime_start=bedtime_start,
        bedtime_end=bedtime_end,
        lowest_heart_rate=sleep_data['lowest_heart_rate'],
        average_hrv=sleep_data['average_hrv'],
        resting_heart_rate=sleep_data['resting_heart_rate'],
        respiratory_rate=sleep_data['respiratory_rate']
    )
    db.session.add(sleep)
    db.session.commit()
    return jsonify({'message': 'Sleep data added', 'sleep_score': score_data['total_score']})

@app.route('/sleep', methods=['GET'])
@login_required
def get_sleep():
    sleep_data = db.session.execute(db.select(SleepData).filter_by(user_id=current_user.id)).scalars().all()
    enriched_data = []
    for d in sleep_data:
        # Recalculate components for each entry
        sleep_metrics = {
            'total_sleep_duration': d.total_sleep_duration,
            'deep_sleep_duration': d.deep_sleep_duration,
            'rem_sleep_duration': d.rem_sleep_duration,
            'efficiency': d.efficiency,
            'restless_periods': d.restless_periods,
            'sleep_midpoint': d.sleep_midpoint.isoformat(),
            'bedtime_start': d.bedtime_start.isoformat(),
            'bedtime_end': d.bedtime_end.isoformat(),
            'lowest_heart_rate': d.lowest_heart_rate,
            'average_hrv': d.average_hrv,
            'resting_heart_rate': d.resting_heart_rate,
            'respiratory_rate': d.respiratory_rate
        }
        score_data = calculate_sleep_score(sleep_metrics)
        enriched_data.append({
            'date': d.date.isoformat(),
            'sleep_score': d.sleep_score,
            'total_sleep_duration': d.total_sleep_duration,
            'deep_sleep_duration': d.deep_sleep_duration,
            'rem_sleep_duration': d.rem_sleep_duration,
            'efficiency': d.efficiency,
            'restless_periods': d.restless_periods,
            'sleep_midpoint': d.sleep_midpoint.isoformat(),
            'bedtime_start': d.bedtime_start.isoformat(),
            'bedtime_end': d.bedtime_end.isoformat(),
            'lowest_heart_rate': d.lowest_heart_rate,
            'average_hrv': d.average_hrv,
            'resting_heart_rate': d.resting_heart_rate,
            'respiratory_rate': d.respiratory_rate,
            'score_components': score_data['components']
        })
    return jsonify({'sleep_data': enriched_data})


@app.route('/sleep', methods=['DELETE'])
@login_required
def delete_all_sleep():
    try:
        # Delete all SleepData entries for the current user
        db.session.execute(db.delete(SleepData).filter_by(user_id=current_user.id))
        db.session.commit()
        return jsonify({'message': 'All sleep data deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Error deleting sleep data: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)