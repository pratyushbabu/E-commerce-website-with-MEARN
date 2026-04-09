import React, { useState, useEffect } from 'react';
import { getWithdrawalRequests, processWithdrawal } from '../../services/api';
import { getSocket } from '../../services/socket';
import toast from 'react-hot-toast';
import { FiCheck, FiX, FiClock, FiDollarSign, FiRefreshCw } from 'react-icons/fi';

const STATUS_COLORS = {
  pending: 'badge-warning',
  approved: 'badge-success',
  rejected: 'badge-danger',
};

const STATUS_ICONS = {
  pending: <FiClock size={13} />,
  approved: <FiCheck size={13} />,
  rejected: <FiX size={13} />,
};

export default function AdminWithdrawals() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null); // id being processed
  const [filterStatus, setFilterStatus] = useState('all');

  const load = () => {
    setLoading(true);
    getWithdrawalRequests()
      .then(r => setRequests(r.data.requests))
      .catch(() => toast.error('Failed to load withdrawal requests'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  // Real-time: new withdrawal request from seller
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = ({ sellerId, sellerName, amount }) => {
      toast.success(`New withdrawal request from ${sellerName}: ₹${amount?.toLocaleString()}`, { icon: '💰', duration: 5000 });
      // Reload to get fresh data
      load();
    };
    socket.on('withdrawal-request', handler);
    return () => socket.off('withdrawal-request', handler);
  }, []);

  const handleProcess = async (sellerId, requestId, action) => {
    const key = `${sellerId}-${requestId}`;
    setProcessing(key);
    try {
      await processWithdrawal(sellerId, requestId, { action });
      setRequests(prev =>
        prev.map(r =>
          r._id.toString() === requestId.toString() && r.sellerId.toString() === sellerId.toString()
            ? { ...r, status: action }
            : r
        )
      );
      toast.success(`Withdrawal ${action === 'approved' ? 'approved ✅' : 'rejected ❌'}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setProcessing(null);
    }
  };

  const filtered = filterStatus === 'all'
    ? requests
    : requests.filter(r => r.status === filterStatus);

  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    totalPending: requests.filter(r => r.status === 'pending').reduce((s, r) => s + r.amount, 0),
    totalApproved: requests.filter(r => r.status === 'approved').reduce((s, r) => s + r.amount, 0),
  };

  return (
    <div style={{ padding: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '26px', marginBottom: '4px' }}>Withdrawal Requests</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Review and process seller withdrawal requests
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={load}>
          <FiRefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Pending Requests', value: stats.pending, color: 'var(--warning)', sub: `₹${stats.totalPending.toLocaleString()} awaiting` },
          { label: 'Approved', value: stats.approved, color: 'var(--success)', sub: `₹${stats.totalApproved.toLocaleString()} paid out` },
          { label: 'Rejected', value: stats.rejected, color: 'var(--danger)', sub: 'declined requests' },
          { label: 'Total Requests', value: requests.length, color: 'var(--primary)', sub: 'all time' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '16px 20px' }}>
            <p style={{ fontSize: '26px', fontWeight: 800, fontFamily: 'var(--font-display)', color: s.color, marginBottom: '2px' }}>{s.value}</p>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '2px' }}>{s.label}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['all', 'pending', 'approved', 'rejected'].map(s => (
          <button
            key={s}
            className={`btn btn-sm ${filterStatus === s ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => setFilterStatus(s)}
          >
            {s === 'all' ? `All (${requests.length})` : `${s.charAt(0).toUpperCase() + s.slice(1)} (${requests.filter(r => r.status === s).length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Seller</th>
                <th>Shop</th>
                <th>Requested Amount</th>
                <th>Total Earnings</th>
                <th>Requested On</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '48px' }}>
                    <div className="spinner" style={{ margin: '0 auto' }} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                      <p style={{ fontSize: '32px', marginBottom: '8px' }}>💸</p>
                      <p style={{ fontSize: '14px' }}>
                        {filterStatus === 'pending' ? 'No pending withdrawal requests' : 'No withdrawal requests found'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map(req => {
                  const key = `${req.sellerId}-${req._id}`;
                  const isProcessing = processing === key;
                  return (
                    <tr key={key}>
                      <td>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '14px' }}>{req.sellerName}</p>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{req.sellerEmail}</p>
                        </div>
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        {req.shopName || '—'}
                      </td>
                      <td>
                        <span style={{ fontWeight: 800, fontSize: '15px', color: 'var(--primary)', fontFamily: 'var(--font-display)' }}>
                          ₹{req.amount?.toLocaleString()}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <FiDollarSign size={13} color="var(--success)" />
                          <span style={{ fontSize: '13px', color: 'var(--success)', fontWeight: 600 }}>
                            ₹{req.totalEarnings?.toLocaleString()}
                          </span>
                        </div>
                        {req.amount > req.totalEarnings && (
                          <p style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '2px' }}>
                            ⚠ Exceeds earnings
                          </p>
                        )}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {new Date(req.requestedAt).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                        <br />
                        <span style={{ fontSize: '11px' }}>
                          {new Date(req.requestedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${STATUS_COLORS[req.status] || 'badge-secondary'}`}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {STATUS_ICONS[req.status]}
                          {req.status}
                        </span>
                      </td>
                      <td>
                        {req.status === 'pending' ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="btn btn-success btn-sm"
                              disabled={isProcessing || req.amount > req.totalEarnings}
                              onClick={() => handleProcess(req.sellerId, req._id, 'approved')}
                              title={req.amount > req.totalEarnings ? 'Amount exceeds seller earnings' : 'Approve withdrawal'}
                            >
                              {isProcessing ? '...' : <><FiCheck size={13} /> Approve</>}
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              disabled={isProcessing}
                              onClick={() => handleProcess(req.sellerId, req._id, 'rejected')}
                            >
                              {isProcessing ? '...' : <><FiX size={13} /> Reject</>}
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            {req.status === 'approved' ? '✅ Processed' : '❌ Declined'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pending alert banner */}
        {stats.pending > 0 && (
          <div style={{
            margin: '16px',
            padding: '14px 18px',
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}>
            <FiClock color="#d97706" size={18} />
            <p style={{ fontSize: '13px', color: '#92400e', fontWeight: 500 }}>
              <strong>{stats.pending} pending request{stats.pending > 1 ? 's' : ''}</strong> awaiting your review —
              total ₹{stats.totalPending.toLocaleString()} to be paid out.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
