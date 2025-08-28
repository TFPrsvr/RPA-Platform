/**
 * 🤖 Advanced Browser Automation Service
 * Puppeteer-powered browser automation for complex web interactions
 */

import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { logger } from '../middleware/errorHandler.js'
import fs from 'fs/promises'
import path from 'path'

// Add stealth plugin to avoid detection
puppeteer.use(StealthPlugin())

export class BrowserAutomationService {
  constructor() {
    this.activeBrowsers = new Map()
    this.maxConcurrentBrowsers = 3
    this.defaultTimeout = 30000
    this.screenshotDir = path.join(process.cwd(), 'server', 'uploads', 'screenshots')
    this.downloadDir = path.join(process.cwd(), 'server', 'uploads', 'downloads')
    this.init()
  }

  async init() {
    // Ensure upload directories exist
    await this.ensureDirectories()
    
    // Setup cleanup on process exit
    process.on('SIGINT', () => this.cleanup())
    process.on('SIGTERM', () => this.cleanup())
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(this.screenshotDir, { recursive: true })
      await fs.mkdir(this.downloadDir, { recursive: true })
    } catch (error) {
      logger.error('Failed to create upload directories', { error: error.message })
    }
  }

  /**
   * Create a new browser instance
   */
  async createBrowser(sessionId, options = {}) {
    try {
      if (this.activeBrowsers.size >= this.maxConcurrentBrowsers) {
        throw new Error('Maximum concurrent browsers reached')
      }

      const defaultOptions = {
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      }

      const browserOptions = { ...defaultOptions, ...options }
      const browser = await puppeteer.launch(browserOptions)
      
      this.activeBrowsers.set(sessionId, {
        browser,
        pages: new Map(),
        createdAt: new Date(),
        lastActivity: new Date()
      })

      logger.info('Browser created', { sessionId, activeCount: this.activeBrowsers.size })
      return browser

    } catch (error) {
      logger.error('Failed to create browser', { sessionId, error: error.message })
      throw error
    }
  }

  /**
   * Get or create a browser for a session
   */
  async getBrowser(sessionId) {
    const session = this.activeBrowsers.get(sessionId)
    if (session && !session.browser.isClosed()) {
      session.lastActivity = new Date()
      return session.browser
    }

    // Create new browser if none exists or previous was closed
    return await this.createBrowser(sessionId)
  }

  /**
   * Create a new page in the browser
   */
  async createPage(sessionId, pageId) {
    try {
      const browser = await this.getBrowser(sessionId)
      const page = await browser.newPage()

      // Set viewport
      await page.setViewport({ width: 1366, height: 768 })

      // Set user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')

      // Set default timeout
      page.setDefaultTimeout(this.defaultTimeout)

      // Configure downloads
      await page._client.send('Page.setDownloadBehavior', {
        behavior: 'allow',
        downloadPath: this.downloadDir
      })

      // Store page reference
      const session = this.activeBrowsers.get(sessionId)
      session.pages.set(pageId, page)
      session.lastActivity = new Date()

      logger.debug('Page created', { sessionId, pageId })
      return page

    } catch (error) {
      logger.error('Failed to create page', { sessionId, pageId, error: error.message })
      throw error
    }
  }

  /**
   * Get an existing page or create a new one
   */
  async getPage(sessionId, pageId = 'default') {
    const session = this.activeBrowsers.get(sessionId)
    if (session && session.pages.has(pageId)) {
      const page = session.pages.get(pageId)
      if (!page.isClosed()) {
        session.lastActivity = new Date()
        return page
      }
    }

    // Create new page if none exists or was closed
    return await this.createPage(sessionId, pageId)
  }

  /**
   * Navigate to a URL
   */
  async navigate(sessionId, url, pageId = 'default', options = {}) {
    try {
      const page = await this.getPage(sessionId, pageId)
      
      const navigateOptions = {
        waitUntil: 'networkidle2',
        timeout: this.defaultTimeout,
        ...options
      }

      logger.info('Navigating to URL', { sessionId, url })
      const response = await page.goto(url, navigateOptions)

      return {
        success: true,
        url: page.url(),
        title: await page.title(),
        statusCode: response.status()
      }

    } catch (error) {
      logger.error('Navigation failed', { sessionId, url, error: error.message })
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Click an element
   */
  async click(sessionId, selector, pageId = 'default', options = {}) {
    try {
      const page = await this.getPage(sessionId, pageId)
      
      await page.waitForSelector(selector, { timeout: options.timeout || this.defaultTimeout })
      await page.click(selector, options)

      logger.debug('Element clicked', { sessionId, selector })
      return { success: true }

    } catch (error) {
      logger.error('Click failed', { sessionId, selector, error: error.message })
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Type text into an element
   */
  async type(sessionId, selector, text, pageId = 'default', options = {}) {
    try {
      const page = await this.getPage(sessionId, pageId)
      
      await page.waitForSelector(selector, { timeout: options.timeout || this.defaultTimeout })
      
      if (options.clear) {
        await page.click(selector, { clickCount: 3 }) // Select all
      }
      
      await page.type(selector, text, { delay: options.delay || 100 })

      logger.debug('Text typed', { sessionId, selector, textLength: text.length })
      return { success: true }

    } catch (error) {
      logger.error('Type failed', { sessionId, selector, error: error.message })
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Wait for an element to appear
   */
  async waitForElement(sessionId, selector, pageId = 'default', options = {}) {
    try {
      const page = await this.getPage(sessionId, pageId)
      
      await page.waitForSelector(selector, {
        timeout: options.timeout || this.defaultTimeout,
        visible: options.visible !== false
      })

      logger.debug('Element found', { sessionId, selector })
      return { success: true }

    } catch (error) {
      logger.error('Wait for element failed', { sessionId, selector, error: error.message })
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Extract text from elements
   */
  async extractText(sessionId, selector, pageId = 'default', options = {}) {
    try {
      const page = await this.getPage(sessionId, pageId)
      
      if (options.multiple) {
        const texts = await page.$$eval(selector, elements => 
          elements.map(el => el.textContent.trim())
        )
        return { success: true, data: texts }
      } else {
        await page.waitForSelector(selector, { timeout: options.timeout || this.defaultTimeout })
        const text = await page.$eval(selector, el => el.textContent.trim())
        return { success: true, data: text }
      }

    } catch (error) {
      logger.error('Text extraction failed', { sessionId, selector, error: error.message })
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Extract attributes from elements
   */
  async extractAttribute(sessionId, selector, attribute, pageId = 'default', options = {}) {
    try {
      const page = await this.getPage(sessionId, pageId)
      
      if (options.multiple) {
        const attributes = await page.$$eval(selector, (elements, attr) => 
          elements.map(el => el.getAttribute(attr)), attribute
        )
        return { success: true, data: attributes }
      } else {
        await page.waitForSelector(selector, { timeout: options.timeout || this.defaultTimeout })
        const value = await page.$eval(selector, (el, attr) => el.getAttribute(attr), attribute)
        return { success: true, data: value }
      }

    } catch (error) {
      logger.error('Attribute extraction failed', { sessionId, selector, attribute, error: error.message })
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Take a screenshot
   */
  async screenshot(sessionId, pageId = 'default', options = {}) {
    try {
      const page = await this.getPage(sessionId, pageId)
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `screenshot-${sessionId}-${pageId}-${timestamp}.png`
      const filepath = path.join(this.screenshotDir, filename)

      const screenshotOptions = {
        path: filepath,
        fullPage: options.fullPage !== false,
        type: 'png',
        ...options
      }

      await page.screenshot(screenshotOptions)

      logger.info('Screenshot taken', { sessionId, filepath })
      return {
        success: true,
        filepath,
        filename,
        url: `/uploads/screenshots/${filename}`
      }

    } catch (error) {
      logger.error('Screenshot failed', { sessionId, error: error.message })
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Generate PDF
   */
  async generatePDF(sessionId, pageId = 'default', options = {}) {
    try {
      const page = await this.getPage(sessionId, pageId)
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const filename = `document-${sessionId}-${pageId}-${timestamp}.pdf`
      const filepath = path.join(this.downloadDir, filename)

      const pdfOptions = {
        path: filepath,
        format: 'A4',
        printBackground: true,
        ...options
      }

      await page.pdf(pdfOptions)

      logger.info('PDF generated', { sessionId, filepath })
      return {
        success: true,
        filepath,
        filename,
        url: `/uploads/downloads/${filename}`
      }

    } catch (error) {
      logger.error('PDF generation failed', { sessionId, error: error.message })
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Scroll the page
   */
  async scroll(sessionId, direction = 'down', amount = 500, pageId = 'default') {
    try {
      const page = await this.getPage(sessionId, pageId)
      
      const scrollScript = `
        window.scrollBy(0, ${direction === 'down' ? amount : -amount});
      `
      
      await page.evaluate(scrollScript)

      logger.debug('Page scrolled', { sessionId, direction, amount })
      return { success: true }

    } catch (error) {
      logger.error('Scroll failed', { sessionId, error: error.message })
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Execute custom JavaScript
   */
  async executeScript(sessionId, script, pageId = 'default') {
    try {
      const page = await this.getPage(sessionId, pageId)
      const result = await page.evaluate(script)

      logger.debug('Script executed', { sessionId, scriptLength: script.length })
      return {
        success: true,
        result
      }

    } catch (error) {
      logger.error('Script execution failed', { sessionId, error: error.message })
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * Close a specific page
   */
  async closePage(sessionId, pageId) {
    try {
      const session = this.activeBrowsers.get(sessionId)
      if (session && session.pages.has(pageId)) {
        const page = session.pages.get(pageId)
        if (!page.isClosed()) {
          await page.close()
        }
        session.pages.delete(pageId)
        logger.debug('Page closed', { sessionId, pageId })
      }
    } catch (error) {
      logger.error('Failed to close page', { sessionId, pageId, error: error.message })
    }
  }

  /**
   * Close browser session
   */
  async closeBrowser(sessionId) {
    try {
      const session = this.activeBrowsers.get(sessionId)
      if (session) {
        // Close all pages first
        for (const [pageId, page] of session.pages) {
          if (!page.isClosed()) {
            await page.close()
          }
        }
        
        // Close browser
        if (!session.browser.isClosed()) {
          await session.browser.close()
        }
        
        this.activeBrowsers.delete(sessionId)
        logger.info('Browser closed', { sessionId, remainingCount: this.activeBrowsers.size })
      }
    } catch (error) {
      logger.error('Failed to close browser', { sessionId, error: error.message })
    }
  }

  /**
   * Get browser session status
   */
  getBrowserStatus(sessionId) {
    const session = this.activeBrowsers.get(sessionId)
    if (!session) {
      return { exists: false }
    }

    return {
      exists: true,
      isOpen: !session.browser.isClosed(),
      pageCount: session.pages.size,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity
    }
  }

  /**
   * Get all active sessions
   */
  getAllSessions() {
    const sessions = {}
    for (const [sessionId, session] of this.activeBrowsers) {
      sessions[sessionId] = {
        isOpen: !session.browser.isClosed(),
        pageCount: session.pages.size,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity
      }
    }
    return sessions
  }

  /**
   * Cleanup idle sessions
   */
  async cleanupIdleSessions(maxIdleTime = 30 * 60 * 1000) { // 30 minutes
    const now = new Date()
    const sessionsToClose = []

    for (const [sessionId, session] of this.activeBrowsers) {
      const idleTime = now - session.lastActivity
      if (idleTime > maxIdleTime) {
        sessionsToClose.push(sessionId)
      }
    }

    for (const sessionId of sessionsToClose) {
      logger.info('Closing idle browser session', { sessionId })
      await this.closeBrowser(sessionId)
    }

    return sessionsToClose.length
  }

  /**
   * Cleanup all browser sessions
   */
  async cleanup() {
    logger.info('Cleaning up browser sessions', { count: this.activeBrowsers.size })
    
    const closePromises = []
    for (const sessionId of this.activeBrowsers.keys()) {
      closePromises.push(this.closeBrowser(sessionId))
    }
    
    await Promise.allSettled(closePromises)
    this.activeBrowsers.clear()
  }
}