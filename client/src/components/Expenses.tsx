import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';

interface Expense {
  id: string;
  description: string;
  total_amount: number;
  date: string;
  category?: string;
  paid_by_user_id?: string;
  paid_by_user?: { name: string };
  expense_splits: Array<{
    user_id?: string;
    user?: { name: string };
    amount_owed: number;
  }>;
}

interface GroupMember {
  id: string;
  name: string;
}

const CATEGORIES = [
  { label: 'Food', emoji: '🍕' },
  { label: 'Transport', emoji: '🚗' },
  { label: 'Housing', emoji: '🏠' },
  { label: 'Entertainment', emoji: '🎬' },
  { label: 'Shopping', emoji: '🛒' },
  { label: 'Travel', emoji: '✈️' },
  { label: 'Utilities', emoji: '⚡' },
  { label: 'Healthcare', emoji: '💊' },
  { label: 'Other', emoji: '📦' },
];

const getCategoryEmoji = (cat?: string) =>
  CATEGORIES.find((c) => c.label === cat)?.emoji || '📦';

const Expenses: React.FC = () => {
  const [searchParams] = useSearchParams();
  const groupId = searchParams.get('groupId');
  const groupName = searchParams.get('groupName') || 'Group';

  const { currentUser } = useAuth();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [groupMembers, setGroupMembers] = useState<GroupMember[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Other');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [splitType, setSplitType] = useState<'EQUAL' | 'EXACT' | 'PERCENTAGE'>('EQUAL');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [paidByUserId, setPaidByUserId] = useState<string>('');
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>({});

  useEffect(() => {
    if (groupId) {
      fetchExpenses();
      fetchGroupMembers();
    }
  }, [groupId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (currentUser?.id) {
      setPaidByUserId(currentUser.id);
    }
  }, [currentUser]);

  const fetchExpenses = async () => {
    setFetching(true);
    try {
      const response = await axios.get(`/api/expenses?groupId=${groupId}`);
      setExpenses(response.data);
    } catch {
      // silent
    } finally {
      setFetching(false);
    }
  };

  const fetchGroupMembers = async () => {
    try {
      const response = await axios.get(`/api/groups/${groupId}/members`);
      const members: GroupMember[] = response.data;
      setGroupMembers(members);
      setSelectedMembers(members.map((m) => m.id));
    } catch {
      // silent
    }
  };

  const toggleMember = (memberId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (selectedMembers.length === 0) {
      setError('Select at least one member to split with.');
      return;
    }
    setLoading(true);
    try {
      const totalAmount = parseFloat(amount);
      let splits;

      if (splitType === 'EQUAL') {
        splits = selectedMembers.map((memberId) => ({
          userId: memberId,
          splitType: 'EQUAL',
          splitValue: 1,
        }));
      } else if (splitType === 'EXACT') {
        splits = selectedMembers.map((memberId) => ({
          userId: memberId,
          splitType: 'EXACT',
          splitValue: parseFloat(exactAmounts[memberId] || '0'),
        }));
      } else {
        const perMember = 100 / selectedMembers.length;
        splits = selectedMembers.map((memberId) => ({
          userId: memberId,
          splitType: 'PERCENTAGE',
          splitValue: perMember,
        }));
      }

      await axios.post('/api/expenses', {
        groupId,
        description: description.trim(),
        totalAmount,
        paidByUserId: paidByUserId || currentUser?.id,
        date,
        category,
        splits,
      });

      setDescription('');
      setAmount('');
      setCategory('Other');
      setDate(new Date().toISOString().split('T')[0]);
      setSplitType('EQUAL');
      setExactAmounts({});
      setShowAddForm(false);
      fetchExpenses();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add expense.');
    } finally {
      setLoading(false);
    }
  };

  if (!groupId) {
    return (
      <div className="page" style={{ textAlign: 'center' }}>
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon">🏘️</span>
            <p className="empty-state-title">No group selected</p>
            <p className="empty-state-desc">Please select a group to view its expenses.</p>
            <Link to="/groups" className="btn btn-primary">
              ← Go to Groups
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (fetching) {
    return (
      <div className="spinner-overlay" style={{ minHeight: '60vh' }}>
        <div className="spinner spinner-dark" />
      </div>
    );
  }

  return (
    <div className="page">
      {/* Header */}
      <div className="flex-between" style={{ marginBottom: '32px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <Link to="/groups" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem' }}>
              Groups
            </Link>
            <span style={{ color: 'var(--text-muted)' }}>›</span>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>{groupName}</span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: 0, letterSpacing: '-0.03em' }}>
            Expenses
          </h1>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { setShowAddForm((v) => !v); setError(''); }}
        >
          {showAddForm ? '✕ Cancel' : '+ Add Expense'}
        </button>
      </div>

      {/* Add expense form */}
      <div
        style={{
          overflow: 'hidden',
          maxHeight: showAddForm ? '1200px' : '0',
          transition: 'max-height 0.35s ease',
          marginBottom: showAddForm ? '28px' : '0',
        }}
      >
        <div className="card" style={{ border: '1.5px solid var(--primary)' }}>
          <h3 style={{ margin: '0 0 20px', fontWeight: 700 }}>New Expense</h3>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleAddExpense}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Description */}
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="input-label">Description</label>
                <input
                  className="input"
                  type="text"
                  placeholder="e.g. Dinner at Olive, Petrol for trip"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  required
                  autoFocus={showAddForm}
                />
              </div>

              {/* Amount */}
              <div className="form-group">
                <label className="input-label">Amount</label>
                <div className="input-group">
                  <span className="input-prefix">$</span>
                  <input
                    className="input"
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{ paddingLeft: '24px' }}
                    required
                  />
                </div>
              </div>

              {/* Date */}
              <div className="form-group">
                <label className="input-label">Date</label>
                <input
                  className="input"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              {/* Category */}
              <div className="form-group">
                <label className="input-label">Category</label>
                <select
                  className="input"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.label} value={c.label}>
                      {c.emoji} {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Paid by */}
              <div className="form-group">
                <label className="input-label">Paid by</label>
                <select
                  className="input"
                  value={paidByUserId}
                  onChange={(e) => setPaidByUserId(e.target.value)}
                >
                  {groupMembers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}{m.id === currentUser?.id ? ' (you)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Split type */}
            <div className="form-group">
              <label className="input-label">Split type</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {(['EQUAL', 'EXACT', 'PERCENTAGE'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={`btn btn-sm ${splitType === t ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setSplitType(t)}
                  >
                    {t === 'EQUAL' ? 'Equal' : t === 'EXACT' ? 'Exact' : 'Percentage'}
                  </button>
                ))}
              </div>
            </div>

            {/* Member selection */}
            <div className="form-group">
              <label className="input-label">Split with</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {groupMembers.map((member) => {
                  const checked = selectedMembers.includes(member.id);
                  return (
                    <label
                      key={member.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: `1.5px solid ${checked ? 'var(--primary)' : 'var(--border)'}`,
                        background: checked ? 'var(--primary-light)' : 'var(--card)',
                        cursor: 'pointer',
                        transition: 'all var(--transition)',
                        userSelect: 'none',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleMember(member.id)}
                        style={{ display: 'none' }}
                      />
                      <div className="avatar avatar-sm">{member.name.charAt(0).toUpperCase()}</div>
                      <span style={{ fontSize: '0.88rem', fontWeight: checked ? 600 : 400 }}>
                        {member.name}{member.id === currentUser?.id ? ' (you)' : ''}
                      </span>
                      {checked && splitType === 'EQUAL' && amount && (
                        <span style={{ fontSize: '0.78rem', color: 'var(--primary-dark)', fontWeight: 600 }}>
                          ${(parseFloat(amount || '0') / selectedMembers.length).toFixed(2)}
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Exact amount inputs */}
            {splitType === 'EXACT' && selectedMembers.length > 0 && (
              <div className="form-group">
                <label className="input-label">Exact amounts per person</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                  {selectedMembers.map((mId) => {
                    const member = groupMembers.find((m) => m.id === mId);
                    return (
                      <div key={mId}>
                        <label className="input-label" style={{ fontWeight: 400 }}>
                          {member?.name}
                        </label>
                        <div className="input-group">
                          <span className="input-prefix">$</span>
                          <input
                            className="input"
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={exactAmounts[mId] || ''}
                            onChange={(e) => setExactAmounts((prev) => ({ ...prev, [mId]: e.target.value }))}
                            style={{ paddingLeft: '24px' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading || selectedMembers.length === 0}
              >
                {loading ? <span className="spinner" /> : 'Add Expense'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => { setShowAddForm(false); setError(''); }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Expenses list */}
      {expenses.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon">🧾</span>
            <p className="empty-state-title">No expenses yet</p>
            <p className="empty-state-desc">Add your first expense to start tracking.</p>
            <button className="btn btn-primary" onClick={() => setShowAddForm(true)}>
              + Add Expense
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '14px' }}>
          {expenses.map((expense) => {
            const emoji = getCategoryEmoji(expense.category);
            const isPaidByMe = expense.paid_by_user_id === currentUser?.id;
            const mySplit = expense.expense_splits.find(
              (s) => s.user_id === currentUser?.id
            );
            const myAmount = mySplit ? Number(mySplit.amount_owed) : 0;

            return (
              <div key={expense.id} className="card" style={{ padding: '18px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  {/* Category icon */}
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--primary-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.3rem',
                      flexShrink: 0,
                    }}
                  >
                    {emoji}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex-between" style={{ marginBottom: '4px', flexWrap: 'wrap', gap: '8px' }}>
                      <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>{expense.description}</h3>
                      <span className="amount-lent" style={{ fontSize: '1.1rem' }}>
                        ${Number(expense.total_amount).toFixed(2)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        Paid by{' '}
                        <strong style={{ color: 'var(--text-secondary)' }}>
                          {isPaidByMe ? 'you' : expense.paid_by_user?.name || 'Unknown'}
                        </strong>
                        {' · '}
                        {new Date(expense.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                      {expense.category && (
                        <span className="badge badge-primary">{expense.category}</span>
                      )}
                    </div>

                    {/* Split chips */}
                    {expense.expense_splits.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                        {expense.expense_splits.map((split, i) => (
                          <span key={i} className="chip">
                            {split.user?.name || 'Unknown'}: ${Number(split.amount_owed).toFixed(2)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* You owe / are owed badge */}
                {myAmount > 0 && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)' }}>
                    {isPaidByMe ? (
                      <span className="badge badge-success">
                        You are owed ${(Number(expense.total_amount) - myAmount).toFixed(2)}
                      </span>
                    ) : (
                      <span className="badge badge-danger">
                        You owe ${myAmount.toFixed(2)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Expenses;
