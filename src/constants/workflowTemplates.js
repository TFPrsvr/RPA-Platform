import { NODE_TYPES } from './workflowTypes.js'

export const WORKFLOW_TEMPLATES = [
  {
    id: 'web-form-automation',
    name: '📝 Web Form Automation',
    description: 'Automatically fill and submit web forms',
    category: 'Data Entry',
    difficulty: 'Beginner',
    estimatedTime: '5 minutes',
    useCase: 'Perfect for repetitive form submissions, contact forms, or survey responses',
    nodes: [
      {
        id: 'start-1',
        type: NODE_TYPES.START,
        position: { x: 100, y: 100 },
        config: {}
      },
      {
        id: 'navigate-1', 
        type: NODE_TYPES.NAVIGATE,
        position: { x: 100, y: 200 },
        config: {
          url: 'https://example.com/contact-form',
          waitForLoad: true,
          timeout: 30
        }
      },
      {
        id: 'input-name',
        type: NODE_TYPES.INPUT,
        position: { x: 100, y: 300 },
        config: {
          selector: 'Full Name',
          selectorType: 'label',
          text: 'John Doe',
          clearFirst: true
        }
      },
      {
        id: 'input-email',
        type: NODE_TYPES.INPUT,
        position: { x: 100, y: 400 },
        config: {
          selector: 'Email Address',
          selectorType: 'label', 
          text: 'john.doe@example.com',
          clearFirst: true
        }
      },
      {
        id: 'input-message',
        type: NODE_TYPES.INPUT,
        position: { x: 100, y: 500 },
        config: {
          selector: 'Message',
          selectorType: 'label',
          text: 'This is an automated message from my RPA workflow.',
          clearFirst: true
        }
      },
      {
        id: 'click-submit',
        type: NODE_TYPES.CLICK,
        position: { x: 100, y: 600 },
        config: {
          selector: 'Submit',
          selectorType: 'text',
          waitAfter: 2
        }
      },
      {
        id: 'end-1',
        type: NODE_TYPES.END,
        position: { x: 100, y: 700 },
        config: {
          message: 'Form submitted successfully!'
        }
      }
    ],
    connections: [
      { from: 'start-1', to: 'navigate-1', outputPort: 'start', inputPort: 'trigger' },
      { from: 'navigate-1', to: 'input-name', outputPort: 'success', inputPort: 'trigger' },
      { from: 'input-name', to: 'input-email', outputPort: 'success', inputPort: 'trigger' },
      { from: 'input-email', to: 'input-message', outputPort: 'success', inputPort: 'trigger' },
      { from: 'input-message', to: 'click-submit', outputPort: 'success', inputPort: 'trigger' },
      { from: 'click-submit', to: 'end-1', outputPort: 'success', inputPort: 'trigger' }
    ]
  },

  {
    id: 'data-extraction',
    name: '📊 Data Extraction Workflow',
    description: 'Extract data from websites and store in variables',
    category: 'Data Collection',
    difficulty: 'Intermediate',
    estimatedTime: '10 minutes',
    useCase: 'Great for web scraping, price monitoring, or collecting research data',
    nodes: [
      {
        id: 'start-2',
        type: NODE_TYPES.START,
        position: { x: 100, y: 100 },
        config: {}
      },
      {
        id: 'navigate-2',
        type: NODE_TYPES.NAVIGATE,
        position: { x: 100, y: 200 },
        config: {
          url: 'https://example-ecommerce.com/product/123',
          waitForLoad: true
        }
      },
      {
        id: 'extract-title',
        type: NODE_TYPES.EXTRACT,
        position: { x: 100, y: 300 },
        config: {
          selector: '.product-title',
          attribute: 'text',
          variableName: 'productTitle'
        }
      },
      {
        id: 'extract-price',
        type: NODE_TYPES.EXTRACT,
        position: { x: 100, y: 400 },
        config: {
          selector: '.price',
          attribute: 'text', 
          variableName: 'productPrice'
        }
      },
      {
        id: 'extract-availability',
        type: NODE_TYPES.EXTRACT,
        position: { x: 100, y: 500 },
        config: {
          selector: '.availability',
          attribute: 'text',
          variableName: 'availability'
        }
      },
      {
        id: 'condition-in-stock',
        type: NODE_TYPES.CONDITION,
        position: { x: 100, y: 600 },
        config: {
          conditionType: 'textExists',
          value: 'In Stock'
        }
      },
      {
        id: 'end-success',
        type: NODE_TYPES.END,
        position: { x: 50, y: 750 },
        config: {
          message: 'Product data extracted - Item is in stock!'
        }
      },
      {
        id: 'end-out-of-stock',
        type: NODE_TYPES.END,
        position: { x: 200, y: 750 },
        config: {
          message: 'Product data extracted - Item is out of stock'
        }
      }
    ],
    connections: [
      { from: 'start-2', to: 'navigate-2', outputPort: 'start', inputPort: 'trigger' },
      { from: 'navigate-2', to: 'extract-title', outputPort: 'success', inputPort: 'trigger' },
      { from: 'extract-title', to: 'extract-price', outputPort: 'success', inputPort: 'trigger' },
      { from: 'extract-price', to: 'extract-availability', outputPort: 'success', inputPort: 'trigger' },
      { from: 'extract-availability', to: 'condition-in-stock', outputPort: 'success', inputPort: 'trigger' },
      { from: 'condition-in-stock', to: 'end-success', outputPort: 'true', inputPort: 'trigger' },
      { from: 'condition-in-stock', to: 'end-out-of-stock', outputPort: 'false', inputPort: 'trigger' }
    ]
  },

  {
    id: 'social-media-posting',
    name: '📱 Social Media Automation',
    description: 'Automate posting to social media platforms',
    category: 'Social Media',
    difficulty: 'Intermediate', 
    estimatedTime: '8 minutes',
    useCase: 'Schedule and automate social media posts across multiple platforms',
    nodes: [
      {
        id: 'start-3',
        type: NODE_TYPES.START,
        position: { x: 100, y: 100 },
        config: {}
      },
      {
        id: 'navigate-twitter',
        type: NODE_TYPES.NAVIGATE,
        position: { x: 100, y: 200 },
        config: {
          url: 'https://twitter.com/compose/tweet',
          waitForLoad: true
        }
      },
      {
        id: 'input-tweet',
        type: NODE_TYPES.INPUT,
        position: { x: 100, y: 300 },
        config: {
          selector: '[data-testid="tweetTextarea_0"]',
          selectorType: 'css',
          text: 'Check out our latest blog post! #automation #productivity',
          clearFirst: true
        }
      },
      {
        id: 'click-tweet-button',
        type: NODE_TYPES.CLICK,
        position: { x: 100, y: 400 },
        config: {
          selector: '[data-testid="tweetButtonInline"]',
          selectorType: 'css',
          waitAfter: 3
        }
      },
      {
        id: 'navigate-linkedin',
        type: NODE_TYPES.NAVIGATE,
        position: { x: 100, y: 500 },
        config: {
          url: 'https://www.linkedin.com/feed/',
          waitForLoad: true
        }
      },
      {
        id: 'click-start-post',
        type: NODE_TYPES.CLICK,
        position: { x: 100, y: 600 },
        config: {
          selector: 'Start a post',
          selectorType: 'text',
          waitAfter: 2
        }
      },
      {
        id: 'input-linkedin-post',
        type: NODE_TYPES.INPUT,
        position: { x: 100, y: 700 },
        config: {
          selector: '[data-placeholder="What do you want to talk about?"]',
          selectorType: 'css',
          text: 'Excited to share our latest insights on workflow automation! Check out our blog for more tips on boosting productivity.',
          clearFirst: true
        }
      },
      {
        id: 'click-post-linkedin',
        type: NODE_TYPES.CLICK,
        position: { x: 100, y: 800 },
        config: {
          selector: 'Post',
          selectorType: 'text',
          waitAfter: 2
        }
      },
      {
        id: 'end-3',
        type: NODE_TYPES.END,
        position: { x: 100, y: 900 },
        config: {
          message: 'Posts published to Twitter and LinkedIn!'
        }
      }
    ],
    connections: [
      { from: 'start-3', to: 'navigate-twitter', outputPort: 'start', inputPort: 'trigger' },
      { from: 'navigate-twitter', to: 'input-tweet', outputPort: 'success', inputPort: 'trigger' },
      { from: 'input-tweet', to: 'click-tweet-button', outputPort: 'success', inputPort: 'trigger' },
      { from: 'click-tweet-button', to: 'navigate-linkedin', outputPort: 'success', inputPort: 'trigger' },
      { from: 'navigate-linkedin', to: 'click-start-post', outputPort: 'success', inputPort: 'trigger' },
      { from: 'click-start-post', to: 'input-linkedin-post', outputPort: 'success', inputPort: 'trigger' },
      { from: 'input-linkedin-post', to: 'click-post-linkedin', outputPort: 'success', inputPort: 'trigger' },
      { from: 'click-post-linkedin', to: 'end-3', outputPort: 'success', inputPort: 'trigger' }
    ]
  },

  {
    id: 'email-automation',
    name: '📧 Email Processing Workflow',
    description: 'Process and respond to emails automatically',
    category: 'Communication',
    difficulty: 'Advanced',
    estimatedTime: '15 minutes',
    useCase: 'Automate email responses, sorting, and follow-up actions',
    nodes: [
      {
        id: 'start-4',
        type: NODE_TYPES.START,
        position: { x: 100, y: 100 },
        config: {}
      },
      {
        id: 'navigate-gmail',
        type: NODE_TYPES.NAVIGATE,
        position: { x: 100, y: 200 },
        config: {
          url: 'https://mail.google.com/mail/u/0/#inbox',
          waitForLoad: true
        }
      },
      {
        id: 'loop-emails',
        type: NODE_TYPES.LOOP,
        position: { x: 100, y: 300 },
        config: {
          loopType: 'count',
          iterations: 5
        }
      },
      {
        id: 'click-first-email',
        type: NODE_TYPES.CLICK,
        position: { x: 100, y: 450 },
        config: {
          selector: '.zA:first-child',
          selectorType: 'css',
          waitAfter: 2
        }
      },
      {
        id: 'extract-subject',
        type: NODE_TYPES.EXTRACT,
        position: { x: 100, y: 550 },
        config: {
          selector: '.hP',
          attribute: 'text',
          variableName: 'emailSubject'
        }
      },
      {
        id: 'condition-urgent',
        type: NODE_TYPES.CONDITION,
        position: { x: 100, y: 650 },
        config: {
          conditionType: 'textExists',
          value: 'URGENT'
        }
      },
      {
        id: 'click-reply-urgent',
        type: NODE_TYPES.CLICK,
        position: { x: 50, y: 800 },
        config: {
          selector: 'Reply',
          selectorType: 'text',
          waitAfter: 1
        }
      },
      {
        id: 'click-archive',
        type: NODE_TYPES.CLICK,
        position: { x: 200, y: 800 },
        config: {
          selector: '[data-tooltip="Archive"]',
          selectorType: 'css',
          waitAfter: 1
        }
      },
      {
        id: 'end-4',
        type: NODE_TYPES.END,
        position: { x: 100, y: 950 },
        config: {
          message: 'Email processing completed!'
        }
      }
    ],
    connections: [
      { from: 'start-4', to: 'navigate-gmail', outputPort: 'start', inputPort: 'trigger' },
      { from: 'navigate-gmail', to: 'loop-emails', outputPort: 'success', inputPort: 'trigger' },
      { from: 'loop-emails', to: 'click-first-email', outputPort: 'iteration', inputPort: 'trigger' },
      { from: 'click-first-email', to: 'extract-subject', outputPort: 'success', inputPort: 'trigger' },
      { from: 'extract-subject', to: 'condition-urgent', outputPort: 'success', inputPort: 'trigger' },
      { from: 'condition-urgent', to: 'click-reply-urgent', outputPort: 'true', inputPort: 'trigger' },
      { from: 'condition-urgent', to: 'click-archive', outputPort: 'false', inputPort: 'trigger' },
      { from: 'click-reply-urgent', to: 'end-4', outputPort: 'success', inputPort: 'trigger' },
      { from: 'click-archive', to: 'end-4', outputPort: 'success', inputPort: 'trigger' },
      { from: 'loop-emails', to: 'end-4', outputPort: 'complete', inputPort: 'trigger' }
    ]
  }
]

export const getTemplateById = (id) => {
  return WORKFLOW_TEMPLATES.find(template => template.id === id)
}

export const getTemplatesByCategory = (category) => {
  return WORKFLOW_TEMPLATES.filter(template => template.category === category)
}

export const getTemplatesByDifficulty = (difficulty) => {
  return WORKFLOW_TEMPLATES.filter(template => template.difficulty === difficulty)
}

export const getAllCategories = () => {
  return [...new Set(WORKFLOW_TEMPLATES.map(template => template.category))]
}

export const getAllDifficulties = () => {
  return [...new Set(WORKFLOW_TEMPLATES.map(template => template.difficulty))]
}