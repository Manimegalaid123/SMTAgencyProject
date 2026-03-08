import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { IconBox, IconChart, IconActivity, IconUsers, IconUser, IconBuilding, IconRocket, IconChevronLeft, IconChevronRight, IconStar } from '../components/Icons';
import './Landing.css';

// SMT Logo Component
const SMTLogo = () => (
  <svg width="50" height="50" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" fill="url(#logoGrad)" />
    <path d="M30 65 L40 45 L50 55 L60 35 L70 50 L75 40" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M25 70 Q50 75 75 70" stroke="#c9a227" strokeWidth="3" fill="none" strokeLinecap="round"/>
    <defs>
      <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#006633"/>
        <stop offset="100%" stopColor="#004d26"/>
      </linearGradient>
    </defs>
  </svg>
);

// Icons
const IconPhone = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

const IconMail = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
  </svg>
);

const IconMapPin = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);

const IconFacebook = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
  </svg>
);

const IconInstagram = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);

const IconTruck = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
  </svg>
);

const IconTrendingUp = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
);

const IconTarget = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
  </svg>
);

export default function Landing() {
  const { theme, toggleTheme } = useTheme();
  const [currentSlide, setCurrentSlide] = useState(0);
  const carouselRef = useRef(null);
  const autoPlayRef = useRef();

  // Nestle Products carousel - matching SMT's distribution business
  const carouselItems = [
    {
      id: 1,
      title: 'Maggi Noodles',
      subtitle: 'Instant Noodles - Best Seller',
      image: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=800&h=400&fit=crop',
      gradient: 'linear-gradient(135deg, #006633 0%, #00a86b 100%)',
      price: '₹12/pack',
      rating: 4.5,
    },
    {
      id: 2,
      title: 'Nescafe Coffee',
      subtitle: 'Premium Coffee Range',
      image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&h=400&fit=crop',
      gradient: 'linear-gradient(135deg, #4a2c0a 0%, #6f4e37 100%)',
      price: '₹150/jar',
      rating: 4.8,
    },
    {
      id: 3,
      title: 'KitKat',
      subtitle: 'Premium Chocolates',
      image: 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?w=800&h=400&fit=crop',
      gradient: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
      price: '₹40/pack',
      rating: 4.7,
    },
    {
      id: 4,
      title: 'Nestlé Milk',
      subtitle: 'Dairy Products',
      image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=800&h=400&fit=crop',
      gradient: 'linear-gradient(135deg, #0369a1 0%, #0284c7 100%)',
      price: '₹25/pack',
      rating: 4.6,
    },
    {
      id: 5,
      title: 'Cerelac',
      subtitle: 'Baby Food Range',
      image: 'https://images.unsplash.com/photo-1584949091598-c31daaaa4aa9?w=800&h=400&fit=crop',
      gradient: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)',
      price: '₹280/pack',
      rating: 4.9,
    },
  ];

  const features = [
    {
      icon: <IconTruck />,
      title: 'Distribution Management',
      desc: 'Track imports from Nestlé & distribute to retail shops efficiently with real-time inventory.',
    },
    {
      icon: <IconChart width={32} height={32} />,
      title: 'Sales Analytics',
      desc: 'Monthly sales analysis, product-wise performance tracking, and revenue insights.',
    },
    {
      icon: <IconTrendingUp />,
      title: 'ML Sales Prediction',
      desc: 'Forecast next month sales using AI. Know which products will sell high.',
    },
    {
      icon: <IconTarget />,
      title: 'Demand Forecasting',
      desc: 'Predict demand patterns to optimize stock levels and reduce wastage.',
    },
  ];

  const stats = [
    { value: '500+', label: 'Products Managed' },
    { value: '50+', label: 'Retail Partners' },
    { value: '₹10L+', label: 'Monthly Turnover' },
    { value: '95%', label: 'Delivery Rate' },
  ];

  // Carousel controls
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % carouselItems.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + carouselItems.length) % carouselItems.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  // Auto-play carousel
  useEffect(() => {
    autoPlayRef.current = setInterval(() => {
      nextSlide();
    }, 4000);
    return () => clearInterval(autoPlayRef.current);
  }, []);

  // Pause on hover
  const pauseAutoPlay = () => clearInterval(autoPlayRef.current);
  const resumeAutoPlay = () => {
    autoPlayRef.current = setInterval(() => nextSlide(), 4000);
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 0; i < 5; i++) {
      stars.push(
        <IconStar
          key={i}
          width={14}
          height={14}
          fill={i < Math.floor(rating) ? 'currentColor' : 'none'}
          style={{ opacity: i < Math.floor(rating) ? 1 : 0.3 }}
        />
      );
    }
    return stars;
  };

  const scrollToSection = (sectionId) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing">
      {/* Top Contact Bar */}
      <div className="top-contact-bar">
        <div className="contact-bar-content">
          <div className="contact-items">
            <a href="tel:+919894086188" className="contact-item">
              <IconPhone />
              <span>+91 98940 86188</span>
            </a>
            <a href="mailto:sriramansmt188@gmail.com" className="contact-item">
              <IconMail />
              <span>sriramansmt188@gmail.com</span>
            </a>
          </div>
          <div className="social-icons">
            <a href="#" className="social-icon" aria-label="Facebook"><IconFacebook /></a>
            <a href="#" className="social-icon" aria-label="Instagram"><IconInstagram /></a>
            <button
              type="button"
              className="theme-toggle-mini"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Header Navigation */}
      <header className="landing-header">
        <div className="header-content">
          <div className="landing-logo-wrap">
            <SMTLogo />
            <div className="logo-text">
              <span className="landing-logo">SMT</span>
              <span className="landing-tagline">AGENCIES</span>
            </div>
          </div>
          
          <nav className="main-nav">
            <button onClick={() => scrollToSection('home')} className="nav-link">HOME</button>
            <button onClick={() => scrollToSection('products')} className="nav-link">PRODUCTS</button>
            <button onClick={() => scrollToSection('about')} className="nav-link">ABOUT US</button>
            <button onClick={() => scrollToSection('features')} className="nav-link">SERVICES</button>
            <button onClick={() => scrollToSection('contact')} className="nav-link">CONTACT</button>
          </nav>

          <div className="header-right">
            <span className="company-title">SM TRADERS</span>
            <span className="company-subtitle">FMCG DISTRIBUTION</span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="home" className="hero">
        <div className="hero-bg" aria-hidden="true" />
        <div className="hero-overlay" aria-hidden="true" />
        <div className="hero-content">
          <span className="hero-badge">
            <IconRocket width={16} height={16} />
            Nestlé Authorized Distributor
          </span>
          <h1 className="hero-title">
            Sales, Stock &<br />
            <span className="hero-title-accent">Demand Forecasting</span>
          </h1>
          <p className="hero-tagline">
            Intelligent FMCG distribution management powered by AI. Track imports, manage inventory, analyze sales trends, and predict next month's demand with confidence.
          </p>
          <div className="hero-ctas">
            <Link to="/login?type=admin" className="cta cta-primary">
              <IconUser width={18} height={18} />
              Admin Login
            </Link>
            <Link to="/login?type=agency" className="cta cta-secondary">
              <IconBuilding width={18} height={18} />
              Retailer Login
            </Link>
          </div>
          <p className="hero-hint">
            New retailer? <Link to="/register">Register here</Link> to request products
          </p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="stats-grid">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-card">
              <span className="stat-value">{stat.value}</span>
              <span className="stat-label">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Product Carousel */}
      <section 
        id="products"
        className="carousel-section"
        onMouseEnter={pauseAutoPlay}
        onMouseLeave={resumeAutoPlay}
        ref={carouselRef}
      >
        <h2 className="section-title carousel-title">Our Products</h2>
        <p className="section-subtitle">Premium Nestlé products for retail distribution</p>
        <div className="carousel-container">
          <button className="carousel-btn carousel-btn-prev" onClick={prevSlide} aria-label="Previous">
            <IconChevronLeft width={24} height={24} />
          </button>
          
          <div className="carousel-track" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
            {carouselItems.map((item, index) => (
              <div 
                key={item.id} 
                className="carousel-slide"
                style={{ background: item.gradient }}
              >
                <div className="carousel-slide-content">
                  <div className="carousel-slide-text">
                    <span className="carousel-badge">Nestlé Product</span>
                    <h2 className="carousel-slide-title">{item.title}</h2>
                    <p className="carousel-slide-subtitle">{item.subtitle}</p>
                    <div className="carousel-rating">
                      {renderStars(item.rating)}
                      <span className="carousel-rating-text">{item.rating}</span>
                    </div>
                    <p className="carousel-price">{item.price}</p>
                    <Link to="/login?type=admin" className="carousel-cta">
                      View Analytics
                      <IconChevronRight width={18} height={18} />
                    </Link>
                  </div>
                  <div className="carousel-slide-image">
                    <img src={item.image} alt={item.title} loading={index === 0 ? 'eager' : 'lazy'} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <button className="carousel-btn carousel-btn-next" onClick={nextSlide} aria-label="Next">
            <IconChevronRight width={24} height={24} />
          </button>
        </div>
        
        {/* Carousel Indicators */}
        <div className="carousel-indicators">
          {carouselItems.map((_, index) => (
            <button
              key={index}
              className={`carousel-indicator ${index === currentSlide ? 'active' : ''}`}
              onClick={() => goToSlide(index)}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section">
        <div className="about-content">
          <div className="about-text">
            <h2 className="section-title">About SMT Agencies</h2>
            <div className="title-underline"></div>
            <p className="about-desc">
              <strong>SMT Agencies</strong> is a trusted FMCG distribution company based in <strong>Thuthikulam, Namakkal</strong>. 
              We are authorized distributors of <strong>Nestlé products</strong>, serving multiple retail shops across the region.
            </p>
            <p className="about-desc">
              Our mission is to ensure efficient supply chain management, timely deliveries, and data-driven insights 
              to help retailers meet consumer demand effectively.
            </p>
            <div className="about-highlights">
              <div className="highlight-item">
                <span className="highlight-number">10+</span>
                <span className="highlight-label">Years Experience</span>
              </div>
              <div className="highlight-item">
                <span className="highlight-number">100+</span>
                <span className="highlight-label">Retail Partners</span>
              </div>
              <div className="highlight-item">
                <span className="highlight-number">24/7</span>
                <span className="highlight-label">Support</span>
              </div>
            </div>
          </div>
          <div className="about-contact-card">
            <h3>Contact Person</h3>
            <p className="contact-name">Mr. Sriraman</p>
            <p className="contact-role">Proprietor</p>
            <div className="contact-details">
              <p><IconMapPin /> 3/64, Main Road, Thuthikulam<br />Namakkal - 637404, Tamil Nadu</p>
              <p><IconPhone /> +91 98940 86188</p>
              <p><IconMail /> sriramansmt188@gmail.com</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <h2 className="section-title">Our Services</h2>
        <p className="section-subtitle">Comprehensive tools for FMCG distribution management</p>
        <div className="features-grid">
          {features.map((f) => (
            <div key={f.title} className="feature-card">
              <div className="feature-icon">{f.icon}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-section-content">
          <h2>Ready to Optimize Your Distribution?</h2>
          <p>Join SMT Agencies distribution network and grow your retail business.</p>
          <div className="cta-buttons">
            <Link to="/register" className="cta cta-primary cta-large">
              Register as Retailer
            </Link>
            <Link to="/login?type=admin" className="cta cta-outline cta-large">
              Admin Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact-section">
        <div className="contact-grid">
          <div className="contact-info">
            <h2 className="section-title">Get In Touch</h2>
            <div className="title-underline"></div>
            <div className="contact-cards">
              <div className="contact-card">
                <div className="contact-card-icon"><IconMapPin /></div>
                <h4>Address</h4>
                <p>SMT Agencies<br />3/64, Main Road, Thuthikulam<br />Namakkal - 637404<br />Tamil Nadu, India</p>
              </div>
              <div className="contact-card">
                <div className="contact-card-icon"><IconPhone /></div>
                <h4>Phone</h4>
                <p>+91 98940 86188</p>
              </div>
              <div className="contact-card">
                <div className="contact-card-icon"><IconMail /></div>
                <h4>Email</h4>
                <p>sriramansmt188@gmail.com</p>
              </div>
            </div>
          </div>
          <div className="contact-map">
            <iframe 
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3916.5!2d78.1677!3d11.2183!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3babf1a3a5555555%3A0x5555555555555555!2sThuthikulam%2C%20Tamil%20Nadu%20637404!5e0!3m2!1sen!2sin!4v1709900000000"
              width="100%" 
              height="300" 
              style={{ border: 0, borderRadius: '12px' }} 
              allowFullScreen="" 
              loading="lazy"
              title="SMT Agencies Location - Thuthikulam, Namakkal"
            ></iframe>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <SMTLogo />
            <div className="footer-brand-text">
              <span className="footer-logo">SMT Agencies</span>
              <p>Nestlé Authorized Distributor</p>
            </div>
          </div>
          <div className="footer-links">
            <div className="footer-col">
              <h4>Quick Links</h4>
              <button onClick={() => scrollToSection('home')}>Home</button>
              <button onClick={() => scrollToSection('about')}>About Us</button>
              <button onClick={() => scrollToSection('products')}>Products</button>
              <button onClick={() => scrollToSection('contact')}>Contact</button>
            </div>
            <div className="footer-col">
              <h4>Services</h4>
              <Link to="/login?type=admin">Admin Dashboard</Link>
              <Link to="/login?type=agency">Retailer Portal</Link>
              <Link to="/register">Register</Link>
            </div>
            <div className="footer-col">
              <h4>Contact</h4>
              <p>Namakkal - 637404</p>
              <p>+91 98940 86188</p>
              <p>sriramansmt188@gmail.com</p>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2026 SMT Agencies. All rights reserved.</p>
          <p className="footer-tech">Built with React • Node.js • MongoDB • Python ML</p>
        </div>
      </footer>
    </div>
  );
}
