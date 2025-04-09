import React from 'react';

function SleepScoreCard({ title, score, unit = '', date, trend, icon, color }) {
    // Format date if present
    const formattedDate = date ? new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    }) : null;

    // Determine trend icon and color
    let trendIcon = null;
    let trendClass = '';

    if (trend !== undefined && trend !== null) {
        if (trend > 0) {
            trendIcon = 'arrow-up';
            trendClass = 'text-success';
        } else if (trend < 0) {
            trendIcon = 'arrow-down';
            trendClass = 'text-danger';
        } else {
            trendIcon = 'arrow-right';
            trendClass = 'text-muted';
        }
    }

    return (
        <div className={`card h-100 shadow-sm border-${color}`}>
            <div className={`card-body`}>
                <div className="d-flex align-items-center mb-3">
                    <div className={`icon-circle bg-${color} bg-opacity-10 me-3`}>
                        <i className={`bi bi-${icon} text-${color}`}></i>
                    </div>
                    <h6 className="mb-0 text-secondary">{title}</h6>
                </div>

                <div className="d-flex align-items-baseline">
                    <h2 className="mb-0">{typeof score === 'number' ? score.toFixed(1) : '0'}</h2>
                    {unit && <span className="ms-1 text-muted">{unit}</span>}
                </div>

                <div className="mt-2">
                    {formattedDate && (
                        <small className="text-muted d-block">
                            {formattedDate}
                        </small>
                    )}

                    {trend !== undefined && trend !== null && (
                        <div className={`small ${trendClass} d-flex align-items-center mt-1`}>
                            <i className={`bi bi-${trendIcon} me-1`}></i>
                            <span>{Math.abs(trend).toFixed(1)}% {trend >= 0 ? 'increase' : 'decrease'}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default SleepScoreCard;