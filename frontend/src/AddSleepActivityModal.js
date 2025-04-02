import React, { useEffect } from 'react';
import { Form, Button, Modal, Row, Col, Alert } from 'react-bootstrap';

const defaultJsonExample = JSON.stringify(
    {
        "sleep_metrics": {
            "total_sleep_duration": 480,
            "deep_sleep_duration": 96,
            "rem_sleep_duration": 110,
            "efficiency": 92.0,
            "restless_periods": 1,
            "sleep_midpoint": "2025-04-02T03:00:00-07:00",
            "bedtime_start": "2025-04-01T23:00:00-07:00",
            "bedtime_end": "2025-04-02T07:00:00-07:00"
        },
        "physiological_metrics": {
            "lowest_heart_rate": 55,
            "average_hrv": 60,
            "resting_heart_rate": 65,
            "respiratory_rate": 15
        }
    },
    null,
    2
);

// Helper function to convert ISO 8601 date-time to datetime-local format
const formatDateTimeForInput = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    // Format to YYYY-MM-DDThh:mm
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

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
    useEffect(() => {
        if (show && !jsonInput) {
            setJsonInput(defaultJsonExample);
            handleJsonInputChange({ target: { value: defaultJsonExample } });
        }
    }, [show, jsonInput, setJsonInput]);

    const handleJsonInputChange = (e) => {
        const jsonText = e.target.value;
        setJsonInput(jsonText);
        try {
            const parsedData = JSON.parse(jsonText);
            setNewSleep({
                sleep_metrics: {
                    total_sleep_duration: parsedData.sleep_metrics.total_sleep_duration || '',
                    deep_sleep_duration: parsedData.sleep_metrics.deep_sleep_duration || '',
                    rem_sleep_duration: parsedData.sleep_metrics.rem_sleep_duration || '',
                    efficiency: parsedData.sleep_metrics.efficiency || '',
                    restless_periods: parsedData.sleep_metrics.restless_periods || '',
                    sleep_midpoint: formatDateTimeForInput(parsedData.sleep_metrics.sleep_midpoint),
                    bedtime_start: formatDateTimeForInput(parsedData.sleep_metrics.bedtime_start),
                    bedtime_end: formatDateTimeForInput(parsedData.sleep_metrics.bedtime_end)
                },
                physiological_metrics: {
                    lowest_heart_rate: parsedData.physiological_metrics.lowest_heart_rate || '',
                    average_hrv: parsedData.physiological_metrics.average_hrv || '',
                    resting_heart_rate: parsedData.physiological_metrics.resting_heart_rate || '',
                    respiratory_rate: parsedData.physiological_metrics.respiratory_rate || ''
                }
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
                {error && <Alert variant="danger">{error}</Alert>}
                <Row>
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
                    <Col md={6} className="ps-3">
                        <Form onSubmit={handleAddSleep}>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3" controlId="bedtimeStart">
                                        <Form.Label>Bedtime Start *</Form.Label>
                                        <Form.Control
                                            type="datetime-local"
                                            value={newSleep.sleep_metrics?.bedtime_start || ''}
                                            onChange={(e) => setNewSleep({
                                                ...newSleep,
                                                sleep_metrics: { ...newSleep.sleep_metrics, bedtime_start: e.target.value }
                                            })}
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3" controlId="bedtimeEnd">
                                        <Form.Label>Bedtime End *</Form.Label>
                                        <Form.Control
                                            type="datetime-local"
                                            value={newSleep.sleep_metrics?.bedtime_end || ''}
                                            onChange={(e) => setNewSleep({
                                                ...newSleep,
                                                sleep_metrics: { ...newSleep.sleep_metrics, bedtime_end: e.target.value }
                                            })}
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3" controlId="totalSleep">
                                        <Form.Label>Total Sleep (min) *</Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={newSleep.sleep_metrics?.total_sleep_duration || ''}
                                            onChange={(e) => setNewSleep({
                                                ...newSleep,
                                                sleep_metrics: { ...newSleep.sleep_metrics, total_sleep_duration: e.target.value }
                                            })}
                                            min="0"
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3" controlId="deepSleep">
                                        <Form.Label>Deep Sleep (min) *</Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={newSleep.sleep_metrics?.deep_sleep_duration || ''}
                                            onChange={(e) => setNewSleep({
                                                ...newSleep,
                                                sleep_metrics: { ...newSleep.sleep_metrics, deep_sleep_duration: e.target.value }
                                            })}
                                            min="0"
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3" controlId="remSleep">
                                        <Form.Label>REM Sleep (min) *</Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={newSleep.sleep_metrics?.rem_sleep_duration || ''}
                                            onChange={(e) => setNewSleep({
                                                ...newSleep,
                                                sleep_metrics: { ...newSleep.sleep_metrics, rem_sleep_duration: e.target.value }
                                            })}
                                            min="0"
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3" controlId="efficiency">
                                        <Form.Label>Efficiency (%) *</Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={newSleep.sleep_metrics?.efficiency || ''}
                                            onChange={(e) => setNewSleep({
                                                ...newSleep,
                                                sleep_metrics: { ...newSleep.sleep_metrics, efficiency: e.target.value }
                                            })}
                                            min="0"
                                            max="100"
                                            step="0.1"
                                            required
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3" controlId="restlessPeriods">
                                        <Form.Label>Restless Periods</Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={newSleep.sleep_metrics?.restless_periods || ''}
                                            onChange={(e) => setNewSleep({
                                                ...newSleep,
                                                sleep_metrics: { ...newSleep.sleep_metrics, restless_periods: e.target.value }
                                            })}
                                            min="0"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3" controlId="sleepMidpoint">
                                        <Form.Label>Sleep Midpoint</Form.Label>
                                        <Form.Control
                                            type="datetime-local"
                                            value={newSleep.sleep_metrics?.sleep_midpoint || ''}
                                            onChange={(e) => setNewSleep({
                                                ...newSleep,
                                                sleep_metrics: { ...newSleep.sleep_metrics, sleep_midpoint: e.target.value }
                                            })}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3" controlId="lowestHeartRate">
                                        <Form.Label>Lowest HR (bpm)</Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={newSleep.physiological_metrics?.lowest_heart_rate || ''}
                                            onChange={(e) => setNewSleep({
                                                ...newSleep,
                                                physiological_metrics: { ...newSleep.physiological_metrics, lowest_heart_rate: e.target.value }
                                            })}
                                            min="0"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3" controlId="averageHrv">
                                        <Form.Label>Average HRV (ms)</Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={newSleep.physiological_metrics?.average_hrv || ''}
                                            onChange={(e) => setNewSleep({
                                                ...newSleep,
                                                physiological_metrics: { ...newSleep.physiological_metrics, average_hrv: e.target.value }
                                            })}
                                            min="0"
                                            step="0.1"
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3" controlId="restingHeartRate">
                                        <Form.Label>Resting HR (bpm)</Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={newSleep.physiological_metrics?.resting_heart_rate || ''}
                                            onChange={(e) => setNewSleep({
                                                ...newSleep,
                                                physiological_metrics: { ...newSleep.physiological_metrics, resting_heart_rate: e.target.value }
                                            })}
                                            min="0"
                                        />
                                    </Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3" controlId="respiratoryRate">
                                        <Form.Label>Respiratory Rate (bpm)</Form.Label>
                                        <Form.Control
                                            type="number"
                                            value={newSleep.physiological_metrics?.respiratory_rate || ''}
                                            onChange={(e) => setNewSleep({
                                                ...newSleep,
                                                physiological_metrics: { ...newSleep.physiological_metrics, respiratory_rate: e.target.value }
                                            })}
                                            min="0"
                                            step="0.1"
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