import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getOrder } from '../../services/api';
import { getSocket } from '../../services/socket';
import { FiArrowLeft, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';

const STEPS = ['pending', 'processing', 'shipped', 'delivered'];
const STEP_LABELS = { pending: 'Order Placed', processing: 'Packed', shipped: 'Shipped', delivered: 'Delivered' };
const STEP_ICONS = { pending: '📋', processing: '📦', shipped: '🚚', delivered: '✅' };

const STATUS_COLORS = {
  pending: 'badge-warning', processing: 'badge-primary',
  shipped: 'badge-primary', delivered: 'badge-success', cancelled: 'badge-danger',
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liveStatus, setLiveStatus] = useState(null);

  const loadOrder = async () => {
    try {
      const r = await getOrder(id);
      setOrder(r.data.order);
      setLiveStatus(r.data.order.orderStatus);
    } catch { navigate('/orders'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadOrder(); }, [id]);

  // Real-time order status sync
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('track-order', id);

    const handler = ({ orderId, orderStatus, status }) => {
      // Accept both orderId formats
      if (orderId === id || orderId === order?._id?.toString()) {
        const finalStatus = orderStatus || status;
        setLiveStatus(finalStatus);
        setOrder(prev => {
          if (!prev) return prev;
          // Also sync sub-order statuses when delivered
          const updated = { ...prev, orderStatus: finalStatus };
          if (finalStatus === 'delivered') {
            updated.paymentStatus = 'paid';
            updated.deliveredAt = new Date().toISOString();
            updated.subOrders = prev.subOrders?.map(sub => ({
              ...sub,
              status: 'delivered',
            }));
          }
          return updated;
        });
      }
    };

    socket.on('order-status-update', handler);
    return () => {
      socket.emit('leave-order', id);
      socket.off('order-status-update', handler);
    };
  }, [id, order?._id]);

  if (loading) return <div className="spinner" style={{ marginTop: '80px' }} />;
  if (!order) return null;

  // Use live status if available, else from order
  const currentStatus = liveStatus || order.orderStatus;
  const currentStep = STEPS.indexOf(currentStatus);

  return (
    <div className="container" style={{ padding: '32px 24px 60px', maxWidth: '820px' }}>
      <button className="btn btn-outline btn-sm" style={{ marginBottom: '24px' }} onClick={() => navigate('/orders')}>
        <FiArrowLeft size={14} /> Back to Orders
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', marginBottom: '4px' }}>Order #{order._id.slice(-8).toUpperCase()}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
            Placed on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--primary)' }}>₹{order.totalAmount?.toLocaleString()}</div>
          <span className={`badge ${STATUS_COLORS[currentStatus] || 'badge-secondary'}`} style={{ marginTop: '4px' }}>
            {currentStatus}
          </span>
        </div>
      </div>

      {/* Live Tracking */}
      <div className="card" style={{ padding: '28px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px' }}>📍 Live Order Tracking</h3>
          <button onClick={loadOrder} className="btn btn-outline btn-sm" style={{ padding: '5px 10px' }}>
            <FiRefreshCw size={13} /> Refresh
          </button>
        </div>
        <div className="status-steps">
          {STEPS.map((step, i) => (
            <div key={step} className={`status-step ${i < currentStep ? 'done' : ''} ${i === currentStep ? 'active' : ''}`}>
              <div className="step-circle">{STEP_ICONS[step]}</div>
              <div className="step-label">{STEP_LABELS[step]}</div>
            </div>
          ))}
        </div>
        {currentStatus === 'delivered' && (
          <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--success)', fontWeight: 600, background: '#dcfce7', padding: '12px 16px', borderRadius: 10 }}>
            <FiCheckCircle size={18} />
            Order delivered{order.deliveredAt ? ` on ${new Date(order.deliveredAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
          </div>
        )}
        {currentStatus === 'cancelled' && (
          <div style={{ marginTop: '16px', background: '#fee2e2', padding: '12px 16px', borderRadius: 10, color: 'var(--danger)', fontWeight: 600 }}>
            ❌ This order has been cancelled
          </div>
        )}
      </div>

      {/* Sub-orders by seller */}
      {order.subOrders?.map((sub, si) => {
        // Show correct sub-order status: if overall is delivered, show delivered
        const subStatus = currentStatus === 'delivered' ? 'delivered' : sub.status;
        return (
          <div key={si} className="card" style={{ padding: '20px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <p style={{ fontWeight: 600, fontSize: '15px' }}>🏪 {sub.seller?.shopName || sub.seller?.name}</p>
                {sub.seller?.phone && <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>📞 {sub.seller.phone}</p>}
              </div>
              <span className={`badge ${STATUS_COLORS[subStatus] || 'badge-secondary'}`}>{subStatus}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sub.items?.map((item, ii) => (
                <div key={ii} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  {item.image
                    ? <img src={item.image} alt={item.name} style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover' }} />
                    : <div style={{ width: 56, height: 56, background: 'var(--bg)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>📦</div>
                  }
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 500, fontSize: '14px' }}>{item.name}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      Qty: {item.quantity}
                      {item.uom && ` × ${item.unitQuantity || 1} ${item.uom}`}
                      {' '}@ ₹{item.price?.toLocaleString()}
                      {item.originalPrice && item.originalPrice > item.price && (
                        <span style={{ textDecoration: 'line-through', marginLeft: '6px', color: 'var(--text-muted)' }}>₹{item.originalPrice?.toLocaleString()}</span>
                      )}
                    </p>
                  </div>
                  <p style={{ fontWeight: 600, color: 'var(--text)' }}>₹{(item.price * item.quantity).toLocaleString()}</p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Seller subtotal</span>
              <span style={{ fontWeight: 700 }}>₹{sub.subtotal?.toLocaleString()}</span>
            </div>
          </div>
        );
      })}

      {/* Shipping & Payment */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '12px' }}>📍 Shipping Address</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.7 }}>
            {order.shippingAddress?.street}<br />
            {order.shippingAddress?.city}, {order.shippingAddress?.state} - {order.shippingAddress?.zip}<br />
            {order.shippingAddress?.country}<br />
            📞 {order.shippingAddress?.phone}
          </p>
        </div>
        <div className="card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '15px', marginBottom: '12px' }}>💳 Payment</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Method</span>
            <span style={{ fontWeight: 600 }}>{order.paymentMethod}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Status</span>
            <span className={`badge ${order.paymentStatus === 'paid' ? 'badge-success' : 'badge-warning'}`}>{order.paymentStatus}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', fontWeight: 700, paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
            <span>Total Paid</span>
            <span style={{ color: 'var(--primary)' }}>₹{order.totalAmount?.toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
