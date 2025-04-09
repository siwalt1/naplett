from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import os
from datetime import datetime, timedelta

from models import db, User, SleepRecord, Baseline, Trend, Insight
from services.data_import import process_oura_import
from services.analysis import calculate_sleep_score, calculate_baseline, calculate_trends, generate_insights

# Initialize Flask app
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev_key_for_testing')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///naplett.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize extensions
CORS(app, supports_credentials=True, resources={r"/api/*": {"origins": "http://localhost:3000"}})

db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)

# User loader for Flask-Login
@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

# Create database tables
@app.before_first_request
def create_tables():
    db.create_all()

# Routes
@app.route('/api/health')
def health_check():
    return jsonify({'status': 'healthy'}), 200

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', 'http://localhost:3000')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    response.headers.add('Access-Control-Allow-Credentials', 'true')
    return response

# Authentication routes
@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.json

    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing required fields'}), 400

    if User.query.filter_by(email=data['email']).first():
        return jsonify({'error': 'Email already registered'}), 400

    hashed_password = generate_password_hash(data['password'])
    new_user = User(
        email=data['email'],
        password=hashed_password,
        first_name=data.get('first_name'),
        last_name=data.get('last_name')
    )

    db.session.add(new_user)
    db.session.commit()

    login_user(new_user)

    return jsonify({
        'message': 'User registered successfully',
        'user_id': new_user.id
    }), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.json

    if not data or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Missing required fields'}), 400

    user = User.query.filter_by(email=data['email']).first()

    if not user or not check_password_hash(user.password, data['password']):
        return jsonify({'error': 'Invalid credentials'}), 401

    login_user(user)
    user.last_login = datetime.utcnow()
    db.session.commit()

    return jsonify({
        'message': 'Logged in successfully',
        'user_id': user.id
    }), 200

@app.route('/api/auth/logout')
@login_required
def logout():
    logout_user()
    return jsonify({'message': 'Logged out successfully'}), 200

@app.route('/api/user/profile')
@login_required
def get_profile():
    return jsonify({
        'id': current_user.id,
        'email': current_user.email,
        'first_name': current_user.first_name,
        'last_name': current_user.last_name,
        'created_at': current_user.created_at.isoformat(),
        'last_login': current_user.last_login.isoformat() if current_user.last_login else None
    }), 200

