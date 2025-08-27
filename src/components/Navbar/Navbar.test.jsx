import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import Navbar from './Navbar'

const mockBrandingConfig = {
  primaryColor: '#007bff',
  secondaryColor: '#6c757d',
  companyName: 'Test Company',
  logo: null,
}

const MockClerkProvider = ({ children }) => (
  <ClerkProvider publishableKey="test-key">
    {children}
  </ClerkProvider>
)

const renderNavbar = (brandingConfig = mockBrandingConfig) => {
  return render(
    <BrowserRouter>
      <MockClerkProvider>
        <Navbar brandingConfig={brandingConfig} />
      </MockClerkProvider>
    </BrowserRouter>
  )
}

describe('Navbar', () => {
  test('renders company name when no logo provided', () => {
    renderNavbar()
    expect(screen.getByText('Test Company')).toBeInTheDocument()
  })

  test('renders navigation links', () => {
    renderNavbar()
    expect(screen.getByRole('link', { name: /go to dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /go to workflow builder/i })).toBeInTheDocument()
  })

  test('has proper accessibility attributes', () => {
    renderNavbar()
    expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Main navigation')
    expect(screen.getByRole('menubar')).toBeInTheDocument()
  })

  test('applies branding color styles', () => {
    renderNavbar()
    const nav = screen.getByRole('navigation')
    expect(nav).toHaveStyle({ backgroundColor: '#007bff' })
  })

  test('renders logo when provided', () => {
    const brandingWithLogo = {
      ...mockBrandingConfig,
      logo: 'https://example.com/logo.png'
    }
    renderNavbar(brandingWithLogo)
    
    const logo = screen.getByRole('img')
    expect(logo).toHaveAttribute('src', 'https://example.com/logo.png')
    expect(logo).toHaveAttribute('alt', 'Test Company logo')
  })
})