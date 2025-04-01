import os
import time
from datetime import datetime

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_login import LoginManager, login_user, login_required, logout_user, current_user
from sqlalchemy.exc import OperationalError
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

from models import db, User, SleepData
from user_model import SleepUserModel

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# Get DATABASE_URL from environment variables
database_url = os.getenv('DATABASE_URL')
if not database_url:
    raise ValueError("DATABASE_URL environment variable is not set")

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key')
CORS(app, supports_credentials=True)
db.init_app(app)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))  # Updated to use db.session.get()

# Add a root endpoint for health check
@app.route('/')
def health_check():
    return jsonify({'status': 'ok'}), 200

# Retry database initialization
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
        date_obj = datetime.strptime(data['date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD'}), 400

    sleep = SleepData(
        user_id=current_user.id,
        date=date_obj,
        sleep_score=float(data['sleep_score']),
        hours_slept=float(data['hours_slept'])
    )
    db.session.add(sleep)
    db.session.commit()
    return jsonify({'message': 'Sleep data added'})

@app.route('/sleep', methods=['GET'])
@login_required
def get_sleep():
    sleep_data = SleepData.query.filter_by(user_id=current_user.id).all()
    user_model = SleepUserModel(current_user.id)
    user_model.update_from_db(sleep_data)
    user_model.generate_recommendations()
    return jsonify({
        'sleep_data': [{'date': d.date.isoformat(), 'score': d.sleep_score, 'hours': d.hours_slept} for d in sleep_data],
        'user_model': user_model.to_dict()
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)