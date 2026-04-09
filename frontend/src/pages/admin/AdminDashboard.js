import React, { useState, useEffect } from 'react';
import { getAdminDashboard } from '../../services/api';
import { getSocket } from '../../services/socket';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { FiUsers, FiPackage, FiShoppingBag, FiDollarSign, FiClock, FiCheck } from 'react-icons/fi';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveActivity, setLiveActivity] = useState([]);

  useEffect(() => {
    getAdminDashboard().then(r => setData(r.data)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('join-admin');
    const handlers = {
      'new-user': (d) => setLiveActivity(prev => [{ type: 'user', ...d, time: new Date() }, ...prev].slice(0, 10)),
      'new-order': (d) => setLiveActivity(prev => [{ type: 'order', ...d, time: new Date() }, ...prev].slice(0, 10)),
      'new-product-pending': (d) => setLiveActivity(prev => [{ type: 'product', ...d, time: new Date() }, ...prev].slice(0, 10)),
      'withdrawal-request': (d) => setLiveActivity(prev => [{ type: 'withdrawal', ...d, time: new Date() }, ...prev].slice(0, 10)),
    };
    Object.entries(handlers).forEach(([e, h]) => socket.on(e, h));
    return () => Object.keys(handlers).forEach(e => socket.off(e));
  }, []);

  if (loading) return <div style={{ padding: '40px' }}><div className="spinner" /></div>;
  if (!data) return null;

  const { stats, monthlyRevenue, recentOrders, recentUsers } = data;

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, icon: <FiUsers />, color: '#6C63FF', sub: `${stats.totalSellers} sellers · ${stats.totalBuyers} buyers` },
    { label: 'Products', value: stats.totalProducts, icon: <FiPackage />, color: '#22c55e', sub: `${stats.pendingProducts} pending approval` },
    { label: 'Total Orders', value: stats.totalOrders, icon: <FiShoppingBag />, color: '#f59e0b', sub: 'All time' },
    { label: 'Revenue', value: `₹${stats.totalRevenue?.toLocaleString()}`, icon: <FiDollarSign />, color: '#ef4444', sub: 'Total revenue' },
  ];

  const alertCards = [
    { label: 'Pending Sellers', value: stats.pendingSellers, icon: <FiClock />, color: '#f59e0b', link: '/admin/users?role=seller' },
    { label: 'Pending Products', value: stats.pendingProducts, icon: <FiCheck />, color: '#6C63FF', link: '/admin/products?isApproved=false' },
    { label: 'Pending Withdrawals', value: stats.pendingWithdrawals || 0, icon: <FiDollarSign />, color: '#ef4444', link: '/admin/withdrawals' },
  ];

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', marginBottom: '4px' }}>Admin Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Real-time platform overview</p>
      </div>

      {/* Alert cards */}
      {(stats.pendingSellers > 0 || stats.pendingProducts > 0 || (stats.pendingWithdrawals || 0) > 0) && (
        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {alertCards.filter(a => a.value > 0).map((a, i) => (
            <div key={i} style={{ background: a.color + '15', border: `1.5px solid ${a.color}40`, borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
              <span style={{ color: a.color, fontSize: '20px' }}>{a.icon}</span>
              <div>
                <p style={{ fontWeight: 700, fontSize: '22px', color: a.color }}>{a.value}</p>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{a.label} awaiting action</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="stats-grid" style={{ marginBottom: '32px' }}>
        {statCards.map((c, i) => (
          <div key={i} className="card" style={{ padding: '20px' }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: c.color + '20', color: c.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', marginBottom: '12px' }}>{c.icon}</div>
            <p style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-display)', marginBottom: '2px' }}>{c.value}</p>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>{c.label}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{c.sub}</p>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '20px' }}>Monthly Revenue</h3>
          {monthlyRevenue?.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="_id.month" tick={{ fontSize: 11 }} tickFormatter={m => ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m-1]} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => [`₹${v.toLocaleString()}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="var(--primary)" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <div className="empty-state" style={{ padding: '40px 0' }}><p>No data</p></div>}
        </div>

        <div className="card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '16px' }}>⚡ Live Activity</h3>
          {liveActivity.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '14px' }}>
              <p style={{ fontSize: '32px', marginBottom: '8px' }}>📡</p>
              Waiting for activity...
            </div>
          ) : liveActivity.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '20px' }}>{a.type === 'order' ? '🛒' : a.type === 'user' ? '👤' : a.type === 'withdrawal' ? '💰' : '📦'}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: '13px', fontWeight: 500 }}>
                  {a.type === 'order' && `New order placed`}
                  {a.type === 'user' && `New ${a.role} registered: ${a.name}`}
                  {a.type === 'product' && `Product pending: ${a.product?.name}`}
                  {a.type === 'withdrawal' && `Withdrawal request from ${a.sellerName}: ₹${a.amount}`}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{new Date(a.time).toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '16px' }}>Recent Orders</h3>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Order</th><th>Buyer</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>
                {recentOrders?.map(o => (
                  <tr key={o._id}>
                    <td style={{ fontWeight: 600, fontSize: '13px' }}>#{o._id.slice(-6).toUpperCase()}</td>
                    <td style={{ fontSize: '13px' }}>{o.buyer?.name}</td>
                    <td style={{ fontWeight: 600, fontSize: '13px' }}>₹{o.totalAmount?.toLocaleString()}</td>
                    <td><span className={`badge ${o.orderStatus === 'delivered' ? 'badge-success' : 'badge-warning'}`}>{o.orderStatus}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '16px' }}>Recent Users</h3>
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Name</th><th>Role</th><th>Joined</th></tr></thead>
              <tbody>
                {recentUsers?.map(u => (
                  <tr key={u._id}>
                    <td style={{ fontSize: '13px', fontWeight: 500 }}>{u.name}</td>
                    <td><span className={`badge ${u.role === 'seller' ? 'badge-primary' : 'badge-secondary'}`}>{u.role}</span></td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(u.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
