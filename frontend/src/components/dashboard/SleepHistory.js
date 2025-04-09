import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import LoadingSpinner from '../common/Loading';

function SleepHistory() {
    const [sleepRecords, setSleepRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('allTime');

    useEffect(() => {
        const fetchSleepRecords = async () => {
            try {
                // Determine date range based on filter
                let params = {};

                if (filter === 'lastWeek') {
                    const lastWeekDate = new Date();
                    lastWeekDate.setDate(lastWeekDate.getDate() - 7);
                    params.start_date = lastWeekDate.toISOString().split('T')[0]; // YYYY-MM-DD
                } else if (filter === 'lastMonth') {
                    const lastMonthDate = new Date();
                    lastMonthDate.setDate(lastMonthDate.getDate() - 30);
                    params.start_date = lastMonthDate.toISOString().split('T')[0]; // YYYY-MM-DD
                }

                const response = await axios.get('/sleep/records', { params });

                // Set records with newest first
                setSleepRecords(response.data.records);
                setError('');
            } catch (err) {
                setError('Failed to load sleep records. Please try again.');
                console.error('Sleep records fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSleepRecords();
    }, [filter]);

    const handleFilterChange = (e) => {
        setFilter(e.target.value);
        setLoading(true);
    };

    // Format time value for display (convert to local time and format)
    const formatTime = (isoTime) => {
        if (!isoTime) return '-';
        const date = new Date(isoTime);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // Format date for display
    const formatDate = (isoDate) => {
        if (!isoDate) return '-';
        const date = new Date(isoDate);
        return date.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="sleep-history">
            {error && (
                <div className="alert alert-danger mb-4" role="alert">
                    {error}
                </div>
            )}

            <div className="d-flex justify-content-between align-items-center mb-4">
                <h1 className="h3 mb-0">Sleep History</h1>
                <div className="d-flex">
                    <select
                        className="form-select me-2"
                        value={filter}
                        onChange={handleFilterChange}
                    >
                        <option value="allTime">All Time</option>
                        <option value="lastWeek">Last Week</option>
                        <option value="lastMonth">Last Month</option>
                    </select>
                    <Link to="/upload" className="btn btn-primary">
                        Upload Data
                    </Link>
                </div>
            </div>

            {sleepRecords.length > 0 ? (
                <div className="card shadow-sm">
                    <div className="table-responsive">
                        <table className="table table-hover mb-0">
                            <thead className="table-light">
                            <tr>
                                <th>Date</th>
                                <th>Sleep Score</th>
                                <th>Duration</th>
                                <th>Deep</th>
                                <th>REM</th>
                                <th>Light</th>
                                <th>Efficiency</th>
                                <th>Bedtime</th>
                                <th>Wake Time</th>
                            </tr>
                            </thead>
                            <tbody>
                            {sleepRecords.map((record) => (
                                <tr key={record.id}>
                                    <td>{formatDate(record.date)}</td>
                                    <td>
                      <span className={`badge rounded-pill ${
                          record.sleep_score >= 85 ? 'bg-success' :
                              record.sleep_score >= 70 ? 'bg-primary' :
                                  record.sleep_score >= 60 ? 'bg-warning' : 'bg-danger'
                      } px-2 py-1`}>
                        {record.sleep_score.toFixed(1)}
                      </span>
                                    </td>
                                    <td>{(record.total_sleep_duration / 60).toFixed(1)}h</td>
                                    <td>{(record.deep_sleep_duration / 60).toFixed(1)}h</td>
                                    <td>{(record.rem_sleep_duration / 60).toFixed(1)}h</td>
                                    <td>{(record.light_sleep_duration / 60).toFixed(1)}h</td>
                                    <td>{record.efficiency.toFixed(1)}%</td>
                                    <td>{formatTime(record.bedtime_start)}</td>
                                    <td>{formatTime(record.bedtime_end)}</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="card shadow-sm">
                    <div className="card-body text-center py-5">
                        <i className="bi bi-moon-stars display-4 mb-3 text-muted"></i>
                        <h4>No Sleep Data Available</h4>
                        <p className="text-muted">Upload your Oura sleep data to start tracking your sleep patterns.</p>
                        <Link to="/upload" className="btn btn-primary mt-2">
                            Upload Sleep Data
                        </Link>
                    </div>
                </div>
            )}

            {sleepRecords.length > 0 && (
                <div className="card mt-4 shadow-sm">
                    <div className="card-body">
                        <h5>Understanding Your Sleep Score</h5>
                        <div className="row mt-3">
                            <div className="col-md-3 mb-3">
                                <div className="d-flex align-items-center">
                                    <span className="badge bg-success rounded-pill px-2 py-1 me-2">85-100</span>
                                    <span>Optimal Sleep</span>
                                </div>
                            </div>
                            <div className="col-md-3 mb-3">
                                <div className="d-flex align-items-center">
                                    <span className="badge bg-primary rounded-pill px-2 py-1 me-2">70-84</span>
                                    <span>Good Sleep</span>
                                </div>
                            </div>
                            <div className="col-md-3 mb-3">
                                <div className="d-flex align-items-center">
                                    <span className="badge bg-warning rounded-pill px-2 py-1 me-2">60-69</span>
                                    <span>Fair Sleep</span>
                                </div>
                            </div>
                            <div className="col-md-3 mb-3">
                                <div className="d-flex align-items-center">
                                    <span className="badge bg-danger rounded-pill px-2 py-1 me-2">&lt;60</span>
                                    <span>Poor Sleep</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SleepHistory;