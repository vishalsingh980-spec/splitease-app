import React from 'react';
import { Link } from 'react-router-dom';

const Register: React.FC = () => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>Register</h2>
        <p style={{ marginBottom: '16px' }}>
          Registration is handled through the login process. If you're a new user, enter your email/phone and name during OTP verification.
        </p>
        <Link to="/login" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 'bold' }}>Go to Login</Link>
      </div>
    </div>
  );
};

export default Register;