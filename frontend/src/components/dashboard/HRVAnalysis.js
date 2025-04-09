import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';

function HRVAnalysis() {
    const [hrvData, setHrvData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [period, setPeriod] = useState('weekly');
    const [analysisType, setAnalysisType] = useState('trend');

    useEffect(() => {
        const fetchHRVData = async () => {
            try {
                // Get sleep records with HRV data
                // Ideally would have a dedicated endpoint for HRV metrics
                const response = await axios.get('/sleep/records', {
                    params: {
                        limit: period === 'weekly' ? 7 : 30
                    }
                });

                const sortedRecords = response.data.records
                    .filter(record => record.average_hrv !== undefined && record.average_hrv !== null)
                    .sort((a, b) => new Date(a.date) - new Date(b.date));

                setHrvData(sortedRecords);
                setError('');
            } catch (err) {
                setError('Failed to load HRV data.');
                console.error('HRV data fetch error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchHRVData();
    }, [period]);

    const generateTrendChartData = () => {
        return {
            labels: hrvData.map(record => {
                const date = new Date(record.date);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }),
            datasets: [
                {
                    label: 'HRV (ms)',
                    data: hrvData.map(record => record.average_hrv),
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    fill: true,
                    tension: 0.4,
                    pointRadius: 3
                },
                {
                    label: '7-day Rolling Average',
                    data: calculateRollingAverage(hrvData.map(record => record.average_hrv), 7),
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
        // Calculate correlation between HRV and sleep quality (represented by sleep score)
        // For simplicity, we'll just plot both metrics on the same chart
        return {
            labels: hrvData.map(record => {
                const date = new Date(record.date);
                return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }),
            datasets: [
                {
                    label: 'HRV (ms)',
                    data: hrvData.map(record => record.average_hrv),
                    borderColor: 'rgba(75, 192, 192, 1)',
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    fill: false,
                    tension: 0.4,
                    pointRadius: 3,
                    yAxisID: 'y'
                },
                {
                    label: 'Sleep Score',
                    data: hrvData.map(record => record.sleep_score),
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

    // Find highest and lowest HRV days with their sleep scores
    const getHRVInsights = () => {
        if (hrvData.length < 3) return [];

        const insights = [];

        // Sort by HRV
        const sortedByHRV = [...hrvData].sort((a, b) => b.average_hrv - a.average_hrv);

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

    // Calculate correlation coefficient between HRV and sleep score
    const calculateCorrelation = () => {
        if (hrvData.length < 3) return null;

        const hrv = hrvData.map(record => record.average_hrv);
        const sleepScores = hrvData.map(record => record.sleep_score);

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

    const insights = getHRVInsights();
    const correlation = calculateCorrelation();

    if (loading) {
        return (
            <div className="card shadow-sm mb-4">
                <div className="card-body">
                    <h5 className="card-title">Heart Rate Variability Analysis</h5>
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
        <div className="hrv-analysis">
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

                    {hrvData.length > 0 ? (
                        <div>
                            <Line
                                data={analysisType === 'trend' ? generateTrendChartData() : generateCorrelationChartData()}
                                options={analysisType === 'trend' ? trendChartOptions : correlationChartOptions}
                            />
                        </div>
                    ) : (
                        <div className="text-center py-5 text-muted">
                            <p>No HRV data available.</p>
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
                                            {hrvData.length > 0
                                                ? Math.round(hrvData.reduce((sum, record) => sum + (record.average_hrv || 0), 0) / hrvData.length)
                                                : '-'}                                        </h2>
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
        </div>
    );
}

export default HRVAnalysis;