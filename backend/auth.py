from flask import current_app
from flask_login import LoginManager
from models import User, db
from werkzeug.security import generate_password_hash, check_password_hash

login_manager = LoginManager()

@login_manager.user_loader
def load_user(user_id):
    """Load user by ID for Flask-Login"""
    return User.query.get(int(user_id))

def init_auth(app):
    """Initialize authentication for the app"""
    login_manager.init_app(app)
    login_manager.login_view = 'login'

def create_user(email, password, first_name=None, last_name=None):
    """Create a new user with hashed password"""
    hashed_password = generate_password_hash(password)
    user = User(
        email=email,
        password=hashed_password,
        first_name=first_name,
        last_name=last_name
    )
    db.session.add(user)
    db.session.commit()
    return user

def verify_password(user, password):
    """Verify a user's password"""
    if not user:
        return False
    return check_password_hash(user.password, password)