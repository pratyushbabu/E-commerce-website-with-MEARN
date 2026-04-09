import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { updateProfile, changePassword, addAddress, deleteAddress } from '../../services/api';
import toast from 'react-hot-toast';
import { FiUser, FiLock, FiMapPin, FiPlus, FiTrash2 } from 'react-icons/fi';

export default function Profile() {
  const { user, updateUser, loadUser } = useAuth();
  const [tab, setTab] = useState('profile');
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '' });
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [addrForm, setAddrForm] = useState({ label: 'Home', street: '', city: '', state: '', zip: '', country: 'India', isDefault: false });
  const [loading, setLoading] = useState(false);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await updateProfile(profileForm);
      updateUser(res.data.user);
      toast.success('Profile updated');
    } catch { toast.error('Update failed'); }
    setLoading(false);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      await changePassword({ currentPassword: passForm.currentPassword, newPassword: passForm.newPassword });
      toast.success('Password changed');
      setPassForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    setLoading(false);
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await addAddress(addrForm);
      await loadUser();
      setAddrForm({ label: 'Home', street: '', city: '', state: '', zip: '', country: 'India', isDefault: false });
      toast.success('Address added');
    } catch { toast.error('Failed to add address'); }
    setLoading(false);
  };

  const handleDeleteAddress = async (id) => {
    try { await deleteAddress(id); await loadUser(); toast.success('Address removed'); }
    catch { toast.error('Failed'); }
  };

  const tabs = [{ id: 'profile', label: 'Profile', icon: <FiUser /> }, { id: 'password', label: 'Password', icon: <FiLock /> }, { id: 'addresses', label: 'Addresses', icon: <FiMapPin /> }];

  return (
    <div className="container" style={{ padding: '32px 24px 60px', maxWidth: '700px' }}>
      <h1 style={{ fontSize: '28px', marginBottom: '24px' }}>My Profile</h1>
      <div style={{ display: 'flex', gap: '4px', marginBottom: '28px', borderBottom: '2px solid var(--border)' }}>
        {tabs.map(t => (
          <button key={t.id} className={`pd-tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === 'profile' && (
        <form className="card" style={{ padding: '28px' }} onSubmit={handleProfileSave}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--primary-light)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 700 }}>{user?.name?.[0]?.toUpperCase()}</div>
            <div>
              <p style={{ fontWeight: 700, fontSize: '18px' }}>{user?.name}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{user?.email}</p>
              <span className="badge badge-primary" style={{ marginTop: '4px' }}>{user?.role}</span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input className="form-input" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input className="form-input" value={profileForm.phone} onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} placeholder="+91 9876543210" />
          </div>
          <button className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Changes'}</button>
        </form>
      )}

      {tab === 'password' && (
        <form className="card" style={{ padding: '28px' }} onSubmit={handlePasswordChange}>
          <div className="form-group">
            <label className="form-label">Current Password</label>
            <input className="form-input" type="password" value={passForm.currentPassword} onChange={e => setPassForm({ ...passForm, currentPassword: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input className="form-input" type="password" value={passForm.newPassword} onChange={e => setPassForm({ ...passForm, newPassword: e.target.value })} placeholder="Min 6 characters" required />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input className="form-input" type="password" value={passForm.confirm} onChange={e => setPassForm({ ...passForm, confirm: e.target.value })} required />
          </div>
          <button className="btn btn-primary" disabled={loading}>{loading ? 'Updating...' : 'Change Password'}</button>
        </form>
      )}

      {tab === 'addresses' && (
        <div>
          {user?.addresses?.map(addr => (
            <div key={addr._id} className="card" style={{ padding: '16px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span className="badge badge-primary">{addr.label}</span>
                  {addr.isDefault && <span className="badge badge-success">Default</span>}
                </div>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {addr.street}, {addr.city}, {addr.state} - {addr.zip}
                </p>
              </div>
              <button onClick={() => handleDeleteAddress(addr._id)} style={{ color: 'var(--danger)', background: 'none', border: 'none', cursor: 'pointer' }}><FiTrash2 size={16} /></button>
            </div>
          ))}
          <form className="card" style={{ padding: '24px', marginTop: '16px' }} onSubmit={handleAddAddress}>
            <h3 style={{ fontSize: '16px', marginBottom: '16px' }}><FiPlus style={{ verticalAlign: 'middle' }} /> Add New Address</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label">Label</label>
                <select className="form-input" value={addrForm.label} onChange={e => setAddrForm({ ...addrForm, label: e.target.value })}>
                  <option>Home</option><option>Work</option><option>Other</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Street</label>
                <input className="form-input" value={addrForm.street} onChange={e => setAddrForm({ ...addrForm, street: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">City</label>
                <input className="form-input" value={addrForm.city} onChange={e => setAddrForm({ ...addrForm, city: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">State</label>
                <input className="form-input" value={addrForm.state} onChange={e => setAddrForm({ ...addrForm, state: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="form-label">PIN Code</label>
                <input className="form-input" value={addrForm.zip} onChange={e => setAddrForm({ ...addrForm, zip: e.target.value })} required />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '14px', cursor: 'pointer' }}>
              <input type="checkbox" checked={addrForm.isDefault} onChange={e => setAddrForm({ ...addrForm, isDefault: e.target.checked })} />
              Set as default address
            </label>
            <button className="btn btn-primary btn-sm" disabled={loading}>{loading ? 'Saving...' : 'Add Address'}</button>
          </form>
        </div>
      )}
    </div>
  );
}
