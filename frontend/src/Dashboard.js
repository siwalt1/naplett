import React, {useState, useEffect} from 'react';
import axios from 'axios';
import {Form, Button, Card, ListGroup, Alert, Table, Container} from 'react-bootstrap';

function Dashboard({setIsLoggedIn}) {
    const [sleepData, setSleepData] = useState([]);
    const [userModel, setUserModel] = useState({});
    const [newSleep, setNewSleep] = useState({date: '', sleep_score: '', hours_slept: ''});
    const [error, setError] = useState('');

    useEffect(() => {
        fetchSleepData();
    }, []);

    const fetchSleepData = async () => {
        try {
            const response = await axios.get('http://localhost:5000/sleep', {withCredentials: true});
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
        if (!newSleep.date || !newSleep.sleep_score || !newSleep.hours_slept) {
            setError('Please fill in all fields');
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

        try {
            await axios.post('http://localhost:5000/sleep', newSleep, {withCredentials: true});
            setNewSleep({date: '', sleep_score: '', hours_slept: ''});
            setError('');
            fetchSleepData();
        } catch (err) {
            setError(err.response?.data.error || 'Error adding sleep data');
            if (err.response?.status === 401) setIsLoggedIn(false);
        }
    };

    return (
        <Container>
            <h1 className="my-4">Naplett Sleep Tracker</h1>
            {error && <Alert variant="danger">{error}</Alert>}

            {/* Add Sleep Data Form */}
            <Card className="mb-4 shadow">
                <Card.Body>
                    <Card.Title>Add Sleep Data</Card.Title>
                    <Form onSubmit={handleAddSleep}>
                        <Form.Group className="mb-3" controlId="date">
                            <Form.Label>Date</Form.Label>
                            <Form.Control
                                type="date"
                                value={newSleep.date}
                                onChange={(e) => setNewSleep({...newSleep, date: e.target.value})}
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="sleepScore">
                            <Form.Label>Sleep Score (0-100)</Form.Label>
                            <Form.Control
                                type="number"
                                value={newSleep.sleep_score}
                                onChange={(e) => setNewSleep({...newSleep, sleep_score: e.target.value})}
                                placeholder="Enter sleep score"
                                min="0"
                                max="100"
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="hoursSlept">
                            <Form.Label>Hours Slept (0-24)</Form.Label>
                            <Form.Control
                                type="number"
                                value={newSleep.hours_slept}
                                onChange={(e) => setNewSleep({...newSleep, hours_slept: e.target.value})}
                                placeholder="Enter hours slept"
                                min="0"
                                max="24"
                                step="0.1"
                                required
                            />
                        </Form.Group>
                        <Button variant="primary" type="submit">
                            Add Sleep Data
                        </Button>
                    </Form>
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
                                <th>Hours Slept</th>
                            </tr>
                            </thead>
                            <tbody>
                            {sleepData.map((data, index) => (
                                <tr key={index}>
                                    <td>{data.date}</td>
                                    <td>{data.score}</td>
                                    <td>{data.hours}</td>
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
                            <strong>7-Day Average:</strong> {userModel.sleep_metrics?.avg_7d?.toFixed(2) || 'N/A'}
                        </ListGroup.Item>
                        <ListGroup.Item>
                            <strong>Trend:</strong> {userModel.trends?.sleep_trend?.toFixed(2) || 'N/A'}%
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