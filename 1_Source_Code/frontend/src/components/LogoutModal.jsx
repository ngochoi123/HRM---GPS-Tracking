import React, { useEffect } from 'react';
import { HelpCircle as QuestionIcon } from 'lucide-react';

const LogoutModal = ({ isOpen, onClose, onConfirm }) => {
  // Đóng modal khi nhấn phím Esc
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleEsc);
    }

    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="logout-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon-container">
          <div className="icon-circle">
            <QuestionIcon size={40} color="#16a34a" />
          </div>
        </div>
        
        <h3>Xác nhận đăng xuất</h3>
        <p>Bạn có chắc chắn muốn đăng xuất?</p>
        
        <div className="modal-actions">
          <button className="btn-confirm" onClick={onConfirm}>Xác nhận</button>
          <button className="btn-cancel" onClick={onClose}>Hủy</button>
        </div>
      </div>
    </div>
  );
};

export default LogoutModal;
