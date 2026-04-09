import React from 'react';
import { Link } from 'react-router-dom';
import { FiHeart, FiShoppingCart, FiStar } from 'react-icons/fi';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { toggleWishlist } from '../../services/api';
import toast from 'react-hot-toast';
import './ProductCard.css';

export default function ProductCard({ product, wishlistIds = [], onWishlistToggle }) {
  const { addToCart } = useCart();
  const { user } = useAuth();
  const isWished = wishlistIds.includes(product._id);

  const handleWishlist = async (e) => {
    e.preventDefault();
    if (!user) { toast.error('Login to add to wishlist'); return; }
    try {
      const res = await toggleWishlist({ productId: product._id });
      if (onWishlistToggle) onWishlistToggle(product._id, res.data.added);
      toast.success(res.data.added ? 'Added to wishlist' : 'Removed from wishlist');
    } catch { toast.error('Failed'); }
  };

  const handleCart = async (e) => {
    e.preventDefault();
    if (!user || user.role !== 'buyer') { toast.error('Login as buyer to add to cart'); return; }
    await addToCart(product._id, 1);
  };

  const discount = product.discountPrice && product.discountPrice < product.price
    ? Math.round(((product.price - product.discountPrice) / product.price) * 100)
    : 0;

  const finalPrice = product.discountPrice && product.discountPrice < product.price
    ? product.discountPrice : product.price;

  return (
    <Link to={`/products/${product._id}`} className="product-card">
      <div className="product-card-img-wrap">
        {product.images?.[0]?.url
          ? <img src={product.images[0].url} alt={product.name} className="product-card-img" />
          : <div className="product-card-no-img">📦</div>
        }
        {discount > 0 && <span className="product-card-discount">-{discount}%</span>}
        {product.stock === 0 && <div className="product-card-oos">Out of Stock</div>}
        <div className="product-card-actions">
          <button className={`product-card-wish ${isWished ? 'wished' : ''}`} onClick={handleWishlist} title="Wishlist">
            <FiHeart size={16} />
          </button>
          <button className="product-card-cart" onClick={handleCart} disabled={product.stock === 0} title="Add to cart">
            <FiShoppingCart size={16} />
          </button>
        </div>
      </div>
      <div className="product-card-body">
        <p className="product-card-seller">{product.seller?.shopName || product.seller?.name}</p>
        <h3 className="product-card-name">{product.name}</h3>
        <div className="product-card-rating">
          <FiStar size={12} fill="#f59e0b" color="#f59e0b" />
          <span>{product.ratings?.toFixed(1) || '—'}</span>
          {product.numReviews > 0 && <span className="review-count">({product.numReviews})</span>}
        </div>
        <div className="product-card-price">
          <span className="price-final">₹{finalPrice.toLocaleString()}</span>
          {discount > 0 && <span className="price-original">₹{product.price.toLocaleString()}</span>}
        </div>
      </div>
    </Link>
  );
}
