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