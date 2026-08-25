import React from 'react';
import './PricingModal.css';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content pricing-modal" onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        
        <div className="pricing-header">
          <h2>Upgrade to <span className="highlight">PRO</span></h2>
          <p>Unlock AI Book Covers and other premium features.</p>
        </div>

        <div className="pricing-cards">
          {/* Free Tier */}
          <div className="pricing-card">
            <h3>Free</h3>
            <div className="price">$0<span>/month</span></div>
            <ul className="features-list">
              <li>✓ Basic AI Story Analysis</li>
              <li>✓ Unlimited Writing Sessions</li>
              <li>✓ Global Leaderboard</li>
              <li className="disabled">✕ AI Cover Art Generation</li>
              <li className="disabled">✕ Advanced PDF Exports</li>
            </ul>
            <button className="btn-pill btn-pill-outline disabled-btn" disabled>Current Plan</button>
          </div>

          {/* Pro Tier */}
          <div className="pricing-card pro">
            <div className="pro-badge">Most Popular</div>
            <h3>Pro</h3>
            <div className="price">$4.99<span>/month</span></div>
            <ul className="features-list">
              <li>✓ Everything in Free</li>
              <li className="highlight-feature">✨ AI Cover Art Generation (DALL-E 3)</li>
              <li>✓ Priority Support</li>
              <li>✓ Advanced PDF Exports</li>
              <li>✓ Ad-Free Experience</li>
            </ul>
            <button className="btn-pill btn-pill-primary upgrade-btn" onClick={() => alert('Payment gateway integration coming soon!')}>Upgrade Now</button>
          </div>
        </div>
      </div>
    </div>
  );
};
