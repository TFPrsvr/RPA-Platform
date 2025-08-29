/**
 * 🤖 AI-Powered Workflow Generator
 * Natural language processing to generate workflows from user descriptions
 */

import { logger } from '../middleware/errorHandler.js'
import { VariableResolver } from '../utils/variableResolver.js'

export class AIWorkflowGenerator {
  constructor(supabase) {
    this.supabase = supabase
    this.variableResolver = new VariableResolver()
    this.setupPatternMatchers()
    this.setupStepTemplates()
  }

  /**
   * Setup pattern matchers for different automation types
   */
  setupPatternMatchers() {
    this.patterns = {
      navigation: {
        keywords: ['go to', 'navigate to', 'visit', 'open', 'browse to'],
        examples: ['go to https://example.com', 'navigate to the login page'],
        stepType: 'navigate'
      },
      
      clicking: {
        keywords: ['click', 'press', 'tap', 'select', 'choose'],
        examples: ['click the login button', 'press submit', 'select the dropdown'],
        stepType: 'click'
      },
      
      typing: {
        keywords: ['type', 'enter', 'input', 'fill', 'write'],
        examples: ['type username', 'enter email address', 'fill in the form'],
        stepType: 'type'
      },
      
      waiting: {
        keywords: ['wait', 'pause', 'delay', 'sleep'],
        examples: ['wait 5 seconds', 'pause for loading', 'delay 2 minutes'],
        stepType: 'wait'
      },
      
      extraction: {
        keywords: ['extract', 'get', 'scrape', 'collect', 'gather', 'capture'],
        examples: ['extract all product names', 'get the price', 'scrape contact info'],
        stepType: 'extract_data'
      },
      
      screenshot: {
        keywords: ['screenshot', 'capture', 'take picture', 'save image'],
        examples: ['take a screenshot', 'capture the page', 'save image of results'],
        stepType: 'screenshot'
      },
      
      scrolling: {
        keywords: ['scroll', 'scroll down', 'scroll up', 'page down'],
        examples: ['scroll to bottom', 'scroll down the page', 'page down'],
        stepType: 'scroll'
      },
      
      conditions: {
        keywords: ['if', 'when', 'check if', 'verify', 'ensure'],
        examples: ['if login fails', 'when page loads', 'check if element exists'],
        stepType: 'condition'
      },
      
      loops: {
        keywords: ['repeat', 'for each', 'loop', 'iterate', 'do for all'],
        examples: ['repeat 5 times', 'for each product', 'loop through items'],
        stepType: 'loop'
      },
      
      email: {
        keywords: ['send email', 'email', 'notify', 'send message'],
        examples: ['send email notification', 'email the results', 'notify team'],
        stepType: 'send_email'
      },
      
      fileOperations: {
        keywords: ['save to file', 'export', 'download', 'save data', 'write file'],
        examples: ['save to CSV', 'export results', 'download file', 'write to database'],
        stepType: 'write_file'
      },
      
      apiCalls: {
        keywords: ['call api', 'send request', 'post data', 'get data from api'],
        examples: ['call the REST API', 'send POST request', 'get user data'],
        stepType: 'http_request'
      },
      
      waitForElement: {
        keywords: ['wait for', 'wait until', 'wait for element', 'until appears', 'until visible'],
        examples: ['wait for button to appear', 'wait until page loads', 'until element is visible'],
        stepType: 'wait_for_element'
      },
      
      pdfGeneration: {
        keywords: ['generate pdf', 'create pdf', 'save as pdf', 'pdf report', 'export pdf'],
        examples: ['generate PDF report', 'save page as PDF', 'create PDF document'],
        stepType: 'generate_pdf'
      },
      
      scriptExecution: {
        keywords: ['run script', 'execute javascript', 'run code', 'custom script'],
        examples: ['run custom JavaScript', 'execute script to modify page', 'run automation code'],
        stepType: 'execute_script'
      },
      
      attributeExtraction: {
        keywords: ['extract attribute', 'get attribute', 'extract href', 'get src', 'extract link'],
        examples: ['extract all links', 'get image sources', 'extract href attributes'],
        stepType: 'extract_attribute'
      },
      
      multiDataExtraction: {
        keywords: ['extract multiple', 'scrape all', 'get all data', 'collect all', 'extract various'],
        examples: ['extract all product details', 'scrape multiple data points', 'collect various information'],
        stepType: 'extract_data'
      },
      
      enterpriseLogin: {
        keywords: ['enterprise login', 'corporate portal', 'authenticate', 'sso login', 'enterprise portal'],
        examples: ['login to enterprise portal', 'authenticate with corporate credentials', 'access enterprise system'],
        stepType: 'type'
      },
      
      competitorMonitoring: {
        keywords: ['competitor', 'competition', 'monitor competitor', 'competitive analysis', 'market analysis'],
        examples: ['monitor competitor prices', 'analyze competition', 'track competitor changes'],
        stepType: 'extract_data'
      },
      
      leadGeneration: {
        keywords: ['lead generation', 'prospect', 'contact extraction', 'lead mining', 'prospect research'],
        examples: ['generate leads from website', 'extract contact information', 'research prospects'],
        stepType: 'extract_data'
      },
      
      complianceCheck: {
        keywords: ['compliance', 'regulatory', 'audit', 'regulation check', 'policy monitoring'],
        examples: ['check regulatory compliance', 'monitor policy changes', 'audit website compliance'],
        stepType: 'extract_text'
      },
      
      inventoryTracking: {
        keywords: ['inventory', 'stock level', 'supply chain', 'warehouse', 'product availability'],
        examples: ['track inventory levels', 'monitor stock availability', 'check product supply'],
        stepType: 'extract_data'
      },
      
      marketIntelligence: {
        keywords: ['market research', 'market intelligence', 'industry analysis', 'market data', 'business intelligence'],
        examples: ['gather market intelligence', 'research industry trends', 'collect market data'],
        stepType: 'extract_data'
      },
      
      securityTesting: {
        keywords: ['security test', 'vulnerability', 'security audit', 'penetration test', 'security scan'],
        examples: ['test website security', 'check for vulnerabilities', 'perform security audit'],
        stepType: 'execute_script'
      },
      
      performanceTesting: {
        keywords: ['performance', 'load time', 'speed test', 'performance monitoring', 'website speed'],
        examples: ['test website performance', 'monitor page load times', 'check website speed'],
        stepType: 'execute_script'
      },
      
      dataValidation: {
        keywords: ['validate', 'verify', 'check accuracy', 'data quality', 'validate data'],
        examples: ['validate extracted data', 'verify information accuracy', 'check data quality'],
        stepType: 'condition'
      },

      // System Administration Patterns
      serverMonitoring: {
        keywords: ['monitor server', 'check health', 'system status', 'server health', 'uptime check'],
        examples: ['monitor server performance', 'check system health', 'verify server uptime'],
        stepType: 'system_check'
      },

      fileSystemMaintenance: {
        keywords: ['clean files', 'delete old files', 'file cleanup', 'disk space', 'file maintenance'],
        examples: ['clean old log files', 'delete temporary files', 'free disk space'],
        stepType: 'file_operation'
      },

      databaseMaintenance: {
        keywords: ['backup database', 'db maintenance', 'database cleanup', 'optimize database'],
        examples: ['backup database daily', 'optimize database performance', 'clean old records'],
        stepType: 'database_operation'
      },

      logAnalysis: {
        keywords: ['analyze logs', 'check logs', 'log parsing', 'error logs', 'log monitoring'],
        examples: ['analyze error logs', 'parse system logs', 'monitor application logs'],
        stepType: 'log_analysis'
      },

      // Data Processing Patterns
      csvProcessing: {
        keywords: ['process csv', 'csv transformation', 'excel processing', 'spreadsheet data'],
        examples: ['process CSV files', 'transform Excel data', 'convert spreadsheet format'],
        stepType: 'data_transformation'
      },

      jsonProcessing: {
        keywords: ['json processing', 'json validation', 'json transformation', 'api data'],
        examples: ['process JSON data', 'validate JSON structure', 'transform JSON format'],
        stepType: 'data_transformation'
      },

      dataMigration: {
        keywords: ['migrate data', 'data transfer', 'database migration', 'move data'],
        examples: ['migrate database records', 'transfer data between systems', 'move user data'],
        stepType: 'data_migration'
      },

      reportGeneration: {
        keywords: ['generate report', 'create report', 'business report', 'data report'],
        examples: ['generate monthly report', 'create sales report', 'compile business metrics'],
        stepType: 'report_generation'
      },

      // Security & Compliance Patterns
      securityAuditNonWeb: {
        keywords: ['security audit', 'vulnerability scan', 'security check', 'compliance audit'],
        examples: ['perform security audit', 'scan for vulnerabilities', 'check security compliance'],
        stepType: 'security_audit'
      },

      accessLogAnalysis: {
        keywords: ['access logs', 'login audit', 'user activity', 'access monitoring'],
        examples: ['analyze access logs', 'audit user logins', 'monitor user activity'],
        stepType: 'log_analysis'
      },

      certificateMonitoring: {
        keywords: ['certificate check', 'ssl monitoring', 'cert renewal', 'certificate expiry'],
        examples: ['check SSL certificates', 'monitor certificate expiry', 'renew certificates'],
        stepType: 'certificate_check'
      },

      // Business Process Patterns
      invoiceProcessing: {
        keywords: ['process invoice', 'invoice validation', 'billing automation', 'payment processing'],
        examples: ['process customer invoices', 'validate billing data', 'automate payment workflow'],
        stepType: 'invoice_processing'
      },

      customerOnboarding: {
        keywords: ['onboard customer', 'customer setup', 'account creation', 'user provisioning'],
        examples: ['onboard new customer', 'setup customer account', 'provision user access'],
        stepType: 'customer_onboarding'
      },

      inventoryManagement: {
        keywords: ['manage inventory', 'stock management', 'inventory update', 'product tracking'],
        examples: ['update inventory levels', 'track product stock', 'manage warehouse inventory'],
        stepType: 'inventory_management'
      }
    }
  }

