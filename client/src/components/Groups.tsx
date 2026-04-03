import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

interface Group {
  id: string;
  name: string;
  creator?: { id: string; name: string };
  group_members: Array<{ user_id: string; user?: { name: string } }>;
}

const GROUP_COLORS = ['color-1', 'color-2', 'color-3', 'color-4', 'color-5', 'color-6', 'color-7', 'color-8'];

const getGroupColor = (name: string): string => {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return GROUP_COLORS[Math.abs(hash) % GROUP_COLORS.length];
};

const Groups: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [inviteEmails, setInviteEmails] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    setFetching(true);
    try {
      const response = await axios.get('/api/groups');
      setGroups(response.data);
    } catch {
      // silent
    } finally {
      setFetching(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await axios.post('/api/groups', {
        name: groupName.trim(),
        inviteEmails: inviteEmails
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      });
      setGroupName('');
      setInviteEmails('');
      setShowCreateForm(false);
      fetchGroups();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create group.');
    } finally {
      setLoading(false);
    }
  };

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
      <div className="flex-between" style={{ marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 4px', letterSpacing: '-0.03em' }}>
            Groups
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: 0, fontSize: '0.9rem' }}>
            {groups.length} {groups.length === 1 ? 'group' : 'groups'}
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { setShowCreateForm((v) => !v); setError(''); }}
        >
          {showCreateForm ? '✕ Cancel' : '+ New Group'}
        </button>
      </div>

      {/* Create group form — smooth collapse */}
      <div
        style={{
          overflow: 'hidden',
          maxHeight: showCreateForm ? '600px' : '0',
          transition: 'max-height 0.3s ease',
          marginBottom: showCreateForm ? '24px' : '0',
        }}
      >
        <div className="card" style={{ background: 'var(--primary-light)', border: '1.5px solid var(--primary)' }}>
          <h3 style={{ margin: '0 0 20px', fontWeight: 700, color: 'var(--primary-dark)' }}>Create a New Group</h3>
          {error && <div className="alert alert-error">{error}</div>}
          <form onSubmit={handleCreateGroup}>
            <div className="form-group">
              <label className="input-label">Group Name</label>
              <input
                className="input"
                type="text"
                placeholder="e.g. Goa Trip 2025, Flat Mates"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                autoFocus={showCreateForm}
                required
              />
            </div>
            <div className="form-group">
              <label className="input-label">
                Invite Members{' '}
                <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(comma-separated emails, optional)</span>
              </label>
              <input
                className="input"
                type="text"
                placeholder="alice@example.com, bob@example.com"
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? <span className="spinner" /> : 'Create Group'}
              </button>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => { setShowCreateForm(false); setError(''); }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Group list */}
      {groups.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="empty-state-icon">👥</span>
            <p className="empty-state-title">No groups yet</p>
            <p className="empty-state-desc">Create your first group to start splitting expenses.</p>
            <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
              + Create Group
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {groups.map((group) => {
            const colorClass = getGroupColor(group.name);
            const memberCount = group.group_members?.length || 0;
            const initial = group.name.charAt(0).toUpperCase();

            return (
              <div
                key={group.id}
                className="card"
                style={{ display: 'flex', alignItems: 'center', gap: '18px', padding: '20px 24px' }}
              >
                {/* Group avatar */}
                <div
                  className={`avatar avatar-lg ${colorClass}`}
                  style={{ borderRadius: 'var(--radius-sm)', flexShrink: 0 }}
                >
                  {initial}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3
                    style={{
                      margin: '0 0 4px',
                      fontWeight: 700,
                      fontSize: '1.05rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {group.name}
                  </h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Member avatar stack */}
                    <div className="avatar-stack">
                      {(group.group_members || []).slice(0, 4).map((m, i) => (
                        <div
                          key={i}
                          className="avatar avatar-sm"
                          style={{ background: GROUP_COLORS[i % GROUP_COLORS.length] }}
                          title={m.user?.name || ''}
                        >
                          {(m.user?.name || '?').charAt(0).toUpperCase()}
                        </div>
                      ))}
                      {memberCount > 4 && (
                        <div className="avatar avatar-sm" style={{ background: 'var(--text-muted)' }}>
                          +{memberCount - 4}
                        </div>
                      )}
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {memberCount} {memberCount === 1 ? 'member' : 'members'}
                    </span>
                    {group.creator && (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        · Created by {group.creator.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '10px', flexShrink: 0 }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate(`/expenses?groupId=${group.id}&groupName=${encodeURIComponent(group.name)}`)}
                  >
                    View Expenses
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Groups;
