import React, {useState, useEffect} from 'react';
import axios from 'axios';
import {Form, Button, Card, Alert, Container} from 'react-bootstrap';

function Login({setIsLoggedIn}) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        axios.get('http://localhost:5000/sleep', {withCredentials: true})
            .then(() => setIsLoggedIn(true))
            .catch(() => setIsLoggedIn(false));
    }, [setIsLoggedIn]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const endpoint = isRegistering ? '/register' : '/login';
        try {
            const response = await axios.post(`http://localhost:5000${endpoint}`, {
                username,
                password
            }, {withCredentials: true});
            if (response.data.message) {
                setIsLoggedIn(true);
                setError('');
            }
        } catch (err) {
            setError(err.response?.data.error || 'An error occurred');
        }
    };

    return (
        <Container className="d-flex justify-content-center align-items-center" style={{minHeight: '80vh'}}>
            <Card style={{width: '100%', maxWidth: '400px'}} className="p-4 shadow">
                <Card.Body>
                    <h2 className="text-center mb-4">{isRegistering ? 'Register' : 'Login'}</h2>
                    {error && <Alert variant="danger">{error}</Alert>}
                    <Form onSubmit={handleSubmit}>
                        <Form.Group className="mb-3" controlId="username">
                            <Form.Label>Username</Form.Label>
                            <Form.Control
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                placeholder="Enter username"
                                required
                            />
                        </Form.Group>
                        <Form.Group className="mb-3" controlId="password">
                            <Form.Label>Password</Form.Label>
                            <Form.Control
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Enter password"
                                required
                            />
                        </Form.Group>
                        <Button variant="primary" type="submit" className="w-100">
                            {isRegistering ? 'Register' : 'Login'}
                        </Button>
                    </Form>
                    <div className="text-center mt-3">
                        <Button variant="link" onClick={() => setIsRegistering(!isRegistering)}>
                            {isRegistering ? 'Already have an account? Login' : 'Need an account? Register'}
                        </Button>
                    </div>
                </Card.Body>
            </Card>
        </Container>
    );
}

export default Login;