  /**
   * Setup step templates for common automation patterns
   */
  setupStepTemplates() {
    this.stepTemplates = {
      webScraping: {
        name: 'Web Scraping Template',
        description: 'Extract data from a website',
        steps: [
          { type: 'navigate', description: 'Navigate to target website' },
          { type: 'wait', description: 'Wait for page to load' },
          { type: 'extract_data', description: 'Extract required data' },
          { type: 'write_file', description: 'Save extracted data' }
        ]
      },
      
      formAutomation: {
        name: 'Form Automation Template',
        description: 'Fill and submit web forms',
        steps: [
          { type: 'navigate', description: 'Navigate to form page' },
          { type: 'type', description: 'Fill form fields' },
          { type: 'click', description: 'Submit form' },
          { type: 'wait', description: 'Wait for confirmation' },
          { type: 'screenshot', description: 'Capture result' }
        ]
      },
      
      dataProcessing: {
        name: 'Data Processing Template',
        description: 'Process and transform data',
        steps: [
          { type: 'read_file', description: 'Read input data' },
          { type: 'transform_data', description: 'Process data' },
          { type: 'condition', description: 'Validate results' },
          { type: 'write_file', description: 'Save processed data' }
        ]
      },
      
      apiIntegration: {
        name: 'API Integration Template',
        description: 'Integrate with external APIs',
        steps: [
          { type: 'http_request', description: 'Call external API' },
          { type: 'condition', description: 'Check response status' },
          { type: 'transform_data', description: 'Process API response' },
          { type: 'send_email', description: 'Send notification' }
        ]
      },
      
      monitoringAlert: {
        name: 'Monitoring & Alert Template',
        description: 'Monitor websites and send alerts',
        steps: [
          { type: 'navigate', description: 'Navigate to monitoring target' },
          { type: 'extract_data', description: 'Extract status information' },
          { type: 'condition', description: 'Check if alert condition met' },
          { type: 'send_email', description: 'Send alert notification' }
        ]
      },
      
      advancedWebScraping: {
        name: 'Advanced Web Scraping Template',
        description: 'Comprehensive web scraping with browser automation',
        steps: [
          { type: 'navigate', description: 'Navigate to target website' },
          { type: 'wait_for_element', description: 'Wait for content to load' },
          { type: 'scroll', description: 'Scroll to load dynamic content' },
          { type: 'extract_data', description: 'Extract multiple data points' },
          { type: 'screenshot', description: 'Capture page for verification' },
          { type: 'generate_pdf', description: 'Generate PDF report' },
          { type: 'write_file', description: 'Save scraped data' }
        ]
      },
      
      eCommerceAutomation: {
        name: 'E-commerce Automation Template',
        description: 'Automate online shopping and product research',
        steps: [
          { type: 'navigate', description: 'Navigate to e-commerce site' },
          { type: 'type', description: 'Search for products' },
          { type: 'click', description: 'Submit search' },
          { type: 'wait_for_element', description: 'Wait for search results' },
          { type: 'extract_data', description: 'Extract product information' },
          { type: 'loop', description: 'Process multiple pages' },
          { type: 'extract_attribute', description: 'Extract product links' },
          { type: 'write_file', description: 'Save product data' }
        ]
      },
      
      socialMediaAutomation: {
        name: 'Social Media Automation Template',
        description: 'Automate social media interactions and monitoring',
        steps: [
          { type: 'navigate', description: 'Navigate to social platform' },
          { type: 'wait_for_element', description: 'Wait for login elements' },
          { type: 'type', description: 'Enter credentials' },
          { type: 'click', description: 'Login' },
          { type: 'wait', description: 'Wait for dashboard' },
          { type: 'extract_data', description: 'Extract social media metrics' },
          { type: 'screenshot', description: 'Capture analytics dashboard' },
          { type: 'send_email', description: 'Send report' }
        ]
      },
      
      qualityAssurance: {
        name: 'QA Testing Automation Template',
        description: 'Automated quality assurance testing',
        steps: [
          { type: 'navigate', description: 'Navigate to application' },
          { type: 'screenshot', description: 'Capture initial state' },
          { type: 'click', description: 'Test navigation elements' },
          { type: 'type', description: 'Test form inputs' },
          { type: 'wait_for_element', description: 'Verify elements load' },
          { type: 'extract_text', description: 'Verify text content' },
          { type: 'condition', description: 'Check test conditions' },
          { type: 'generate_pdf', description: 'Generate test report' }
        ]
      },
      
      dataCollection: {
        name: 'Comprehensive Data Collection Template',
        description: 'Collect various types of data from web sources',
        steps: [
          { type: 'navigate', description: 'Navigate to data source' },
          { type: 'execute_script', description: 'Run custom data collection script' },
          { type: 'extract_text', description: 'Extract text data' },
          { type: 'extract_attribute', description: 'Extract link and media URLs' },
          { type: 'scroll', description: 'Load additional content' },
          { type: 'extract_data', description: 'Extract structured data' },
          { type: 'write_file', description: 'Save collected data' },
          { type: 'http_request', description: 'Send data to API' }
        ]
      },

      enterpriseDataMining: {
        name: 'Enterprise Data Mining Template',
        description: 'Large-scale data extraction for enterprise analytics',
        steps: [
          { type: 'navigate', description: 'Navigate to enterprise portal' },
          { type: 'wait_for_element', description: 'Wait for authentication prompt' },
          { type: 'type', description: 'Enter enterprise credentials' },
          { type: 'click', description: 'Submit login' },
          { type: 'wait_for_element', description: 'Wait for dashboard load' },
          { type: 'execute_script', description: 'Inject data mining script' },
          { type: 'loop', description: 'Process multiple data sources' },
          { type: 'extract_data', description: 'Extract structured enterprise data' },
          { type: 'generate_pdf', description: 'Create executive report' },
          { type: 'screenshot', description: 'Capture evidence screenshots' },
          { type: 'http_request', description: 'Upload to data warehouse' },
          { type: 'send_email', description: 'Send completion notification' }
        ]
      },

      competitorAnalysis: {
        name: 'Competitor Analysis Automation',
        description: 'Monitor competitor websites and extract intelligence',
        steps: [
          { type: 'navigate', description: 'Navigate to competitor website' },
          { type: 'screenshot', description: 'Capture homepage' },
          { type: 'extract_data', description: 'Extract pricing information' },
          { type: 'click', description: 'Navigate to products page' },
          { type: 'wait_for_element', description: 'Wait for product listings' },
          { type: 'scroll', description: 'Load all product listings' },
          { type: 'extract_attribute', description: 'Extract product URLs and images' },
          { type: 'loop', description: 'Process each product category' },
          { type: 'execute_script', description: 'Calculate pricing metrics' },
          { type: 'generate_pdf', description: 'Generate analysis report' },
          { type: 'http_request', description: 'Update competitive database' },
          { type: 'condition', description: 'Check for price changes' },
          { type: 'send_email', description: 'Alert team of significant changes' }
        ]
      },

      leadGeneration: {
        name: 'Advanced Lead Generation Template',
        description: 'Extract contact information and qualify leads',
        steps: [
          { type: 'navigate', description: 'Navigate to prospect website' },
          { type: 'extract_text', description: 'Extract company information' },
          { type: 'click', description: 'Navigate to contact/about page' },
          { type: 'extract_data', description: 'Extract contact details' },
          { type: 'extract_attribute', description: 'Extract social media links' },
          { type: 'navigate', description: 'Visit LinkedIn company page' },
          { type: 'wait_for_element', description: 'Wait for profile data' },
          { type: 'extract_data', description: 'Extract employee count and details' },
          { type: 'execute_script', description: 'Calculate lead scoring' },
          { type: 'condition', description: 'Qualify lead based on criteria' },
          { type: 'http_request', description: 'Enrich data via APIs' },
          { type: 'write_file', description: 'Save qualified leads' },
          { type: 'send_email', description: 'Notify sales team' }
        ]
      },

      complianceMonitoring: {
        name: 'Regulatory Compliance Monitoring',
        description: 'Monitor regulatory websites for compliance changes',
        steps: [
          { type: 'navigate', description: 'Navigate to regulatory website' },
          { type: 'extract_text', description: 'Extract current regulations' },
          { type: 'write_file', description: 'Save current state' },
          { type: 'http_request', description: 'Compare with previous version' },
          { type: 'condition', description: 'Check for regulatory changes' },
          { type: 'extract_data', description: 'Extract change details' },
          { type: 'generate_pdf', description: 'Generate compliance report' },
          { type: 'screenshot', description: 'Capture regulatory notices' },
          { type: 'send_email', description: 'Alert compliance team' },
          { type: 'http_request', description: 'Update compliance database' }
        ]
      },

      inventoryMonitoring: {
        name: 'E-commerce Inventory Monitoring',
        description: 'Monitor supplier inventory and pricing changes',
        steps: [
          { type: 'navigate', description: 'Navigate to supplier portal' },
          { type: 'type', description: 'Enter login credentials' },
          { type: 'click', description: 'Submit login' },
          { type: 'wait_for_element', description: 'Wait for dashboard' },
          { type: 'navigate', description: 'Go to inventory section' },
          { type: 'extract_data', description: 'Extract stock levels' },
          { type: 'extract_attribute', description: 'Extract product SKUs' },
          { type: 'loop', description: 'Check each product category' },
          { type: 'execute_script', description: 'Calculate reorder points' },
          { type: 'condition', description: 'Check for low stock alerts' },
          { type: 'screenshot', description: 'Capture inventory dashboard' },
          { type: 'write_file', description: 'Save inventory data' },
          { type: 'http_request', description: 'Update ERP system' },
          { type: 'send_email', description: 'Send reorder notifications' }
        ]
      },

      marketResearch: {
        name: 'Comprehensive Market Research Template',
        description: 'Gather market intelligence across multiple sources',
        steps: [
          { type: 'navigate', description: 'Navigate to industry report site' },
          { type: 'extract_data', description: 'Extract market size data' },
          { type: 'screenshot', description: 'Capture key charts' },
          { type: 'navigate', description: 'Visit competitor websites' },
          { type: 'loop', description: 'Process each competitor' },
          { type: 'extract_data', description: 'Extract competitor metrics' },
          { type: 'navigate', description: 'Check social media sentiment' },
          { type: 'extract_text', description: 'Extract customer feedback' },
          { type: 'execute_script', description: 'Perform sentiment analysis' },
          { type: 'generate_pdf', description: 'Create market research report' },
          { type: 'http_request', description: 'Store in research database' },
          { type: 'send_email', description: 'Distribute to stakeholders' }
        ]
      },

      securityAudit: {
        name: 'Website Security Audit Template',
        description: 'Automated security testing and vulnerability assessment',
        steps: [
          { type: 'navigate', description: 'Navigate to target website' },
          { type: 'screenshot', description: 'Capture initial state' },
          { type: 'execute_script', description: 'Check for common vulnerabilities' },
          { type: 'extract_text', description: 'Extract security headers' },
          { type: 'navigate', description: 'Test login pages' },
          { type: 'type', description: 'Test SQL injection patterns' },
          { type: 'wait_for_element', description: 'Check error responses' },
          { type: 'execute_script', description: 'Test XSS vulnerabilities' },
          { type: 'extract_data', description: 'Extract security findings' },
          { type: 'generate_pdf', description: 'Generate security report' },
          { type: 'condition', description: 'Check severity levels' },
          { type: 'send_email', description: 'Send critical alerts' },
          { type: 'http_request', description: 'Update security database' }
        ]
      },

      performanceMonitoring: {
        name: 'Website Performance Monitoring Template',
        description: 'Monitor website performance and user experience',
        steps: [
          { type: 'navigate', description: 'Navigate to target website' },
          { type: 'execute_script', description: 'Start performance monitoring' },
          { type: 'wait_for_element', description: 'Wait for full page load' },
          { type: 'execute_script', description: 'Measure load times' },
          { type: 'scroll', description: 'Test scroll performance' },
          { type: 'click', description: 'Test interaction responsiveness' },
          { type: 'screenshot', description: 'Capture performance metrics' },
          { type: 'extract_data', description: 'Extract timing data' },
          { type: 'condition', description: 'Check performance thresholds' },
          { type: 'generate_pdf', description: 'Generate performance report' },
          { type: 'http_request', description: 'Send to monitoring service' },
          { type: 'send_email', description: 'Alert on performance issues' }
        ]
      },

      // System Administration Templates
      serverHealthMonitoring: {
        name: 'Server Health Monitoring Template',
        description: 'Monitor server performance and system health',
        steps: [
          { type: 'system_check', description: 'Check CPU usage and memory' },
          { type: 'system_check', description: 'Monitor disk space' },
          { type: 'system_check', description: 'Verify network connectivity' },
          { type: 'system_check', description: 'Check running services' },
          { type: 'log_analysis', description: 'Analyze system logs' },
          { type: 'condition', description: 'Check alert thresholds' },
          { type: 'write_file', description: 'Save health report' },
          { type: 'send_email', description: 'Send alerts if issues found' },
          { type: 'http_request', description: 'Update monitoring dashboard' }
        ]
      },

      fileSystemCleanup: {
        name: 'File System Maintenance Template',
        description: 'Automated file system cleanup and maintenance',
        steps: [
          { type: 'file_operation', description: 'Scan for old temporary files' },
          { type: 'file_operation', description: 'Identify large unused files' },
          { type: 'condition', description: 'Check file age and access time' },
          { type: 'file_operation', description: 'Delete expired files' },
          { type: 'file_operation', description: 'Compress old log files' },
          { type: 'system_check', description: 'Verify disk space freed' },
          { type: 'write_file', description: 'Log cleanup actions' },
          { type: 'send_email', description: 'Send cleanup summary' }
        ]
      },

      databaseBackupMaintenance: {
        name: 'Database Backup and Maintenance Template',
        description: 'Automated database backup and optimization',
        steps: [
          { type: 'database_operation', description: 'Create database backup' },
          { type: 'condition', description: 'Verify backup integrity' },
          { type: 'database_operation', description: 'Optimize database tables' },
          { type: 'database_operation', description: 'Update table statistics' },
          { type: 'database_operation', description: 'Clean expired records' },
          { type: 'file_operation', description: 'Archive old backup files' },
          { type: 'write_file', description: 'Generate maintenance report' },
          { type: 'send_email', description: 'Send backup confirmation' },
          { type: 'http_request', description: 'Update backup status dashboard' }
        ]
      },

      logAnalysisAlert: {
        name: 'Log Analysis and Alerting Template',
        description: 'Analyze system logs and trigger alerts',
        steps: [
          { type: 'log_analysis', description: 'Parse application logs' },
          { type: 'log_analysis', description: 'Extract error patterns' },
          { type: 'log_analysis', description: 'Count error frequencies' },
          { type: 'condition', description: 'Check error thresholds' },
          { type: 'data_transformation', description: 'Categorize log entries' },
          { type: 'write_file', description: 'Save analysis results' },
          { type: 'condition', description: 'Determine alert severity' },
          { type: 'send_email', description: 'Send critical alerts' },
          { type: 'http_request', description: 'Update incident tracking' }
        ]
      },

      // Data Processing Templates
      csvDataProcessing: {
        name: 'CSV Data Processing and Transformation',
        description: 'Process and transform CSV data files',
        steps: [
          { type: 'read_file', description: 'Load CSV input file' },
          { type: 'data_transformation', description: 'Validate data format' },
          { type: 'data_transformation', description: 'Clean and normalize data' },
          { type: 'data_transformation', description: 'Apply business rules' },
          { type: 'condition', description: 'Validate processed data' },
          { type: 'data_transformation', description: 'Calculate derived fields' },
          { type: 'write_file', description: 'Export processed CSV' },
          { type: 'write_file', description: 'Generate processing log' },
          { type: 'send_email', description: 'Send completion notification' }
        ]
      },

      jsonDataValidation: {
        name: 'JSON Data Validation and Processing',
        description: 'Validate and transform JSON data structures',
        steps: [
          { type: 'read_file', description: 'Load JSON data file' },
          { type: 'data_transformation', description: 'Validate JSON schema' },
          { type: 'condition', description: 'Check required fields' },
          { type: 'data_transformation', description: 'Transform data structure' },
          { type: 'data_transformation', description: 'Apply data enrichment' },
          { type: 'condition', description: 'Validate business rules' },
          { type: 'write_file', description: 'Save processed JSON' },
          { type: 'http_request', description: 'Send to target system' },
          { type: 'write_file', description: 'Log processing results' }
        ]
      },

      databaseDataMigration: {
        name: 'Database Data Migration Template',
        description: 'Migrate data between database systems',
        steps: [
          { type: 'database_operation', description: 'Connect to source database' },
          { type: 'database_operation', description: 'Extract source data' },
          { type: 'data_transformation', description: 'Transform data format' },
          { type: 'condition', description: 'Validate data integrity' },
          { type: 'database_operation', description: 'Connect to target database' },
          { type: 'database_operation', description: 'Load transformed data' },
          { type: 'condition', description: 'Verify migration success' },
          { type: 'write_file', description: 'Generate migration report' },
          { type: 'send_email', description: 'Send migration summary' }
        ]
      },

      businessReportGeneration: {
        name: 'Business Report Generation Template',
        description: 'Generate comprehensive business reports',
        steps: [
          { type: 'database_operation', description: 'Query business data' },
          { type: 'http_request', description: 'Fetch external data sources' },
          { type: 'data_transformation', description: 'Aggregate and calculate metrics' },
          { type: 'data_transformation', description: 'Format report data' },
          { type: 'report_generation', description: 'Generate charts and graphs' },
          { type: 'report_generation', description: 'Create report template' },
          { type: 'generate_pdf', description: 'Export report as PDF' },
          { type: 'write_file', description: 'Save report data' },
          { type: 'send_email', description: 'Distribute report to stakeholders' }
        ]
      },

      // API Integration Templates
      restApiDataCollection: {
        name: 'REST API Data Collection Template',
        description: 'Collect and aggregate data from REST APIs',
        steps: [
          { type: 'http_request', description: 'Authenticate with API' },
          { type: 'http_request', description: 'Fetch data from multiple endpoints' },
          { type: 'condition', description: 'Check API response status' },
          { type: 'data_transformation', description: 'Parse API responses' },
          { type: 'data_transformation', description: 'Aggregate data from sources' },
          { type: 'condition', description: 'Validate collected data' },
          { type: 'write_file', description: 'Save aggregated data' },
          { type: 'database_operation', description: 'Store in database' },
          { type: 'send_email', description: 'Send collection summary' }
        ]
      },

      webhookProcessing: {
        name: 'Webhook Processing and Routing Template',
        description: 'Process incoming webhooks and route data',
        steps: [
          { type: 'http_request', description: 'Receive webhook data' },
          { type: 'data_transformation', description: 'Parse webhook payload' },
          { type: 'condition', description: 'Validate webhook signature' },
          { type: 'data_transformation', description: 'Transform payload data' },
          { type: 'condition', description: 'Route based on event type' },
          { type: 'database_operation', description: 'Store webhook data' },
          { type: 'http_request', description: 'Forward to target systems' },
          { type: 'write_file', description: 'Log webhook processing' },
          { type: 'send_email', description: 'Send processing notifications' }
        ]
      },

      thirdPartyIntegration: {
        name: 'Third-Party Service Integration Template',
        description: 'Integrate with external service providers',
        steps: [
          { type: 'http_request', description: 'Authenticate with service' },
          { type: 'data_transformation', description: 'Prepare integration data' },
          { type: 'http_request', description: 'Send data to service' },
          { type: 'condition', description: 'Check integration response' },
          { type: 'data_transformation', description: 'Process service response' },
          { type: 'database_operation', description: 'Update local records' },
          { type: 'condition', description: 'Handle integration errors' },
          { type: 'write_file', description: 'Log integration activity' },
          { type: 'send_email', description: 'Send integration status' }
        ]
      },

      apiHealthMonitoring: {
        name: 'API Health Monitoring Template',
        description: 'Monitor API endpoints and performance',
        steps: [
          { type: 'http_request', description: 'Test API endpoint availability' },
          { type: 'http_request', description: 'Check API response times' },
          { type: 'condition', description: 'Validate API responses' },
          { type: 'data_transformation', description: 'Calculate performance metrics' },
          { type: 'condition', description: 'Check SLA thresholds' },
          { type: 'write_file', description: 'Record monitoring data' },
          { type: 'condition', description: 'Determine alert conditions' },
          { type: 'send_email', description: 'Send performance alerts' },
          { type: 'http_request', description: 'Update monitoring dashboard' }
        ]
      },

      // Security & Compliance Templates
      securityAuditSystem: {
        name: 'System Security Audit Template',
        description: 'Comprehensive security audit and vulnerability assessment',
        steps: [
          { type: 'security_audit', description: 'Scan system for vulnerabilities' },
          { type: 'security_audit', description: 'Check user permissions' },
          { type: 'security_audit', description: 'Verify security configurations' },
          { type: 'log_analysis', description: 'Analyze security logs' },
          { type: 'condition', description: 'Assess vulnerability severity' },
          { type: 'report_generation', description: 'Generate security report' },
          { type: 'condition', description: 'Check compliance requirements' },
          { type: 'send_email', description: 'Send critical security alerts' },
          { type: 'database_operation', description: 'Update security database' }
        ]
      },

      accessLogAudit: {
        name: 'Access Log Audit Template',
        description: 'Audit user access patterns and security events',
        steps: [
          { type: 'log_analysis', description: 'Parse access log files' },
          { type: 'data_transformation', description: 'Extract user activity patterns' },
          { type: 'condition', description: 'Identify suspicious activities' },
          { type: 'data_transformation', description: 'Correlate security events' },
          { type: 'condition', description: 'Check compliance violations' },
          { type: 'report_generation', description: 'Generate audit report' },
          { type: 'condition', description: 'Trigger security alerts' },
          { type: 'send_email', description: 'Send audit notifications' },
          { type: 'database_operation', description: 'Store audit results' }
        ]
      },

      complianceReporting: {
        name: 'Compliance Reporting Template',
        description: 'Generate regulatory compliance reports',
        steps: [
          { type: 'database_operation', description: 'Collect compliance data' },
          { type: 'log_analysis', description: 'Analyze compliance logs' },
          { type: 'condition', description: 'Check regulatory requirements' },
          { type: 'data_transformation', description: 'Format compliance metrics' },
          { type: 'report_generation', description: 'Generate compliance report' },
          { type: 'condition', description: 'Validate report completeness' },
          { type: 'generate_pdf', description: 'Create official report document' },
          { type: 'write_file', description: 'Archive compliance data' },
          { type: 'send_email', description: 'Submit to compliance team' }
        ]
      },

      certificateMonitoringSystem: {
        name: 'Certificate Monitoring and Renewal Template',
        description: 'Monitor SSL certificates and automate renewals',
        steps: [
          { type: 'certificate_check', description: 'Check certificate expiry dates' },
          { type: 'condition', description: 'Identify expiring certificates' },
          { type: 'certificate_check', description: 'Validate certificate chains' },
          { type: 'condition', description: 'Check renewal requirements' },
          { type: 'http_request', description: 'Request certificate renewal' },
          { type: 'certificate_check', description: 'Verify new certificates' },
          { type: 'write_file', description: 'Log certificate status' },
          { type: 'send_email', description: 'Send renewal notifications' },
          { type: 'database_operation', description: 'Update certificate inventory' }
        ]
      },

      // Business Process Templates
      invoiceProcessingSystem: {
        name: 'Invoice Processing and Validation Template',
        description: 'Automate invoice processing workflow',
        steps: [
          { type: 'read_file', description: 'Load invoice data files' },
          { type: 'data_transformation', description: 'Extract invoice information' },
          { type: 'condition', description: 'Validate invoice format' },
          { type: 'invoice_processing', description: 'Apply business rules' },
          { type: 'database_operation', description: 'Check against purchase orders' },
          { type: 'condition', description: 'Approve or flag for review' },
          { type: 'database_operation', description: 'Update accounting system' },
          { type: 'send_email', description: 'Send processing notifications' },
          { type: 'report_generation', description: 'Generate processing report' }
        ]
      },

      customerOnboardingSystem: {
        name: 'Customer Onboarding Automation Template',
        description: 'Automate new customer setup and provisioning',
        steps: [
          { type: 'read_file', description: 'Load customer registration data' },
          { type: 'data_transformation', description: 'Validate customer information' },
          { type: 'customer_onboarding', description: 'Create customer account' },
          { type: 'database_operation', description: 'Setup customer profile' },
          { type: 'http_request', description: 'Provision access credentials' },
          { type: 'send_email', description: 'Send welcome email' },
          { type: 'database_operation', description: 'Create billing records' },
          { type: 'write_file', description: 'Log onboarding completion' },
          { type: 'http_request', description: 'Notify support team' }
        ]
      },

      inventoryManagementSystem: {
        name: 'Inventory Management Automation Template',
        description: 'Automate inventory tracking and management',
        steps: [
          { type: 'database_operation', description: 'Query current inventory levels' },
          { type: 'http_request', description: 'Fetch sales data' },
          { type: 'data_transformation', description: 'Calculate inventory changes' },
          { type: 'condition', description: 'Check reorder thresholds' },
          { type: 'inventory_management', description: 'Generate reorder recommendations' },
          { type: 'database_operation', description: 'Update inventory records' },
          { type: 'condition', description: 'Identify low stock alerts' },
          { type: 'send_email', description: 'Send inventory alerts' },
          { type: 'report_generation', description: 'Generate inventory report' }
        ]
      },

      financialReconciliation: {
        name: 'Financial Reconciliation Template',
        description: 'Automate financial data reconciliation process',
        steps: [
          { type: 'database_operation', description: 'Extract financial transactions' },
          { type: 'read_file', description: 'Load bank statement data' },
          { type: 'data_transformation', description: 'Match transactions' },
          { type: 'condition', description: 'Identify discrepancies' },
          { type: 'data_transformation', description: 'Calculate reconciliation differences' },
          { type: 'report_generation', description: 'Generate reconciliation report' },
          { type: 'condition', description: 'Flag exceptions for review' },
          { type: 'database_operation', description: 'Update accounting records' },
          { type: 'send_email', description: 'Send reconciliation summary' }
        ]
      }
    }
  }

