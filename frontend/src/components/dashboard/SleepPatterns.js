import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';

function SleepPatterns() {
    const [sleepPatterns, setSleepPatterns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [period, setPeriod] = useState('weekly');

    useEffect(() => {
        const fetchSleepPatterns = async () => {
            try {
                // Here we would ideally have a dedicated endpoint for sleep timing patterns
                // For now, we'll use the sleep records endpoint and process the data
                const response = await axios.get('/sleep/records', {
                    params: {
                        limit: period === 'weekly' ? 7 : 30
                    }
                });

                const sortedRecords = response.data.records.sort(
                    (a, b) => new Date(a.date) - new Date(b.date)
                );

                setSleepPatterns(sortedRecords);
                setError('');
            } catch (err) {
                setError('Failed to load sleep pattern data.');
                console.error('Sleep patterns fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchSleepPatterns();
    }, [period]);

    // Process bedtime data
    const bedtimeData = {
        labels: sleepPatterns.map(record => {
            const date = new Date(record.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }),
        datasets: [
            {
                label: 'Bedtime',
                data: sleepPatterns.map(record => {
                    const bedtime = new Date(record.bedtime_start);
                    // Handle bedtime after midnight (e.g., 1am should be represented as 25 hours)
                    let hours = bedtime.getHours();
                    if (hours < 12) {
                        hours += 24;
                    }
                    return hours + (bedtime.getMinutes() / 60);
                }),
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.4
            },
            {
                label: 'Wake Time',
                data: sleepPatterns.map(record => {
                    const wakeTime = new Date(record.bedtime_end);
                    let hours = wakeTime.getHours();
                    // Ensure wake time is properly displayed (e.g. 7am is 7, not 31)
                    return hours + (wakeTime.getMinutes() / 60);
                }),
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                tension: 0.4
            }
        ]
    };

    // Calculate sleep duration consistency
    const calculateConsistency = () => {
        if (sleepPatterns.length < 3) return { score: 'N/A', message: 'Need more data' };

        // Extract total sleep durations
        const durations = sleepPatterns.map(record => record.total_sleep_duration);

        // Calculate standard deviation
        const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
        const variance = durations.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / durations.length;
        const stdDev = Math.sqrt(variance);

        // Calculate coefficient of variation (lower is more consistent)
        const cv = (stdDev / mean) * 100;

        // Interpret the consistency
        let score, message;
        if (cv < 10) {
            score = 'Excellent';
            message = 'Your sleep duration is very consistent.';
        } else if (cv < 15) {
            score = 'Good';
            message = 'Your sleep duration is fairly consistent.';
        } else if (cv < 20) {
            score = 'Fair';
            message = 'Your sleep duration varies somewhat from day to day.';
        } else {
            score = 'Needs Improvement';
            message = 'Your sleep duration is quite variable, which may impact sleep quality.';
        }

        return { score, message, cv: cv.toFixed(1) };
    };

    // Calculate bedtime consistency
    const calculateBedtimeConsistency = () => {
        if (sleepPatterns.length < 3) return { score: 'N/A', message: 'Need more data' };

        // Extract bedtimes and convert to minutes since midnight
        const bedtimes = sleepPatterns.map(record => {
            const bedtime = new Date(record.bedtime_start);
            let minutes = bedtime.getHours() * 60 + bedtime.getMinutes();
            // Adjust for bedtimes after midnight
            if (minutes < 12 * 60) minutes += 24 * 60;
            return minutes;
        });

        // Calculate standard deviation of bedtimes
        const mean = bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length;
        const variance = bedtimes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / bedtimes.length;
        const stdDev = Math.sqrt(variance);

        // Interpret the consistency (in minutes)
        let score, message;
        if (stdDev < 30) {
            score = 'Excellent';
            message = 'Your bedtime is very consistent (less than 30 min variation).';
        } else if (stdDev < 45) {
            score = 'Good';
            message = 'Your bedtime is fairly consistent (less than 45 min variation).';
        } else if (stdDev < 60) {
            score = 'Fair';
            message = 'Your bedtime varies somewhat (less than 1 hour variation).';
        } else {
            score = 'Needs Improvement';
            message = 'Your bedtime varies significantly (more than 1 hour variation).';
        }

        return { score, message, stdDev: Math.round(stdDev) };
    };

    const consistencyData = calculateConsistency();
    const bedtimeConsistencyData = calculateBedtimeConsistency();

    const chartOptions = {
        responsive: true,
        plugins: {
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const value = context.parsed.y;
                        const hours = Math.floor(value);
                        const minutes = Math.round((value - hours) * 60);
                        return `${context.dataset.label}: ${hours % 24}:${minutes.toString().padStart(2, '0')} ${hours >= 24 || (hours >= 0 && hours < 12) ? 'AM' : 'PM'}`;
                    }
                }
            }
        },
        scales: {
            y: {
                min: 0,
                max: 12,
                ticks: {
                    callback: function(value) {
                        // Convert 24-hour format to 12-hour format with AM/PM
                        const hour = value % 12 || 12;
                        const ampm = value >= 12 ? 'PM' : 'AM';
                        return `${hour} ${ampm}`;
                    }
                },
                title: {
                    display: true,
                    text: 'Time'
                }
            }
        }
    };

    // If bedtime times extend past midnight, adjust the scale
    if (bedtimeData.datasets[0].data.some(time => time > 24)) {
        chartOptions.scales.y.max = 28; // Show up to 4am
    }

    if (loading) {
        return (
            <div className="card shadow-sm mb-4">
                <div className="card-body">
                    <h5 className="card-title">Sleep Timing Patterns</h5>
                    <div className="d-flex justify-content-center py-4">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Loading...</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="sleep-patterns">
            <div className="row">
                <div className="col-lg-8">
                    <div className="card shadow-sm mb-4">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h5 className="card-title mb-0">Sleep Timing Patterns</h5>
                                <div className="btn-group">
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${period === 'weekly' ? 'btn-primary' : 'btn-outline-primary'}`}
                                        onClick={() => setPeriod('weekly')}
                                    >
                                        Weekly
                                    </button>
                                    <button
                                        type="button"
                                        className={`btn btn-sm ${period === 'monthly' ? 'btn-primary' : 'btn-outline-primary'}`}
                                        onClick={() => setPeriod('monthly')}
                                    >
                                        Monthly
                                    </button>
                                </div>
                            </div>

                            {sleepPatterns.length > 0 ? (
                                <Line data={bedtimeData} options={chartOptions} />
                            ) : (
                                <div className="text-center py-5 text-muted">
                                    <p>No sleep data available.</p>
                                </div>
                            )}

                            <div className="mt-3 small text-muted">
                                Consistent sleep and wake times can help regulate your body's internal clock and improve sleep quality.
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-lg-4">
                    <div className="card shadow-sm mb-4">
                        <div className="card-header bg-white">
                            <h5 className="mb-0">Sleep Consistency</h5>
                        </div>
                        <div className="card-body">
                            <div className="mb-4">
                                <h6>Sleep Duration Consistency</h6>
                                <div className="d-flex align-items-center mb-2">
                                    <div className={`badge bg-${
                                        consistencyData.score === 'Excellent' ? 'success' :
                                            consistencyData.score === 'Good' ? 'primary' :
                                                consistencyData.score === 'Fair' ? 'warning' : 'danger'
                                    } me-2`}>
                                        {consistencyData.score}
                                    </div>
                                    {consistencyData.cv !== undefined && (
                                        <small className="text-muted">Variation: {consistencyData.cv}%</small>
                                    )}
                                </div>
                                <p className="small text-muted">{consistencyData.message}</p>
                            </div>

                            <div>
                                <h6>Bedtime Consistency</h6>
                                <div className="d-flex align-items-center mb-2">
                                    <div className={`badge bg-${
                                        bedtimeConsistencyData.score === 'Excellent' ? 'success' :
                                            bedtimeConsistencyData.score === 'Good' ? 'primary' :
                                                bedtimeConsistencyData.score === 'Fair' ? 'warning' : 'danger'
                                    } me-2`}>
                                        {bedtimeConsistencyData.score}
                                    </div>
                                    {bedtimeConsistencyData.stdDev !== undefined && (
                                        <small className="text-muted">Variation: ±{bedtimeConsistencyData.stdDev} minutes</small>
                                    )}
                                </div>
                                <p className="small text-muted">{bedtimeConsistencyData.message}</p>
                            </div>
                        </div>
                        <div className="card-footer bg-light">
                            <small className="text-muted">
                                Consistent sleep habits are one of the most important factors for good sleep quality and overall health.
                            </small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SleepPatterns;