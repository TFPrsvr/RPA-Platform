import { memo, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import './Toast.css'

const Toast = ({ 
  message, 
  type = 'info', 
  duration = 5000, 
  onClose,
  position = 'top-right',
  showCloseButton = true 
}) => {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)

  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setIsVisible(true), 10)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [duration])

  const handleClose = () => {
    setIsExiting(true)
    setTimeout(() => {
      if (onClose) {
        onClose()
      }
    }, 300) // Match CSS animation duration
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅'
      case 'error':
        return '❌'
      case 'warning':
        return '⚠️'
      case 'info':
      default:
        return 'ℹ️'
    }
  }

  const toastClasses = [
    'toast',
    `toast-${type}`,
    `toast-${position}`,
    isVisible ? 'toast-visible' : '',
    isExiting ? 'toast-exiting' : ''
  ].filter(Boolean).join(' ')

  return (
    <div 
      className={toastClasses}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="toast-content">
        <span className="toast-icon" aria-hidden="true">
          {getIcon()}
        </span>
        <span className="toast-message">
          {message}
        </span>
      </div>
      
      {showCloseButton && (
        <button
          className="toast-close"
          onClick={handleClose}
          aria-label="Close notification"
          type="button"
        >
          ×
        </button>
      )}
    </div>
  )
}

Toast.propTypes = {
  message: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['success', 'error', 'warning', 'info']),
  duration: PropTypes.number,
  onClose: PropTypes.func,
  position: PropTypes.oneOf([
    'top-left', 'top-center', 'top-right',
    'bottom-left', 'bottom-center', 'bottom-right'
  ]),
  showCloseButton: PropTypes.bool,
}

export default memo(Toast)