  /**
   * Generate workflow from natural language description
   */
  async generateWorkflow(description, userId, options = {}) {
    try {
      logger.info('Generating workflow from description', { 
        description: description.substring(0, 100) + '...', 
        userId 
      })

      // Clean and prepare the description
      const cleanDescription = this.cleanDescription(description)
      
      // Analyze the description to understand intent
      const analysis = this.analyzeDescription(cleanDescription)
      
      // Generate workflow steps based on analysis
      const steps = this.generateSteps(analysis, cleanDescription)
      
      // Extract variables from description
      const variables = this.extractVariables(cleanDescription, steps)
      
      // Generate workflow metadata
      const metadata = this.generateMetadata(analysis, cleanDescription)
      
      // Create the workflow structure
      const workflow = {
        name: metadata.name,
        description: metadata.description,
        category: metadata.category,
        steps: steps,
        variables: variables,
        user_id: userId,
        status: 'draft',
        ai_generated: true,
        ai_confidence: analysis.confidence,
        ai_analysis: {
          intent: analysis.intent,
          complexity: analysis.complexity,
          patterns: analysis.patterns,
          originalDescription: description
        }
      }

      // Store the generated workflow
      const { data: savedWorkflow, error } = await this.supabase
        .from('workflows')
        .insert([workflow])
        .select()
        .single()

      if (error) {
        throw error
      }

      logger.info('AI workflow generated successfully', { 
        workflowId: savedWorkflow.id, 
        confidence: analysis.confidence 
      })

      return {
        workflow: savedWorkflow,
        analysis: analysis,
        suggestions: this.generateImprovementSuggestions(analysis, steps)
      }

    } catch (error) {
      logger.error('Error generating AI workflow', { error: error.message })
      throw error
    }
  }

