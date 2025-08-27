import React from 'react';
import { FaRocket, FaMousePointer, FaCog, FaUsers, FaPalette, FaShieldAlt, FaArrowRight, FaPlay } from 'react-icons/fa';
import { SignInButton } from '@clerk/clerk-react';
import { Globe, Marquee } from '@/components/ui';
import { Button } from '@/components/ui';
import './Landing.css';

const Landing = ({ brandingConfig = {
  primaryColor: '#007bff',
  secondaryColor: '#6c757d',
  companyName: 'AutoFlow RPA'
} }) => {
  const features = [
    {
      icon: <FaMousePointer />,
      title: "Drag & Drop Builder",
      description: "Create complex workflows with our intuitive visual builder. No coding required."
    },
    {
      icon: <FaCog />,
      title: "Pre-built Templates",
      description: "Start with ready-made automation templates for common business processes."
    },
    {
      icon: <FaUsers />,
      title: "User-Friendly Design",
      description: "Designed for non-technical users with minimal learning curve."
    },
    {
      icon: <FaPalette />,
      title: "White Label Ready",
      description: "Fully customizable branding and themes for your organization."
    },
    {
      icon: <FaShieldAlt />,
      title: "Secure & Reliable",
      description: "Enterprise-grade security with role-based access control."
    },
    {
      icon: <FaRocket />,
      title: "Fast Deployment",
      description: "Get up and running in minutes, not days or weeks."
    }
  ];

  const useCases = [
    {
      title: "Data Entry Automation",
      description: "Automatically transfer data between systems, eliminating manual entry errors.",
      example: "Extract customer info from emails → Update CRM → Send confirmation"
    },
    {
      title: "Report Generation",
      description: "Generate and distribute reports automatically on schedule.",
      example: "Collect sales data → Create Excel report → Email to managers"
    },
    {
      title: "Customer Onboarding",
      description: "Streamline new customer setup with automated workflows.",
      example: "New signup → Create accounts → Send welcome email → Schedule follow-up"
    }
  ];

  return (
    <div 
      className="landing-page"
      style={{
        '--primary-color': brandingConfig.primaryColor,
        '--secondary-color': brandingConfig.secondaryColor
      }}
    >
      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-badge">🚀 The future of business automation is here</div>
          <h1>Stop doing repetitive work.<br />Start automating everything.</h1>
          <p>
            Transform hours of manual work into seconds of automated precision. 
            No coding skills needed - just drag, drop, and deploy.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <SignInButton mode="modal">
              <Button size="lg" className="gap-2">
                <FaPlay /> Try Demo Now
              </Button>
            </SignInButton>
            <Button variant="outline" size="lg" className="gap-2">
              Watch Video <FaArrowRight />
            </Button>
          </div>
          
        </div>
        
        <div className="hero-visual">
          <Globe className="mx-auto" />
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-header">
          <h2>Why Choose Our RPA Platform?</h2>
          <p>Everything you need to automate your business processes efficiently</p>
        </div>
        
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card">
              <div className="feature-icon">
                {feature.icon}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="use-cases-section">
        <div className="section-header">
          <h2>Common Use Cases</h2>
          <p>See how businesses like yours are saving time and reducing errors</p>
        </div>
        
        <div className="use-cases-grid">
          {useCases.map((useCase, index) => (
            <div key={index} className="use-case-card">
              <h3>{useCase.title}</h3>
              <p>{useCase.description}</p>
              <div className="workflow-example">
                <strong>Example workflow:</strong>
                <span>{useCase.example}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready to Automate Your Workflows?</h2>
          <p>Join thousands of businesses already saving time with our RPA platform</p>
          <SignInButton mode="modal">
            <Button size="lg" className="gap-2">
              <FaRocket /> Start Free Demo
            </Button>
          </SignInButton>
          <div className="cta-note">
            <small>✨ No credit card required • 5-minute setup • Full demo access</small>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>{brandingConfig.companyName}</h4>
            <p>Simplifying business automation for everyone</p>
          </div>
          <div className="footer-section">
            <h5>Product</h5>
            <ul>
              <li>Features</li>
              <li>Pricing</li>
              <li>Templates</li>
              <li>Security</li>
            </ul>
          </div>
          <div className="footer-section">
            <h5>Resources</h5>
            <ul>
              <li>Documentation</li>
              <li>Tutorials</li>
              <li>Support</li>
              <li>Blog</li>
            </ul>
          </div>
          <div className="footer-section">
            <h5>Company</h5>
            <ul>
              <li>About</li>
              <li>Careers</li>
              <li>Contact</li>
              <li>Privacy</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 {brandingConfig.companyName}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Landing;