import { useState, useEffect, ReactNode } from 'react'
// import style from './btn-wallet-login.module.scss'

interface ModalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  closeOnOverlayClick?: boolean;
  showCloseButton?: boolean;
  overlayClassName?: string;
  contentClassName?: string;
}

const ModalDialog = ({
  isOpen,
  onClose, 
  children, 
  closeOnOverlayClick = true,
  showCloseButton = true,
  overlayClassName,
  contentClassName
}: ModalDialogProps) => {

  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  }

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('modal-open')
    }
    return () => {
      document.body.classList.remove('modal-open')
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className={`modal-dialog ${overlayClassName || ''}`}
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <div 
        className={`modal-content ${contentClassName || ''}`} 
        onClick={stopPropagation}
      >
        <div className="md-ctx-wrapper">
          {children}
        </div>
        {showCloseButton && (
          <div className="close-icon" onClick={onClose}>&times;</div>
        )}
      </div>
    </div>
  )
}

export default ModalDialog;