  /**
   * Analyze natural language description to understand automation intent
   */
  analyzeDescription(description) {
    const analysis = {
      intent: 'unknown',
      confidence: 0,
      complexity: 'simple',
      patterns: [],
      entities: [],
      actions: []
    }

    const lowerDesc = description.toLowerCase()
    const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 0)
    
    // Detect automation patterns
    for (const [patternType, patternConfig] of Object.entries(this.patterns)) {
      const matchCount = patternConfig.keywords.filter(keyword => 
        lowerDesc.includes(keyword)
      ).length

      if (matchCount > 0) {
        analysis.patterns.push({
          type: patternType,
          confidence: matchCount / patternConfig.keywords.length,
          stepType: patternConfig.stepType
        })
      }
    }

    // Determine primary intent based on patterns
    if (analysis.patterns.length > 0) {
      const primaryPattern = analysis.patterns
        .sort((a, b) => b.confidence - a.confidence)[0]
      
      analysis.intent = this.determineIntent(analysis.patterns)
      analysis.confidence = this.calculateConfidence(analysis.patterns, sentences.length)
    }

    // Determine complexity
    analysis.complexity = this.determineComplexity(sentences.length, analysis.patterns.length)

    // Extract entities (URLs, file paths, numbers, etc.)
    analysis.entities = this.extractEntities(description)

    // Extract actions from each sentence
    analysis.actions = sentences.map(sentence => this.extractActions(sentence))

