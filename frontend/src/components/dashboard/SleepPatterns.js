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
                    return bedtime.getHours() + (bedtime.getMinutes() / 60);
                }),
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.4,
                pointRadius: 5
            },
            {
                label: 'Wake Time',
                data: sleepPatterns.map(record => {
                    const wakeTime = new Date(record.bedtime_end);
                    return wakeTime.getHours() + (wakeTime.getMinutes() / 60);
                }),
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                tension: 0.4,
                pointRadius: 5
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

    // Find the latest and earliest bedtimes to determine proper y-axis range
    const determineYAxisRange = () => {
        if (!sleepPatterns || sleepPatterns.length === 0) {
            return { min: 0, max: 24 };
        }

        // Extract all bedtime hours (converted to 0-24 scale)
        const bedtimeHours = sleepPatterns.map(record => {
            const bedtime = new Date(record.bedtime_start);
            let hours = bedtime.getHours();
            let minutes = bedtime.getMinutes() / 60;
            return hours + minutes;
        });

        // Extract all wake time hours
        const wakeTimeHours = sleepPatterns.map(record => {
            const wakeTime = new Date(record.bedtime_end);
            let hours = wakeTime.getHours();
            let minutes = wakeTime.getMinutes() / 60;
            return hours + minutes;
        });

        // Find min and max values with padding
        const minTime = Math.min(...wakeTimeHours, ...bedtimeHours);
        const maxTime = Math.max(...wakeTimeHours, ...bedtimeHours);

        // Ensure we have a reasonable range (at least 6 hours shown)
        const range = Math.max(maxTime - minTime, 6);

        // Add padding
        const min = Math.max(0, Math.floor(minTime - 1));
        const max = Math.min(24, Math.ceil(maxTime + 1));

        return { min, max };
    };

    const yAxisRange = determineYAxisRange();

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            tooltip: {
                callbacks: {
                    label: function(context) {
                        const value = context.parsed.y;
                        const hours = Math.floor(value);
                        const minutes = Math.round((value - hours) * 60);
                        return `${context.dataset.label}: ${hours % 24}:${minutes.toString().padStart(2, '0')} ${hours >= 12 && hours < 24 ? 'PM' : 'AM'}`;
                    }
                }
            }
        },
        scales: {
            y: {
                min: yAxisRange.min,
                max: yAxisRange.max,
                reverse: true, // This makes times flow from top (early) to bottom (late)
                ticks: {
                    callback: function(value) {
                        if (value === 0) return '12 AM';
                        if (value === 12) return '12 PM';

                        if (value < 12) return `${value} AM`;
                        return `${value - 12} PM`;
                    },
                    stepSize: 2, // Show tick every 2 hours for less clutter
                    autoSkip: false
                },
                title: {
                    display: true,
                    text: 'Time'
                }
            }
        }
    };

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
                                <div style={{ height: '350px' }}> {/* Fixed height container */}
                                    <Line data={bedtimeData} options={chartOptions} />
                                </div>
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