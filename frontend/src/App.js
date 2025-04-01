import React, {useState} from 'react';
import {Navbar, Nav, Container, Alert} from 'react-bootstrap';
import axios from 'axios'; // Add this import
import Login from './Login';
import Dashboard from './Dashboard';

function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [logoutMessage, setLogoutMessage] = useState(''); // Add state for logout message

    const handleLogout = async () => {
        try {
            await axios.get('http://localhost:5000/logout', {withCredentials: true});
            setLogoutMessage('You have been logged out successfully.');
            setTimeout(() => {
                setIsLoggedIn(false);
                setLogoutMessage('');
            }, 2000); // Show message for 2 seconds before redirecting
        } catch (err) {
            console.error('Error logging out:', err);
            setLogoutMessage('Error logging out. Please try again.');
        }
    };

    return (
        <div>
            {/* Navigation Bar */}
            <Navbar bg="dark" variant="dark" expand="lg">
                <Container>
                    <Navbar.Brand href="/">
                        <img src="/logo.png" alt="Naplett" height="30" className="d-inline-block align-top"/> Naplett
                    </Navbar.Brand>
                    <Navbar.Toggle aria-controls="basic-navbar-nav"/>
                    <Navbar.Collapse id="basic-navbar-nav">
                        <Nav className="ms-auto">
                            {isLoggedIn ? (
                                <Nav.Link onClick={handleLogout}>Logout</Nav.Link>
                            ) : (
                                <Nav.Link disabled>Login</Nav.Link>
                            )}
                        </Nav>
                    </Navbar.Collapse>
                </Container>
            </Navbar>

            {/* Main Content */}
            <Container className="mt-4">
                {logoutMessage && (
                    <Alert variant={logoutMessage.includes('Error') ? 'danger' : 'success'} className="text-center">
                        {logoutMessage}
                    </Alert>
                )}
                {isLoggedIn ? <Dashboard setIsLoggedIn={setIsLoggedIn}/> : <Login setIsLoggedIn={setIsLoggedIn}/>}
            </Container>
        </div>
    );
}

export default App;