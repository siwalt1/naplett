import React from 'react';

function InsightCard({ insight }) {
    // Determine icon based on insight type
    let icon, bgColor;

    switch (insight.type) {
        case 'pattern':
            icon = 'graph-up';
            bgColor = 'info';
            break;
        case 'recommendation':
            icon = 'lightbulb';
            bgColor = 'warning';
            break;
        case 'anomaly':
            icon = 'exclamation-circle';
            bgColor = 'danger';
            break;
        case 'calibration':
            icon = 'gear';
            bgColor = 'secondary';
            break;
        default:
            icon = 'info-circle';
            bgColor = 'primary';
    }

    // Determine priority marker based on importance
    let priorityColor;

    switch (insight.importance) {
        case 5:
            priorityColor = 'danger';
            break;
        case 4:
            priorityColor = 'warning';
            break;
        case 3:
            priorityColor = 'info';
            break;
        case 2:
            priorityColor = 'success';
            break;
        default:
            priorityColor = 'secondary';
    }

    return (
        <div className="list-group-item list-group-item-action">
            <div className="d-flex align-items-center mb-2">
                <div className={`icon-circle bg-${bgColor} bg-opacity-10 me-3`}>
                    <i className={`bi bi-${icon} text-${bgColor}`}></i>
                </div>
                <h6 className="mb-0">{insight.title}</h6>
                <div className={`ms-auto badge bg-${priorityColor} rounded-pill`}>
                    {insight.importance}
                </div>
            </div>

            <p className="mb-0 ms-4 ps-3 text-muted">
                {insight.description}
            </p>
        </div>
    );
}

export default InsightCard;