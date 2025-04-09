import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';

import SleepScoreCard from './SleepScoreCard';
import InsightCard from './InsightCard';
import CalibrationCard from './CalibrationCard';
import LoadingSpinner from '../common/Loading';
import PeriodTrendChart from './PeriodTrendChart'; // Import new components
import PhysiologicalMetrics from './PhysiologicalMetrics';
import BaselineInsights from './BaselineInsights';
import SleepPatterns from './SleepPatterns';
import BaselineChangeInsights from './BaselineChangeInsights';

// Register ChartJS components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

function Dashboard() {
    const [dashboardData, setDashboardData] = useState(null);
    const [sleepRecords, setSleepRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [activeTab, setActiveTab] = useState('overview'); // overview, trends, baseline

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch dashboard summary data
                const dashboardResponse = await axios.get('/sleep/dashboard');
                setDashboardData(dashboardResponse.data);

                // Fetch last 30 days of sleep records for charts (increased from 14 for monthly view)
                const recordsResponse = await axios.get('/sleep/records', {
                    params: {
                        limit: 30
                    }
                });

                // Sort records by date (oldest to newest)
                const sortedRecords = recordsResponse.data.records.sort(
                    (a, b) => new Date(a.date) - new Date(b.date)
                );

                setSleepRecords(sortedRecords);
                setError('');
            } catch (err) {
                setError('Failed to load dashboard data. Please try again.');
                console.error('Dashboard data fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Prepare chart data
    const sleepScoreChartData = {
        labels: sleepRecords.map(record => {
            const date = new Date(record.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }),
        datasets: [
            {
                label: 'Sleep Score',
                data: sleepRecords.map(record => record.sleep_score),
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
                tension: 0.4
            }
        ]
    };

    const sleepComponentsChartData = {
        labels: sleepRecords.map(record => {
            const date = new Date(record.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }),
        datasets: [
            {
                label: 'Deep Sleep',
                data: sleepRecords.map(record => record.deep_sleep_duration / 60), // Convert to hours
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                borderWidth: 2,
                tension: 0.4
            },
            {
                label: 'REM Sleep',
                data: sleepRecords.map(record => record.rem_sleep_duration / 60), // Convert to hours
                borderColor: 'rgba(153, 102, 255, 1)',
                backgroundColor: 'rgba(153, 102, 255, 0.5)',
                borderWidth: 2,
                tension: 0.4
            },
            {
                label: 'Light Sleep',
                data: sleepRecords.map(record => record.light_sleep_duration / 60), // Convert to hours
                borderColor: 'rgba(255, 159, 64, 1)',
                backgroundColor: 'rgba(255, 159, 64, 0.5)',
                borderWidth: 2,
                tension: 0.4
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            tooltip: {
                mode: 'index',
                intersect: false,
            }
        },
        scales: {
            y: {
                beginAtZero: true
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        }
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="dashboard">
            {error && (
                <div className="alert alert-danger mb-4" role="alert">
                    {error}
                </div>
            )}

            {/* Calibration notice if applicable */}
            {dashboardData?.calibration_status?.in_progress && (
                <CalibrationCard
                    daysComplete={dashboardData.calibration_status.days_complete}
                    daysNeeded={dashboardData.calibration_status.days_needed}
                />
            )}

            <div className="row mb-4">
                <div className="col-md-6">
                    <h1 className="h3 mb-3">Your Sleep Dashboard</h1>
                </div>
                <div className="col-md-6 text-md-end">
                    <Link to="/upload" className="btn btn-primary">
                        <i className="bi bi-upload me-2"></i>Upload Sleep Data
                    </Link>
                </div>
            </div>

            {/* Navigation Tabs */}
            <ul className="nav nav-tabs mb-4">
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`}
                        onClick={() => setActiveTab('overview')}
                    >
                        <i className="bi bi-house me-1"></i>Overview
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'trends' ? 'active' : ''}`}
                        onClick={() => setActiveTab('trends')}
                    >
                        <i className="bi bi-graph-up me-1"></i>Trends
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        className={`nav-link ${activeTab === 'baseline' ? 'active' : ''}`}
                        onClick={() => setActiveTab('baseline')}
                    >
                        <i className="bi bi-card-checklist me-1"></i>Baseline
                    </button>
                </li>
            </ul>

            {/* Overview Tab Content */}
            {activeTab === 'overview' && (
                <>
                    {/* Sleep score cards */}
                    <div className="row mb-4">
                        {/* Latest sleep score */}
                        <div className="col-md-6 col-lg-3 mb-3">
                            <SleepScoreCard
                                title="Latest Sleep Score"
                                score={dashboardData?.latest_sleep?.sleep_score || 0}
                                date={dashboardData?.latest_sleep?.date}
                                trend={dashboardData?.trends?.sleep_score_trend}
                                icon="moon-stars"
                                color="primary"
                            />
                        </div>

                        {/* Sleep duration */}
                        <div className="col-md-6 col-lg-3 mb-3">
                            <SleepScoreCard
                                title="Sleep Duration"
                                score={dashboardData?.latest_sleep?.total_sleep_duration
                                    ? Math.round(dashboardData.latest_sleep.total_sleep_duration / 60 * 10) / 10
                                    : 0}
                                unit="hours"
                                trend={dashboardData?.trends?.total_sleep_trend}
                                icon="clock"
                                color="info"
                            />
                        </div>

                        {/* Deep sleep */}
                        <div className="col-md-6 col-lg-3 mb-3">
                            <SleepScoreCard
                                title="Deep Sleep"
                                score={dashboardData?.latest_sleep?.deep_sleep_duration
                                    ? Math.round(dashboardData.latest_sleep.deep_sleep_duration / 60 * 10) / 10
                                    : 0}
                                unit="hours"
                                trend={dashboardData?.trends?.deep_sleep_trend}
                                icon="activity"
                                color="success"
                            />
                        </div>

                        {/* Sleep efficiency */}
                        <div className="col-md-6 col-lg-3 mb-3">
                            <SleepScoreCard
                                title="Sleep Efficiency"
                                score={dashboardData?.latest_sleep?.efficiency || 0}
                                unit="%"
                                trend={dashboardData?.trends?.efficiency_trend}
                                icon="check-circle"
                                color="warning"
                            />
                        </div>
                    </div>

                    <div className="row">
                        {/* Sleep score chart */}
                        <div className="col-lg-8">
                            <PeriodTrendChart
                                title="Sleep Score Trend"
                                data={sleepScoreChartData}
                                options={{
                                    ...chartOptions,
                                    scales: {
                                        ...chartOptions.scales,
                                        y: {
                                            ...chartOptions.scales.y,
                                            min: 0,
                                            max: 100
                                        }
                                    }
                                }}
                                description="Higher sleep scores indicate better overall sleep quality, based on multiple factors including duration, architecture, and efficiency."
                            />

                            {/* Sleep components chart */}
                            <PeriodTrendChart
                                title="Sleep Architecture"
                                data={sleepComponentsChartData}
                                options={chartOptions}
                                description="Your sleep is composed of different phases: deep sleep is crucial for physical recovery, REM sleep for cognitive function and memory, and light sleep serves as a transition between phases."
                            />
                        </div>

                        {/* Insights and recommendations */}
                        <div className="col-lg-4">
                            <div className="card shadow-sm mb-4">
                                <div className="card-header bg-white">
                                    <h5 className="mb-0">Insights & Recommendations</h5>
                                </div>
                                <div className="card-body p-0">
                                    {dashboardData?.insights && dashboardData.insights.length > 0 ? (
                                        <div className="list-group list-group-flush">
                                            {dashboardData.insights.map((insight, index) => (
                                                <InsightCard
                                                    key={insight.id || index}
                                                    insight={insight}
                                                />
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-5 text-muted">
                                            <p>No insights available yet.</p>
                                            {dashboardData?.calibration_status?.in_progress ? (
                                                <p>Complete your calibration to unlock personalized insights.</p>
                                            ) : (
                                                <p>Upload more sleep data to generate insights.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Trends Tab Content */}
            {activeTab === 'trends' && (
                <>
                    <div className="row mb-4">
                        <div className="col-12">
                            <PhysiologicalMetrics sleepRecords={sleepRecords} />
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-12">
                            <SleepPatterns />
                        </div>
                    </div>
                </>
            )}

            {/* Baseline Tab Content */}
            {activeTab === 'baseline' && (
                <div className="row">
                    <div className="col-md-8">
                        <BaselineInsights />
                        <BaselineChangeInsights />
                    </div>

                    <div className="col-md-4">
                        {dashboardData?.baseline && !dashboardData?.calibration_status?.in_progress && (
                            <div className="card shadow-sm mb-4">
                                <div className="card-header bg-white">
                                    <h5 className="mb-0">Your Sleep Baseline</h5>
                                </div>
                                <div className="card-body">
                                    <div className="mb-3">
                                        <label className="small text-muted d-block">Average Sleep Duration</label>
                                        <div className="h5">{Math.round(dashboardData.baseline.avg_total_sleep / 60 * 10) / 10} hours</div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="small text-muted d-block">Average Deep Sleep</label>
                                        <div className="h5">{Math.round(dashboardData.baseline.avg_deep_sleep / 60 * 10) / 10} hours</div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="small text-muted d-block">Average REM Sleep</label>
                                        <div className="h5">{Math.round(dashboardData.baseline.avg_rem_sleep / 60 * 10) / 10} hours</div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="small text-muted d-block">Average Sleep Efficiency</label>
                                        <div className="h5">{Math.round(dashboardData.baseline.avg_efficiency)}%</div>
                                    </div>

                                    {dashboardData.baseline.avg_hrv && (
                                        <div className="mb-3">
                                            <label className="small text-muted d-block">Average HRV</label>
                                            <div className="h5">{Math.round(dashboardData.baseline.avg_hrv)} ms</div>
                                        </div>
                                    )}
                                </div>
                                <div className="card-footer bg-light">
                                    <small className="text-muted">
                                        Your baseline is calculated from 14 days of sleep data and helps personalize recommendations.
                                    </small>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Dashboard;