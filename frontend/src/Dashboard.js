import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, Card, Alert, Table, Container, Row, Col } from 'react-bootstrap';
import AddSleepActivityModal from './AddSleepActivityModal';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

function Dashboard({ setIsLoggedIn }) {
    const [sleepData, setSleepData] = useState([]);
    const [newSleep, setNewSleep] = useState({
        sleep_metrics: {
            total_sleep_duration: '',
            deep_sleep_duration: '',
            rem_sleep_duration: '',
            efficiency: '',
            restless_periods: '',
            sleep_midpoint: '',
            bedtime_start: '',
            bedtime_end: ''
        },
        physiological_metrics: {
            lowest_heart_rate: '',
            average_hrv: '',
            resting_heart_rate: '',
            respiratory_rate: ''
        }
    });
    const [error, setError] = useState('');
    const [showActivityForm, setShowActivityForm] = useState(false);
    const [jsonInput, setJsonInput] = useState('');

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

    useEffect(() => {
        fetchSleepData();
    }, []);

    const fetchSleepData = async () => {
        try {
            const response = await axios.get(`${API_URL}/sleep`, { withCredentials: true });
            setSleepData(response.data.sleep_data);
            setError('');
        } catch (err) {
            setError(err.response?.data.error || 'Error fetching sleep data');
            if (err.response?.status === 401) setIsLoggedIn(false);
        }
    };

    const handleAddSleep = async (e) => {
        e.preventDefault();
        const requiredFields = ['total_sleep_duration', 'deep_sleep_duration', 'rem_sleep_duration', 'efficiency', 'bedtime_start', 'bedtime_end'];
        if (requiredFields.some(field => !newSleep.sleep_metrics[field])) {
            setError('Please fill in all required fields');
            return;
        }

        const sleepDataToSubmit = {
            sleep_metrics: {
                total_sleep_duration: parseInt(newSleep.sleep_metrics.total_sleep_duration),
                deep_sleep_duration: parseInt(newSleep.sleep_metrics.deep_sleep_duration),
                rem_sleep_duration: parseInt(newSleep.sleep_metrics.rem_sleep_duration),
                efficiency: parseFloat(newSleep.sleep_metrics.efficiency),
                restless_periods: parseInt(newSleep.sleep_metrics.restless_periods) || 0,
                sleep_midpoint: newSleep.sleep_metrics.sleep_midpoint || newSleep.sleep_metrics.bedtime_start,
                bedtime_start: newSleep.sleep_metrics.bedtime_start,
                bedtime_end: newSleep.sleep_metrics.bedtime_end
            },
            physiological_metrics: {
                lowest_heart_rate: newSleep.physiological_metrics.lowest_heart_rate ? parseInt(newSleep.physiological_metrics.lowest_heart_rate) : null,
                average_hrv: newSleep.physiological_metrics.average_hrv ? parseFloat(newSleep.physiological_metrics.average_hrv) : null,
                resting_heart_rate: newSleep.physiological_metrics.resting_heart_rate ? parseInt(newSleep.physiological_metrics.resting_heart_rate) : null,
                respiratory_rate: newSleep.physiological_metrics.respiratory_rate ? parseFloat(newSleep.physiological_metrics.respiratory_rate) : null
            }
        };

        try {
            await axios.post(`${API_URL}/sleep`, sleepDataToSubmit, { withCredentials: true });
            setNewSleep({
                sleep_metrics: { total_sleep_duration: '', deep_sleep_duration: '', rem_sleep_duration: '', efficiency: '', restless_periods: '', sleep_midpoint: '', bedtime_start: '', bedtime_end: '' },
                physiological_metrics: { lowest_heart_rate: '', average_hrv: '', resting_heart_rate: '', respiratory_rate: '' }
            });
            setError('');
            setShowActivityForm(false);
            setJsonInput('');
            fetchSleepData();
        } catch (err) {
            setError(err.response?.data.error || 'Error adding sleep data');
            if (err.response?.status === 401) setIsLoggedIn(false);
        }
    };

    const handleClearData = async () => {
        if (window.confirm('Are you sure you want to delete all sleep data? This action cannot be undone.')) {
            try {
                await axios.delete(`${API_URL}/sleep`, { withCredentials: true });
                setSleepData([]);
                setError('');
            } catch (err) {
                setError(err.response?.data.error || 'Error deleting sleep data');
                if (err.response?.status === 401) setIsLoggedIn(false);
            }
        }
    };

    const handleClose = () => {
        setShowActivityForm(false);
        setJsonInput('');
        setNewSleep({
            sleep_metrics: { total_sleep_duration: '', deep_sleep_duration: '', rem_sleep_duration: '', efficiency: '', restless_periods: '', sleep_midpoint: '', bedtime_start: '', bedtime_end: '' },
            physiological_metrics: { lowest_heartbeat_rate: '', average_hrv: '', resting_heart_rate: '', respiratory_rate: '' }
        });
        setError('');
    };

    // Prepare data for charts
    const labels = sleepData.map(data => data.date);
    const sleepScores = sleepData.map(data => data.sleep_score);
    const durationScores = sleepData.map(data => data.score_components?.duration_score || 0);
    const architectureScores = sleepData.map(data => data.score_components?.architecture_score || 0);
    const efficiencyScores = sleepData.map(data => data.score_components?.efficiency_continuity_score || 0);
    const timingScores = sleepData.map(data => data.score_components?.timing_score || 0);
    const physiologicalScores = sleepData.map(data => data.score_components?.physiological_score || 0);

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            title: { display: true }
        },
        scales: {
            y: {
                beginAtZero: true,
                max: 100,
                title: { display: true, text: 'Score' }
            },
            x: {
                title: { display: true, text: 'Date' }
            }
        }
    };

    const sleepScoreChartData = {
        labels,
        datasets: [
            {
                label: 'Sleep Score',
                data: sleepScores,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                fill: false
            }
        ]
    };

    const componentsChartData = {
        labels,
        datasets: [
            {
                label: 'Duration Score',
                data: durationScores,
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.5)',
                fill: false
            },
            {
                label: 'Architecture Score',
                data: architectureScores,
                borderColor: 'rgb(54, 162, 235)',
                backgroundColor: 'rgba(54, 162, 235, 0.5)',
                fill: false
            },
            {
                label: 'Efficiency & Continuity Score',
                data: efficiencyScores,
                borderColor: 'rgb(255, 206, 86)',
                backgroundColor: 'rgba(255, 206, 86, 0.5)',
                fill: false
            },
            {
                label: 'Timing Score',
                data: timingScores,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.5)',
                fill: false
            },
            {
                label: 'Physiological Score',
                data: physiologicalScores,
                borderColor: 'rgb(153, 102, 255)',
                backgroundColor: 'rgba(153, 102, 255, 0.5)',
                fill: false
            }
        ]
    };

    return (
        <Container>
            <Row className="my-4">
                <Col><h1>Naplett Sleep Tracker</h1></Col>
                <Col className="text-end">
                    <Button variant="success" onClick={() => setShowActivityForm(true)} className="me-2">
                        Add Sleep Activity
                    </Button>
                    <Button variant="danger" onClick={handleClearData}>
                        Clear All Data
                    </Button>
                </Col>
            </Row>

            {error && !showActivityForm && <Alert variant="danger">{error}</Alert>}

            <AddSleepActivityModal
                show={showActivityForm}
                onHide={handleClose}
                newSleep={newSleep}
                setNewSleep={setNewSleep}
                jsonInput={jsonInput}
                setJsonInput={setJsonInput}
                error={error}
                setError={setError}
                handleAddSleep={handleAddSleep}
            />

            {/* Sleep Score Graph */}
            <Card className="mb-4 shadow">
                <Card.Body>
                    <Card.Title>Sleep Score Over Time</Card.Title>
                    {sleepData.length > 0 ? (
                        <Line
                            data={sleepScoreChartData}
                            options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { display: true, text: 'Sleep Score' } } }}
                        />
                    ) : (
                        <p>No sleep data available to display.</p>
                    )}
                </Card.Body>
            </Card>

            {/* Score Components Graph */}
            <Card className="mb-4 shadow">
                <Card.Body>
                    <Card.Title>Sleep Score Components Over Time</Card.Title>
                    {sleepData.length > 0 ? (
                        <Line
                            data={componentsChartData}
                            options={{ ...chartOptions, plugins: { ...chartOptions.plugins, title: { display: true, text: 'Sleep Score Components' } } }}
                        />
                    ) : (
                        <p>No sleep data available to display.</p>
                    )}
                </Card.Body>
            </Card>

            {/* Sleep Data Table */}
            <Card className="mb-4 shadow">
                <Card.Body>
                    <Card.Title>Your Sleep Data</Card.Title>
                    {sleepData.length > 0 ? (
                        <Table striped bordered hover responsive>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Sleep Score</th>
                                    <th>Total Sleep (hrs)</th>
                                    <th>Deep Sleep (hrs)</th>
                                    <th>REM Sleep (hrs)</th>
                                    <th>Efficiency (%)</th>
                                    <th>Restless Periods</th>
                                    <th>Sleep Midpoint</th>
                                    <th>Bedtime Start</th>
                                    <th>Bedtime End</th>
                                    <th>Lowest HR (bpm)</th>
                                    <th>Avg HRV (ms)</th>
                                    <th>Resting HR (bpm)</th>
                                    <th>Resp Rate (bpm)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sleepData.map((data, index) => (
                                    <tr key={index}>
                                        <td>{data.date}</td>
                                        <td>{data.sleep_score.toFixed(1)}</td>
                                        <td>{(data.total_sleep_duration / 60).toFixed(1)}</td>
                                        <td>{(data.deep_sleep_duration / 60).toFixed(1)}</td>
                                        <td>{(data.rem_sleep_duration / 60).toFixed(1)}</td>
                                        <td>{data.efficiency.toFixed(1)}</td>
                                        <td>{data.restless_periods}</td>
                                        <td>{new Date(data.sleep_midpoint).toLocaleString()}</td>
                                        <td>{new Date(data.bedtime_start).toLocaleString()}</td>
                                        <td>{new Date(data.bedtime_end).toLocaleString()}</td>
                                        <td>{data.lowest_heart_rate || 'N/A'}</td>
                                        <td>{data.average_hrv ? data.average_hrv.toFixed(1) : 'N/A'}</td>
                                        <td>{data.resting_heart_rate || 'N/A'}</td>
                                        <td>{data.respiratory_rate ? data.respiratory_rate.toFixed(1) : 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    ) : (
                        <p>No sleep data available. Add some data above!</p>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
}

export default Dashboard;