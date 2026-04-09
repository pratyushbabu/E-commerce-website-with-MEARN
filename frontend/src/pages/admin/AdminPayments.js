import React, { useState, useEffect } from 'react';
import { getAdminPayments, refundPayment } from '../../services/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = { pending: 'badge-warning', completed: 'badge-success', refunded: 'badge-primary', failed: 'badge-danger' };

export default function AdminPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refundModal, setRefundModal] = useState(null);
  const [refundReason, setRefundReason] = useState('');

  useEffect(() => {
    getAdminPayments().then(r => setPayments(r.data.payments)).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleRefund = async () => {
    if (!refundReason) { toast.error('Enter refund reason'); return; }
    try {
      const res = await refundPayment(refundModal._id, { reason: refundReason });
      setPayments(prev => prev.map(p => p._id === refundModal._id ? res.data.payment : p));
      toast.success('Refund processed');
      setRefundModal(null);
      setRefundReason('');
    } catch { toast.error('Refund failed'); }
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '26px', marginBottom: '4px' }}>Payments</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{payments.length} transactions</p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {[
          { label: 'Total Revenue', value: `₹${payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0).toLocaleString()}`, color: 'var(--success)' },
          { label: 'Pending', value: payments.filter(p => p.status === 'pending').length, color: 'var(--warning)' },
          { label: 'Refunded', value: `₹${payments.filter(p => p.status === 'refunded').reduce((s, p) => s + p.amount, 0).toLocaleString()}`, color: 'var(--danger)' },
          { label: 'Transactions', value: payments.length, color: 'var(--primary)' },
        ].map((s, i) => (
          <div key={i} className="card" style={{ padding: '16px' }}>
            <p style={{ fontSize: '22px', fontWeight: 800, color: s.color, fontFamily: 'var(--font-display)' }}>{s.value}</p>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{s.label}</p>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="table-wrapper">
          <table>
            <thead><tr><th>Transaction</th><th>Buyer</th><th>Order</th><th>Amount</th><th>Method</th><th>Status</th><th>Date</th><th>Action</th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}><div className="spinner" style={{ margin: '0 auto' }} /></td></tr>
               : payments.map(p => (
                <tr key={p._id}>
                  <td style={{ fontWeight: 700, fontSize: '13px' }}>#{p._id.slice(-6).toUpperCase()}</td>
                  <td style={{ fontSize: '13px' }}>{p.buyer?.name}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>#{p.order?._id?.slice(-6).toUpperCase()}</td>
                  <td style={{ fontWeight: 700, fontSize: '14px' }}>₹{p.amount?.toLocaleString()}</td>
                  <td><span className="badge badge-secondary">{p.method}</span></td>
                  <td><span className={`badge ${STATUS_COLORS[p.status] || 'badge-secondary'}`}>{p.status}</span></td>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                  <td>
                    {p.status !== 'refunded' && (
                      <button className="btn btn-outline btn-sm" onClick={() => setRefundModal(p)}>Refund</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {refundModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setRefundModal(null)}>
          <div className="modal">
            <h3 style={{ marginBottom: '16px' }}>Process Refund</h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Refund ₹{refundModal.amount?.toLocaleString()} to {refundModal.buyer?.name}
            </p>
            <div className="form-group">
              <label className="form-label">Reason for Refund</label>
              <textarea className="form-input" rows={3} value={refundReason} onChange={e => setRefundReason(e.target.value)} placeholder="Enter reason..." />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setRefundModal(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleRefund}>Process Refund</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
