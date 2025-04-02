import React, { useEffect } from 'react';
import { Form, Button, Modal, Row, Col, Alert } from 'react-bootstrap';

// Default formatted JSON example
const defaultJsonExample = JSON.stringify(
    {
        date: "2025-04-01",
        sleep_score: 85,
        hours_slept: 7.5,
        spo2_percentage: 96,
        readiness_score: 82,
        deep_sleep_duration: 5400,
        rem_sleep_duration: 7200,
        light_sleep_duration: 10800,
        average_heart_rate: 65,
        average_hrv: 50,
        active_calories: 400,
        steps: 12000,
        sedentary_time: 28800
    },
    null,
    2
);

function AddSleepActivityModal({
    show,
    onHide,
    newSleep,
    setNewSleep,
    jsonInput,
    setJsonInput,
    error,
    setError,
    handleAddSleep
}) {
    // Set the default JSON example when the modal opens
    useEffect(() => {
        if (show && !jsonInput) {
            setJsonInput(defaultJsonExample);
        }
    }, [show, jsonInput, setJsonInput]);

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

    return (
        <Modal show={show} onHide={onHide} centered size="lg">
            <Modal.Header closeButton>
                <Modal.Title>Add Sleep Activity</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {error && (
                    <Alert variant="danger">{error}</Alert>
                )}
                <Row>
                    {/* Left Section: JSON Input */}
                    <Col md={6} className="border-end pe-3">
                        <Form.Group className="mb-3" controlId="jsonInput">
                            <Form.Label>Paste JSON Content</Form.Label>
                            <Form.Control
                                as="textarea"
                                rows={15}
                                value={jsonInput}
                                onChange={handleJsonInputChange}
                                style={{ fontFamily: 'monospace', fontSize: '14px' }}
                            />
                        </Form.Group>
                    </Col>

                    {/* Right Section: Form Fields in Multi-Column Layout */}
                    <Col md={6} className="ps-3">
                        <Form onSubmit={handleAddSleep}>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3" controlId="activityDate">
                                        <Form.Label>Date *</Form.Label>
                                        <Form.Control
                                            type="date"
                                            value={newSleep.date}
                                            onChange={(e) => setNewSleep({ ...newSleep, date: e.target.value })}
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
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
                                </Col>
                            </Row>
                            <Row>
                                <Col md={6}>
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
                                </Col>
                                <Col md={6}>
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
                                </Col>
                            </Row>
                            <Row>
                                <Col md={6}>
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
                                </Col>
                                <Col md={6}>
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
                                </Col>
                            </Row>
                            <Row>
                                <Col md={6}>
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
                                </Col>
                                <Col md={6}>
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
                                </Col>
                            </Row>
                            <Row>
                                <Col md={6}>
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
                                </Col>
                                <Col md={6}>
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
                                </Col>
                            </Row>
                            <Row>
                                <Col md={6}>
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
                                </Col>
                                <Col md={6}>
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
                                </Col>
                            </Row>
                            <Row>
                                <Col md={6}>
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
                                </Col>
                            </Row>
                            <Button variant="primary" type="submit">
                                Submit Sleep Activity
                            </Button>
                        </Form>
                    </Col>
                </Row>
            </Modal.Body>
        </Modal>
    );
}

export default AddSleepActivityModal;