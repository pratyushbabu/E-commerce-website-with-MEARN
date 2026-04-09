import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProduct, getProductReviews, addReview, toggleWishlist, getWishlist } from '../../services/api';
import { getSocket } from '../../services/socket';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { FiStar, FiHeart, FiShoppingCart, FiMinus, FiPlus, FiArrowLeft } from 'react-icons/fi';
import toast from 'react-hot-toast';
import './ProductDetail.css';

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [selectedImg, setSelectedImg] = useState(0);
  const [qty, setQty] = useState(1);
  const [wished, setWished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [tab, setTab] = useState('desc');

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, rRes] = await Promise.all([getProduct(id), getProductReviews(id)]);
        setProduct(pRes.data.product);
        setReviews(rRes.data.reviews);
        if (user?.role === 'buyer') {
          const wRes = await getWishlist();
          const ids = wRes.data.wishlist?.products?.map(p => p._id || p) || [];
          setWished(ids.includes(id));
        }
      } catch { navigate('/products'); }
      setLoading(false);
    };
    load();
  }, [id]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    socket.emit('watch-product', id);
    const handler = ({ productId, stock }) => {
      if (productId === id) setProduct(p => p ? { ...p, stock } : p);
    };
    socket.on('stock-update', handler);
    return () => { socket.emit('leave-product', id); socket.off('stock-update', handler); };
  }, [id]);

  const handleWishlist = async () => {
    if (!user) { toast.error('Login to wishlist'); return; }
    const res = await toggleWishlist({ productId: id });
    setWished(res.data.added);
    toast.success(res.data.added ? 'Added to wishlist' : 'Removed from wishlist');
  };

  const handleAddCart = async () => {
    if (!user || user.role !== 'buyer') { toast.error('Login as buyer'); return; }
    await addToCart(id, qty);
  };

  const handleReview = async (e) => {
    e.preventDefault();
    if (!user || user.role !== 'buyer') { toast.error('Login as buyer to review'); return; }
    setSubmittingReview(true);
    try {
      const res = await addReview(id, reviewForm);
      setReviews(prev => [res.data.review, ...prev]);
      setReviewForm({ rating: 5, comment: '' });
      toast.success('Review submitted!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSubmittingReview(false); }
  };

  if (loading) return <div className="spinner" style={{ marginTop: '100px' }} />;
  if (!product) return null;

  const finalPrice = product.discountPrice && product.discountPrice < product.price ? product.discountPrice : product.price;
  const discount = product.discountPrice && product.discountPrice < product.price
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100) : 0;

  return (
    <div className="product-detail container">
      <button className="btn btn-outline btn-sm" style={{ marginBottom: '24px' }} onClick={() => navigate(-1)}>
        <FiArrowLeft size={14} /> Back
      </button>

      <div className="pd-grid">
        {/* Images */}
        <div className="pd-images">
          <div className="pd-main-img">
            {product.images?.[selectedImg]?.url
              ? <img src={product.images[selectedImg].url} alt={product.name} />
              : <div className="pd-no-img">📦</div>
            }
            {discount > 0 && <span className="product-card-discount">-{discount}%</span>}
          </div>
          {product.images?.length > 1 && (
            <div className="pd-thumbs">
              {product.images.map((img, i) => (
                <button key={i} className={`pd-thumb ${selectedImg === i ? 'active' : ''}`} onClick={() => setSelectedImg(i)}>
                  <img src={img.url} alt="" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="pd-info">
          <p className="pd-seller">By {product.seller?.shopName || product.seller?.name}</p>
          <h1 className="pd-name">{product.name}</h1>
          <div className="pd-rating">
            {[1,2,3,4,5].map(s => (
              <FiStar key={s} size={16} fill={s <= Math.round(product.ratings) ? '#f59e0b' : 'none'} color="#f59e0b" />
            ))}
            <span style={{ fontSize: '14px', color: 'var(--text-secondary)', marginLeft: '6px' }}>
              {product.ratings?.toFixed(1)} ({product.numReviews} reviews)
            </span>
          </div>
          <div className="pd-price-row">
            <span className="pd-price">₹{finalPrice.toLocaleString()}</span>
            {discount > 0 && <span className="pd-price-original">₹{product.price.toLocaleString()}</span>}
            {discount > 0 && <span className="badge badge-danger">{discount}% OFF</span>}
          </div>

          {product.stock > 0
            ? <span className="badge badge-success">In Stock ({product.stock} available)</span>
            : <span className="badge badge-danger">Out of Stock</span>
          }

          <div className="pd-qty">
            <p className="filter-label" style={{ marginBottom: '8px' }}>Quantity</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button className="qty-btn" onClick={() => setQty(q => Math.max(1, q - 1))}><FiMinus size={14} /></button>
              <span style={{ fontSize: '16px', fontWeight: 600, minWidth: '24px', textAlign: 'center' }}>{qty}</span>
              <button className="qty-btn" onClick={() => setQty(q => Math.min(product.stock, q + 1))} disabled={qty >= product.stock}><FiPlus size={14} /></button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={handleAddCart} disabled={product.stock === 0}>
              <FiShoppingCart /> Add to Cart
            </button>
            <button className={`btn btn-outline ${wished ? 'wished-btn' : ''}`} onClick={handleWishlist}>
              <FiHeart fill={wished ? 'currentColor' : 'none'} />
            </button>
          </div>

          {product.brand && <p className="pd-meta"><strong>Brand:</strong> {product.brand}</p>}
          {product.category && <p className="pd-meta"><strong>Category:</strong> {product.category}</p>}
          {product.tags?.length > 0 && (
            <div className="pd-tags">
              {product.tags.map(t => <span key={t} className="badge badge-secondary">{t}</span>)}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="pd-tabs">
        <button className={`pd-tab ${tab === 'desc' ? 'active' : ''}`} onClick={() => setTab('desc')}>Description</button>
        <button className={`pd-tab ${tab === 'specs' ? 'active' : ''}`} onClick={() => setTab('specs')}>Specifications</button>
        <button className={`pd-tab ${tab === 'reviews' ? 'active' : ''}`} onClick={() => setTab('reviews')}>Reviews ({reviews.length})</button>
      </div>
      <div className="pd-tab-content card">
        {tab === 'desc' && <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>{product.description}</p>}
        {tab === 'specs' && (
          product.specifications?.length > 0
            ? <table><tbody>{product.specifications.map((s, i) => (
                <tr key={i}><td style={{ fontWeight: 600, width: '200px' }}>{s.key}</td><td>{s.value}</td></tr>
              ))}</tbody></table>
            : <p style={{ color: 'var(--text-muted)' }}>No specifications listed.</p>
        )}
        {tab === 'reviews' && (
          <div>
            {user?.role === 'buyer' && (
              <form className="review-form" onSubmit={handleReview}>
                <h4 style={{ marginBottom: '12px' }}>Write a Review</h4>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                  {[1,2,3,4,5].map(s => (
                    <button type="button" key={s} onClick={() => setReviewForm(f => ({ ...f, rating: s }))} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                      <FiStar size={24} fill={s <= reviewForm.rating ? '#f59e0b' : 'none'} color="#f59e0b" />
                    </button>
                  ))}
                </div>
                <textarea className="form-input" rows={3} placeholder="Share your experience..." value={reviewForm.comment} onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))} required />
                <button className="btn btn-primary btn-sm" style={{ marginTop: '8px' }} disabled={submittingReview}>{submittingReview ? 'Submitting...' : 'Submit Review'}</button>
              </form>
            )}
            {reviews.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No reviews yet. Be the first!</p> : (
              <div className="reviews-list">
                {reviews.map(r => (
                  <div key={r._id} className="review-item">
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                      {[1,2,3,4,5].map(s => <FiStar key={s} size={13} fill={s <= r.rating ? '#f59e0b' : 'none'} color="#f59e0b" />)}
                    </div>
                    <p style={{ fontSize: '13px', fontWeight: 600 }}>{r.user?.name}</p>
                    <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: '4px 0' }}>{r.comment}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(r.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
