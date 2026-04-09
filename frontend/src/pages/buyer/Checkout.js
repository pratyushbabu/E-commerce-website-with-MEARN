import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { placeOrder } from '../../services/api';
import toast from 'react-hot-toast';
import { FiMapPin, FiTruck, FiShield } from 'react-icons/fi';

const getEffectivePrice = (item) => {
  if (item.effectivePrice != null && item.effectivePrice > 0) return item.effectivePrice;
  const p = item.product;
  if (p && p.discountPrice && p.discountPrice > 0 && p.discountPrice < p.price) return p.discountPrice;
  return item.price || p?.price || 0;
};

export default function Checkout() {
  const { cart, cartTotal, fetchCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    street: user?.addresses?.[0]?.street || '',
    city: user?.addresses?.[0]?.city || '',
    state: user?.addresses?.[0]?.state || '',
    zip: user?.addresses?.[0]?.zip || '',
    country: 'India',
    phone: user?.phone || '',
    note: '',
  });
  const [loading, setLoading] = useState(false);
  const items = cart?.items || [];

  const totalOriginal = items.reduce((s, i) => s + (i.price || i.product?.price || 0) * i.quantity, 0);
  const totalSavings = totalOriginal - cartTotal;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (items.length === 0) { toast.error('Cart is empty'); return; }
    setLoading(true);
    try {
      const res = await placeOrder({ shippingAddress: form, note: form.note });
      toast.success('Order placed successfully!');
      await fetchCart();
      navigate(`/orders/${res.data.order._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally { setLoading(false); }
  };

  // Select saved address
  const selectAddress = (addr) => {
    setForm(f => ({ ...f, street: addr.street, city: addr.city, state: addr.state, zip: addr.zip }));
  };

  return (
    <div className="container" style={{ padding: '32px 24px 60px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '28px' }}>Checkout</h1>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '32px', alignItems: 'start' }}>
        <form onSubmit={handleSubmit}>
          {/* Saved addresses */}
          {user?.addresses?.length > 0 && (
            <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '15px', marginBottom: '12px' }}>📍 Saved Addresses</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {user.addresses.map(addr => (
                  <button type="button" key={addr._id}
                    onClick={() => selectAddress(addr)}
                    style={{ textAlign: 'left', padding: '10px 14px', border: '1.5px solid var(--border)', borderRadius: 8, background: 'none', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)', transition: 'all 0.15s' }}
                    onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--text)'; }}
                    onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}>
                    <strong>{addr.label}</strong> — {addr.street}, {addr.city}, {addr.state} {addr.zip}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="card" style={{ padding: '24px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiMapPin color="var(--primary)" /> Shipping Address
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Street Address</label>
                <input className="form-input" value={form.street} onChange={e => setForm({ ...form, street: e.target.value })} placeholder="123 Main St, Apt 4B" required />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Mumbai" required />
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <input className="form-input" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} placeholder="Maharashtra" required />
              </div>
              <div className="form-group">
                <label className="form-label">PIN Code</label>
                <input className="form-input" value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} placeholder="400001" required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+91 9876543210" required />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Order Note (optional)</label>
                <textarea className="form-input" rows={2} value={form.note} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Special delivery instructions..." />
              </div>
            </div>
          </div>

          <div className="card" style={{ padding: '20px', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiShield color="var(--primary)" /> Payment Method
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px', background: 'var(--primary-light)', borderRadius: 10, border: '2px solid var(--primary)' }}>
              <input type="radio" checked readOnly style={{ accentColor: 'var(--primary)' }} />
              <div>
                <p style={{ fontWeight: 600, fontSize: '15px' }}>💵 Cash on Delivery</p>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Pay when your order arrives at your door</p>
              </div>
            </div>
          </div>

          <button className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Placing Order...' : `Place Order — ₹${cartTotal.toLocaleString()}`}
          </button>
        </form>

        {/* Order Summary */}
        <div className="card" style={{ padding: '24px', position: 'sticky', top: '90px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '16px' }}>Order Items ({items.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', maxHeight: '300px', overflowY: 'auto' }}>
            {items.map(item => {
              const p = item.product; if (!p) return null;
              const ep = getEffectivePrice(item);
              const hasDiscount = ep < (item.price || p.price || 0);
              const uomLabel = p.uom ? `${p.quantity || 1} ${p.uom}` : null;
              return (
                <div key={item._id} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {p.images?.[0]?.url
                    ? <img src={p.images[0].url} style={{ width: 52, height: 52, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} alt="" />
                    : <div style={{ width: 52, height: 52, borderRadius: 8, background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>📦</div>
                  }
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                    {uomLabel && <p style={{ fontSize: '11px', color: 'var(--primary)', marginTop: '1px' }}>{uomLabel}</p>}
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Qty: {item.quantity}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>₹{(ep * item.quantity).toLocaleString()}</p>
                    {hasDiscount && (
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', textDecoration: 'line-through' }}>₹{((item.price || p.price) * item.quantity).toLocaleString()}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {totalSavings > 0 && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <span>Subtotal (original)</span>
                  <span style={{ textDecoration: 'line-through' }}>₹{totalOriginal.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--success)', fontWeight: 600 }}>
                  <span>🎉 Discount Savings</span>
                  <span>- ₹{totalSavings.toLocaleString()}</span>
                </div>
              </>
            )}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--success)' }}>
              <span>Delivery</span><span>FREE</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '20px', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
              <span>Total</span>
              <span style={{ color: 'var(--primary)' }}>₹{cartTotal.toLocaleString()}</span>
            </div>
          </div>

          <div style={{ marginTop: '16px', padding: '12px', background: 'var(--bg)', borderRadius: 8, display: 'flex', gap: '8px', alignItems: 'center' }}>
            <FiTruck size={16} color="var(--success)" />
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Free delivery on all orders. Estimated 3-7 business days.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
