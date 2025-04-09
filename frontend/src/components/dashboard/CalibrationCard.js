import React from 'react';
import { Link } from 'react-router-dom';

function CalibrationCard({ daysComplete, daysNeeded }) {
    // Calculate progress percentage
    const progressPercentage = Math.min(100, Math.round((daysComplete / daysNeeded) * 100));

    return (
        <div className="card shadow-sm mb-4 border-info">
            <div className="card-body">
                <div className="d-flex align-items-center mb-3">
                    <div className="icon-circle bg-info bg-opacity-10 me-3">
                        <i className="bi bi-speedometer2 text-info"></i>
                    </div>
                    <h5 className="mb-0">Calibration in Progress</h5>
                </div>

                <p>
                    Naplett is learning your sleep patterns to create personalized insights.
                    We need {daysNeeded} days of data to establish your baseline.
                </p>

                <div className="progress mb-3">
                    <div
                        className="progress-bar progress-bar-striped bg-info"
                        role="progressbar"
                        style={{ width: `${progressPercentage}%` }}
                        aria-valuenow={progressPercentage}
                        aria-valuemin="0"
                        aria-valuemax="100"
                    ></div>
                </div>

                <div className="d-flex justify-content-between small text-muted mb-3">
                    <span>{daysComplete} days complete</span>
                    <span>{daysNeeded - daysComplete} days remaining</span>
                </div>

                {daysComplete < daysNeeded && (
                    <Link to="/upload" className="btn btn-outline-primary btn-sm">
                        Add More Sleep Data
                    </Link>
                )}
            </div>
        </div>
    );
}

export default CalibrationCard;