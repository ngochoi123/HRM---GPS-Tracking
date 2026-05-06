import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X } from 'lucide-react';
import './Banner.css';

/**
 * Banner Component
 * @param {string} id - Unique ID for localStorage dismiss state
 * @param {string} type - 'leaderboard' | 'billboard' | 'skyscraper' | 'medium-rectangle' | 'popup'
 * @param {ReactNode} children - Content of the banner
 * @param {boolean} dismissible - Whether the banner can be closed
 * @param {function} onClose - Optional callback when banner is closed
 */
const Banner = ({ id, type = 'leaderboard', children, dismissible = true, onClose }) => {
  const [isVisible, setIsVisible] = useState(() => {
    if (id) {
      return !localStorage.getItem(`banner_dismissed_${id}`);
    }
    return true;
  });
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    // Handle resize for responsive behavior
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    if (id) {
      localStorage.setItem(`banner_dismissed_${id}`, 'true');
    }
    if (onClose) {
      onClose();
    }
  };

  if (!isVisible) return null;

  // Responsive mapping: hide or change size based on window width
  let currentType = type;
  if (windowWidth < 1024) {
    if (type === 'billboard' || type === 'leaderboard') {
      // Hide large horizontal banners on mobile/tablet or transform to smaller ones
      // For this implementation, we'll transform leaderboard to a responsive banner and hide billboard
      if (type === 'billboard') return null;
    }
    if (type === 'skyscraper') {
      currentType = 'medium-rectangle'; // Convert tall to rectangle on small screens if placed in block
    }
  }

  const bannerClasses = `custom-banner banner-${currentType}`;

  const renderContent = () => (
    <div className={bannerClasses}>
      <div className="banner-content-wrapper">
        {children}
      </div>
      {dismissible && (
        <button className="banner-close-btn" onClick={handleDismiss} aria-label="Close Banner">
          <X size={18} />
        </button>
      )}
    </div>
  );

  // If it's a popup, render it in a Portal attached to document.body
  if (currentType === 'popup') {
    return ReactDOM.createPortal(
      <div className="banner-popup-overlay">
        {renderContent()}
      </div>,
      document.body
    );
  }

  return renderContent();
};

export default Banner;
