import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getProducts, deleteProduct } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function SellerProducts() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    getProducts({ seller: user._id, limit: 100 })
      .then(r => setProducts(r.data.products || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(load, [user._id]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await deleteProduct(id);
      setProducts(prev => prev.filter(p => p._id !== id));
      toast.success('Product deleted');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to delete'); }
  };

  return (
    <div style={{ padding: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontSize: '26px', marginBottom: '4px' }}>My Products</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{products.length} products listed</p>
        </div>
        <Link to="/seller/products/add" className="btn btn-primary"><FiPlus /> Add Product</Link>
      </div>

      {loading ? <div className="spinner" /> : products.length === 0 ? (
        <div className="empty-state card" style={{ padding: '60px' }}>
          <p style={{ fontSize: '48px' }}>📦</p>
          <h3>No products yet</h3>
          <p>Start by adding your first product</p>
          <Link to="/seller/products/add" className="btn btn-primary" style={{ marginTop: '16px' }}><FiPlus /> Add Product</Link>
        </div>
      ) : (
        <div className="card">
          <div className="table-wrapper">
            <table>
              <thead><tr><th>Product</th><th>Category</th><th>Price</th><th>Stock</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {p.images?.[0]?.url
                          ? <img src={p.images[0].url} alt="" style={{ width: 44, height: 44, borderRadius: 8, objectFit: 'cover' }} />
                          : <div style={{ width: 44, height: 44, background: 'var(--bg)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📦</div>
                        }
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '14px' }}>{p.name}</p>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{p.brand}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-secondary">{p.category}</span></td>
                    <td style={{ fontWeight: 600 }}>₹{p.price?.toLocaleString()}</td>
                    <td>
                      <span style={{ color: p.stock === 0 ? 'var(--danger)' : p.stock < 10 ? 'var(--warning)' : 'var(--success)', fontWeight: 600 }}>
                        {p.stock}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${p.isApproved ? 'badge-success' : 'badge-warning'}`}>
                        {p.isApproved ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <Link to={`/seller/products/edit/${p._id}`} className="btn btn-outline btn-sm"><FiEdit2 size={13} /></Link>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p._id)}><FiTrash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
