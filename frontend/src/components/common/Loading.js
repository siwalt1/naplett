import React from 'react';

function LoadingSpinner() {
    return (
        <div className="d-flex justify-content-center align-items-center py-5">
            <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
            </div>
            <span className="ms-3">Loading...</span>
        </div>
    );
}

export default LoadingSpinner;