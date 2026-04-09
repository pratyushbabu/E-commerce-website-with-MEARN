import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getSellerDashboard, requestWithdrawal } from '../../services/api';
import { getSocket } from '../../services/socket';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FiPackage, FiShoppingBag, FiDollarSign, FiClock, FiTrendingUp, FiAlertCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';

export default function SellerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [liveEarnings, setLiveEarnings] = useState(null); // tracks real-time updates
  const [livePending, setLivePending] = useState(null);   // tracks pending withdrawal changes live

  const load = () => {
    getSellerDashboard()
      .then(r => { setData(r.data); setLiveEarnings(null); setLivePending(null); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Real-time: new earnings credited on order delivery
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = ({ amount, orderId }) => {
      setLiveEarnings(prev => (prev ?? data?.stats?.totalEarnings ?? 0) + amount);
      toast.success(`₹${amount?.toLocaleString()} added to your earnings!`, { icon: '💰', duration: 5000 });
    };
    socket.on('earnings-updated', handler);
    return () => socket.off('earnings-updated', handler);
  }, [data]);

  // Real-time: withdrawal approved or rejected by admin — auto-reduce balance
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = ({ action, amount }) => {
      if (action === 'approved') {
        // Deduct from live earnings (net balance) and clear from pending
        setLiveEarnings(prev => {
          const base = prev ?? (data?.stats?.balanceAfterApprovedWithdrawals ?? data?.stats?.totalEarnings ?? 0);
          return Math.max(0, base - amount);
        });
        setLivePending(prev => Math.max(0, (prev ?? data?.stats?.pendingWithdrawalAmount ?? 0) - amount));
      } else {
        // Rejected: remove from pending so amount returns to available
        setLivePending(prev => Math.max(0, (prev ?? data?.stats?.pendingWithdrawalAmount ?? 0) - amount));
      }
      // Reload after short delay to sync full state from server
      setTimeout(load, 1500);
    };
    socket.on('withdrawal-processed', handler);
    return () => socket.off('withdrawal-processed', handler);
  }, [data]);

  // Real-time new orders
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = () => { setTimeout(load, 1000); };
    socket.on('new-order', handler);
    return () => socket.off('new-order', handler);
  }, []);

  const handleWithdraw = async () => {
    if (!withdrawAmount || isNaN(withdrawAmount) || Number(withdrawAmount) <= 0) {
      toast.error('Enter a valid amount'); return;
    }
    const available = liveAvailable;
    if (Number(withdrawAmount) > available) {
      toast.error(`Amount exceeds available balance (₹${available.toLocaleString()})`); return;
    }
    try {
      await requestWithdrawal({ amount: Number(withdrawAmount) });
      // Immediately add to pending display so seller sees locked amount
      setLivePending(prev => (prev ?? data?.stats?.pendingWithdrawalAmount ?? 0) + Number(withdrawAmount));
      toast.success('Withdrawal request submitted! Admin will review and process it.');
      setWithdrawAmount('');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
  };

  if (loading) return <div style={{ padding: '40px' }}><div className="spinner" /></div>;
  if (!data) return null;

  const { stats, salesData, recentOrders, withdrawalHistory } = data;

  // Live-adjusted values
  // Use balanceAfterApprovedWithdrawals (User.totalEarnings) as the base —
  // this is already reduced when admin approves, so it reflects actual money left.
  const baseBalance    = stats.balanceAfterApprovedWithdrawals ?? stats.availableEarnings ?? stats.totalEarnings;
  const displayEarnings = liveEarnings ?? baseBalance;
  const displayPending  = livePending  ?? stats.pendingWithdrawalAmount ?? 0;
  const liveAvailable   = Math.max(0, displayEarnings - displayPending);

  const chartData = Object.entries(salesData || {}).map(([month, revenue]) => ({ month, revenue }));

  const cards = [
    {
      label: 'Total Products', value: stats.totalProducts, icon: <FiPackage />, color: '#6C63FF',
      sub: `${stats.approvedProducts} approved · ${stats.pendingProducts} pending`,
    },
    {
      label: 'Total Orders', value: stats.totalOrders, icon: <FiShoppingBag />, color: '#22c55e',
      sub: 'All time orders',
    },
    {
      label: 'Total Earnings', value: `₹${displayEarnings?.toLocaleString()}`, icon: <FiDollarSign />, color: '#f59e0b',
      sub: liveEarnings != null ? '🔴 Updated live' : `Gross: ₹${stats.totalEarnings?.toLocaleString()}`,
      highlight: liveEarnings != null,
    },
    {
      label: 'Units Sold', value: stats.totalSales, icon: <FiTrendingUp />, color: '#ef4444',
      sub: 'Total units across all orders',
    },
  ];

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', marginBottom: '4px' }}>Welcome back, {user?.name} 👋</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          {user?.shopName} · Seller Dashboard
        </p>
      </div>

      {/* Approval banner */}
      {!user?.isApproved && (
        <div style={{ background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 12, padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <FiAlertCircle color="#d97706" size={22} />
          <div>
            <p style={{ fontSize: '14px', color: '#92400e', fontWeight: 600 }}>Account Pending Approval</p>
            <p style={{ fontSize: '13px', color: '#92400e' }}>Your seller account is awaiting admin review. You'll be notified once approved.</p>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="stats-grid" style={{ marginBottom: '32px' }}>
        {cards.map((c, i) => (
          <div key={i} className="card" style={{
            padding: '20px',
            ...(c.highlight ? { border: '2px solid var(--warning)', background: '#fffbeb' } : {}),
            transition: 'all 0.3s',
          }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: c.color + '20', color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '12px' }}>{c.icon}</div>
            <p style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: '2px', color: c.highlight ? '#d97706' : 'var(--text)' }}>{c.value}</p>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>{c.label}</p>
            <p style={{ fontSize: '12px', color: c.highlight ? '#d97706' : 'var(--text-muted)' }}>{c.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px', alignItems: 'start' }}>
        {/* Sales chart */}
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '16px', marginBottom: '20px' }}>📈 Monthly Sales Revenue</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [`₹${v.toLocaleString()}`, 'Revenue']} />
                <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2.5} dot={{ fill: 'var(--primary)', r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state" style={{ padding: '40px 0' }}>
              <p style={{ fontSize: '32px' }}>📊</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No sales data yet. Add products to start selling!</p>
              <Link to="/seller/products/add" className="btn btn-primary btn-sm" style={{ marginTop: '12px' }}>Add Product</Link>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Withdrawal */}
          <div className="card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '15px', marginBottom: '14px' }}>💰 Withdrawal</h3>

            {/* Available balance */}
            <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '12px', marginBottom: displayPending > 0 ? '8px' : '14px' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>Available to Withdraw</p>
              <p style={{ fontSize: '22px', fontWeight: 800, color: 'var(--success)', fontFamily: 'var(--font-display)' }}>
                ₹{liveAvailable.toLocaleString()}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                Total earnings: ₹{displayEarnings?.toLocaleString()}
              </p>
            </div>

            {/* Pending lock notice */}
            {displayPending > 0 && (
              <div style={{
                background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 8,
                padding: '8px 12px', marginBottom: '14px',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <FiClock size={13} color="#d97706" style={{ flexShrink: 0 }} />
                <p style={{ fontSize: '12px', color: '#92400e' }}>
                  <strong>₹{displayPending.toLocaleString()}</strong> pending admin approval
                </p>
              </div>
            )}

            <input
              className="form-input"
              type="number"
              placeholder={`Amount to withdraw (max ₹${liveAvailable.toLocaleString()})`}
              value={withdrawAmount}
              onChange={e => setWithdrawAmount(e.target.value)}
              min="1"
              max={liveAvailable}
              style={{ marginBottom: '10px' }}
            />
            <button
              className="btn btn-primary w-full"
              onClick={handleWithdraw}
              disabled={liveAvailable <= 0}
            >
              Request Withdrawal
            </button>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
              Admin reviews and processes within 2-5 business days. Amount is locked until decision.
            </p>

            {/* Withdrawal history */}
            {withdrawalHistory?.length > 0 && (
              <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '14px' }}>
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Recent Requests
                </p>
                {withdrawalHistory.map(w => (
                  <div key={w._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 600 }}>₹{w.amount?.toLocaleString()}</p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {new Date(w.requestedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <span className={`badge ${w.status === 'approved' ? 'badge-success' : w.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}
                      style={{ fontSize: '11px' }}>
                      {w.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent orders */}
          <div className="card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px' }}>Recent Orders</h3>
              <Link to="/seller/orders" style={{ fontSize: '12px', color: 'var(--primary)' }}>View all</Link>
            </div>
            {recentOrders?.length > 0 ? (
              recentOrders.slice(0, 5).map(o => (
                <div key={o._id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: 600 }}>#{o._id.slice(-6).toUpperCase()}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{o.buyer?.name}</p>
                  </div>
                  <span className={`badge ${o.orderStatus === 'delivered' ? 'badge-success' : o.orderStatus === 'shipped' ? 'badge-primary' : 'badge-warning'}`}>
                    {o.orderStatus}
                  </span>
                </div>
              ))
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>No orders yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
