import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Line } from 'react-chartjs-2';
import LoadingSpinner from '../common/Loading';
import { formatMetricValue, getMetricLabel } from '../../utils/ChartUtils';

function BaselineInsights() {
    const [baselineHistory, setBaselineHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [comparisonPeriod, setComparisonPeriod] = useState('lastTwoWeeks');
    const [selectedMetric, setSelectedMetric] = useState('avg_total_sleep');

    useEffect(() => {
        const fetchBaselineHistory = async () => {
            try {
                const response = await axios.get('/sleep/baseline/history', {
                    params: { period: comparisonPeriod }
                });

                if (response.data && response.data.history) {
                    setBaselineHistory(response.data.history);
                } else {
                    setBaselineHistory([]);
                }

                setError('');
            } catch (err) {
                console.error('Baseline history fetch error:', err);
                setError('Failed to load baseline history.');
            } finally {
                setLoading(false);
            }
        };

        fetchBaselineHistory();
    }, [comparisonPeriod]);

    // Format percentage change with color and arrow
    const formatChange = (current, previous) => {
        if (!previous) return 'N/A';

        const percentChange = ((current - previous) / previous) * 100;
        const isPositive = percentChange > 0;
        const isNeutral = Math.abs(percentChange) < 1;

        let colorClass = 'text-muted';
        let icon = 'arrow-right';

        if (!isNeutral) {
            // For most metrics, higher is better
            let isPositiveGood = true;

            // For heart rate, lower is better
            if (selectedMetric === 'avg_resting_hr') {
                isPositiveGood = false;
            }

            colorClass = (isPositive === isPositiveGood) ? 'text-success' : 'text-danger';
            icon = isPositive ? 'arrow-up' : 'arrow-down';
        }

        return (
            <span className={colorClass}>
        <i className={`bi bi-${icon} me-1`}></i>
                {Math.abs(percentChange).toFixed(1)}%
      </span>
        );
    };

    // Prepare chart data
    const prepareChartData = () => {
        if (!baselineHistory || baselineHistory.length === 0) {
            return {
                labels: [],
                datasets: []
            };
        }

        const labels = baselineHistory.map(baseline => {
            const date = new Date(baseline.date);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        // Format the selected metric data
        let data = baselineHistory.map(baseline => {
            const value = baseline[selectedMetric];

            // Convert sleep duration from minutes to hours
            if (['avg_total_sleep', 'avg_deep_sleep', 'avg_rem_sleep', 'avg_light_sleep'].includes(selectedMetric)) {
                return value ? value / 60 : null;
            }

            return value;
        });

        // Determine chart color based on metric
        let borderColor = 'rgba(75, 192, 192, 1)';
        let backgroundColor = 'rgba(75, 192, 192, 0.2)';

        if (selectedMetric === 'avg_resting_hr') {
            borderColor = 'rgba(255, 99, 132, 1)';
            backgroundColor = 'rgba(255, 99, 132, 0.2)';
        } else if (selectedMetric === 'avg_hrv') {
            borderColor = 'rgba(54, 162, 235, 1)';
            backgroundColor = 'rgba(54, 162, 235, 0.2)';
        }

        return {
            labels,
            datasets: [
                {
                    label: getMetricLabel(selectedMetric),
                    data,
                    fill: true,
                    borderColor,
                    backgroundColor,
                    tension: 0.4
                }
            ]
        };
    };

    // Chart options
    const chartOptions = {
        responsive: true,
        plugins: {
            tooltip: {
                callbacks: {
                    label: function(context) {
                        return `${context.dataset.label}: ${context.parsed.y}`;
                    }
                }
            }
        },
        scales: {
            y: {
                beginAtZero: false
            }
        }
    };

    // Check if we have at least two baselines to compare
    const hasBaselineComparison = baselineHistory.length >= 2;

    // Get current and previous baseline
    const currentBaseline = hasBaselineComparison ? baselineHistory[baselineHistory.length - 1] : null;
    const previousBaseline = hasBaselineComparison ? baselineHistory[0] : null;

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="card shadow-sm mb-4">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Baseline Trends</h5>
                <div className="d-flex align-items-center">
                    <select
                        className="form-select form-select-sm me-2"
                        style={{ width: 'auto' }}
                        value={comparisonPeriod}
                        onChange={(e) => setComparisonPeriod(e.target.value)}
                    >
                        <option value="lastTwoWeeks">Last 2 Weeks</option>
                        <option value="lastMonth">Last Month</option>
                        <option value="lastQuarter">Last Quarter</option>
                        <option value="lastYear">Last Year</option>
                    </select>

                    <select
                        className="form-select form-select-sm"
                        style={{ width: 'auto' }}
                        value={selectedMetric}
                        onChange={(e) => setSelectedMetric(e.target.value)}
                    >
                        <option value="avg_total_sleep">Sleep Duration</option>
                        <option value="avg_deep_sleep">Deep Sleep</option>
                        <option value="avg_rem_sleep">REM Sleep</option>
                        <option value="avg_efficiency">Sleep Efficiency</option>
                        <option value="avg_hrv">Heart Rate Variability</option>
                        <option value="avg_resting_hr">Resting Heart Rate</option>
                    </select>
                </div>
            </div>

            <div className="card-body">
                {error && (
                    <div className="alert alert-danger" role="alert">
                        {error}
                    </div>
                )}

                {!hasBaselineComparison ? (
                    <div className="text-center py-4 text-muted">
                        <p>Not enough historical data to show baseline changes.</p>
                        <p>Continue tracking your sleep to see how your patterns evolve.</p>
                    </div>
                ) : (
                    <>
                        <div className="mb-4">
                            <Line data={prepareChartData()} options={chartOptions} />
                        </div>

                        <div className="table-responsive">
                            <table className="table table-hover mb-0">
                                <thead className="table-light">
                                <tr>
                                    <th>Metric</th>
                                    <th>Current</th>
                                    <th>Previous</th>
                                    <th>Change</th>
                                </tr>
                                </thead>
                                <tbody>
                                {[
                                    'avg_total_sleep',
                                    'avg_deep_sleep',
                                    'avg_rem_sleep',
                                    'avg_efficiency',
                                    'avg_hrv',
                                    'avg_resting_hr'
                                ].map(metric => {
                                    if (!currentBaseline || !previousBaseline ||
                                        currentBaseline[metric] === null || previousBaseline[metric] === null) {
                                        return null;
                                    }

                                    return (
                                        <tr key={metric} className={metric === selectedMetric ? 'table-active' : ''}>
                                            <td>{getMetricLabel(metric)}</td>
                                            <td>{formatMetricValue(metric, currentBaseline[metric])}</td>
                                            <td>{formatMetricValue(metric, previousBaseline[metric])}</td>
                                            <td>{formatChange(currentBaseline[metric], previousBaseline[metric])}</td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>

            <div className="card-footer bg-light">
                <small className="text-muted">
                    Higher values for deep sleep, REM sleep, efficiency, and HRV indicate better sleep quality.
                    For resting heart rate, lower values are generally better.
                </small>
            </div>
        </div>
    );
}

export default BaselineInsights;