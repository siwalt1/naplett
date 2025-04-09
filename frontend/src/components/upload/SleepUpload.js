import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function SleepUpload() {
    const [file, setFile] = useState(null);
    const [dragActive, setDragActive] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const fileInputRef = useRef(null);
    const navigate = useNavigate();

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileChange(e.dataTransfer.files[0]);
        }
    };

    const handleButtonClick = () => {
        fileInputRef.current.click();
    };

    const handleFileChange = (selectedFile) => {
        // Reset states
        setError('');
        setSuccess('');

        // Check file type
        if (!selectedFile.name.endsWith('.csv')) {
            setError('Please upload a CSV file');
            return;
        }

        setFile(selectedFile);
    };

    const handleInputChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileChange(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError('Please select a file to upload');
            return;
        }

        setUploading(true);
        setError('');
        setSuccess('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post('/sleep/upload', formData, {
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round(
                        (progressEvent.loaded * 100) / progressEvent.total
                    );
                    setUploadProgress(percentCompleted);
                }
            });

            setSuccess(`Successfully processed ${response.data.records_processed} sleep records.`);

            // Redirect to dashboard after successful upload (with delay for user to see success message)
            setTimeout(() => {
                navigate('/dashboard');
            }, 2000);

        } catch (err) {
            setError(
                err.response?.data?.error ||
                'An error occurred during file upload. Please try again.'
            );
        } finally {
            setUploading(false);
            setUploadProgress(0);
        }
    };

    return (
        <div className="row justify-content-center">
            <div className="col-lg-8">
                <div className="card shadow-sm">
                    <div className="card-body">
                        <h2 className="mb-4">Upload Sleep Data</h2>

                        <div className="mb-4">
                            <h5>Instructions</h5>
                            <ol className="mb-4">
                                <li>Export your sleep data from your Oura app as a CSV file</li>
                                <li>Upload the CSV file using the form below</li>
                                <li>Naplett will process your data and generate insights based on your sleep patterns</li>
                            </ol>
                        </div>

                        {error && (
                            <div className="alert alert-danger" role="alert">
                                {error}
                            </div>
                        )}

                        {success && (
                            <div className="alert alert-success" role="alert">
                                {success}
                            </div>
                        )}

                        <div
                            className={`upload-area p-5 text-center border rounded ${dragActive ? 'border-primary bg-light' : ''}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                onChange={handleInputChange}
                                className="d-none"
                            />

                            <i className="bi bi-cloud-upload display-4 mb-3 text-primary"></i>

                            <h5>Drag and drop your CSV file here</h5>
                            <p className="text-muted">or</p>

                            <button
                                type="button"
                                className="btn btn-outline-primary"
                                onClick={handleButtonClick}
                            >
                                Browse Files
                            </button>

                            {file && (
                                <div className="mt-3">
                  <span className="badge bg-success p-2">
                    {file.name} ({Math.round(file.size / 1024)} KB)
                  </span>
                                </div>
                            )}
                        </div>

                        {uploading && (
                            <div className="mt-4">
                                <label className="form-label">Uploading and processing...</label>
                                <div className="progress">
                                    <div
                                        className="progress-bar progress-bar-striped progress-bar-animated"
                                        role="progressbar"
                                        style={{ width: `${uploadProgress}%` }}
                                        aria-valuenow={uploadProgress}
                                        aria-valuemin="0"
                                        aria-valuemax="100"
                                    ></div>
                                </div>
                            </div>
                        )}

                        <div className="d-flex justify-content-between mt-4">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => navigate('/dashboard')}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={handleUpload}
                                disabled={!file || uploading}
                            >
                                {uploading ? 'Processing...' : 'Upload and Analyze'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="card mt-4 shadow-sm">
                    <div className="card-body">
                        <h5>Supported Data Format</h5>
                        <p>The Naplett MVP currently supports Oura Ring CSV sleep data exports with the following columns:</p>
                        <ul className="small">
                            <li>Date</li>
                            <li>Bedtime Start</li>
                            <li>Bedtime End</li>
                            <li>Sleep Duration</li>
                            <li>Deep Sleep Duration</li>
                            <li>REM Sleep Duration</li>
                            <li>Light Sleep Duration</li>
                            <li>Sleep Efficiency</li>
                            <li>Restless Sleep</li>
                        </ul>
                        <p className="small">Additional physiological metrics such as HRV, respiratory rate, and heart rate will be used if available in your export.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SleepUpload;