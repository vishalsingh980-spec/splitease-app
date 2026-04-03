import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface BalanceEntry {
  userId: string;
  name: string;
  amount: number; // positive = they owe me, negative = I owe them
}

interface BalanceSummary {
  balances: BalanceEntry[];
  totalOwed: number;
  totalLent: number;
  groupCount: number;
}

interface Expense {
  id: string;
  description: string;
  total_amount: number;
  date: string;
  category?: string;
  paid_by_user?: { name: string };
}

const CATEGORY_EMOJI: Record<string, string> = {
  Food: '🍕',
  Transport: '🚗',
  Housing: '🏠',
  Entertainment: '🎬',
  Shopping: '🛒',
  Travel: '✈️',
  Utilities: '⚡',
  Healthcare: '💊',
  Other: '📦',
};

const Dashboard: React.FC = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<BalanceSummary>({
    balances: [],
    totalOwed: 0,
    totalLent: 0,
    groupCount: 0,
  });
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([]);
  const [thisMonthTotal, setThisMonthTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [balRes, expRes] = await Promise.allSettled([
          axios.get('/api/balances'),
          axios.get('/api/expenses'),
        ]);

        if (balRes.status === 'fulfilled') {
          setSummary(balRes.value.data);
        }

        if (expRes.status === 'fulfilled') {
          const expenses: Expense[] = expRes.value.data;
          const now = new Date();
          const monthTotal = expenses
            .filter((e) => {
              const d = new Date(e.date);
              return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            })
            .reduce((sum, e) => sum + Number(e.total_amount), 0);
          setThisMonthTotal(monthTotal);
          setRecentExpenses(expenses.slice(0, 5));
        }
      } catch {
        // silent — partial data shown
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const firstName = currentUser?.name?.split(' ')[0] || 'there';

  if (loading) {
    return (
      <div className="spinner-overlay" style={{ minHeight: '60vh' }}>
        <div className="spinner spinner-dark" />
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.03em' }}>
          Hello, {firstName} 👋
        </h1>
        <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>{today}</p>
      </div>

      {/* Summary cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
          gap: '16px',
          marginBottom: '32px',
        }}
      >
        <div className="stat-card">
          <div className="stat-card-label">You are owed</div>
          <div className="stat-card-value amount-lent">${summary.totalLent.toFixed(2)}</div>
          <div className="stat-card-sub">across all groups</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">You owe</div>
          <div className="stat-card-value amount-owed">${summary.totalOwed.toFixed(2)}</div>
          <div className="stat-card-sub">across all groups</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">Total groups</div>
          <div className="stat-card-value" style={{ color: '#3A86FF' }}>{summary.groupCount}</div>
          <div className="stat-card-sub">active groups</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label">This month</div>
          <div className="stat-card-value" style={{ color: '#8338EC' }}>${thisMonthTotal.toFixed(2)}</div>
          <div className="stat-card-sub">total expenses</div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '36px', flexWrap: 'wrap' }}>
        <button
          className="btn btn-primary"
          onClick={() => navigate('/expenses')}
        >
          + Add Expense
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/groups')}
        >
          + New Group
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => navigate('/settlements')}
        >
          ⚡ Settle Up
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        {/* Your Balances */}
        <div className="card">
          <div className="section-header">
            <h2 className="section-title">Your Balances</h2>
          </div>

          {summary.balances.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 0' }}>
              <span className="empty-state-icon">🎉</span>
              <p className="empty-state-title">All settled up!</p>
              <p className="empty-state-desc">No outstanding balances.</p>
            </div>
          ) : (
            <div>
              {summary.balances.map((b) => (
                <div key={b.userId} className="list-item">
                  <div className="avatar avatar-sm">
                    {b.name.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{b.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {b.amount > 0 ? 'owes you' : 'you owe'}
                    </div>
                  </div>
                  <span className={b.amount > 0 ? 'amount-lent' : 'amount-owed'} style={{ fontSize: '0.95rem' }}>
                    ${Math.abs(b.amount).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="section-header">
            <h2 className="section-title">Recent Activity</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/expenses')}>
              View all →
            </button>
          </div>

          {recentExpenses.length === 0 ? (
            <div className="empty-state" style={{ padding: '32px 0' }}>
              <span className="empty-state-icon">🧾</span>
              <p className="empty-state-title">No expenses yet</p>
              <p className="empty-state-desc">Add your first expense to see it here.</p>
            </div>
          ) : (
            <div>
              {recentExpenses.map((exp) => {
                const emoji = CATEGORY_EMOJI[exp.category || 'Other'] || '📦';
                return (
                  <div key={exp.id} className="list-item">
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--primary-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '1.1rem',
                        flexShrink: 0,
                      }}
                    >
                      {emoji}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {exp.description}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {exp.paid_by_user?.name && `Paid by ${exp.paid_by_user.name} · `}
                        {new Date(exp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    <span className="amount-lent" style={{ fontSize: '0.9rem', flexShrink: 0 }}>
                      ${Number(exp.total_amount).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