# Data upload route
@app.route('/api/sleep/upload', methods=['POST'])
@login_required
def upload_sleep_data():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400

    # Process the uploaded Oura data
    try:
        records_processed = process_oura_import(current_user.id, file)

        # Calculate sleep scores for new data
        baseline = Baseline.query.filter_by(user_id=current_user.id).order_by(Baseline.updated_at.desc()).first()
        for record in records_processed:
            sleep_score_data = calculate_sleep_score(record, baseline)
            record.sleep_score = sleep_score_data['total_score']
            record.sleep_score_components = sleep_score_data['components']

        db.session.commit()

        # Calculate baselines and trends (could be moved to background task)
        calculate_baseline(current_user.id)
        calculate_trends(current_user.id)
        generate_insights(current_user.id)

        return jsonify({
            'message': 'Data uploaded successfully',
            'records_processed': len(records_processed)
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Sleep data routes
@app.route('/api/sleep/records')
@login_required
def get_sleep_records():
    # Optional date range filtering
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    query = SleepRecord.query.filter_by(user_id=current_user.id)

    if start_date:
        query = query.filter(SleepRecord.record_date >= start_date)
    if end_date:
        query = query.filter(SleepRecord.record_date <= end_date)

    # Order by date, newest first
    records = query.order_by(SleepRecord.record_date.desc()).all()

    return jsonify({
        'records': [{
            'id': record.id,
            'date': record.record_date.isoformat(),
            'total_sleep_duration': record.total_sleep_duration,
            'deep_sleep_duration': record.deep_sleep_duration,
            'rem_sleep_duration': record.rem_sleep_duration,
            'light_sleep_duration': record.light_sleep_duration,
            'efficiency': record.efficiency,
            'bedtime_start': record.bedtime_start.isoformat(),
            'bedtime_end': record.bedtime_end.isoformat(),
            'sleep_score': record.sleep_score,
            'sleep_score_components': record.sleep_score_components
        } for record in records]
    }), 200

@app.route('/api/sleep/baseline')
@login_required
def get_baseline():
    baseline = Baseline.query.filter_by(
        user_id=current_user.id
    ).order_by(Baseline.updated_at.desc()).first()

    if not baseline:
        return jsonify({'error': 'No baseline available yet'}), 404

    return jsonify({
        'id': baseline.id,
        'type': baseline.baseline_type,
        'start_date': baseline.start_date.isoformat(),
        'end_date': baseline.end_date.isoformat(),
        'updated_at': baseline.updated_at.isoformat(),
        'metrics': {
            'avg_total_sleep': baseline.avg_total_sleep,
            'avg_deep_sleep': baseline.avg_deep_sleep,
            'avg_rem_sleep': baseline.avg_rem_sleep,
            'avg_light_sleep': baseline.avg_light_sleep,
            'avg_efficiency': baseline.avg_efficiency,
            'avg_hrv': baseline.avg_hrv,
            'avg_resting_hr': baseline.avg_resting_hr,
            'avg_respiratory_rate': baseline.avg_respiratory_rate
        }
    }), 200

@app.route('/api/sleep/trends')
@login_required
def get_trends():
    trend_type = request.args.get('type', 'weekly')

    trend = Trend.query.filter_by(
        user_id=current_user.id,
        trend_type=trend_type
    ).order_by(Trend.period_end.desc()).first()

    if not trend:
        return jsonify({'error': f'No {trend_type} trend available yet'}), 404

    return jsonify({
        'id': trend.id,
        'type': trend.trend_type,
        'period_start': trend.period_start.isoformat(),
        'period_end': trend.period_end.isoformat(),
        'metrics': {
            'total_sleep_trend': trend.total_sleep_trend,
            'deep_sleep_trend': trend.deep_sleep_trend,
            'rem_sleep_trend': trend.rem_sleep_trend,
            'efficiency_trend': trend.efficiency_trend,
            'hrv_trend': trend.hrv_trend,
            'resting_hr_trend': trend.resting_hr_trend,
            'sleep_score_trend': trend.sleep_score_trend
        }
    }), 200

@app.route('/api/sleep/insights')
@login_required
def get_insights():
    insights = Insight.query.filter_by(
        user_id=current_user.id,
        dismissed=False
    ).order_by(
        Insight.importance.desc(),
        Insight.created_at.desc()
    ).limit(10).all()

    return jsonify({
        'insights': [{
            'id': insight.id,
            'type': insight.insight_type,
            'title': insight.title,
            'description': insight.description,
            'importance': insight.importance,
            'created_at': insight.created_at.isoformat(),
            'read': insight.read
        } for insight in insights]
    }), 200

@app.route('/api/sleep/dashboard')
@login_required
def get_dashboard():
    # Get latest sleep record
    latest_sleep = SleepRecord.query.filter_by(
        user_id=current_user.id
    ).order_by(SleepRecord.record_date.desc()).first()

    # Get current baseline
    baseline = Baseline.query.filter_by(
        user_id=current_user.id
    ).order_by(Baseline.updated_at.desc()).first()

    # Get latest trends
    weekly_trend = Trend.query.filter_by(
        user_id=current_user.id,
        trend_type='weekly'
    ).order_by(Trend.period_end.desc()).first()

    # Get top insights
    insights = Insight.query.filter_by(
        user_id=current_user.id,
        dismissed=False
    ).order_by(
        Insight.importance.desc(),
        Insight.created_at.desc()
    ).limit(5).all()

    # Calculate sleep record count
    record_count = SleepRecord.query.filter_by(user_id=current_user.id).count()

    # Check if we're still in calibration mode (less than 14 days of data)
    calibration_status = {
        'in_progress': record_count < 14,
        'days_complete': min(record_count, 14),
        'days_needed': 14
    }

    return jsonify({
        'latest_sleep': {
            'date': latest_sleep.record_date.isoformat() if latest_sleep else None,
            'sleep_score': latest_sleep.sleep_score if latest_sleep else None,
            'total_sleep_duration': latest_sleep.total_sleep_duration if latest_sleep else None,
            'efficiency': latest_sleep.efficiency if latest_sleep else None,
            'deep_sleep_duration': latest_sleep.deep_sleep_duration if latest_sleep else None,
        } if latest_sleep else None,
        'baseline': {
            'avg_total_sleep': baseline.avg_total_sleep,
            'avg_efficiency': baseline.avg_efficiency,
            'avg_hrv': baseline.avg_hrv,
            'avg_deep_sleep': baseline.avg_deep_sleep,
            'avg_rem_sleep': baseline.avg_rem_sleep
        } if baseline else None,
        'trends': {
            'sleep_score_trend': weekly_trend.sleep_score_trend,
            'total_sleep_trend': weekly_trend.total_sleep_trend,
            'deep_sleep_trend': weekly_trend.deep_sleep_trend,
            'hrv_trend': weekly_trend.hrv_trend
        } if weekly_trend else None,
        'insights': [{
            'id': insight.id,
            'title': insight.title,
            'description': insight.description,
            'importance': insight.importance
        } for insight in insights],
        'calibration_status': calibration_status,
        'record_count': record_count
    }), 200

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')