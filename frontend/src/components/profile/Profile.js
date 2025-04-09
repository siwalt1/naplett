import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LoadingSpinner from '../common/Loading';

function Profile() {
    const [profileData, setProfileData] = useState(null);
    const [sleepBaseline, setSleepBaseline] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editMode, setEditMode] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        firstName: '',
        lastName: '',
        birthDate: '',
        gender: '',
    });
    const [updateSuccess, setUpdateSuccess] = useState(false);

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                // Fetch user profile
                const profileResponse = await axios.get('/user/profile');
                setProfileData(profileResponse.data);

                // Initialize form data
                setFormData({
                    email: profileResponse.data.email || '',
                    firstName: profileResponse.data.first_name || '',
                    lastName: profileResponse.data.last_name || '',
                    birthDate: profileResponse.data.birth_date || '',
                    gender: profileResponse.data.gender || '',
                });

                // Fetch sleep baseline data
                const baselineResponse = await axios.get('/sleep/baseline');
                if (baselineResponse.data) {
                    setSleepBaseline(baselineResponse.data);
                }

                setError('');
            } catch (err) {
                console.error('Error fetching profile data:', err);
                setError('Failed to load profile data. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchProfileData();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setUpdateSuccess(false);

        try {
            // Format data for the API
            const updateData = {
                email: formData.email,
                first_name: formData.firstName,
                last_name: formData.lastName,
                birth_date: formData.birthDate || null,
                gender: formData.gender || null,
            };

            // Update user profile
            await axios.put('/user/profile', updateData);

            // Refresh profile data
            const refreshResponse = await axios.get('/user/profile');
            setProfileData(refreshResponse.data);

            setEditMode(false);
            setUpdateSuccess(true);
            setTimeout(() => setUpdateSuccess(false), 3000);
        } catch (err) {
            console.error('Error updating profile:', err);
            setError('Failed to update profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Format date for display
    const formatDate = (isoDate) => {
        if (!isoDate) return '-';
        const date = new Date(isoDate);
        return date.toLocaleDateString();
    };

    // Helper to format time values
    const formatTime = (timeString) => {
        if (!timeString) return '-';
        const [hours, minutes] = timeString.split(':');
        const time = new Date();
        time.setHours(parseInt(hours, 10));
        time.setMinutes(parseInt(minutes, 10));

        return time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    if (loading && !profileData) {
        return <LoadingSpinner />;
    }

    return (
        <div className="profile-page">
            <h1 className="h3 mb-4">My Profile</h1>

            {error && (
                <div className="alert alert-danger mb-4">
                    {error}
                </div>
            )}

            {updateSuccess && (
                <div className="alert alert-success mb-4">
                    Profile updated successfully!
                </div>
            )}

            <div className="row">
                <div className="col-lg-6">
                    <div className="card shadow-sm mb-4">
                        <div className="card-header bg-white d-flex justify-content-between align-items-center">
                            <h5 className="mb-0">Personal Information</h5>
                            <button
                                className="btn btn-sm btn-outline-primary"
                                onClick={() => setEditMode(!editMode)}
                            >
                                {editMode ? 'Cancel' : 'Edit'}
                            </button>
                        </div>

                        <div className="card-body">
                            {editMode ? (
                                <form onSubmit={handleSubmit}>
                                    <div className="mb-3">
                                        <label htmlFor="email" className="form-label">Email Address</label>
                                        <input
                                            type="email"
                                            className="form-control"
                                            id="email"
                                            name="email"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>

                                    <div className="row mb-3">
                                        <div className="col-md-6">
                                            <label htmlFor="firstName" className="form-label">First Name</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                id="firstName"
                                                name="firstName"
                                                value={formData.firstName}
                                                onChange={handleInputChange}
                                            />
                                        </div>

                                        <div className="col-md-6">
                                            <label htmlFor="lastName" className="form-label">Last Name</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                id="lastName"
                                                name="lastName"
                                                value={formData.lastName}
                                                onChange={handleInputChange}
                                            />
                                        </div>
                                    </div>

                                    <div className="row mb-3">
                                        <div className="col-md-6">
                                            <label htmlFor="birthDate" className="form-label">Date of Birth</label>
                                            <input
                                                type="date"
                                                className="form-control"
                                                id="birthDate"
                                                name="birthDate"
                                                value={formData.birthDate}
                                                onChange={handleInputChange}
                                            />
                                        </div>

                                        <div className="col-md-6">
                                            <label htmlFor="gender" className="form-label">Gender</label>
                                            <select
                                                className="form-select"
                                                id="gender"
                                                name="gender"
                                                value={formData.gender}
                                                onChange={handleInputChange}
                                            >
                                                <option value="">Prefer not to say</option>
                                                <option value="male">Male</option>
                                                <option value="female">Female</option>
                                                <option value="non-binary">Non-binary</option>
                                                <option value="other">Other</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="d-grid gap-2 mt-4">
                                        <button type="submit" className="btn btn-primary" disabled={loading}>
                                            {loading ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <div>
                                    <div className="row mb-4">
                                        <div className="col-sm-4 text-muted">Email:</div>
                                        <div className="col-sm-8">{profileData?.email || '-'}</div>
                                    </div>

                                    <div className="row mb-4">
                                        <div className="col-sm-4 text-muted">Name:</div>
                                        <div className="col-sm-8">
                                            {profileData?.first_name && profileData?.last_name
                                                ? `${profileData.first_name} ${profileData.last_name}`
                                                : profileData?.first_name || profileData?.last_name || '-'}
                                        </div>
                                    </div>

                                    <div className="row mb-4">
                                        <div className="col-sm-4 text-muted">Date of Birth:</div>
                                        <div className="col-sm-8">{profileData?.birth_date ? formatDate(profileData.birth_date) : '-'}</div>
                                    </div>

                                    <div className="row mb-4">
                                        <div className="col-sm-4 text-muted">Gender:</div>
                                        <div className="col-sm-8">
                                            {profileData?.gender
                                                ? profileData.gender.charAt(0).toUpperCase() + profileData.gender.slice(1)
                                                : '-'}
                                        </div>
                                    </div>

                                    <div className="row mb-4">
                                        <div className="col-sm-4 text-muted">Member Since:</div>
                                        <div className="col-sm-8">{profileData?.created_at ? formatDate(profileData.created_at) : '-'}</div>
                                    </div>

                                    <div className="row">
                                        <div className="col-sm-4 text-muted">Last Login:</div>
                                        <div className="col-sm-8">{profileData?.last_login ? formatDate(profileData.last_login) : '-'}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="col-lg-6">
                    <div className="card shadow-sm mb-4">
                        <div className="card-header bg-white">
                            <h5 className="mb-0">Sleep Profile</h5>
                        </div>

                        <div className="card-body">
                            {sleepBaseline ? (
                                <>
                                    <div className="alert alert-info mb-4">
                                        <i className="bi bi-info-circle me-2"></i>
                                        Your sleep profile is based on your data from {formatDate(sleepBaseline.start_date)} to {formatDate(sleepBaseline.end_date)}.
                                    </div>

                                    <h6 className="text-primary mb-3">Sleep Timing</h6>
                                    <div className="row mb-4">
                                        <div className="col-6">
                                            <div className="small text-muted">Typical Bedtime</div>
                                            <div className="h5">{formatTime(sleepBaseline.metrics.avg_bedtime_start)}</div>
                                        </div>
                                        <div className="col-6">
                                            <div className="small text-muted">Typical Wake Time</div>
                                            <div className="h5">{formatTime(sleepBaseline.metrics.avg_bedtime_end)}</div>
                                        </div>
                                    </div>

                                    <h6 className="text-primary mb-3">Sleep Architecture</h6>
                                    <div className="row mb-4">
                                        <div className="col-4">
                                            <div className="small text-muted">Deep Sleep</div>
                                            <div className="h5">
                                                {Math.round(sleepBaseline.metrics.avg_deep_sleep / sleepBaseline.metrics.avg_total_sleep * 100)}%
                                            </div>
                                        </div>
                                        <div className="col-4">
                                            <div className="small text-muted">REM Sleep</div>
                                            <div className="h5">
                                                {Math.round(sleepBaseline.metrics.avg_rem_sleep / sleepBaseline.metrics.avg_total_sleep * 100)}%
                                            </div>
                                        </div>
                                        <div className="col-4">
                                            <div className="small text-muted">Light Sleep</div>
                                            <div className="h5">
                                                {Math.round(sleepBaseline.metrics.avg_light_sleep / sleepBaseline.metrics.avg_total_sleep * 100)}%
                                            </div>
                                        </div>
                                    </div>

                                    <h6 className="text-primary mb-3">Physiological Metrics</h6>
                                    <div className="row">
                                        {sleepBaseline.metrics.avg_hrv && (
                                            <div className="col-4">
                                                <div className="small text-muted">Avg. HRV</div>
                                                <div className="h5">{Math.round(sleepBaseline.metrics.avg_hrv)} ms</div>
                                            </div>
                                        )}

                                        {sleepBaseline.metrics.avg_resting_hr && (
                                            <div className="col-4">
                                                <div className="small text-muted">Resting HR</div>
                                                <div className="h5">{Math.round(sleepBaseline.metrics.avg_resting_hr)} bpm</div>
                                            </div>
                                        )}

                                        {sleepBaseline.metrics.avg_respiratory_rate && (
                                            <div className="col-4">
                                                <div className="small text-muted">Respiratory Rate</div>
                                                <div className="h5">{sleepBaseline.metrics.avg_respiratory_rate.toFixed(1)}</div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-4">
                                    <i className="bi bi-moon-stars display-4 mb-3 text-muted"></i>
                                    <h5>No Sleep Profile Available</h5>
                                    <p className="text-muted">
                                        We need at least 7 days of sleep data to establish your sleep profile.
                                        Upload your sleep data to see your personalized insights.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="card shadow-sm">
                        <div className="card-header bg-white">
                            <h5 className="mb-0">Account Settings</h5>
                        </div>
                        <div className="card-body">
                            <div className="d-grid gap-2">
                                <button className="btn btn-outline-primary" onClick={() => alert('Password change feature coming soon')}>
                                    Change Password
                                </button>
                                <button className="btn btn-outline-danger" onClick={() => alert('Export data feature coming soon')}>
                                    Export My Data
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Profile;