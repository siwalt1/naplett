import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LoadingSpinner from '../common/Loading';

function BaselineChangeInsights() {
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchBaselineInsights = async () => {
            try {
                // Fetch baseline change insights from the API
                const response = await axios.get('/sleep/baseline/insights');

                if (response.data && response.data.insights) {
                    setInsights(response.data.insights);
                } else {
                    setInsights([]);
                }

                setError('');
            } catch (err) {
                console.error('Baseline insights fetch error:', err);
                setError('Failed to load baseline change insights.');
            } finally {
                setLoading(false);
            }
        };

        fetchBaselineInsights();
    }, []);

    // Function to get icon and color based on insight related metric and whether it's positive
    const getInsightVisuals = (insight) => {
        // Determine if change is positive based on insight importance (lower = more positive)
        const isPositive = insight.importance < 3;

        // Set icon and color based on related metric
        let icon, color;

        switch (insight.related_metric) {
            case 'avg_total_sleep':
                icon = 'clock';
                color = isPositive ? 'success' : 'warning';
                break;
            case 'avg_deep_sleep':
                icon = 'moon';
                color = isPositive ? 'success' : 'warning';
                break;
            case 'avg_efficiency':
                icon = 'check-circle';
                color = isPositive ? 'success' : 'warning';
                break;
            case 'avg_hrv':
                icon = 'activity';
                color = isPositive ? 'success' : 'danger';
                break;
            case 'avg_resting_hr':
                icon = 'heart';
                color = isPositive ? 'success' : 'danger';
                break;
            default:
                icon = 'bar-chart';
                color = isPositive ? 'success' : 'warning';
        }

        return { icon, color };
    };

    if (loading) {
        return <LoadingSpinner />;
    }

    return (
        <div className="card shadow-sm mb-4">
            <div className="card-header bg-white">
                <h5 className="mb-0">Baseline Change Insights</h5>
            </div>

            <div className="card-body p-0">
                {error && (
                    <div className="alert alert-danger m-3" role="alert">
                        {error}
                    </div>
                )}

                {insights.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                        <p>No baseline change insights available yet.</p>
                        <p>We need at least two baseline periods to generate comparative insights.</p>
                    </div>
                ) : (
                    <div className="list-group list-group-flush">
                        {insights.map(insight => {
                            const { icon, color } = getInsightVisuals(insight);

                            return (
                                <div key={insight.id} className="list-group-item list-group-item-action">
                                    <div className="d-flex align-items-center mb-2">
                                        <div className={`icon-circle bg-${color} bg-opacity-10 me-3`}>
                                            <i className={`bi bi-${icon} text-${color}`}></i>
                                        </div>
                                        <h6 className="mb-0">{insight.title}</h6>
                                        <div className={`ms-auto badge bg-${color} rounded-pill`}>
                                            {insight.importance}
                                        </div>
                                    </div>

                                    <p className="mb-0 ms-4 ps-3 text-muted">
                                        {insight.description}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="card-footer bg-light">
                <small className="text-muted">
                    These insights compare your current sleep baseline with your previous baseline period to identify significant changes.
                </small>
            </div>
        </div>
    );
}

export default BaselineChangeInsights;