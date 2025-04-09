import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';

// Import components
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Dashboard from './components/dashboard/Dashboard';
import SleepUpload from './components/upload/SleepUpload';
import SleepHistory from './components/dashboard/SleepHistory';
import Navbar from './components/common/Navbar';
import Loading from './components/common/Loading';

// Set base URL for API requests
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
axios.defaults.withCredentials = true;

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check authentication status on load
    useEffect(() => {
        const checkAuth = async () => {
            try {
                const response = await axios.get('/user/profile');
                setIsAuthenticated(true);
                setUser(response.data);
            } catch (error) {
                setIsAuthenticated(false);
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        checkAuth();
    }, []);

    // Create Protected Route component
    const ProtectedRoute = ({ children }) => {
        if (loading) return <Loading />;
        return isAuthenticated ? children : <Navigate to="/login" />;
    };

    if (loading) {
        return <Loading />;
    }

    return (
        <Router>
            <div className="app">
                <Navbar
                    isAuthenticated={isAuthenticated}
                    user={user}
                    setIsAuthenticated={setIsAuthenticated}
                    setUser={setUser}
                />
                <main className="container py-4">
                    <Routes>
                        <Route path="/login" element={
                            isAuthenticated ?
                                <Navigate to="/dashboard" /> :
                                <Login setIsAuthenticated={setIsAuthenticated} setUser={setUser} />
                        } />
                        <Route path="/register" element={
                            isAuthenticated ?
                                <Navigate to="/dashboard" /> :
                                <Register setIsAuthenticated={setIsAuthenticated} setUser={setUser} />
                        } />
                        <Route path="/dashboard" element={
                            <ProtectedRoute>
                                <Dashboard user={user} />
                            </ProtectedRoute>
                        } />
                        <Route path="/upload" element={
                            <ProtectedRoute>
                                <SleepUpload />
                            </ProtectedRoute>
                        } />
                        <Route path="/history" element={
                            <ProtectedRoute>
                                <SleepHistory />
                            </ProtectedRoute>
                        } />
                        <Route path="/" element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;