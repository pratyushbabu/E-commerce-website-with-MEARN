import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getProducts, getCategories } from '../../services/api';
import ProductCard from '../../components/common/ProductCard';
import { FiArrowRight, FiZap, FiShield, FiTruck } from 'react-icons/fi';
import './Home.css';

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, cRes] = await Promise.all([
          getProducts({ limit: 8, sort: 'popular' }),
          getCategories(),
        ]);
        setFeatured(pRes.data.products);
        setCategories(cRes.data.categories.slice(0, 8));
      } catch {}
      setLoading(false);
    };
    load();
  }, []);

  const features = [
    { icon: <FiTruck />, title: 'Free Delivery', desc: 'On orders above ₹499' },
    { icon: <FiShield />, title: 'Secure Payments', desc: 'COD & safe checkout' },
    { icon: <FiZap />, title: 'Real-time Updates', desc: 'Live order tracking' },
  ];

  return (
    <div className="home">
      {/* Hero */}
      <section className="hero">
        <div className="hero-content container">
          <div className="hero-text">
            <p className="hero-eyebrow">Multi-Vendor Marketplace</p>
            <h1 className="hero-title">Shop from <span className="hero-highlight">thousands</span> of sellers</h1>
            <p className="hero-desc">Discover unique products from verified sellers. Real-time tracking, secure checkout, best prices.</p>
            <div className="hero-actions">
              <button className="btn btn-primary btn-lg" onClick={() => navigate('/products')}>
                Browse Products <FiArrowRight />
              </button>
              <Link to="/register" className="btn btn-outline btn-lg">Become a Seller</Link>
            </div>
          </div>
          <div className="hero-visual">
            <div className="hero-card-stack">
              <div className="hero-card hero-card-1">🛍 250K+ Products</div>
              <div className="hero-card hero-card-2">⭐ 4.8 Avg Rating</div>
              <div className="hero-card hero-card-3">🚚 Fast Delivery</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="features container">
        {features.map((f, i) => (
          <div key={i} className="feature-item">
            <span className="feature-icon">{f.icon}</span>
            <div>
              <h4 className="feature-title">{f.title}</h4>
              <p className="feature-desc">{f.desc}</p>
            </div>
          </div>
        ))}
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="section container">
          <div className="section-header">
            <h2 className="section-title">Shop by Category</h2>
            <Link to="/products" className="section-link">View all <FiArrowRight /></Link>
          </div>
          <div className="categories-grid">
            {categories.map((cat, i) => (
              <button key={cat} className="category-chip" onClick={() => navigate(`/products?category=${encodeURIComponent(cat)}`)}>
                <span className="category-emoji">{['📱','👕','🏠','💄','📚','🎮','🍕','⚽'][i] || '📦'}</span>
                <span>{cat}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Popular Products */}
      <section className="section container">
        <div className="section-header">
          <h2 className="section-title">Popular Products</h2>
          <Link to="/products?sort=popular" className="section-link">See all <FiArrowRight /></Link>
        </div>
        {loading ? (
          <div className="spinner" />
        ) : featured.length > 0 ? (
          <div className="products-grid">
            {featured.map(p => <ProductCard key={p._id} product={p} />)}
          </div>
        ) : (
          <div className="empty-state">
            <p style={{ fontSize: '48px' }}>📦</p>
            <h3>No products yet</h3>
            <p>Check back soon!</p>
          </div>
        )}
      </section>

      {/* CTA banner */}
      <section className="cta-banner">
        <div className="container">
          <h2>Want to sell on ShopHive?</h2>
          <p>Join our marketplace and reach thousands of customers</p>
          <Link to="/register" className="btn btn-lg" style={{ background: 'white', color: 'var(--primary)' }}>
            Start Selling Today <FiArrowRight />
          </Link>
        </div>
      </section>
    </div>
  );
}
