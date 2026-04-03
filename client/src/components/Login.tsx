import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const [identifier, setIdentifier] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<'send' | 'verify'>('send');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [devOtp, setDevOtp] = useState('');

  const navigate = useNavigate();
  const { login } = useAuth();
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    if (!identifier.trim()) {
      setError('Please enter your email or phone number.');
      return;
    }
    setLoading(true);
    try {
      const type = identifier.includes('@') ? 'email' : 'phone';
      const res = await axios.post('/api/auth/send-otp', { identifier: identifier.trim(), type });
      setSuccessMsg('OTP sent! Check your email or phone.');
      // Dev mode: backend returns OTP in response
      if (res.data.otp) setDevOtp(res.data.otp);
      setStep('verify');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otpDigits];
    next[index] = digit;
    setOtpDigits(next);
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtpDigits(pasted.split(''));
      otpRefs.current[5]?.focus();
    }
    e.preventDefault();
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const otp = otpDigits.join('');
    if (otp.length < 6) {
      setError('Please enter the 6-digit OTP.');
      return;
    }
    setLoading(true);
    try {
      const response = await axios.post('/api/auth/verify-otp', {
        identifier: identifier.trim(),
        otp,
        name: name.trim() || undefined,
      });
      login(response.data.user, response.data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'stretch',
        background: 'var(--bg)',
      }}
    >
      {/* Left — Hero */}
      <div
        style={{
          flex: '0 0 45%',
          background: 'linear-gradient(135deg, #1CC29F 0%, #17A085 50%, #0e7a65 100%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px',
          color: '#fff',
        }}
        className="login-hero"
      >
        <div style={{ fontSize: '4rem', marginBottom: '16px' }}>💸</div>
        <h1
          style={{
            fontSize: '2.2rem',
            fontWeight: 800,
            margin: '0 0 16px',
            letterSpacing: '-0.03em',
            textAlign: 'center',
          }}
        >
          SplitEase
        </h1>
        <p
          style={{
            fontSize: '1.15rem',
            opacity: 0.88,
            textAlign: 'center',
            lineHeight: 1.6,
            maxWidth: '280px',
            margin: '0 0 40px',
          }}
        >
          Split expenses, not friendships.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', width: '100%', maxWidth: '260px' }}>
          {[
            { icon: '👥', text: 'Create groups with friends' },
            { icon: '🧾', text: 'Track shared expenses easily' },
            { icon: '⚡', text: 'Settle up in one tap' },
          ].map((item) => (
            <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1.3rem' }}>{item.icon}</span>
              <span style={{ fontSize: '0.92rem', opacity: 0.9 }}>{item.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right — Form */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 32px',
        }}
      >
        <div style={{ width: '100%', maxWidth: '420px' }}>
          {step === 'send' ? (
            <>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                Welcome back
              </h2>
              <p style={{ color: 'var(--text-secondary)', margin: '0 0 32px', fontSize: '0.95rem' }}>
                Enter your email or phone to sign in or create an account.
              </p>

              {error && <div className="alert alert-error">{error}</div>}

              <form onSubmit={handleSendOTP}>
                <div className="form-group">
                  <label className="input-label">Email or Phone Number</label>
                  <div className="input-group">
                    <span className="input-icon">✉</span>
                    <input
                      className="input"
                      type="text"
                      placeholder="you@example.com or +91 9876543210"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg btn-block"
                  disabled={loading}
                  style={{ marginTop: '8px' }}
                >
                  {loading ? <span className="spinner" /> : 'Send OTP →'}
                </button>
              </form>

              <p style={{ marginTop: '24px', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                No password needed — we'll send a one-time code.
              </p>
            </>
          ) : (
            <>
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginBottom: '24px', padding: '6px 0', color: 'var(--text-secondary)' }}
                onClick={() => { setStep('send'); setError(''); setOtpDigits(['','','','','','']); }}
              >
                ← Back
              </button>

              <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                Check your inbox
              </h2>
              <p style={{ color: 'var(--text-secondary)', margin: '0 0 8px', fontSize: '0.95rem' }}>
                We sent a 6-digit code to <strong>{identifier}</strong>
              </p>
              {devOtp && (
                <p style={{ color: 'var(--primary)', fontSize: '0.85rem', margin: '0 0 24px', fontWeight: 600 }}>
                  Dev mode — OTP: {devOtp}
                </p>
              )}
              {!devOtp && <div style={{ marginBottom: '24px' }} />}

              {error && <div className="alert alert-error">{error}</div>}
              {successMsg && <div className="alert alert-success">{successMsg}</div>}

              <form onSubmit={handleVerifyOTP}>
                <div className="form-group">
                  <label className="input-label">Enter OTP</label>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'space-between' }}>
                    {otpDigits.map((digit, i) => (
                      <input
                        key={i}
                        ref={(el) => { otpRefs.current[i] = el; }}
                        className="otp-input"
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(i, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(i, e)}
                        onPaste={i === 0 ? handleOtpPaste : undefined}
                        autoFocus={i === 0}
                      />
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="input-label">
                    Your Name <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(only for new accounts)</span>
                  </label>
                  <input
                    className="input"
                    type="text"
                    placeholder="e.g. Alex Johnson"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-lg btn-block"
                  disabled={loading}
                  style={{ marginTop: '8px' }}
                >
                  {loading ? <span className="spinner" /> : 'Verify & Sign In →'}
                </button>
              </form>

              <p style={{ marginTop: '20px', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                Didn't receive it?{' '}
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: 'var(--primary)', padding: '0', fontWeight: 600, fontSize: '0.85rem' }}
                  onClick={handleSendOTP as any}
                >
                  Resend OTP
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
