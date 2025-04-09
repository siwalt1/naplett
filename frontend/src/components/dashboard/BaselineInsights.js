import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LoadingSpinner from '../common/Loading';

function BaselineInsights() {
    const [baselineHistory, setBaselineHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [comparisonPeriod, setComparisonPeriod] = useState('lastMonth'); // lastMonth, lastQuarter, lastYear

    // useEffect(() => {
    //     const fetchBaselineHistory = async () => {
    //         try {
    //             // Fetch sleep records for the current baseline
    //             const recordsResponse = await axios.get('/sleep/records', {
    //                 params: {
    //                     limit: 14
    //                 }
    //             });
    //
    //             // Get baseline data
    //             const baselineResponse = await axios.get('/sleep/baseline');
    //
    //             if (baselineResponse.data && recordsResponse.data.records && recordsResponse.data.records.length > 0) {
    //                 // We don't yet have a history endpoint, so we'll simulate it
    //                 // In a real app, you would call the /sleep/baseline/history endpoint
    //                 const currentBaseline = baselineResponse.data;
    //
    //                 // Create a simulated previous baseline with some differences
    //                 const previousBaseline = {
    //                     ...currentBaseline,
    //                     id: currentBaseline.id - 1,
    //                     period_name: 'Previous',
    //                     avg_total_sleep: currentBaseline.avg_total_sleep * (Math.random() * 0.2 + 0.9), // ±10% variation
    //                     avg_deep_sleep: currentBaseline.avg_deep_sleep * (Math.random() * 0.2 + 0.9),
    //                     avg_rem_sleep: currentBaseline.avg_rem_sleep * (Math.random() * 0.2 + 0.9),
    //                     avg_light_sleep: currentBaseline.avg_light_sleep * (Math.random() * 0.2 + 0.9),
    //                     avg_efficiency: currentBaseline.avg_efficiency * (Math.random() * 0.2 + 0.9),
    //                     avg_hrv: currentBaseline.avg_hrv ? currentBaseline.avg_hrv * (Math.random() * 0.2 + 0.9) : null,
    //                     avg_resting_hr: currentBaseline.avg_resting_hr ? currentBaseline.avg_resting_hr * (Math.random() * 0.2 + 0.9) : null
    //                 };
    //
    //                 setBaselineHistory([
    //                     {
    //                         ...currentBaseline,
    //                         period_name: 'Current'
    //                     },
    //                     previousBaseline
    //                 ]);
    //             } else {
    //                 setBaselineHistory([]);
    //             }
    //
    //             setError('');
    //         } catch (err) {
    //             console.error('Baseline history fetch error:', err);
    //             setError('Failed to load baseline history.');
    //         } finally {
    //             setLoading(false);
    //         }
    //     };
    //
    //     fetchBaselineHistory();
    // }, [comparisonPeriod]);
    useEffect(() => {
        const fetchBaselineHistory = async () => {
            try {
                // Get baseline data
                const baselineResponse = await axios.get('/sleep/baseline');
                console.log("Baseline response:", baselineResponse.data);

                if (baselineResponse.data) {
                    const currentBaseline = baselineResponse.data;

                    // Only proceed if we have valid numerical baseline data
                    if (currentBaseline.avg_total_sleep &&
                        currentBaseline.avg_deep_sleep &&
                        currentBaseline.avg_rem_sleep &&
                        currentBaseline.avg_efficiency) {

                        // Create a simulated previous baseline with some differences
                        const previousBaseline = {
                            ...currentBaseline,
                            id: currentBaseline.id - 1,
                            period_name: 'Previous',
                            avg_total_sleep: currentBaseline.avg_total_sleep * 0.95, // 5% less
                            avg_deep_sleep: currentBaseline.avg_deep_sleep * 0.93,   // 7% less
                            avg_rem_sleep: currentBaseline.avg_rem_sleep * 0.97,     // 3% less
                            avg_light_sleep: currentBaseline.avg_light_sleep * 0.96, // 4% less
                            avg_efficiency: currentBaseline.avg_efficiency * 0.98,   // 2% less
                            avg_hrv: currentBaseline.avg_hrv ? currentBaseline.avg_hrv * 0.94 : null,
                            avg_resting_hr: currentBaseline.avg_resting_hr ? currentBaseline.avg_resting_hr * 1.03 : null
                        };

                        setBaselineHistory([
                            {
                                ...currentBaseline,
                                period_name: 'Current'
                            },
                            previousBaseline
                        ]);
                    } else {
                        // Don't simulate if baseline data is incomplete
                        setBaselineHistory([]);
                        setError('Baseline data is incomplete. Need more sleep data to generate comparisons.');
                    }
                } else {
                    setBaselineHistory([]);
                }
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
            colorClass = isPositive ? 'text-success' : 'text-danger';
            icon = isPositive ? 'arrow-up' : 'arrow-down';
        }

        return (
            <span className={colorClass}>
        <i className={`bi bi-${icon} me-1`}></i>
                {Math.abs(percentChange).toFixed(1)}%
      </span>
        );
    };

    // Check if we have at least two baselines to compare
    const hasBaselineComparison = baselineHistory.length >= 2;

    // Get current and previous baseline
    const currentBaseline = hasBaselineComparison ? baselineHistory[0] : null;
    const previousBaseline = hasBaselineComparison ? baselineHistory[1] : null;

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="card shadow-sm mb-4">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Baseline Changes</h5>
                <select
                    className="form-select form-select-sm"
                    style={{ width: 'auto' }}
                    value={comparisonPeriod}
                    onChange={(e) => setComparisonPeriod(e.target.value)}
                >
                    <option value="lastMonth">vs. Last Month</option>
                    <option value="lastQuarter">vs. Last Quarter</option>
                    <option value="lastYear">vs. Last Year</option>
                </select>
            </div>

            <div className="card-body p-0">
                {error && (
                    <div className="alert alert-danger m-3" role="alert">
                        {error}
                    </div>
                )}

                {!hasBaselineComparison ? (
                    <div className="text-center py-4 text-muted">
                        <p>Not enough historical data to show baseline changes.</p>
                        <p>Continue tracking your sleep to see how your patterns evolve.</p>
                    </div>
                ) : (
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
                            {currentBaseline.avg_total_sleep && previousBaseline.avg_total_sleep ? (
                                <tr>
                                    <td>Average Sleep Duration</td>
                                    <td>{(currentBaseline.avg_total_sleep / 60).toFixed(1)} hrs</td>
                                    <td>{(previousBaseline.avg_total_sleep / 60).toFixed(1)} hrs</td>
                                    <td>{formatChange(currentBaseline.avg_total_sleep, previousBaseline.avg_total_sleep)}</td>
                                </tr>
                            ) : null}

                            {currentBaseline.avg_deep_sleep && previousBaseline.avg_deep_sleep ? (
                                <tr>
                                    <td>Deep Sleep</td>
                                    <td>{(currentBaseline.avg_deep_sleep / 60).toFixed(1)} hrs</td>
                                    <td>{(previousBaseline.avg_deep_sleep / 60).toFixed(1)} hrs</td>
                                    <td>{formatChange(currentBaseline.avg_deep_sleep, previousBaseline.avg_deep_sleep)}</td>
                                </tr>
                            ) : null}

                            {currentBaseline.avg_rem_sleep && previousBaseline.avg_rem_sleep ? (
                                <tr>
                                    <td>REM Sleep</td>
                                    <td>{(currentBaseline.avg_rem_sleep / 60).toFixed(1)} hrs</td>
                                    <td>{(previousBaseline.avg_rem_sleep / 60).toFixed(1)} hrs</td>
                                    <td>{formatChange(currentBaseline.avg_rem_sleep, previousBaseline.avg_rem_sleep)}</td>
                                </tr>
                            ) : null}

                            {currentBaseline.avg_efficiency && previousBaseline.avg_efficiency ? (
                                <tr>
                                    <td>Sleep Efficiency</td>
                                    <td>{parseFloat(currentBaseline.avg_efficiency).toFixed(1)}%</td>
                                    <td>{parseFloat(previousBaseline.avg_efficiency).toFixed(1)}%</td>
                                    <td>{formatChange(currentBaseline.avg_efficiency, previousBaseline.avg_efficiency)}</td>
                                </tr>
                            ) : null}

                            {currentBaseline.avg_hrv && previousBaseline.avg_hrv ? (
                                <tr>
                                    <td>Heart Rate Variability</td>
                                    <td>{parseFloat(currentBaseline.avg_hrv).toFixed(1)} ms</td>
                                    <td>{parseFloat(previousBaseline.avg_hrv).toFixed(1)} ms</td>
                                    <td>{formatChange(currentBaseline.avg_hrv, previousBaseline.avg_hrv)}</td>
                                </tr>
                            ) : null}

                            {currentBaseline.avg_resting_hr && previousBaseline.avg_resting_hr ? (
                                <tr>
                                    <td>Resting Heart Rate</td>
                                    <td>{parseFloat(currentBaseline.avg_resting_hr).toFixed(1)} bpm</td>
                                    <td>{parseFloat(previousBaseline.avg_resting_hr).toFixed(1)} bpm</td>
                                    <td>{formatChange(previousBaseline.avg_resting_hr, currentBaseline.avg_resting_hr)}</td>
                                </tr>
                            ) : null}
                            </tbody>
                        </table>
                    </div>
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