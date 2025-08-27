import { memo } from 'react'
import PropTypes from 'prop-types'
import './LoadingSpinner.css'

const LoadingSpinner = ({ size = 'medium', message = 'Loading...' }) => {
  const sizeClass = `spinner-${size}`
  
  return (
    <div 
      className="loading-container" 
      role="status" 
      aria-live="polite"
      aria-label={message}
    >
      <div className={`spinner ${sizeClass}`}>
        <div className="spinner-circle"></div>
        <div className="spinner-circle"></div>
        <div className="spinner-circle"></div>
      </div>
      <p className="loading-message" aria-hidden="true">{message}</p>
    </div>
  )
}

LoadingSpinner.propTypes = {
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  message: PropTypes.string,
}

LoadingSpinner.defaultProps = {
  size: 'medium',
  message: 'Loading...',
}

export default memo(LoadingSpinner)