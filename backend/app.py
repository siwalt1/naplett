from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import os
from datetime import datetime, timedelta
from sqlalchemy import func

from models import db, User, SleepRecord, Baseline, Trend, Insight
from services.data_import import process_oura_import
from services.analysis import (
    calculate_sleep_score,
    calculate_baseline,
    calculate_trends,
    generate_insights,
    generate_baseline_insights,
    calculate_sleep_consistency,
    calculate_correlation
)
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
            'sleep_score_components': record.sleep_score_components,
            'average_hrv': record.average_hrv,
            'resting_heart_rate': record.resting_heart_rate,
            'lowest_heart_rate': record.lowest_heart_rate,
            'respiratory_rate': record.respiratory_rate
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

@app.route('/api/user/profile', methods=['PUT'])
@login_required
def update_profile():
    data = request.json

    # Make sure we have data
    if not data:
        return jsonify({'error': 'No data provided'}), 400

    try:
        # Update user fields
        if 'email' in data and data['email'] != current_user.email:
            # Check if email is already in use by another user
            existing_user = User.query.filter_by(email=data['email']).first()
            if existing_user and existing_user.id != current_user.id:
                return jsonify({'error': 'Email is already in use'}), 400
            current_user.email = data['email']

        if 'first_name' in data:
            current_user.first_name = data['first_name']

        if 'last_name' in data:
            current_user.last_name = data['last_name']

        if 'birth_date' in data and data['birth_date']:
            try:
                current_user.birth_date = datetime.strptime(data['birth_date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid date format for birth_date'}), 400

        if 'gender' in data:
            current_user.gender = data['gender']

        # Save changes
        db.session.commit()

        return jsonify({
            'message': 'Profile updated successfully',
            'id': current_user.id,
            'email': current_user.email,
            'first_name': current_user.first_name,
            'last_name': current_user.last_name,
            'birth_date': current_user.birth_date.isoformat() if current_user.birth_date else None,
            'gender': current_user.gender,
            'created_at': current_user.created_at.isoformat(),
            'last_login': current_user.last_login.isoformat() if current_user.last_login else None
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update profile: {str(e)}'}), 500

    # Add this route to app.py

@app.route('/api/sleep/baseline/history')
@login_required
def get_baseline_history():
    """Get historical baseline data for comparing changes over time"""
    period = request.args.get('period', 'lastMonth')

    # Get current date
    latest_date = db.session.query(func.max(SleepRecord.record_date)).filter_by(user_id=current_user.id).scalar()

    if not latest_date:
        return jsonify({'error': 'No sleep records available'}), 404

    # Determine comparison period
    if period == 'lastMonth':
        comparison_lookback = 30
    elif period == 'lastQuarter':
        comparison_lookback = 90
    elif period == 'lastYear':
        comparison_lookback = 365
    else:
        comparison_lookback = 30

    # Get all historical baselines
    baselines = Baseline.query.filter(
        Baseline.user_id == current_user.id
    ).order_by(Baseline.end_date.desc()).all()

    if not baselines:
        return jsonify({'error': 'No baseline data available yet'}), 404

    # Filter baselines based on comparison period
    filtered_baselines = []
    latest_baseline_date = baselines[0].end_date

    for baseline in baselines:
        # Only include baselines that are either the most recent or from our comparison period
        days_apart = (latest_baseline_date - baseline.end_date).days
        if days_apart == 0 or (days_apart >= comparison_lookback - 14 and days_apart <= comparison_lookback + 14):
            filtered_baselines.append({
                'id': baseline.id,
                'period_name': 'Current' if days_apart == 0 else 'Previous',
                'start_date': baseline.start_date.isoformat(),
                'end_date': baseline.end_date.isoformat(),
                'avg_total_sleep': baseline.avg_total_sleep,
                'avg_deep_sleep': baseline.avg_deep_sleep,
                'avg_rem_sleep': baseline.avg_rem_sleep,
                'avg_light_sleep': baseline.avg_light_sleep,
                'avg_efficiency': baseline.avg_efficiency,
                'avg_hrv': baseline.avg_hrv,
                'avg_resting_hr': baseline.avg_resting_hr,
                'avg_respiratory_rate': baseline.avg_respiratory_rate
            })

    return jsonify({
        'baselineHistory': filtered_baselines
    }), 200

@app.route('/api/sleep/baseline/insights')
@login_required
def get_baseline_change_insights():
    """Get insights about changes between baseline periods"""
    # Get the two most recent baselines
    baselines = Baseline.query.filter_by(
        user_id=current_user.id
    ).order_by(Baseline.end_date.desc()).limit(2).all()

    if len(baselines) < 2:
        return jsonify({
            'insights': [],
            'message': 'Not enough baseline data to generate comparative insights'
        }), 200

    current_baseline = baselines[0]
    previous_baseline = baselines[1]

    # Get existing baseline change insights
    existing_insights = Insight.query.filter_by(
        user_id=current_user.id,
        insight_type='baseline_change',
        dismissed=False
    ).all()

    # Generate new insights if none exist
    if not existing_insights:
        insights = generate_baseline_insights(current_user.id, current_baseline, previous_baseline)
    else:
        insights = existing_insights

    return jsonify({
        'insights': [{
            'id': insight.id,
            'type': insight.insight_type,
            'title': insight.title,
            'description': insight.description,
            'importance': insight.importance,
            'created_at': insight.created_at.isoformat(),
            'read': insight.read,
            'related_metric': insight.related_metric
        } for insight in insights]
    }), 200

@app.route('/api/sleep/patterns')
@login_required
def get_sleep_patterns():
    """Get sleep timing patterns and consistency metrics"""
    period = request.args.get('period', 'weekly')

    # Determine date range based on period
    end_date = db.session.query(func.max(SleepRecord.record_date)).filter_by(user_id=current_user.id).scalar()

    if not end_date:
        return jsonify({'error': 'No sleep records available'}), 404

    if period == 'weekly':
        start_date = end_date - timedelta(days=6)  # Last 7 days
        limit = 7
    else:  # monthly
        start_date = end_date - timedelta(days=29)  # Last 30 days
        limit = 30

    # Get sleep records within date range
    records = SleepRecord.query.filter(
        SleepRecord.user_id == current_user.id,
        SleepRecord.record_date >= start_date,
        SleepRecord.record_date <= end_date
    ).order_by(SleepRecord.record_date.asc()).all()

    if not records:
        return jsonify({'error': 'No sleep records available for selected period'}), 404

    # Calculate consistency metrics
    consistency_metrics = calculate_sleep_consistency(records)

    # Format sleep timing data
    sleep_timing = []
    for record in records:
        timing = {
            'date': record.record_date.isoformat(),
            'bedtime': record.bedtime_start.isoformat(),
            'waketime': record.bedtime_end.isoformat(),
            'duration': record.total_sleep_duration,
            'deep_sleep': record.deep_sleep_duration,
            'rem_sleep': record.rem_sleep_duration,
            'light_sleep': record.light_sleep_duration
        }
        sleep_timing.append(timing)

    return jsonify({
        'sleep_timing': sleep_timing,
        'consistency_metrics': consistency_metrics
    }), 200

@app.route('/api/sleep/hrv/analysis')
@login_required
def get_hrv_analysis():
    """Get detailed HRV analysis data"""
    period = request.args.get('period', 'weekly')

    # Determine date range based on period
    end_date = db.session.query(func.max(SleepRecord.record_date)).filter_by(user_id=current_user.id).scalar()

    if not end_date:
        return jsonify({'error': 'No sleep records available'}), 404

    if period == 'weekly':
        start_date = end_date - timedelta(days=6)  # Last 7 days
    else:  # monthly
        start_date = end_date - timedelta(days=29)  # Last 30 days

    # Get sleep records with HRV data within date range
    records = SleepRecord.query.filter(
        SleepRecord.user_id == current_user.id,
        SleepRecord.record_date >= start_date,
        SleepRecord.record_date <= end_date,
        SleepRecord.average_hrv != None
    ).order_by(SleepRecord.record_date.asc()).all()

    if not records:
        return jsonify({'error': 'No HRV data available for selected period'}), 404

    # Calculate HRV statistics
    hrv_data = []
    hrv_values = []
    sleep_scores = []

    for record in records:
        hrv_data.append({
            'date': record.record_date.isoformat(),
            'average_hrv': record.average_hrv,
            'sleep_score': record.sleep_score,
            'resting_heart_rate': record.resting_heart_rate,
            'lowest_heart_rate': record.lowest_heart_rate,
            'total_sleep_duration': record.total_sleep_duration
        })

        if record.average_hrv:
            hrv_values.append(record.average_hrv)

        if record.sleep_score:
            sleep_scores.append(record.sleep_score)

    # Calculate basic statistics
    hrv_stats = {
        'avg_hrv': sum(hrv_values) / len(hrv_values) if hrv_values else None,
        'max_hrv': max(hrv_values) if hrv_values else None,
        'min_hrv': min(hrv_values) if hrv_values else None,
        'correlation': calculate_correlation(hrv_values, sleep_scores) if hrv_values and sleep_scores else None
    }

    # Find highest and lowest HRV days
    if hrv_values:
        sorted_hrv_data = sorted(hrv_data, key=lambda x: x['average_hrv'], reverse=True)
        highest_hrv = sorted_hrv_data[0]
        lowest_hrv = sorted_hrv_data[-1]
    else:
        highest_hrv = None
        lowest_hrv = None

    return jsonify({
        'hrv_data': hrv_data,
        'hrv_stats': hrv_stats,
        'highest_hrv': highest_hrv,
        'lowest_hrv': lowest_hrv
    }), 200
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')