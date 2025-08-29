// Workflow Node Types and Configurations
export const NODE_TYPES = {
  // Action Nodes
  CLICK: 'click',
  INPUT: 'input',
  WAIT: 'wait',
  NAVIGATE: 'navigate',
  SCROLL: 'scroll',
  SCREENSHOT: 'screenshot',
  
  // Logic Nodes  
  CONDITION: 'condition',
  LOOP: 'loop',
  BRANCH: 'branch',
  
  // Data Nodes
  EXTRACT: 'extract',
  STORE: 'store',
  TRANSFORM: 'transform',
  
  // Control Nodes
  START: 'start',
  END: 'end',
  PAUSE: 'pause'
}

export const NODE_CATEGORIES = {
  ACTIONS: 'actions',
  LOGIC: 'logic', 
  DATA: 'data',
  CONTROL: 'control'
}

export const WORKFLOW_NODE_DEFINITIONS = [
  // Action Nodes
  {
    id: NODE_TYPES.CLICK,
    name: 'Click Element',
    category: NODE_CATEGORIES.ACTIONS,
    icon: '👆',
    description: 'Click on buttons, links, or any clickable element',
    inputs: ['trigger'],
    outputs: ['success', 'error'],
    configSchema: {
      selector: { type: 'text', label: 'Element Selector/Text', required: true },
      selectorType: { 
        type: 'select', 
        label: 'Selector Type', 
        options: ['text', 'id', 'class', 'xpath', 'css'],
        default: 'text'
      },
      waitAfter: { type: 'number', label: 'Wait After (seconds)', default: 1, min: 0, max: 60 },
      timeout: { type: 'number', label: 'Timeout (seconds)', default: 10, min: 1, max: 300 }
    }
  },
  
  {
    id: NODE_TYPES.INPUT,
    name: 'Fill Form Field',
    category: NODE_CATEGORIES.ACTIONS,
    icon: '✏️',
    description: 'Enter text into forms and input fields',
    inputs: ['trigger'],
    outputs: ['success', 'error'],
    configSchema: {
      selector: { type: 'text', label: 'Field Selector/Label', required: true },
      selectorType: { 
        type: 'select', 
        label: 'Selector Type', 
        options: ['label', 'id', 'class', 'xpath', 'css', 'placeholder'],
        default: 'label'
      },
      text: { type: 'textarea', label: 'Text to Enter', required: true },
      clearFirst: { type: 'boolean', label: 'Clear Field First', default: true },
      pressEnter: { type: 'boolean', label: 'Press Enter After', default: false }
    }
  },
  
  {
    id: NODE_TYPES.NAVIGATE,
    name: 'Navigate to URL',
    category: NODE_CATEGORIES.ACTIONS,
    icon: '🌐',
    description: 'Navigate to a specific web page',
    inputs: ['trigger'],
    outputs: ['success', 'error'],
    configSchema: {
      url: { type: 'url', label: 'Website URL', required: true },
      waitForLoad: { type: 'boolean', label: 'Wait for Page Load', default: true },
      timeout: { type: 'number', label: 'Load Timeout (seconds)', default: 30, min: 1, max: 300 }
    }
  },
  
  {
    id: NODE_TYPES.WAIT,
    name: 'Wait/Delay',
    category: NODE_CATEGORIES.ACTIONS,
    icon: '⏱️',
    description: 'Pause execution for a specified time',
    inputs: ['trigger'],
    outputs: ['success'],
    configSchema: {
      duration: { type: 'number', label: 'Duration (seconds)', required: true, default: 3, min: 0.1, max: 3600 },
      reason: { type: 'text', label: 'Wait Reason (optional)' }
    }
  },

  {
    id: NODE_TYPES.SCROLL,
    name: 'Scroll Page',
    category: NODE_CATEGORIES.ACTIONS,
    icon: '📜',
    description: 'Scroll the page up, down, or to an element',
    inputs: ['trigger'],
    outputs: ['success'],
    configSchema: {
      scrollType: { 
        type: 'select', 
        label: 'Scroll Type', 
        options: ['toTop', 'toBottom', 'toElement', 'byPixels'],
        default: 'toBottom'
      },
      target: { type: 'text', label: 'Target Element (if applicable)' },
      pixels: { type: 'number', label: 'Pixels to Scroll (if applicable)', default: 500 }
    }
  },

  // Logic Nodes
  {
    id: NODE_TYPES.CONDITION,
    name: 'Conditional Check',
    category: NODE_CATEGORIES.LOGIC,
    icon: '🔀',
    description: 'Make decisions based on page conditions',
    inputs: ['trigger'],
    outputs: ['true', 'false'],
    configSchema: {
      conditionType: { 
        type: 'select', 
        label: 'Condition Type', 
        options: ['elementExists', 'textExists', 'urlContains', 'titleContains'],
        required: true
      },
      value: { type: 'text', label: 'Value to Check', required: true },
      timeout: { type: 'number', label: 'Check Timeout (seconds)', default: 5, min: 1, max: 60 }
    }
  },
  
  {
    id: NODE_TYPES.LOOP,
    name: 'Loop/Repeat',
    category: NODE_CATEGORIES.LOGIC,
    icon: '🔄',
    description: 'Repeat a set of actions multiple times',
    inputs: ['trigger'],
    outputs: ['iteration', 'complete'],
    configSchema: {
      loopType: { 
        type: 'select', 
        label: 'Loop Type', 
        options: ['count', 'condition', 'infinite'],
        default: 'count'
      },
      iterations: { type: 'number', label: 'Number of Iterations', default: 3, min: 1, max: 10000 },
      condition: { type: 'text', label: 'Loop Condition (if applicable)' }
    }
  },

  // Data Nodes
  {
    id: NODE_TYPES.EXTRACT,
    name: 'Extract Data',
    category: NODE_CATEGORIES.DATA,
    icon: '📤',
    description: 'Extract text or data from the page',
    inputs: ['trigger'],
    outputs: ['success', 'error'],
    configSchema: {
      selector: { type: 'text', label: 'Element Selector', required: true },
      attribute: { 
        type: 'select', 
        label: 'Data to Extract', 
        options: ['text', 'value', 'href', 'src', 'innerHTML'],
        default: 'text'
      },
      variableName: { type: 'text', label: 'Store in Variable', required: true }
    }
  },

  // Enhanced Logic Nodes
  {
    id: NODE_TYPES.TRY_CATCH,
    name: 'Try/Catch Block',
    category: NODE_CATEGORIES.LOGIC,
    icon: '🛠️',
    description: 'Handle errors and exceptions gracefully',
    inputs: ['trigger'],
    outputs: ['success', 'error', 'finally'],
    configSchema: {
      maxRetries: { type: 'number', label: 'Max Retry Attempts', default: 3, min: 0, max: 10 },
      retryDelay: { type: 'number', label: 'Delay Between Retries (seconds)', default: 1, min: 0 },
      continueOnError: { type: 'boolean', label: 'Continue Workflow on Error', default: false },
      logErrors: { type: 'boolean', label: 'Log Error Details', default: true },
      errorMessage: { type: 'text', label: 'Custom Error Message' }
    }
  },

  {
    id: NODE_TYPES.BRANCH,
    name: 'Multi-Path Branch',
    category: NODE_CATEGORIES.LOGIC,
    icon: '🌿',
    description: 'Split workflow into multiple parallel paths',
    inputs: ['trigger'],
    outputs: ['path1', 'path2', 'path3', 'path4'],
    configSchema: {
      branchCount: { type: 'number', label: 'Number of Branches', default: 2, min: 2, max: 4 },
      waitForAll: { type: 'boolean', label: 'Wait for All Branches to Complete', default: false },
      timeout: { type: 'number', label: 'Branch Timeout (seconds)', default: 300, min: 10 },
      failOnError: { type: 'boolean', label: 'Fail if Any Branch Errors', default: true }
    }
  },

  // API & Integration Nodes  
  {
    id: NODE_TYPES.HTTP_REQUEST,
    name: 'HTTP Request',
    category: NODE_CATEGORIES.INTEGRATIONS,
    icon: '🌐',
    description: 'Make HTTP requests to APIs and web services',
    inputs: ['trigger'],
    outputs: ['success', 'error'],
    configSchema: {
      method: { 
        type: 'select', 
        label: 'HTTP Method', 
        options: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        default: 'GET'
      },
      url: { type: 'url', label: 'Request URL', required: true },
      headers: { 
        type: 'object', 
        label: 'Request Headers', 
        placeholder: '{"Content-Type": "application/json"}'
      },
      body: { type: 'textarea', label: 'Request Body (for POST/PUT)' },
      timeout: { type: 'number', label: 'Request Timeout (seconds)', default: 30, min: 1, max: 300 },
      followRedirects: { type: 'boolean', label: 'Follow Redirects', default: true },
      validateStatus: { type: 'boolean', label: 'Validate HTTP Status', default: true },
      variableName: { type: 'text', label: 'Store response in variable', default: 'http_response', required: true }
    }
  },

  {
    id: NODE_TYPES.WEBHOOK,
    name: 'Webhook Trigger',
    category: NODE_CATEGORIES.INTEGRATIONS,
    icon: '🎯',
    description: 'Receive HTTP webhook notifications',
    inputs: [],
    outputs: ['received'],
    configSchema: {
      endpoint: { type: 'text', label: 'Webhook Endpoint Path', required: true, default: '/webhook' },
      method: { 
        type: 'select', 
        label: 'HTTP Method', 
        options: ['POST', 'GET', 'PUT'],
        default: 'POST'
      },
      authentication: { 
        type: 'select', 
        label: 'Authentication Method', 
        options: ['none', 'secret', 'bearer_token'],
        default: 'none'
      },
      secret: { type: 'password', label: 'Webhook Secret (optional)' },
      parseJson: { type: 'boolean', label: 'Parse JSON Body', default: true },
      variableName: { type: 'text', label: 'Store payload in variable', default: 'webhook_data', required: true }
    }
  },

  {
    id: NODE_TYPES.DATABASE_QUERY,
    name: 'Database Query',
    category: NODE_CATEGORIES.INTEGRATIONS,
    icon: '🗄️',
    description: 'Execute SQL queries on databases',
    inputs: ['trigger'],
    outputs: ['success', 'error'],
    configSchema: {
      connectionString: { type: 'text', label: 'Database Connection String', required: true },
      query: { type: 'textarea', label: 'SQL Query', required: true },
      parameters: { 
        type: 'object', 
        label: 'Query Parameters', 
        placeholder: '{"id": 123, "name": "example"}'
      },
      timeout: { type: 'number', label: 'Query Timeout (seconds)', default: 60, min: 1, max: 300 },
      maxRows: { type: 'number', label: 'Max Rows to Return (0 = all)', default: 1000, min: 0 },
      variableName: { type: 'text', label: 'Store results in variable', default: 'db_results', required: true }
    }
  },

  {
    id: NODE_TYPES.SEND_EMAIL,
    name: 'Send Email',
    category: NODE_CATEGORIES.INTEGRATIONS,
    icon: '📧',
    description: 'Send email notifications and reports',
    inputs: ['trigger'],
    outputs: ['success', 'error'],
    configSchema: {
      smtpHost: { type: 'text', label: 'SMTP Host', required: true },
      smtpPort: { type: 'number', label: 'SMTP Port', default: 587, min: 1, max: 65535 },
      username: { type: 'text', label: 'SMTP Username', required: true },
      password: { type: 'password', label: 'SMTP Password', required: true },
      from: { type: 'email', label: 'From Email Address', required: true },
      to: { type: 'text', label: 'To Email Addresses (comma separated)', required: true },
      cc: { type: 'text', label: 'CC Email Addresses (comma separated)' },
      bcc: { type: 'text', label: 'BCC Email Addresses (comma separated)' },
      subject: { type: 'text', label: 'Email Subject', required: true },
      body: { type: 'textarea', label: 'Email Body', required: true },
      isHtml: { type: 'boolean', label: 'Send as HTML', default: false },
      attachments: { 
        type: 'array', 
        label: 'File Attachments',
        itemSchema: { type: 'file', label: 'Attachment File' }
      }
    }
  },

  {
    id: NODE_TYPES.SLACK_MESSAGE,
    name: 'Slack Message',
    category: NODE_CATEGORIES.INTEGRATIONS,
    icon: '💬',
    description: 'Send messages to Slack channels',
    inputs: ['trigger'],
    outputs: ['success', 'error'],
    configSchema: {
      webhookUrl: { type: 'url', label: 'Slack Webhook URL', required: true },
      channel: { type: 'text', label: 'Channel Name (optional)', placeholder: '#general' },
      username: { type: 'text', label: 'Bot Username', default: 'RPA Bot' },
      message: { type: 'textarea', label: 'Message Text', required: true },
      emoji: { type: 'text', label: 'Bot Emoji', default: ':robot_face:' },
      color: { 
        type: 'select', 
        label: 'Message Color', 
        options: ['good', 'warning', 'danger', 'custom'],
        default: 'good'
      },
      customColor: { type: 'color', label: 'Custom Color (hex)', default: '#1db8ce' },
      includeAttachments: { type: 'boolean', label: 'Include Rich Attachments', default: false }
    }
  },

  // Enhanced Security Nodes
  {
    id: NODE_TYPES.CHECK_SECURITY,
    name: 'Security Scan',
    category: NODE_CATEGORIES.SECURITY,
    icon: '🔍',
    description: 'Perform security scans and vulnerability checks',
    inputs: ['trigger'],
    outputs: ['passed', 'failed', 'warning'],
    configSchema: {
      scanType: { 
        type: 'select', 
        label: 'Scan Type', 
        options: ['port_scan', 'ssl_check', 'headers_check', 'xss_check', 'sql_injection'],
        default: 'ssl_check'
      },
      target: { type: 'url', label: 'Target URL/IP', required: true },
      timeout: { type: 'number', label: 'Scan Timeout (seconds)', default: 120, min: 10, max: 600 },
      severity: { 
        type: 'select', 
        label: 'Alert Severity Level', 
        options: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
      },
      reportPath: { type: 'text', label: 'Save Report to File', default: './security_reports/scan.json' },
      variableName: { type: 'text', label: 'Store results in variable', default: 'security_scan', required: true }
    }
  },

  // Control Nodes
  {
    id: NODE_TYPES.START,
    name: 'Start',
    category: NODE_CATEGORIES.CONTROL,
    icon: '▶️',
    description: 'Workflow starting point',
    inputs: [],
    outputs: ['start'],
    configSchema: {}
  },

  {
    id: NODE_TYPES.END,
    name: 'End',
    category: NODE_CATEGORIES.CONTROL,
    icon: '⏹️',
    description: 'Workflow ending point',
    inputs: ['trigger'],
    outputs: [],
    configSchema: {
      message: { type: 'text', label: 'Completion Message' }
    }
  },

  {
    id: NODE_TYPES.PAUSE,
    name: 'Pause/Breakpoint',
    category: NODE_CATEGORIES.CONTROL,
    icon: '⏸️',
    description: 'Pause workflow execution for manual intervention',
    inputs: ['trigger'],
    outputs: ['resume'],
    configSchema: {
      message: { type: 'text', label: 'Pause Message', default: 'Workflow paused - waiting for manual action' },
      requireConfirmation: { type: 'boolean', label: 'Require Manual Confirmation', default: true },
      autoResume: { type: 'boolean', label: 'Auto Resume After Timeout', default: false },
      resumeTimeout: { type: 'number', label: 'Auto Resume Timeout (seconds)', default: 300, min: 10 }
    }
  },

  {
    id: NODE_TYPES.SCHEDULE,
    name: 'Schedule Trigger',
    category: NODE_CATEGORIES.CONTROL,
    icon: '⏰',
    description: 'Schedule workflow execution',
    inputs: [],
    outputs: ['triggered'],
    configSchema: {
      scheduleType: { 
        type: 'select', 
        label: 'Schedule Type', 
        options: ['cron', 'interval', 'once'],
        default: 'interval'
      },
      cronExpression: { type: 'text', label: 'Cron Expression', placeholder: '0 9 * * 1-5' },
      interval: { type: 'number', label: 'Interval (minutes)', default: 60, min: 1 },
      startTime: { type: 'datetime-local', label: 'Start Time (for once)' },
      timezone: { type: 'text', label: 'Timezone', default: 'UTC' },
      enabled: { type: 'boolean', label: 'Schedule Enabled', default: true }
    }
  }
]

export const WORKFLOW_STATUS = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed'
}

export const EXECUTION_STATUS = {
  PENDING: 'pending',
  RUNNING: 'running',
  SUCCESS: 'success',
  ERROR: 'error',
  SKIPPED: 'skipped'
}