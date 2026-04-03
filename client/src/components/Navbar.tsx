import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar: React.FC = () => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '?';

  return (
    <nav className="navbar">
      <NavLink to="/dashboard" className="navbar-brand">
        💸 SplitEase
      </NavLink>

      <div className="navbar-links">
        <NavLink
          to="/dashboard"
          className={({ isActive }) => 'navbar-link' + (isActive ? ' active' : '')}
        >
          Dashboard
        </NavLink>
        <NavLink
          to="/groups"
          className={({ isActive }) => 'navbar-link' + (isActive ? ' active' : '')}
        >
          Groups
        </NavLink>
        <NavLink
          to="/expenses"
          className={({ isActive }) => 'navbar-link' + (isActive ? ' active' : '')}
        >
          Expenses
        </NavLink>
        <NavLink
          to="/settlements"
          className={({ isActive }) => 'navbar-link' + (isActive ? ' active' : '')}
        >
          Settle Up
        </NavLink>
      </div>

      <div className="navbar-right">
        <div className="navbar-avatar">
          <div className="avatar avatar-sm">{initials}</div>
          <span className="navbar-username">{currentUser?.name}</span>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
