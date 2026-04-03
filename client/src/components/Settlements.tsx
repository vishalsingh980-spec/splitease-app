import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface BalanceEntry {
  userId: string;
  name: string;
  amount: number;
}

interface Settlement {
  id: string;
  from_user?: { name: string };
  to_user?: { name: string };
  amount: number;
  payment_method?: string;
  created_at: string;
  note?: string;
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash', icon: '💵' },
  { value: 'UPI', label: 'UPI', icon: '📱' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: '🏦' },
];

const Settlements: React.FC = () => {
  const { currentUser } = useAuth();

  const [balances, setBalances] = useState<BalanceEntry[]>([]);
  const [recentSettlements, setRecentSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<Record<string, string>>({});
  const [note, setNote] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [balRes, settleRes] = await Promise.allSettled([
        axios.get('/api/balances'),
        axios.get('/api/settlements'),
      ]);
      if (balRes.status === 'fulfilled') {
        setBalances(balRes.value.data.balances || []);
      }
      if (settleRes.status === 'fulfilled') {
        setRecentSettlements(settleRes.value.data.slice(0, 10));
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  const handleSettle = async (peer: BalanceEntry) => {
    setError('');
    setSuccessMsg('');
    setSettlingId(peer.userId);
    try {
      // If amount < 0, I owe them — so I am from, they are to
      // If amount > 0, they owe me — they are from, I am to
      const fromUserId = peer.amount < 0 ? currentUser!.id : peer.userId;
      const toUserId = peer.amount < 0 ? peer.userId : currentUser!.id;
      const settleAmount = Math.abs(peer.amount);

      await axios.post('/api/settlements', {
        fromUserId,
        toUserId,
        amount: settleAmount,
        paymentMethod: paymentMethod[peer.userId] || 'CASH',
        note: note[peer.userId] || '',
      });

      setSuccessMsg(`Settlement recorded with ${peer.name}!`);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to record settlement.');
    } finally {
      setSettlingId(null);
    }
  };

  const debts = balances.filter((b) => b.amount < 0);
  const credits = balances.filter((b) => b.amount > 0);

  if (loading) {
    return (
      <div className="spinner-overlay" style={{ minHeight: '60vh' }}>
        <div className="spinner spinner-dark" />
      </div>
    );
  }

  return (
    <div className="page">
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.03em' }}>
          Settle Up
        </h1>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
          Record payments to clear your balances.
        </p>
      </div>

      {successMsg && <div className="alert alert-success">{successMsg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* You owe section */}
      {debts.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 className="section-title" style={{ marginBottom: '20px' }}>You owe</h2>
          <div style={{ display: 'grid', gap: '16px' }}>
            {debts.map((b) => (
              <SettleRow
                key={b.userId}
                peer={b}
                currentUser={currentUser}
                paymentMethod={paymentMethod[b.userId] || 'CASH'}
                note={note[b.userId] || ''}
                isSettling={settlingId === b.userId}
                onPaymentMethodChange={(v) => setPaymentMethod((p) => ({ ...p, [b.userId]: v }))}
                onNoteChange={(v) => setNote((p) => ({ ...p, [b.userId]: v }))}
                onSettle={() => handleSettle(b)}
                direction="owe"
              />
            ))}
          </div>
        </div>
      )}

      {/* You are owed section */}
      {credits.length > 0 && (
        <div className="card" style={{ marginBottom: '24px' }}>
          <h2 className="section-title" style={{ marginBottom: '20px' }}>You are owed</h2>
          <div style={{ display: 'grid', gap: '16px' }}>
            {credits.map((b) => (
              <SettleRow
                key={b.userId}
                peer={b}
                currentUser={currentUser}
                paymentMethod={paymentMethod[b.userId] || 'CASH'}
                note={note[b.userId] || ''}
                isSettling={settlingId === b.userId}
                onPaymentMethodChange={(v) => setPaymentMethod((p) => ({ ...p, [b.userId]: v }))}
                onNoteChange={(v) => setNote((p) => ({ ...p, [b.userId]: v }))}
                onSettle={() => handleSettle(b)}
                direction="lent"
              />
            ))}
          </div>
        </div>
      )}

      {debts.length === 0 && credits.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon">🎉</span>
            <p className="empty-state-title">All settled up!</p>
            <p className="empty-state-desc">You have no outstanding balances with anyone.</p>
          </div>
        </div>
      )}

      {/* Recent settlements */}
      {recentSettlements.length > 0 && (
        <div className="card" style={{ marginTop: '24px' }}>
          <h2 className="section-title" style={{ marginBottom: '16px' }}>Recent Settlements</h2>
          <div>
            {recentSettlements.map((s) => (
              <div key={s.id} className="list-item">
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--success-light)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    flexShrink: 0,
                  }}
                >
                  {PAYMENT_METHODS.find((m) => m.value === s.payment_method)?.icon || '💵'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                    {s.from_user?.name || 'Someone'} → {s.to_user?.name || 'Someone'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {s.payment_method || 'Cash'} ·{' '}
                    {new Date(s.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                    {s.note ? ` · "${s.note}"` : ''}
                  </div>
                </div>
                <span className="amount-lent">${Number(s.amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface SettleRowProps {
  peer: BalanceEntry;
  currentUser: any;
  paymentMethod: string;
  note: string;
  isSettling: boolean;
  onPaymentMethodChange: (v: string) => void;
  onNoteChange: (v: string) => void;
  onSettle: () => void;
  direction: 'owe' | 'lent';
}

const SettleRow: React.FC<SettleRowProps> = ({
  peer,
  paymentMethod,
  note,
  isSettling,
  onPaymentMethodChange,
  onNoteChange,
  onSettle,
  direction,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        border: `1px solid ${direction === 'owe' ? '#f5c6c2' : '#b7e5c7'}`,
        borderRadius: 'var(--radius)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          padding: '16px 18px',
          background: direction === 'owe' ? 'var(--danger-light)' : 'var(--success-light)',
        }}
      >
        <div className="avatar">{peer.name.charAt(0).toUpperCase()}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{peer.name}</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            {direction === 'owe' ? 'You owe' : 'Owes you'}{' '}
            <strong className={direction === 'owe' ? 'amount-owed' : 'amount-lent'}>
              ${Math.abs(peer.amount).toFixed(2)}
            </strong>
          </div>
        </div>
        <button
          className={`btn btn-sm ${direction === 'owe' ? 'btn-danger' : 'btn-primary'}`}
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Cancel' : 'Settle Up'}
        </button>
      </div>

      {/* Expanded form */}
      <div
        style={{
          maxHeight: expanded ? '300px' : '0',
          overflow: 'hidden',
          transition: 'max-height 0.25s ease',
        }}
      >
        <div style={{ padding: '16px 18px', borderTop: `1px solid ${direction === 'owe' ? '#f5c6c2' : '#b7e5c7'}` }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' }}>
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                className={`btn btn-sm ${paymentMethod === m.value ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => onPaymentMethodChange(m.value)}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>
          <div className="form-group">
            <label className="input-label">Note (optional)</label>
            <input
              className="input"
              type="text"
              placeholder="e.g. Paid via Google Pay"
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
            />
          </div>
          <button
            className={`btn ${direction === 'owe' ? 'btn-danger' : 'btn-primary'}`}
            disabled={isSettling}
            onClick={onSettle}
          >
            {isSettling ? <span className="spinner" /> : `Confirm — $${Math.abs(peer.amount).toFixed(2)}`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settlements;
