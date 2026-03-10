import React, { useState } from 'react';
import './NestleProductCarousel.css';

const products = [
  {
    name: 'Cerelac',
    category: 'Baby Food Range',
    price: 280,
    rating: 4.9,
    image: 'https://www.nestle.in/sites/g/files/pydnoa451/files/cerelac-wheat-apple-cherry.jpg',
  },
  {
    name: 'Maggi Noodles',
    category: 'Instant Noodles',
    price: 60,
    rating: 4.8,
    image: 'https://www.nestle.in/sites/g/files/pydnoa451/files/maggi-2-minutes-noodles.jpg',
  },
  {
    name: 'Milkmaid',
    category: 'Condensed Milk',
    price: 120,
    rating: 4.7,
    image: 'https://www.nestle.in/sites/g/files/pydnoa451/files/milkmaid.jpg',
  },
  {
    name: 'Nescafé Classic',
    category: 'Coffee',
    price: 150,
    rating: 4.6,
    image: 'https://www.nestle.in/sites/g/files/pydnoa451/files/nescafe-classic.jpg',
  },
];

export default function NestleProductCarousel() {
  const [index, setIndex] = useState(0);
  const prev = () => setIndex((i) => (i === 0 ? products.length - 1 : i - 1));
  const next = () => setIndex((i) => (i === products.length - 1 ? 0 : i + 1));
  const product = products[index];

  return (
    <div className="nestle-carousel">
      <button className="carousel-arrow left" onClick={prev}>&lt;</button>
      <div className="carousel-card" style={{ background: 'linear-gradient(120deg, #7c3aed 0%, #8b5cf6 100%)' }}>
        <div className="carousel-info">
          <span className="carousel-badge">NESTLÉ PRODUCT</span>
          <h2 className="carousel-title">{product.name}</h2>
          <div className="carousel-category">{product.category}</div>
          <div className="carousel-rating">
            <span className="star">★</span> {product.rating}
          </div>
          <div className="carousel-price">₹{product.price}/pack</div>
          <button className="carousel-analytics-btn">View Analytics &rarr;</button>
        </div>
        <div className="carousel-image-wrap">
          <img src={product.image} alt={product.name} className="carousel-image" />
        </div>
      </div>
      <button className="carousel-arrow right" onClick={next}>&gt;</button>
      <div className="carousel-dots">
        {products.map((_, i) => (
          <span key={i} className={`dot${i === index ? ' active' : ''}`}></span>
        ))}
      </div>
    </div>
  );
}