    return analysis
  }

  /**
   * Generate workflow steps based on analysis
   */
  generateSteps(analysis, description) {
    const steps = []
    let stepCounter = 1

    // Use template-based generation for high confidence
    if (analysis.confidence > 0.7) {
      const template = this.selectTemplate(analysis)
      if (template) {
        return this.generateStepsFromTemplate(template, analysis, description)
      }
    }

    // Pattern-based step generation
    const sortedPatterns = analysis.patterns.sort((a, b) => b.confidence - a.confidence)
    const processedActions = new Set()

    for (const action of analysis.actions.flat()) {
      if (processedActions.has(action.text)) continue
      
      const matchingPattern = sortedPatterns.find(p => 
        action.text.toLowerCase().includes(p.type) || 
        this.patterns[p.type].keywords.some(keyword => 
          action.text.toLowerCase().includes(keyword)
        )
      )

      if (matchingPattern) {
        const step = this.createStepFromPattern(matchingPattern, action, stepCounter++)
        if (step) {
          steps.push(step)
          processedActions.add(action.text)
        }
      }
    }

    // Add default steps if none generated
    if (steps.length === 0) {
      steps.push(...this.generateDefaultSteps(analysis))
    }

    return steps
  }

  /**
   * Create step from pattern and action
   */
  createStepFromPattern(pattern, action, stepIndex) {
    const stepConfig = {
      id: stepIndex.toString(),
      type: pattern.stepType,
      name: this.generateStepName(pattern.stepType, action.text),
      config: {}
    }

    switch (pattern.stepType) {
      case 'navigate':
        const url = this.extractURL(action.text) || '{{target_url}}'
        stepConfig.config = {
          url: url,
          waitAfter: 2000
        }
        break

      case 'click':
        const selector = this.extractSelector(action.text) || '{{click_selector}}'
        stepConfig.config = {
          selector: selector,
          waitAfter: 1000
        }
        break

      case 'type':
        const inputSelector = this.extractSelector(action.text) || '{{input_selector}}'
        const inputText = this.extractInputText(action.text) || '{{input_text}}'
        stepConfig.config = {
          selector: inputSelector,
          text: inputText,
          waitAfter: 500
        }
        break

      case 'wait':
        const duration = this.extractDuration(action.text) || 3000
        stepConfig.config = {
          duration: duration
        }
        break

      case 'extract_data':
        stepConfig.config = {
          selectors: this.extractDataSelectors(action.text),
          outputVariable: 'extracted_data'
        }
        break

      case 'screenshot':
        stepConfig.config = {
          filename: 'screenshot_{{date("timestamp")}}.png'
        }
        break

      case 'scroll':
        stepConfig.config = {
          direction: this.extractScrollDirection(action.text) || 'down',
          amount: this.extractScrollAmount(action.text) || 100
        }
        break

      case 'send_email':
        stepConfig.config = {
          to: '{{recipient_email}}',
          subject: 'Automation Result',
          body: '{{email_message}}'
        }
        break

      case 'write_file':
        stepConfig.config = {
          path: this.extractFilePath(action.text) || './output_{{date("timestamp")}}.txt',
          content: '{{file_content}}'
        }
        break

      case 'http_request':
        stepConfig.config = {
          url: this.extractURL(action.text) || '{{api_url}}',
          method: this.extractHTTPMethod(action.text) || 'GET',
          responseVariable: 'api_response'
        }
        break

      case 'wait_for_element':
        stepConfig.config = {
          selector: this.extractSelector(action.text) || '{{element_selector}}',
          timeout: this.extractTimeout(action.text) || 30000,
          visible: true
        }
        break

      case 'generate_pdf':
        stepConfig.config = {
          format: 'A4',
          printBackground: true,
          variableName: 'generated_pdf'
        }
        break

      case 'execute_script':
        stepConfig.config = {
          script: this.extractScript(action.text) || '// Custom JavaScript code\nreturn document.title;',
          variableName: 'script_result',
          timeout: 30000
        }
        break

      case 'extract_attribute':
        stepConfig.config = {
          selector: this.extractSelector(action.text) || '{{element_selector}}',
          attribute: this.extractAttribute(action.text) || 'href',
          multiple: action.text.toLowerCase().includes('all') || action.text.toLowerCase().includes('multiple'),
          variableName: 'extracted_attribute'
        }
        break

      case 'extract_data':
        stepConfig.config = {
          dataPoints: this.extractDataPoints(action.text) || [
            { name: 'title', selector: 'h1' },
            { name: 'description', selector: '.description' }
          ]
        }
        break

      // System Administration Step Types
      case 'system_check':
        stepConfig.config = {
          checkType: this.extractSystemCheckType(action.text) || 'health',
          thresholds: this.extractSystemThresholds(action.text),
          alertOnFailure: true,
          variableName: 'system_status'
        }
        break

      case 'file_operation':
        stepConfig.config = {
          operation: this.extractFileOperation(action.text) || 'cleanup',
          path: this.extractFilePath(action.text) || '/tmp',
          criteria: this.extractFileCriteria(action.text),
          backup: true,
          variableName: 'file_operation_result'
        }
        break

      case 'database_operation':
        stepConfig.config = {
          operation: this.extractDatabaseOperation(action.text) || 'query',
          query: this.extractDatabaseQuery(action.text) || '-- Query placeholder',
          database: '{{database_name}}',
          variableName: 'db_result'
        }
        break

      case 'log_analysis':
        stepConfig.config = {
          logPath: this.extractLogPath(action.text) || '/var/log',
          pattern: this.extractLogPattern(action.text) || 'ERROR|WARN',
          timeRange: this.extractTimeRange(action.text) || '24h',
          outputFormat: 'json',
          variableName: 'log_analysis_result'
        }
        break

      // Data Processing Step Types
      case 'data_transformation':
        stepConfig.config = {
          transformType: this.extractTransformationType(action.text) || 'format',
          inputFormat: this.extractDataFormat(action.text) || 'csv',
          outputFormat: this.extractOutputFormat(action.text) || 'json',
          rules: this.extractTransformationRules(action.text),
          variableName: 'transformed_data'
        }
        break

      case 'data_migration':
        stepConfig.config = {
          sourceConnection: '{{source_db}}',
          targetConnection: '{{target_db}}',
          batchSize: this.extractBatchSize(action.text) || 1000,
          validateData: true,
          rollbackOnError: true,
          variableName: 'migration_result'
        }
        break

      case 'report_generation':
        stepConfig.config = {
          reportType: this.extractReportType(action.text) || 'summary',
          dataSource: '{{data_source}}',
          template: this.extractReportTemplate(action.text) || 'standard',
          format: this.extractReportFormat(action.text) || 'pdf',
          variableName: 'generated_report'
        }
        break

      // Security & Compliance Step Types
      case 'security_audit':
        stepConfig.config = {
          auditType: this.extractAuditType(action.text) || 'vulnerability',
          scanDepth: this.extractScanDepth(action.text) || 'standard',
          compliance: this.extractComplianceStandard(action.text),
          generateReport: true,
          variableName: 'audit_result'
        }
        break

      case 'certificate_check':
        stepConfig.config = {
          certificatePath: this.extractCertificatePath(action.text) || '/etc/ssl/certs',
          checkExpiry: true,
          daysWarning: this.extractWarningDays(action.text) || 30,
          autoRenew: false,
          variableName: 'certificate_status'
        }
        break

      // Business Process Step Types
      case 'invoice_processing':
        stepConfig.config = {
          processingRules: this.extractInvoiceRules(action.text),
          approvalThreshold: this.extractApprovalThreshold(action.text) || 1000,
          validateVendor: true,
          integrationEndpoint: '{{accounting_api}}',
          variableName: 'invoice_result'
        }
        break

      case 'customer_onboarding':
        stepConfig.config = {
          onboardingSteps: this.extractOnboardingSteps(action.text),
          provisioningConfig: this.extractProvisioningConfig(action.text),
          notificationTemplates: this.extractNotificationTemplates(action.text),
          variableName: 'onboarding_result'
        }
        break

      case 'inventory_management':
        stepConfig.config = {
          operation: this.extractInventoryOperation(action.text) || 'update',
          reorderThreshold: this.extractReorderThreshold(action.text) || 10,
          suppliers: this.extractSuppliers(action.text),
          variableName: 'inventory_result'
        }
        break

      default:
        return null
    }

    return stepConfig
  }

  /**
   * Generate steps from template
   */
  generateStepsFromTemplate(template, analysis, description) {
    const steps = []
    let stepCounter = 1

    for (const templateStep of template.steps) {
      const step = {
        id: stepCounter.toString(),
        type: templateStep.type,
        name: templateStep.description,
        config: this.generateStepConfig(templateStep.type, analysis, description)
      }
      
      steps.push(step)
      stepCounter++
    }

    return steps
  }

  /**
   * Generate step configuration based on type and analysis
   */
  generateStepConfig(stepType, analysis, description) {
    const config = {}

    switch (stepType) {
      case 'navigate':
        const url = this.extractURL(description)
        config.url = url || '{{target_url}}'
        config.waitAfter = 2000
        break

      case 'type':
        config.selector = '{{input_selector}}'
        config.text = '{{input_text}}'
        config.waitAfter = 500
        break

      case 'click':
        config.selector = '{{button_selector}}'
        config.waitAfter = 1000
        break

      case 'wait':
        config.duration = 3000
        break

      case 'extract_data':
        config.selectors = { data: '{{data_selector}}' }
        config.outputVariable = 'extracted_data'
        break

      case 'screenshot':
        config.filename = 'result_{{date("timestamp")}}.png'
        break

      case 'write_file':
        config.path = './results_{{date("timestamp")}}.json'
        config.content = '{{output_data}}'
        break

      case 'send_email':
        config.to = '{{notification_email}}'
        config.subject = 'Workflow Completed'
        config.body = 'The automation workflow has completed successfully.'
        break

      case 'http_request':
        config.url = '{{api_endpoint}}'
        config.method = 'GET'
        config.responseVariable = 'api_response'
        break

      case 'system_check':
        config.checkType = 'health'
        config.thresholds = { cpu: 80, memory: 85, disk: 90 }
        config.alertOnFailure = true
        config.variableName = 'system_status'
        break

      case 'file_operation':
        config.operation = 'cleanup'
        config.path = '/tmp'
        config.criteria = { olderThan: '7d', largerThan: '100MB' }
        config.backup = true
        config.variableName = 'file_operation_result'
        break

      case 'database_operation':
        config.operation = 'backup'
        config.database = '{{database_name}}'
        config.variableName = 'db_result'
        break

      case 'log_analysis':
        config.logPath = '/var/log'
        config.pattern = 'ERROR|WARN'
        config.timeRange = '24h'
        config.outputFormat = 'json'
        config.variableName = 'log_analysis_result'
        break

      case 'data_transformation':
        config.transformType = 'format'
        config.inputFormat = 'csv'
        config.outputFormat = 'json'
        config.variableName = 'transformed_data'
        break

      case 'data_migration':
        config.sourceConnection = '{{source_db}}'
        config.targetConnection = '{{target_db}}'
        config.batchSize = 1000
        config.validateData = true
        config.variableName = 'migration_result'
        break

      case 'report_generation':
        config.reportType = 'summary'
        config.dataSource = '{{data_source}}'
        config.template = 'standard'
        config.format = 'pdf'
        config.variableName = 'generated_report'
        break

      case 'security_audit':
        config.auditType = 'vulnerability'
        config.scanDepth = 'standard'
        config.generateReport = true
        config.variableName = 'audit_result'
        break

      case 'certificate_check':
        config.certificatePath = '/etc/ssl/certs'
        config.checkExpiry = true
        config.daysWarning = 30
        config.autoRenew = false
        config.variableName = 'certificate_status'
        break

      case 'invoice_processing':
        config.approvalThreshold = 1000
        config.validateVendor = true
        config.integrationEndpoint = '{{accounting_api}}'
        config.variableName = 'invoice_result'
        break

      case 'customer_onboarding':
        config.provisioningConfig = '{{provisioning_config}}'
        config.notificationTemplates = '{{notification_templates}}'
        config.variableName = 'onboarding_result'
        break

      case 'inventory_management':
        config.operation = 'update'
        config.reorderThreshold = 10
        config.variableName = 'inventory_result'
        break

      default:
        break
    }

    return config
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Clean and normalize description text
   */
  cleanDescription(description) {
    return description
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,;:!?()-]/g, '')
  }

  /**
   * Determine primary intent from patterns
   */
  determineIntent(patterns) {
    const intentMap = {
      navigation: 'web_automation',
      clicking: 'web_automation', 
      typing: 'form_automation',
      extraction: 'data_extraction',
      email: 'notification',
      fileOperations: 'data_processing',
      apiCalls: 'api_integration',
      // System Administration
      serverMonitoring: 'system_administration',
      fileSystemMaintenance: 'system_administration',
      databaseMaintenance: 'system_administration',
      logAnalysis: 'system_administration',
      // Data Processing
      csvProcessing: 'data_processing',
      jsonProcessing: 'data_processing',
      dataMigration: 'data_processing',
      reportGeneration: 'data_processing',
      // Security & Compliance
      securityAuditNonWeb: 'security_compliance',
      accessLogAnalysis: 'security_compliance',
      certificateMonitoring: 'security_compliance',
      // Business Processes
      invoiceProcessing: 'business_process',
      customerOnboarding: 'business_process',
      inventoryManagement: 'business_process'
    }

    const primaryPattern = patterns.sort((a, b) => b.confidence - a.confidence)[0]
    return intentMap[primaryPattern.type] || 'general_automation'
  }

  /**
   * Calculate overall confidence score
   */
  calculateConfidence(patterns, sentenceCount) {
    if (patterns.length === 0) return 0

    const avgPatternConfidence = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
    const coverageBonus = Math.min(patterns.length / sentenceCount, 1) * 0.3
    
    return Math.min(avgPatternConfidence + coverageBonus, 1)
  }

  /**
   * Determine workflow complexity
   */
  determineComplexity(sentenceCount, patternCount) {
    if (sentenceCount <= 2 && patternCount <= 2) return 'simple'
    if (sentenceCount <= 5 && patternCount <= 4) return 'medium'
    return 'complex'
  }

  /**
   * Extract entities like URLs, emails, file paths from text
   */
  extractEntities(text) {
    const entities = []

    // URLs
    const urlRegex = /https?:\/\/[^\s]+/gi
    const urls = text.match(urlRegex) || []
    urls.forEach(url => entities.push({ type: 'url', value: url }))

    // Email addresses
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi
    const emails = text.match(emailRegex) || []
    emails.forEach(email => entities.push({ type: 'email', value: email }))

    // File paths
    const filePathRegex = /[./\\][\w./\\-]+\.(csv|json|txt|xlsx|pdf)/gi
    const filePaths = text.match(filePathRegex) || []
    filePaths.forEach(path => entities.push({ type: 'file_path', value: path }))

    // Numbers
    const numberRegex = /\b\d+\b/g
    const numbers = text.match(numberRegex) || []
    numbers.forEach(num => entities.push({ type: 'number', value: parseInt(num) }))

    return entities
  }

  /**
   * Extract actions from sentence
   */
  extractActions(sentence) {
    const actions = []
    const words = sentence.toLowerCase().split(/\s+/)
    
    // Look for action verbs
    const actionVerbs = ['go', 'click', 'type', 'enter', 'fill', 'extract', 'get', 'send', 'save', 'download']
    
    for (let i = 0; i < words.length; i++) {
      if (actionVerbs.includes(words[i])) {
        // Get context around the action verb
        const start = Math.max(0, i - 2)
        const end = Math.min(words.length, i + 5)
        const context = words.slice(start, end).join(' ')
        
        actions.push({
          verb: words[i],
          text: context,
          position: i
        })
      }
    }

    return actions.length > 0 ? actions : [{ verb: 'unknown', text: sentence, position: 0 }]
  }

  /**
   * Select appropriate template based on analysis
   */
  selectTemplate(analysis) {
    const intentTemplateMap = {
      'web_automation': this.stepTemplates.formAutomation,
      'data_extraction': this.stepTemplates.webScraping,
      'data_processing': this.stepTemplates.csvDataProcessing,
      'api_integration': this.stepTemplates.restApiDataCollection,
      'notification': this.stepTemplates.monitoringAlert,
      'system_administration': this.stepTemplates.serverHealthMonitoring,
      'security_compliance': this.stepTemplates.securityAuditSystem,
      'business_process': this.stepTemplates.invoiceProcessingSystem
    }

    return intentTemplateMap[analysis.intent] || null
  }

  /**
   * Generate default steps for low confidence scenarios
   */
  generateDefaultSteps(analysis) {
    return [
      {
        id: '1',
        type: 'navigate',
        name: 'Navigate to Website',
        config: {
          url: '{{target_url}}',
          waitAfter: 2000
        }
      },
      {
        id: '2',
        type: 'wait',
        name: 'Wait for Page Load',
        config: {
          duration: 3000
        }
      },
      {
        id: '3',
        type: 'screenshot',
        name: 'Take Screenshot',
        config: {
          filename: 'result_{{date("timestamp")}}.png'
        }
      }
    ]
  }

  /**
   * Extract variables from description and steps
   */
  extractVariables(description, steps) {
    const variables = {}

    // Extract URLs
    const urls = this.extractEntities(description).filter(e => e.type === 'url')
    if (urls.length > 0) {
      variables.target_url = urls[0].value
    }

    // Add common variables based on step types
    const stepTypes = steps.map(s => s.type)
    
    if (stepTypes.includes('type')) {
      variables.input_text = ''
      variables.input_selector = ''
    }
    
    if (stepTypes.includes('click')) {
      variables.button_selector = ''
    }
    
    if (stepTypes.includes('extract_data')) {
      variables.data_selector = ''
    }
    
    if (stepTypes.includes('send_email')) {
      variables.recipient_email = ''
      variables.email_message = ''
    }

    return variables
  }

  /**
   * Generate workflow metadata
   */
  generateMetadata(analysis, description) {
    const name = this.generateWorkflowName(description, analysis.intent)
    const category = this.mapIntentToCategory(analysis.intent)
    
    return {
      name: name,
      description: `AI-generated workflow: ${description.substring(0, 100)}${description.length > 100 ? '...' : ''}`,
      category: category
    }
  }

  /**
   * Generate workflow name from description
   */
  generateWorkflowName(description, intent) {
    const words = description.split(/\s+/).slice(0, 6)
    const baseName = words.join(' ').replace(/[^\w\s]/g, '')
    
    if (baseName.length > 50) {
      return baseName.substring(0, 47) + '...'
    }
    
    return baseName || `${intent.replace('_', ' ')} workflow`
  }

  /**
   * Map intent to workflow category
   */
  mapIntentToCategory(intent) {
    const categoryMap = {
      'web_automation': 'Web Automation',
      'data_extraction': 'Data Extraction', 
      'form_automation': 'Form Processing',
      'data_processing': 'Data Processing',
      'api_integration': 'API Integration',
      'notification': 'Communication',
      'system_administration': 'System Administration',
      'security_compliance': 'Security & Compliance',
      'business_process': 'Business Process',
      'general_automation': 'General'
    }

    return categoryMap[intent] || 'AI Generated'
  }

  /**
   * Generate improvement suggestions
   */
  generateImprovementSuggestions(analysis, steps) {
    const suggestions = []

    if (analysis.confidence < 0.6) {
      suggestions.push({
        type: 'low_confidence',
        message: 'This workflow was generated with low confidence. Please review and adjust the steps.',
        priority: 'high'
      })
    }

    if (steps.length < 3) {
      suggestions.push({
        type: 'simple_workflow',
        message: 'Consider adding error handling and validation steps for more robust automation.',
        priority: 'medium'
      })
    }

    if (steps.some(s => Object.values(s.config).some(v => typeof v === 'string' && v.includes('{{')))) {
      suggestions.push({
        type: 'variables_needed',
        message: 'Some steps contain placeholder variables. Update these with actual values before running.',
        priority: 'high'
      })
    }

    return suggestions
  }

  // ============================================================================
  // EXTRACTION HELPER METHODS
  // ============================================================================

  extractURL(text) {
    const urlMatch = text.match(/https?:\/\/[^\s]+/i)
    return urlMatch ? urlMatch[0] : null
  }

  extractSelector(text) {
    // Try to extract CSS selectors from common descriptions
    const selectorPatterns = [
      /["']([.#]?[\w-]+)["']/,  // Quoted selectors
      /button[\s]+["']([^"']+)["']/i,  // "button 'text'"
      /input[\s]+["']([^"']+)["']/i,   // "input 'name'"
      /click[\s]+["']([^"']+)["']/i    // "click 'element'"
    ]

    for (const pattern of selectorPatterns) {
      const match = text.match(pattern)
      if (match) return match[1]
    }

    return null
  }

  extractInputText(text) {
    const inputPatterns = [
      /["']([^"']{2,})["']/,  // Quoted text
      /with[\s]+"([^"]+)"/i,  // "with 'text'"
      /enter[\s]+"([^"]+)"/i  // "enter 'text'"
    ]

    for (const pattern of inputPatterns) {
      const match = text.match(pattern)
      if (match) return match[1]
    }

    return null
  }

  extractDuration(text) {
    const durationMatch = text.match(/(\d+)[\s]*(second|sec|minute|min|hour|hr)s?/i)
    if (durationMatch) {
      const value = parseInt(durationMatch[1])
      const unit = durationMatch[2].toLowerCase()
      
      switch (unit) {
        case 'second':
        case 'sec':
          return value * 1000
        case 'minute':
        case 'min':
          return value * 60 * 1000
        case 'hour':
        case 'hr':
          return value * 60 * 60 * 1000
      }
    }
    return null
  }

  extractDataSelectors(text) {
    // Extract data fields to scrape
    const selectors = {}
    const fieldPatterns = [
      /get[\s]+the[\s]+(\w+)/gi,
      /extract[\s]+(\w+)/gi,
      /scrape[\s]+(\w+)/gi
    ]

    for (const pattern of fieldPatterns) {
      const matches = [...text.matchAll(pattern)]
      matches.forEach(match => {
        const fieldName = match[1].toLowerCase()
        selectors[fieldName] = `{{${fieldName}_selector}}`
      })
    }

    return Object.keys(selectors).length > 0 ? selectors : { data: '{{data_selector}}' }
  }

  extractScrollDirection(text) {
    if (text.includes('up')) return 'up'
    if (text.includes('down')) return 'down'
    if (text.includes('left')) return 'left'
    if (text.includes('right')) return 'right'
    return 'down'
  }

  extractScrollAmount(text) {
    const amountMatch = text.match(/(\d+)[\s]*(px|pixel|%|percent)?/i)
    return amountMatch ? parseInt(amountMatch[1]) : 100
  }

  extractFilePath(text) {
    const pathMatch = text.match(/[./\\]?[\w./\\-]+\.(csv|json|txt|xlsx|pdf)/i)
    return pathMatch ? pathMatch[0] : null
  }

  extractHTTPMethod(text) {
    const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
    const upperText = text.toUpperCase()
    
    for (const method of methods) {
      if (upperText.includes(method)) return method
    }
    
    return 'GET'
  }

  extractTimeout(text) {
    const timeoutMatch = text.match(/timeout[\s]*[:\-]?[\s]*(\d+)/i) || 
                        text.match(/wait[\s]+for[\s]+(\d+)/i) ||
                        text.match(/(\d+)[\s]*seconds?[\s]*timeout/i)
    
    if (timeoutMatch) {
      const value = parseInt(timeoutMatch[1])
      return value * 1000 // Convert to milliseconds
    }
    
    return 30000 // Default 30 seconds
  }

  extractAttribute(text) {
    const attributePatterns = [
      /extract[\s]+href/i,
      /get[\s]+link/i,
      /extract[\s]+src/i,
      /get[\s]+image/i,
      /extract[\s]+value/i,
      /get[\s]+id/i,
      /extract[\s]+class/i
    ]

    const attributeMap = {
      'href': 'href',
      'link': 'href',
      'src': 'src',
      'image': 'src',
      'value': 'value',
      'id': 'id',
      'class': 'class'
    }

    for (const pattern of attributePatterns) {
      const match = text.match(pattern)
      if (match) {
        const key = match[0].toLowerCase().replace(/extract\s+|get\s+/g, '')
        return attributeMap[key] || 'href'
      }
    }

    return 'href'
  }

  extractScript(text) {
    // Try to extract JavaScript from common descriptions
    const scriptPatterns = [
      /script[\s]*[:\-]?[\s]*["']([^"']+)["']/i,
      /javascript[\s]*[:\-]?[\s]*["']([^"']+)["']/i,
      /code[\s]*[:\-]?[\s]*["']([^"']+)["']/i
    ]

    for (const pattern of scriptPatterns) {
      const match = text.match(pattern)
      if (match) return match[1]
    }

    // Default scripts based on common operations
    if (text.includes('title')) return 'return document.title;'
    if (text.includes('url')) return 'return window.location.href;'
    if (text.includes('scroll')) return 'window.scrollTo(0, document.body.scrollHeight);'
    
    return '// Custom JavaScript code\nreturn document.title;'
  }

  extractDataPoints(text) {
    const dataPoints = []
    
    // Common data extraction patterns
    const patterns = [
      { keywords: ['title', 'heading'], selector: 'h1, h2, .title', name: 'title' },
      { keywords: ['price', 'cost', 'amount'], selector: '.price, .cost', name: 'price' },
      { keywords: ['description', 'details'], selector: '.description, .details', name: 'description' },
      { keywords: ['name', 'product'], selector: '.name, .product-name', name: 'name' },
      { keywords: ['email', 'contact'], selector: '[href*="mailto"]', name: 'email' },
      { keywords: ['phone', 'tel'], selector: '[href*="tel"]', name: 'phone' },
      { keywords: ['link', 'url'], selector: 'a[href]', name: 'links' },
      { keywords: ['image', 'photo'], selector: 'img[src]', name: 'images' }
    ]

    for (const pattern of patterns) {
      const hasKeyword = pattern.keywords.some(keyword => 
        text.toLowerCase().includes(keyword)
      )
      
      if (hasKeyword) {
        dataPoints.push({
          name: pattern.name,
          selector: pattern.selector,
          selectorType: 'css'
        })
      }
    }

    // If no specific patterns found, add generic ones
    if (dataPoints.length === 0) {
      dataPoints.push(
        { name: 'title', selector: 'h1', selectorType: 'css' },
        { name: 'content', selector: '.content, .description', selectorType: 'css' }
      )
    }

    return dataPoints
  }

  extractEnterpriseCredentials(text) {
    // Pattern for enterprise login scenarios
    const patterns = [
      { keyword: 'sso', fields: ['username'] },
      { keyword: 'corporate', fields: ['employee_id', 'password'] },
      { keyword: 'enterprise', fields: ['username', 'password', 'domain'] },
      { keyword: 'portal', fields: ['login', 'password'] }
    ]

    for (const pattern of patterns) {
      if (text.toLowerCase().includes(pattern.keyword)) {
        return pattern.fields.map(field => ({ field, value: `{{${field}}}` }))
      }
    }

    return [{ field: 'username', value: '{{username}}' }, { field: 'password', value: '{{password}}' }]
  }

  extractSecurityTestPatterns(text) {
    // Security testing patterns
    if (text.includes('sql')) return ['SELECT * FROM users--', '\' OR 1=1--']
    if (text.includes('xss')) return ['<script>alert("XSS")</script>', '"><script>alert(1)</script>']
    if (text.includes('csrf')) return ['Check CSRF tokens', 'Verify referrer headers']
    
    return ['Basic security scan', 'Check for common vulnerabilities']
  }

  extractPerformanceMetrics(text) {
    // Performance monitoring metrics
    const metrics = []
    
    if (text.includes('load time') || text.includes('performance')) {
      metrics.push('loadTime', 'domContentLoaded', 'firstPaint')
    }
    if (text.includes('memory')) {
      metrics.push('memoryUsage')
    }
    if (text.includes('network')) {
      metrics.push('networkRequests', 'bandwidth')
    }
    
    return metrics.length > 0 ? metrics : ['loadTime', 'domContentLoaded']
  }

  extractComplianceChecks(text) {
    // Compliance monitoring patterns
    const checks = []
    
    if (text.includes('gdpr') || text.includes('privacy')) {
      checks.push('privacy_policy', 'cookie_consent', 'data_processing')
    }
    if (text.includes('accessibility') || text.includes('wcag')) {
      checks.push('alt_tags', 'aria_labels', 'color_contrast')
    }
    if (text.includes('security') || text.includes('ssl')) {
      checks.push('https_redirect', 'security_headers', 'ssl_certificate')
    }
    
    return checks.length > 0 ? checks : ['general_compliance']
  }

  generateStepName(stepType, actionText) {
    const stepNames = {
      navigate: 'Navigate to Website',
      click: 'Click Element',
      type: 'Enter Text',
      wait: 'Wait',
      wait_for_element: 'Wait for Element',
      extract_data: 'Extract Data',
      extract_text: 'Extract Text',
      extract_attribute: 'Extract Attribute',
      screenshot: 'Take Screenshot',
      generate_pdf: 'Generate PDF',
      scroll: 'Scroll Page',
      execute_script: 'Execute JavaScript',
      send_email: 'Send Email',
      write_file: 'Save File',
      http_request: 'API Request',
      // System Administration
      system_check: 'System Health Check',
      file_operation: 'File System Operation',
      database_operation: 'Database Operation',
      log_analysis: 'Log Analysis',
      // Data Processing
      data_transformation: 'Transform Data',
      data_migration: 'Migrate Data',
      report_generation: 'Generate Report',
      // Security & Compliance
      security_audit: 'Security Audit',
      certificate_check: 'Certificate Check',
      // Business Process
      invoice_processing: 'Process Invoice',
      customer_onboarding: 'Onboard Customer',
      inventory_management: 'Manage Inventory'
    }

    return stepNames[stepType] || 'Automation Step'
  }

  // ============================================================================
  // NEW EXTRACTION HELPER METHODS FOR NON-BROWSER AUTOMATION
  // ============================================================================

  // System Administration Helpers
  extractSystemCheckType(text) {
    const types = {
      'cpu': 'cpu',
      'memory': 'memory',
      'disk': 'disk',
      'network': 'network',
      'service': 'service',
      'health': 'health'
    }
    
    for (const [keyword, type] of Object.entries(types)) {
      if (text.toLowerCase().includes(keyword)) return type
    }
    return 'health'
  }

  extractSystemThresholds(text) {
    const thresholds = {}
    
    // Extract percentage thresholds
    const percentMatch = text.match(/(\d+)%/g)
    if (percentMatch) {
      const values = percentMatch.map(p => parseInt(p))
      if (text.includes('cpu')) thresholds.cpu = values[0] || 80
      if (text.includes('memory')) thresholds.memory = values[0] || 85
      if (text.includes('disk')) thresholds.disk = values[0] || 90
    }
    
    return Object.keys(thresholds).length > 0 ? thresholds : { cpu: 80, memory: 85, disk: 90 }
  }

  extractFileOperation(text) {
    const operations = ['cleanup', 'delete', 'move', 'compress', 'backup', 'scan']
    for (const op of operations) {
      if (text.toLowerCase().includes(op)) return op
    }
    return 'cleanup'
  }

  extractFileCriteria(text) {
    const criteria = {}
    
    // Extract age criteria
    const ageMatch = text.match(/(\d+)\s*(day|week|month|year)s?/i)
    if (ageMatch) {
      criteria.olderThan = `${ageMatch[1]}${ageMatch[2][0]}`
    }
    
    // Extract size criteria
    const sizeMatch = text.match(/(\d+)\s*(MB|GB|KB)/i)
    if (sizeMatch) {
      criteria.largerThan = `${sizeMatch[1]}${sizeMatch[2]}`
    }
    
    return Object.keys(criteria).length > 0 ? criteria : { olderThan: '7d' }
  }

  extractDatabaseOperation(text) {
    const operations = ['backup', 'restore', 'query', 'optimize', 'maintenance', 'migrate']
    for (const op of operations) {
      if (text.toLowerCase().includes(op)) return op
    }
    return 'query'
  }

  extractDatabaseQuery(text) {
    // Try to extract SQL-like patterns
    const sqlMatch = text.match(/['"]([^'"]*SELECT[^'"]*)['"]/i)
    if (sqlMatch) return sqlMatch[1]
    
    // Return operation-specific default queries
    if (text.includes('backup')) return 'BACKUP DATABASE {{database_name}}'
    if (text.includes('optimize')) return 'OPTIMIZE TABLE {{table_name}}'
    
    return '-- Query placeholder'
  }

  extractLogPath(text) {
    const pathMatch = text.match(/\/[\w\/.-]+/)
    if (pathMatch) return pathMatch[0]
    
    // Common log paths based on context
    if (text.includes('apache') || text.includes('httpd')) return '/var/log/apache2'
    if (text.includes('nginx')) return '/var/log/nginx'
    if (text.includes('system')) return '/var/log/syslog'
    
    return '/var/log'
  }

  extractLogPattern(text) {
    // Look for quoted patterns
    const patternMatch = text.match(/['"]([^'"]+)['"]/)
    if (patternMatch) return patternMatch[1]
    
    // Default patterns based on keywords
    if (text.includes('error')) return 'ERROR|FATAL'
    if (text.includes('warning')) return 'WARN|WARNING'
    if (text.includes('security')) return 'SECURITY|AUTH|FAIL'
    
    return 'ERROR|WARN'
  }

  extractTimeRange(text) {
    const timeMatch = text.match(/(\d+)\s*(hour|day|week|month)s?/i)
    if (timeMatch) {
      const value = timeMatch[1]
      const unit = timeMatch[2].toLowerCase()[0] // h, d, w, m
      return `${value}${unit}`
    }
    return '24h'
  }

  // Data Processing Helpers
  extractTransformationType(text) {
    const types = ['format', 'validate', 'clean', 'normalize', 'enrich', 'aggregate']
    for (const type of types) {
      if (text.toLowerCase().includes(type)) return type
    }
    return 'format'
  }

  extractDataFormat(text) {
    const formats = ['csv', 'json', 'xml', 'excel', 'tsv', 'parquet']
    for (const format of formats) {
      if (text.toLowerCase().includes(format)) return format
    }
    return 'csv'
  }

  extractOutputFormat(text) {
    const formats = ['csv', 'json', 'xml', 'excel', 'pdf', 'html']
    const outputFormats = text.match(/to\s+(\w+)/i) || text.match(/as\s+(\w+)/i)
    
    if (outputFormats && formats.includes(outputFormats[1].toLowerCase())) {
      return outputFormats[1].toLowerCase()
    }
    
    return 'json'
  }

  extractTransformationRules(text) {
    const rules = []
    
    if (text.includes('validate')) rules.push({ type: 'validation', rule: 'required_fields' })
    if (text.includes('clean')) rules.push({ type: 'cleaning', rule: 'remove_duplicates' })
    if (text.includes('normalize')) rules.push({ type: 'normalization', rule: 'standardize_format' })
    
    return rules.length > 0 ? rules : [{ type: 'basic', rule: 'default_transformation' }]
  }

  extractBatchSize(text) {
    const batchMatch = text.match(/batch[\s]*(?:of|size)?[\s]*(\d+)/i)
    return batchMatch ? parseInt(batchMatch[1]) : 1000
  }

  extractReportType(text) {
    const types = ['summary', 'detailed', 'analytics', 'financial', 'operational', 'compliance']
    for (const type of types) {
      if (text.toLowerCase().includes(type)) return type
    }
    return 'summary'
  }

  extractReportTemplate(text) {
    const templates = ['standard', 'executive', 'technical', 'financial', 'custom']
    for (const template of templates) {
      if (text.toLowerCase().includes(template)) return template
    }
    return 'standard'
  }

  extractReportFormat(text) {
    const formats = ['pdf', 'excel', 'html', 'csv', 'powerpoint']
    for (const format of formats) {
      if (text.toLowerCase().includes(format)) return format
    }
    return 'pdf'
  }

  // Security & Compliance Helpers
  extractAuditType(text) {
    const types = ['vulnerability', 'compliance', 'access', 'configuration', 'penetration']
    for (const type of types) {
      if (text.toLowerCase().includes(type)) return type
    }
    return 'vulnerability'
  }

  extractScanDepth(text) {
    if (text.includes('deep') || text.includes('comprehensive')) return 'deep'
    if (text.includes('quick') || text.includes('basic')) return 'basic'
    return 'standard'
  }

  extractComplianceStandard(text) {
    const standards = ['GDPR', 'HIPAA', 'PCI-DSS', 'SOX', 'ISO27001', 'NIST']
    for (const standard of standards) {
      if (text.toUpperCase().includes(standard)) return standard
    }
    return null
  }

  extractCertificatePath(text) {
    const pathMatch = text.match(/\/[\w\/.-]+\.(crt|pem|cer|cert)/)
    if (pathMatch) return pathMatch[0].replace(/\.[^.]*$/, '') // Remove extension
    
    return '/etc/ssl/certs'
  }

  extractWarningDays(text) {
    const daysMatch = text.match(/(\d+)\s*days?\s*(?:before|warning|alert)/i)
    return daysMatch ? parseInt(daysMatch[1]) : 30
  }

  // Business Process Helpers
  extractInvoiceRules(text) {
    const rules = []
    
    if (text.includes('validate vendor')) rules.push({ type: 'vendor_validation', enabled: true })
    if (text.includes('check po') || text.includes('purchase order')) {
      rules.push({ type: 'po_matching', enabled: true })
    }
    if (text.includes('tax')) rules.push({ type: 'tax_calculation', enabled: true })
    
    return rules.length > 0 ? rules : [{ type: 'basic_validation', enabled: true }]
  }

  extractApprovalThreshold(text) {
    const amountMatch = text.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)|(?:threshold|limit|amount)[\s]*:?[\s]*(\d+)/i)
    if (amountMatch) {
      const amount = amountMatch[1] || amountMatch[2]
      return parseFloat(amount.replace(/,/g, ''))
    }
    return 1000
  }

  extractOnboardingSteps(text) {
    const steps = []
    
    if (text.includes('account')) steps.push('create_account')
    if (text.includes('profile')) steps.push('setup_profile')
    if (text.includes('welcome')) steps.push('send_welcome')
    if (text.includes('access') || text.includes('provision')) steps.push('provision_access')
    
    return steps.length > 0 ? steps : ['create_account', 'setup_profile', 'send_welcome']
  }

  extractProvisioningConfig(text) {
    return {
      createSystemAccount: true,
      assignDefaultRole: true,
      setupInitialPermissions: true,
      sendCredentials: text.includes('credential') || text.includes('password')
    }
  }

  extractNotificationTemplates(text) {
    const templates = []
    
    if (text.includes('welcome')) templates.push('welcome_email')
    if (text.includes('setup')) templates.push('setup_instructions')
    if (text.includes('training')) templates.push('training_materials')
    
    return templates.length > 0 ? templates : ['welcome_email']
  }

  extractInventoryOperation(text) {
    const operations = ['update', 'reorder', 'audit', 'reconcile', 'forecast']
    for (const op of operations) {
      if (text.toLowerCase().includes(op)) return op
    }
    return 'update'
  }

  extractReorderThreshold(text) {
    const thresholdMatch = text.match(/(?:threshold|minimum|reorder)[\s]*:?[\s]*(\d+)/i)
    return thresholdMatch ? parseInt(thresholdMatch[1]) : 10
  }

  extractSuppliers(text) {
    const supplierMatch = text.match(/suppliers?[\s]*:?[\s]*\[([^\]]+)\]/i)
    if (supplierMatch) {
      return supplierMatch[1].split(',').map(s => s.trim())
    }
    return ['{{primary_supplier}}']
  }
}