import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import LoadingSpinner from '../common/Loading';

function PhysiologicalMetrics() {
    const [hrData, setHrData] = useState([]);
    const [hrvData, setHrvData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [period, setPeriod] = useState('weekly');
    const [showDetailedHRV, setShowDetailedHRV] = useState(false);

    useEffect(() => {
        const fetchPhysiologicalData = async () => {
            setLoading(true);
            try {
                // Fetch sleep records with heart rate and HRV data
                const response = await axios.get('/sleep/records', {
                    params: {
                        limit: period === 'weekly' ? 7 : 30
                    }
                });

                if (response.data.records && response.data.records.length > 0) {
                    // Sort by date (oldest to newest)
                    const sortedRecords = response.data.records.sort(
                        (a, b) => new Date(a.date) - new Date(b.date)
                    );

                    // Format data for charts
                    prepareChartData(sortedRecords);
                } else {
                    setHrData({
                        labels: [],
                        datasets: []
                    });
                    setHrvData({
                        labels: [],
                        datasets: []
                    });
                }
                setError('');
            } catch (err) {
                console.error('Error fetching physiological data:', err);
                setError('Failed to load physiological data. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        fetchPhysiologicalData();
    }, [period]);

    const prepareChartData = (records) => {
        // Format dates for chart labels
        const labels = records.map(record => {
            const date = new Date(record.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        // Check if we have HRV data
        const hasHrvData = records.some(record => record.average_hrv != null);

        // Prepare HRV dataset
        const hrvChartData = {
            labels,
            datasets: [
                {
                    label: 'Average HRV (ms)',
                    data: records.map(record => record.average_hrv),
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3
                }
            ]
        };

        // Check if we have heart rate data
        const hasHrData = records.some(record =>
            record.resting_heart_rate != null || record.lowest_heart_rate != null
        );

        // Prepare HR dataset
        const hrChartData = {
            labels,
            datasets: []
        };

        if (records.some(record => record.resting_heart_rate != null)) {
            hrChartData.datasets.push({
                label: 'Resting Heart Rate (bpm)',
                data: records.map(record => record.resting_heart_rate),
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                fill: true,
                tension: 0.4,
                pointRadius: 3
            });
        }

        if (records.some(record => record.lowest_heart_rate != null)) {
            hrChartData.datasets.push({
                label: 'Lowest Heart Rate (bpm)',
                data: records.map(record => record.lowest_heart_rate),
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                borderDash: [5, 5],
                fill: false,
                tension: 0.4,
                pointRadius: 2
            });
        }

        // If we have no data, add a placeholder message
        if (!hasHrvData && !hasHrData) {
            setError('No heart rate or HRV data available in your sleep records.');
        }

        setHrvData(hrvChartData);
        setHrData(hrChartData);
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
                beginAtZero: false,
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        }
    };

    // Detailed HRV Analysis
    const HRVAnalysis = () => {
        const [detailedHrvData, setDetailedHrvData] = useState([]);
        const [analysisLoading, setAnalysisLoading] = useState(true);
        const [analysisError, setAnalysisError] = useState('');
        const [analysisType, setAnalysisType] = useState('trend');

        useEffect(() => {
            const fetchDetailedHRV = async () => {
                setAnalysisLoading(true);
                try {
                    // We're using the sleep/records endpoint for now
                    // In a production app, you should create a dedicated HRV analysis endpoint
                    const response = await axios.get('/sleep/records', {
                        params: {
                            limit: period === 'weekly' ? 14 : 30
                        }
                    });

                    const hrvRecords = response.data.records
                        .filter(record => record.average_hrv != null)
                        .sort((a, b) => new Date(a.date) - new Date(b.date));

                    setDetailedHrvData(hrvRecords);
                    setAnalysisError('');
                } catch (err) {
                    console.error('Error fetching detailed HRV data:', err);
                    setAnalysisError('Failed to load detailed HRV analysis.');
                } finally {
                    setAnalysisLoading(false);
                }
            };

            fetchDetailedHRV();
        }, [period]);

        const generateTrendChartData = () => {
            return {
                labels: detailedHrvData.map(record => {
                    const date = new Date(record.date);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }),
                datasets: [
                    {
                        label: 'HRV (ms)',
                        data: detailedHrvData.map(record => record.average_hrv),
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 3
                    },
                    {
                        label: '7-day Rolling Average',
                        data: calculateRollingAverage(detailedHrvData.map(record => record.average_hrv), 7),
                        borderColor: 'rgba(54, 162, 235, 1)',
                        backgroundColor: 'rgba(54, 162, 235, 0)',
                        borderWidth: 2,
                        borderDash: [5, 5],
                        fill: false,
                        tension: 0.4,
                        pointRadius: 0
                    }
                ]
            };
        };

        const generateCorrelationChartData = () => {
            return {
                labels: detailedHrvData.map(record => {
                    const date = new Date(record.date);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                }),
                datasets: [
                    {
                        label: 'HRV (ms)',
                        data: detailedHrvData.map(record => record.average_hrv),
                        borderColor: 'rgba(75, 192, 192, 1)',
                        backgroundColor: 'rgba(75, 192, 192, 0.2)',
                        fill: false,
                        tension: 0.4,
                        pointRadius: 3,
                        yAxisID: 'y'
                    },
                    {
                        label: 'Sleep Score',
                        data: detailedHrvData.map(record => record.sleep_score),
                        borderColor: 'rgba(153, 102, 255, 1)',
                        backgroundColor: 'rgba(153, 102, 255, 0.2)',
                        fill: false,
                        tension: 0.4,
                        pointRadius: 3,
                        yAxisID: 'y1'
                    }
                ]
            };
        };

        const calculateRollingAverage = (data, window) => {
            if (!data || data.length < window) return data;

            const result = [];

            // Fill in null values for the beginning of the dataset
            for (let i = 0; i < window - 1; i++) {
                result.push(null);
            }

            // Calculate rolling averages
            for (let i = window - 1; i < data.length; i++) {
                let sum = 0;
                let count = 0;

                for (let j = 0; j < window; j++) {
                    if (data[i - j] !== null && data[i - j] !== undefined) {
                        sum += data[i - j];
                        count++;
                    }
                }

                result.push(count > 0 ? sum / count : null);
            }

            return result;
        };

        // Calculate correlation coefficient between HRV and sleep score
        const calculateCorrelation = () => {
            if (detailedHrvData.length < 3) return null;

            const validRecords = detailedHrvData.filter(
                record => record.average_hrv != null && record.sleep_score != null
            );

            if (validRecords.length < 3) return null;

            const hrv = validRecords.map(record => record.average_hrv);
            const sleepScores = validRecords.map(record => record.sleep_score);

            // Calculate means
            const hrvMean = hrv.reduce((a, b) => a + b, 0) / hrv.length;
            const scoreMean = sleepScores.reduce((a, b) => a + b, 0) / sleepScores.length;

            // Calculate covariance and standard deviations
            let covariance = 0;
            let hrvVariance = 0;
            let scoreVariance = 0;

            for (let i = 0; i < hrv.length; i++) {
                const hrvDiff = hrv[i] - hrvMean;
                const scoreDiff = sleepScores[i] - scoreMean;

                covariance += hrvDiff * scoreDiff;
                hrvVariance += hrvDiff * hrvDiff;
                scoreVariance += scoreDiff * scoreDiff;
            }

            const hrvStdDev = Math.sqrt(hrvVariance);
            const scoreStdDev = Math.sqrt(scoreVariance);

            // Calculate correlation coefficient
            const correlation = covariance / (hrvStdDev * scoreStdDev);

            return {
                value: correlation.toFixed(2),
                strength:
                    Math.abs(correlation) < 0.3 ? 'weak' :
                        Math.abs(correlation) < 0.7 ? 'moderate' : 'strong',
                direction: correlation > 0 ? 'positive' : 'negative'
            };
        };

        const trendChartOptions = {
            responsive: true,
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false
                },
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: {
                        display: true,
                        text: 'HRV (ms)'
                    }
                }
            }
        };

        const correlationChartOptions = {
            responsive: true,
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false
                },
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: 'HRV (ms)'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Sleep Score'
                    },
                    min: 0,
                    max: 100,
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        };

        // Find highest and lowest HRV days
        const getHRVInsights = () => {
            if (detailedHrvData.length < 3) return [];

            const insights = [];

            // Sort by HRV
            const sortedByHRV = [...detailedHrvData].sort((a, b) => b.average_hrv - a.average_hrv);

            // Get highest and lowest
            const highest = sortedByHRV[0];
            const lowest = sortedByHRV[sortedByHRV.length - 1];

            // Format dates
            const formatDate = (dateStr) => {
                const date = new Date(dateStr);
                return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
            };

            insights.push({
                title: 'Highest HRV Day',
                value: `${Math.round(highest.average_hrv)} ms`,
                date: formatDate(highest.date),
                sleepScore: highest.sleep_score.toFixed(1),
                sleepDuration: (highest.total_sleep_duration / 60).toFixed(1) + ' hours',
                icon: 'arrow-up-circle',
                color: 'success'
            });

            insights.push({
                title: 'Lowest HRV Day',
                value: `${Math.round(lowest.average_hrv)} ms`,
                date: formatDate(lowest.date),
                sleepScore: lowest.sleep_score.toFixed(1),
                sleepDuration: (lowest.total_sleep_duration / 60).toFixed(1) + ' hours',
                icon: 'arrow-down-circle',
                color: 'danger'
            });

            return insights;
        };

        const insights = detailedHrvData.length >= 3 ? getHRVInsights() : [];
        const correlation = detailedHrvData.length >= 3 ? calculateCorrelation() : null;

        if (analysisLoading) {
            return <LoadingSpinner />;
        }

        return (
            <div className="card shadow-sm mb-4">
                <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="card-title mb-0">Heart Rate Variability Analysis</h5>
                        <div className="d-flex">
                            <div className="btn-group me-2">
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

                            <div className="btn-group">
                                <button
                                    type="button"
                                    className={`btn btn-sm ${analysisType === 'trend' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setAnalysisType('trend')}
                                >
                                    Trend
                                </button>
                                <button
                                    type="button"
                                    className={`btn btn-sm ${analysisType === 'correlation' ? 'btn-primary' : 'btn-outline-primary'}`}
                                    onClick={() => setAnalysisType('correlation')}
                                >
                                    Correlation
                                </button>
                            </div>
                        </div>
                    </div>

                    {analysisError && (
                        <div className="alert alert-danger" role="alert">
                            {analysisError}
                        </div>
                    )}

                    {detailedHrvData.length > 0 ? (
                        <div>
                            <Line
                                data={analysisType === 'trend' ? generateTrendChartData() : generateCorrelationChartData()}
                                options={analysisType === 'trend' ? trendChartOptions : correlationChartOptions}
                            />
                        </div>
                    ) : (
                        <div className="text-center py-5 text-muted">
                            <p>No HRV data available for the selected period.</p>
                            <p>Ensure your sleep tracking device captures HRV data and it's properly uploaded.</p>
                        </div>
                    )}

                    <div className="row mt-4">
                        <div className="col-md-4">
                            <div className="card bg-light">
                                <div className="card-body">
                                    <h6 className="card-title">What is HRV?</h6>
                                    <p className="small mb-0">
                                        Heart Rate Variability (HRV) is the variation in time between consecutive heartbeats.
                                        Higher HRV generally indicates better cardiovascular fitness and recovery, while lower
                                        HRV may indicate stress or incomplete recovery.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {correlation && (
                            <div className="col-md-4">
                                <div className="card bg-light">
                                    <div className="card-body">
                                        <h6 className="card-title">HRV & Sleep Correlation</h6>
                                        <p className="small mb-0">
                                            Your HRV and sleep score have a <strong>{correlation.strength} {correlation.direction}</strong> correlation ({correlation.value}).
                                            {correlation.direction === 'positive' ?
                                                ' This suggests that higher HRV is associated with better sleep quality in your data.' :
                                                ' This unusual pattern suggests other factors may be influencing your sleep or HRV measurements.'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="col-md-4">
                            <div className="card bg-light">
                                <div className="card-body">
                                    <h6 className="card-title">Average HRV</h6>
                                    <div className="d-flex align-items-center">
                                        <h2 className="mb-0">
                                            {detailedHrvData.length > 0
                                                ? Math.round(detailedHrvData.reduce((sum, record) => sum + record.average_hrv, 0) / detailedHrvData.length)
                                                : "-"}
                                        </h2>
                                        <span className="ms-2">ms</span>
                                    </div>
                                    <small className="text-muted">
                                        During the selected period
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>

                    {insights.length > 0 && (
                        <div className="row mt-3">
                            {insights.map((insight, index) => (
                                <div className="col-md-6" key={index}>
                                    <div className={`card border-${insight.color} mb-2`}>
                                        <div className="card-body py-2">
                                            <div className="d-flex align-items-center">
                                                <i className={`bi bi-${insight.icon} text-${insight.color} me-2`}></i>
                                                <h6 className="mb-0">{insight.title}: <strong>{insight.value}</strong></h6>
                                            </div>
                                            <div className="ms-4 small text-muted">
                                                <div>Date: {insight.date}</div>
                                                <div>Sleep Score: {insight.sleepScore}</div>
                                                <div>Sleep Duration: {insight.sleepDuration}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="physiological-metrics">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="mb-0">Physiological Trends</h4>
                <div className="d-flex">
                    <div className="btn-group me-2">
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

                    <button
                        className={`btn btn-sm ${showDetailedHRV ? 'btn-primary' : 'btn-outline-primary'}`}
                        onClick={() => setShowDetailedHRV(!showDetailedHRV)}
                    >
                        {showDetailedHRV ? 'Show Overview' : 'Show Detailed HRV Analysis'}
                    </button>
                </div>
            </div>

            {error && (
                <div className="alert alert-warning mb-4" role="alert">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {error}
                    <p className="mt-2 mb-0 small">
                        Make sure your sleep tracking device captures HRV and heart rate data, and that it's included in your data upload.
                    </p>
                </div>
            )}

            {showDetailedHRV ? (
                <HRVAnalysis />
            ) : (
                <div className="row">
                    <div className="col-lg-6">
                        <div className="card shadow-sm mb-4">
                            <div className="card-body">
                                <h5 className="card-title">Heart Rate Variability (HRV)</h5>
                                {hrvData.labels && hrvData.labels.length > 0 ? (
                                    <Line
                                        data={hrvData}
                                        options={chartOptions}
                                    />
                                ) : (
                                    <div className="text-center py-5 text-muted">
                                        <p>No HRV data available.</p>
                                    </div>
                                )}
                                <div className="mt-3 small text-muted">
                                    Higher HRV values generally indicate better cardiovascular fitness and recovery.
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-lg-6">
                        <div className="card shadow-sm mb-4">
                            <div className="card-body">
                                <h5 className="card-title">Heart Rate</h5>
                                {hrData.labels && hrData.labels.length > 0 && hrData.datasets.length > 0 ? (
                                    <Line
                                        data={hrData}
                                        options={chartOptions}
                                    />
                                ) : (
                                    <div className="text-center py-5 text-muted">
                                        <p>No heart rate data available.</p>
                                    </div>
                                )}
                                <div className="mt-3 small text-muted">
                                    Your resting and lowest heart rates during sleep can indicate recovery status and cardiovascular health.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PhysiologicalMetrics;