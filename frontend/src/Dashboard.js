import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Form, Button, Card, ListGroup, Alert, Table, Container, Row, Col, Offcanvas } from 'react-bootstrap';

function Dashboard({ setIsLoggedIn }) {
    const [sleepData, setSleepData] = useState([]);
    const [userModel, setUserModel] = useState({});
    const [newSleep, setNewSleep] = useState({
        date: '',
        sleep_score: '',
        hours_slept: '',
        spo2_percentage: '',
        readiness_score: '',
        deep_sleep_duration: '',
        rem_sleep_duration: '',
        light_sleep_duration: '',
        average_heart_rate: '',
        average_hrv: '',
        active_calories: '',
        steps: '',
        sedentary_time: ''
    });
    const [error, setError] = useState('');
    const [showActivityForm, setShowActivityForm] = useState(false); // State to show/hide the form
    const [jsonInput, setJsonInput] = useState(''); // State for JSON input

    useEffect(() => {
        fetchSleepData();
    }, []);

    const fetchSleepData = async () => {
        try {
            const response = await axios.get('http://localhost:5000/sleep', { withCredentials: true });
            setSleepData(response.data.sleep_data);
            setUserModel(response.data.user_model);
            setError('');
        } catch (err) {
            setError(err.response?.data.error || 'Error fetching sleep data');
            if (err.response?.status === 401) setIsLoggedIn(false);
        }
    };

    const handleAddSleep = async (e) => {
        e.preventDefault();
        // Validate required fields
        if (!newSleep.date || !newSleep.sleep_score || !newSleep.hours_slept) {
            setError('Please fill in all required fields (date, sleep score, hours slept)');
            return;
        }
        if (newSleep.sleep_score < 0 || newSleep.sleep_score > 100) {
            setError('Sleep score must be between 0 and 100');
            return;
        }
        if (newSleep.hours_slept < 0 || newSleep.hours_slept > 24) {
            setError('Hours slept must be between 0 and 24');
            return;
        }

        // Prepare data for submission (convert strings to numbers where necessary)
        const sleepDataToSubmit = {
            date: newSleep.date,
            sleep_score: parseFloat(newSleep.sleep_score),
            hours_slept: parseFloat(newSleep.hours_slept),
            spo2_percentage: newSleep.spo2_percentage ? parseFloat(newSleep.spo2_percentage) : null,
            readiness_score: newSleep.readiness_score ? parseFloat(newSleep.readiness_score) : null,
            deep_sleep_duration: newSleep.deep_sleep_duration ? parseInt(newSleep.deep_sleep_duration) : null,
            rem_sleep_duration: newSleep.rem_sleep_duration ? parseInt(newSleep.rem_sleep_duration) : null,
            light_sleep_duration: newSleep.light_sleep_duration ? parseInt(newSleep.light_sleep_duration) : null,
            average_heart_rate: newSleep.average_heart_rate ? parseFloat(newSleep.average_heart_rate) : null,
            average_hrv: newSleep.average_hrv ? parseFloat(newSleep.average_hrv) : null,
            active_calories: newSleep.active_calories ? parseInt(newSleep.active_calories) : null,
            steps: newSleep.steps ? parseInt(newSleep.steps) : null,
            sedentary_time: newSleep.sedentary_time ? parseInt(newSleep.sedentary_time) : null
        };

        try {
            await axios.post('http://localhost:5000/sleep', sleepDataToSubmit, { withCredentials: true });
            setNewSleep({
                date: '',
                sleep_score: '',
                hours_slept: '',
                spo2_percentage: '',
                readiness_score: '',
                deep_sleep_duration: '',
                rem_sleep_duration: '',
                light_sleep_duration: '',
                average_heart_rate: '',
                average_hrv: '',
                active_calories: '',
                steps: '',
                sedentary_time: ''
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

    // Handle JSON input change and auto-populate form fields
    const handleJsonInputChange = (e) => {
        const jsonText = e.target.value;
        setJsonInput(jsonText);
        try {
            const parsedData = JSON.parse(jsonText);
            setNewSleep({
                date: parsedData.date || '',
                sleep_score: parsedData.sleep_score || '',
                hours_slept: parsedData.hours_slept || '',
                spo2_percentage: parsedData.spo2_percentage || '',
                readiness_score: parsedData.readiness_score || '',
                deep_sleep_duration: parsedData.deep_sleep_duration || '',
                rem_sleep_duration: parsedData.rem_sleep_duration || '',
                light_sleep_duration: parsedData.light_sleep_duration || '',
                average_heart_rate: parsedData.average_heart_rate || '',
                average_hrv: parsedData.average_hrv || '',
                active_calories: parsedData.active_calories || '',
                steps: parsedData.steps || '',
                sedentary_time: parsedData.sedentary_time || ''
            });
            setError('');
        } catch (err) {
            setError('Invalid JSON format');
        }
    };

    // Reset form and JSON input when closing the Offcanvas
    const handleClose = () => {
        setShowActivityForm(false);
        setJsonInput('');
        setNewSleep({
            date: '',
            sleep_score: '',
            hours_slept: '',
            spo2_percentage: '',
            readiness_score: '',
            deep_sleep_duration: '',
            rem_sleep_duration: '',
            light_sleep_duration: '',
            average_heart_rate: '',
            average_hrv: '',
            active_calories: '',
            steps: '',
            sedentary_time: ''
        });
        setError('');
    };

    return (
        <Container>
            <Row className="my-4">
                <Col>
                    <h1>Naplett Sleep Tracker</h1>
                </Col>
                <Col className="text-end">
                    <Button variant="success" onClick={() => setShowActivityForm(true)}>
                        Add Sleep Activity
                    </Button>
                </Col>
            </Row>

            {error && <Alert variant="danger">{error}</Alert>}

            {/* Offcanvas for Add Sleep Activity */}
            <Offcanvas show={showActivityForm} onHide={handleClose} placement="end">
                <Offcanvas.Header closeButton>
                    <Offcanvas.Title>Add Sleep Activity</Offcanvas.Title>
                </Offcanvas.Header>
                <Offcanvas.Body>
                    <Row>
                        {/* Left Section: JSON Input */}
                        <Col md={6}>
                            <Form.Group className="mb-3" controlId="jsonInput">
                                <Form.Label>Paste JSON Content</Form.Label>
                                <Form.Control
                                    as="textarea"
                                    rows={10}
                                    value={jsonInput}
                                    onChange={handleJsonInputChange}
                                    placeholder='Example: {"date": "2025-04-01", "sleep_score": 85, "hours_slept": 7.5, "spo2_percentage": 95, "readiness_score": 80, "deep_sleep_duration": 3600, "rem_sleep_duration": 5400, "light_sleep_duration": 10800, "average_heart_rate": 65, "average_hrv": 50, "active_calories": 300, "steps": 10000, "sedentary_time": 36000}'
                                />
                            </Form.Group>
                        </Col>

                        {/* Right Section: Form Fields */}
                        <Col md={6}>
                            <Form onSubmit={handleAddSleep}>
                                <Form.Group className="mb-3" controlId="activityDate">
                                    <Form.Label>Date *</Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={newSleep.date}
                                        onChange={(e) => setNewSleep({ ...newSleep, date: e.target.value })}
                                        required
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3" controlId="activitySleepScore">
                                    <Form.Label>Sleep Score (0-100) *</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={newSleep.sleep_score}
                                        onChange={(e) => setNewSleep({ ...newSleep, sleep_score: e.target.value })}
                                        placeholder="Enter sleep score"
                                        min="0"
                                        max="100"
                                        required
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3" controlId="activityHoursSlept">
                                    <Form.Label>Hours Slept (0-24) *</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={newSleep.hours_slept}
                                        onChange={(e) => setNewSleep({ ...newSleep, hours_slept: e.target.value })}
                                        placeholder="Enter hours slept"
                                        min="0"
                                        max="24"
                                        step="0.1"
                                        required
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3" controlId="activitySpo2">
                                    <Form.Label>SpO2 Percentage (0-100)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={newSleep.spo2_percentage}
                                        onChange={(e) => setNewSleep({ ...newSleep, spo2_percentage: e.target.value })}
                                        placeholder="Enter SpO2 percentage"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3" controlId="activityReadiness">
                                    <Form.Label>Readiness Score (0-100)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={newSleep.readiness_score}
                                        onChange={(e) => setNewSleep({ ...newSleep, readiness_score: e.target.value })}
                                        placeholder="Enter readiness score"
                                        min="0"
                                        max="100"
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3" controlId="activityDeepSleep">
                                    <Form.Label>Deep Sleep Duration (seconds)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={newSleep.deep_sleep_duration}
                                        onChange={(e) => setNewSleep({ ...newSleep, deep_sleep_duration: e.target.value })}
                                        placeholder="Enter deep sleep duration"
                                        min="0"
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3" controlId="activityRemSleep">
                                    <Form.Label>REM Sleep Duration (seconds)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={newSleep.rem_sleep_duration}
                                        onChange={(e) => setNewSleep({ ...newSleep, rem_sleep_duration: e.target.value })}
                                        placeholder="Enter REM sleep duration"
                                        min="0"
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3" controlId="activityLightSleep">
                                    <Form.Label>Light Sleep Duration (seconds)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={newSleep.light_sleep_duration}
                                        onChange={(e) => setNewSleep({ ...newSleep, light_sleep_duration: e.target.value })}
                                        placeholder="Enter light sleep duration"
                                        min="0"
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3" controlId="activityHeartRate">
                                    <Form.Label>Average Heart Rate (bpm)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={newSleep.average_heart_rate}
                                        onChange={(e) => setNewSleep({ ...newSleep, average_heart_rate: e.target.value })}
                                        placeholder="Enter average heart rate"
                                        min="0"
                                        step="0.1"
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3" controlId="activityHrv">
                                    <Form.Label>Average HRV</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={newSleep.average_hrv}
                                        onChange={(e) => setNewSleep({ ...newSleep, average_hrv: e.target.value })}
                                        placeholder="Enter average HRV"
                                        min="0"
                                        step="0.1"
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3" controlId="activityCalories">
                                    <Form.Label>Active Calories</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={newSleep.active_calories}
                                        onChange={(e) => setNewSleep({ ...newSleep, active_calories: e.target.value })}
                                        placeholder="Enter active calories"
                                        min="0"
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3" controlId="activitySteps">
                                    <Form.Label>Steps</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={newSleep.steps}
                                        onChange={(e) => setNewSleep({ ...newSleep, steps: e.target.value })}
                                        placeholder="Enter steps"
                                        min="0"
                                    />
                                </Form.Group>
                                <Form.Group className="mb-3" controlId="activitySedentary">
                                    <Form.Label>Sedentary Time (seconds)</Form.Label>
                                    <Form.Control
                                        type="number"
                                        value={newSleep.sedentary_time}
                                        onChange={(e) => setNewSleep({ ...newSleep, sedentary_time: e.target.value })}
                                        placeholder="Enter sedentary time"
                                        min="0"
                                    />
                                </Form.Group>
                                <Button variant="primary" type="submit">
                                    Submit Sleep Activity
                                </Button>
                            </Form>
                        </Col>
                    </Row>
                </Offcanvas.Body>
            </Offcanvas>

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
                                    <th>Hours Slept</th>
                                    <th>SpO2 (%)</th>
                                    <th>Readiness Score</th>
                                    <th>Deep Sleep (hrs)</th>
                                    <th>REM Sleep (hrs)</th>
                                    <th>Light Sleep (hrs)</th>
                                    <th>Heart Rate (bpm)</th>
                                    <th>HRV</th>
                                    <th>Active Calories</th>
                                    <th>Steps</th>
                                    <th>Sedentary Time (hrs)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sleepData.map((data, index) => (
                                    <tr key={index}>
                                        <td>{data.date}</td>
                                        <td>{data.score}</td>
                                        <td>{data.hours}</td>
                                        <td>{data.spo2_percentage ? data.spo2_percentage.toFixed(1) : 'N/A'}</td>
                                        <td>{data.readiness_score || 'N/A'}</td>
                                        <td>{data.deep_sleep_duration ? (data.deep_sleep_duration / 3600).toFixed(1) : 'N/A'}</td>
                                        <td>{data.rem_sleep_duration ? (data.rem_sleep_duration / 3600).toFixed(1) : 'N/A'}</td>
                                        <td>{data.light_sleep_duration ? (data.light_sleep_duration / 3600).toFixed(1) : 'N/A'}</td>
                                        <td>{data.average_heart_rate ? data.average_heart_rate.toFixed(1) : 'N/A'}</td>
                                        <td>{data.average_hrv ? data.average_hrv.toFixed(1) : 'N/A'}</td>
                                        <td>{data.active_calories || 'N/A'}</td>
                                        <td>{data.steps || 'N/A'}</td>
                                        <td>{data.sedentary_time ? (data.sedentary_time / 3600).toFixed(1) : 'N/A'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    ) : (
                        <p>No sleep data available. Add some data above!</p>
                    )}
                </Card.Body>
            </Card>

            {/* Adaptive Insights */}
            <Card className="shadow">
                <Card.Body>
                    <Card.Title>Adaptive Insights</Card.Title>
                    <ListGroup variant="flush">
                        <ListGroup.Item>
                            <strong>Current Sleep Score:</strong> {userModel.sleep_metrics?.current_score || 'N/A'}
                        </ListGroup.Item>
                        <ListGroup.Item>
                            <strong>7-Day Average Sleep Score:</strong> {userModel.sleep_metrics?.avg_7d?.toFixed(2) || 'N/A'}
                        </ListGroup.Item>
                        <ListGroup.Item>
                            <strong>Sleep Trend:</strong> {userModel.trends?.sleep_trend?.toFixed(2) || 'N/A'}%
                        </ListGroup.Item>
                        <ListGroup.Item>
                            <strong>Current Hours Slept:</strong> {userModel.sleep_metrics?.current_hours?.toFixed(1) || 'N/A'} hours
                        </ListGroup.Item>
                        <ListGroup.Item>
                            <strong>7-Day Average Hours Slept:</strong> {userModel.sleep_metrics?.avg_hours_7d?.toFixed(1) || 'N/A'} hours
                        </ListGroup.Item>
                        <ListGroup.Item>
                            <strong>Hours Slept Trend:</strong> {userModel.trends?.hours_trend?.toFixed(2) || 'N/A'}%
                        </ListGroup.Item>
                        <ListGroup.Item>
                            <strong>Current SpO2:</strong> {userModel.sleep_metrics?.current_spo2?.toFixed(1) || 'N/A'}%
                        </ListGroup.Item>
                        <ListGroup.Item>
                            <strong>7-Day Average SpO2:</strong> {userModel.sleep_metrics?.avg_spo2_7d?.toFixed(1) || 'N/A'}%
                        </ListGroup.Item>
                        <ListGroup.Item>
                            <strong>SpO2 Trend:</strong> {userModel.trends?.spo2_trend?.toFixed(2) || 'N/A'}%
                        </ListGroup.Item>
                        <ListGroup.Item>
                            <strong>Current Readiness Score:</strong> {userModel.sleep_metrics?.current_readiness || 'N/A'}
                        </ListGroup.Item>
                        <ListGroup.Item>
                            <strong>7-Day Average Readiness:</strong> {userModel.sleep_metrics?.avg_readiness_7d?.toFixed(1) || 'N/A'}
                        </ListGroup.Item>
                        <ListGroup.Item>
                            <strong>Readiness Trend:</strong> {userModel.trends?.readiness_trend?.toFixed(2) || 'N/A'}%
                        </ListGroup.Item>
                        <ListGroup.Item>
                            <strong>Current Deep Sleep Duration:</strong> {userModel.sleep_metrics?.current_deep_sleep?.toFixed(1) || 'N/A'} hours
                        </ListGroup.Item>
                        <ListGroup.Item>
                            <strong>7-Day Average Deep Sleep:</strong> {userModel.sleep_metrics?.avg_deep_sleep_7d?.toFixed(1) || 'N/A'} hours
                        </ListGroup.Item>
                        <ListGroup.Item>
                            <strong>Deep Sleep Trend:</strong> {userModel.trends?.deep_sleep_trend?.toFixed(2) || 'N/A'}%
                        </ListGroup.Item>
                        <ListGroup.Item>
                            <strong>Current REM Sleep Duration:</strong> {userModel.sleep_metrics?.current_rem_sleep?.toFixed(1) || 'N/A'} hours
                        </ListGroup.Item>
                        <ListGroup.Item>
                            <strong>7-Day Average REM Sleep:</strong> {userModel.sleep_metrics?.avg_rem_sleep_7d?.toFixed(1) || 'N/A'} hours
                        </ListGroup.Item>
                        <ListGroup.Item>
                            <strong>REM Sleep Trend:</strong> {userModel.trends?.rem_sleep_trend?.toFixed(2) || 'N/A'}%
                        </ListGroup.Item>
                        <ListGroup.Item>
                            <strong>Current Heart Rate:</strong> {userModel.sleep_metrics?.current_heart_rate?.toFixed(1) || 'N/A'} bpm
                        </ListGroup.Item>
                        <ListGroup.Item>
                            <strong>7-Day Average Heart Rate:</strong> {userModel.sleep_metrics?.avg_heart_rate_7d?.toFixed(1) || 'N/A'} bpm
                        </ListGroup.Item>
                        <ListGroup.Item>
                            <strong>Heart Rate Trend:</strong> {userModel.trends?.heart_rate_trend?.toFixed(2) || 'N/A'}%
                        </ListGroup.Item>
                        <ListGroup.Item>
                            <strong>Current HRV:</strong> {userModel.sleep_metrics?.current_hrv?.toFixed(1) || 'N/A'}
                        </ListGroup.Item>
                        <ListGroup.Item>
                            <strong>7-Day Average HRV:</strong> {userModel.sleep_metrics?.avg_hrv_7d?.toFixed(1) || 'N/A'}
                        </ListGroup.Item>
                        <ListGroup.Item>
                            <strong>HRV Trend:</strong> {userModel.trends?.hrv_trend?.toFixed(2) || 'N/A'}%
                        </ListGroup.Item>
                        <ListGroup.Item>
                            <strong>Current Steps:</strong> {userModel.sleep_metrics?.current_steps || 'N/A'}
                        </ListGroup.Item>
                        <ListGroup.Item>
                            <strong>7-Day Average Steps:</strong> {userModel.sleep_metrics?.avg_steps_7d?.toFixed(0) || 'N/A'}
                        </ListGroup.Item>
                        <ListGroup.Item>
                            <strong>Steps Trend:</strong> {userModel.trends?.steps_trend?.toFixed(2) || 'N/A'}%
                        </ListGroup.Item>
                        <ListGroup.Item>
                            <strong>Current Sedentary Time:</strong> {userModel.sleep_metrics?.current_sedentary_time?.toFixed(1) || 'N/A'} hours
                        </ListGroup.Item>
                        <ListGroup.Item>
                            <strong>7-Day Average Sedentary Time:</strong> {userModel.sleep_metrics?.avg_sedentary_time_7d?.toFixed(1) || 'N/A'} hours
                        </ListGroup.Item>
                        <ListGroup.Item>
                            <strong>Sedentary Time Trend:</strong> {userModel.trends?.sedentary_time_trend?.toFixed(2) || 'N/A'}%
                        </ListGroup.Item>
                    </ListGroup>
                    <h5 className="mt-3">Recommendations</h5>
                    {userModel.recommendations?.length > 0 ? (
                        <ListGroup variant="flush">
                            {userModel.recommendations.map((rec, index) => (
                                <ListGroup.Item key={index}>{rec}</ListGroup.Item>
                            ))}
                        </ListGroup>
                    ) : (
                        <p>No recommendations yet.</p>
                    )}
                </Card.Body>
            </Card>
        </Container>
    );
}

export default Dashboard;