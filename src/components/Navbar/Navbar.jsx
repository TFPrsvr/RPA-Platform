import { memo } from 'react'
import { Link } from 'react-router-dom'
import { UserButton, useUser } from '@clerk/clerk-react'
import PropTypes from 'prop-types'
import './Navbar.css'

const Navbar = ({ brandingConfig }) => {
  const { user } = useUser()
  return (
    <nav 
      className="navbar" 
      style={{ backgroundColor: brandingConfig.primaryColor }}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="navbar-container">
        <div className="navbar-brand">
          {brandingConfig.logo ? (
            <img 
              src={brandingConfig.logo} 
              alt={`${brandingConfig.companyName} logo`} 
              className="navbar-logo" 
            />
          ) : (
            <h1 aria-label="Company name">{brandingConfig.companyName}</h1>
          )}
        </div>
        
        <div className="navbar-menu" role="menubar">
          <Link 
            to="/" 
            className="navbar-link"
            role="menuitem"
            aria-label="Go to Dashboard"
          >
            Dashboard
          </Link>
          <Link 
            to="/ai-generator" 
            className="navbar-link"
            role="menuitem"
            aria-label="Go to AI Workflow Generator"
          >
            🤖 AI Generator
          </Link>
          <Link 
            to="/builder" 
            className="navbar-link"
            role="menuitem"
            aria-label="Go to Workflow Builder"
          >
            Workflow Builder
          </Link>
          <div className="navbar-user" aria-label="User menu">
            <span 
              className="navbar-user-email"
              aria-label={`Logged in as ${user?.emailAddresses[0]?.emailAddress}`}
            >
              {user?.emailAddresses[0]?.emailAddress}
            </span>
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>
    </nav>
  )
}

Navbar.propTypes = {
  brandingConfig: PropTypes.shape({
    primaryColor: PropTypes.string,
    secondaryColor: PropTypes.string,
    companyName: PropTypes.string,
    logo: PropTypes.string,
  }).isRequired,
}

export default memo(Navbar)