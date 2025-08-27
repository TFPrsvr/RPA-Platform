/**
 * 📅 Calendar Integration Service
 * Integrates with Google Calendar, Apple Calendar, and other calendar services
 */

import { logger } from '../middleware/errorHandler.js'

export class CalendarIntegrationService {
  constructor(supabase) {
    this.supabase = supabase
    this.integrations = new Map()
    this.setupIntegrations()
  }

  /**
   * Setup calendar integrations
   */
  setupIntegrations() {
    // Google Calendar integration
    this.integrations.set('google', {
      name: 'Google Calendar',
      authUrl: 'https://accounts.google.com/oauth/v2/auth',
      scopes: ['https://www.googleapis.com/auth/calendar.readonly'],
      clientId: process.env.GOOGLE_CALENDAR_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CALENDAR_CLIENT_SECRET
    })

    // Microsoft Outlook/Office 365
    this.integrations.set('microsoft', {
      name: 'Microsoft Calendar',
      authUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
      scopes: ['https://graph.microsoft.com/calendars.read'],
      clientId: process.env.MICROSOFT_CALENDAR_CLIENT_ID,
      clientSecret: process.env.MICROSOFT_CALENDAR_CLIENT_SECRET
    })

    // Apple Calendar (via CalDAV)
    this.integrations.set('apple', {
      name: 'Apple Calendar',
      type: 'caldav',
      baseUrl: 'https://caldav.icloud.com'
    })
  }

  /**
   * Get available calendar integrations
   */
  getAvailableIntegrations() {
    return Array.from(this.integrations.entries()).map(([key, config]) => ({
      id: key,
      name: config.name,
      type: config.type || 'oauth',
      enabled: Boolean(config.clientId) || config.type === 'caldav'
    }))
  }

  /**
   * Initialize OAuth flow for calendar integration
   */
  async initializeCalendarAuth(provider, userId, redirectUri) {
    try {
      const integration = this.integrations.get(provider)
      if (!integration) {
        throw new Error(`Unsupported calendar provider: ${provider}`)
      }

      if (!integration.clientId && integration.type !== 'caldav') {
        throw new Error(`${integration.name} integration not configured`)
      }

      // Generate state token for security
      const state = this.generateStateToken(userId, provider)

      // Store state token
      await this.supabase
        .from('calendar_auth_states')
        .insert([{
          user_id: userId,
          provider,
          state_token: state,
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
        }])

      let authUrl

      switch (provider) {
        case 'google':
          authUrl = this.buildGoogleAuthUrl(integration, state, redirectUri)
          break
        case 'microsoft':
          authUrl = this.buildMicrosoftAuthUrl(integration, state, redirectUri)
          break
        case 'apple':
          // Apple Calendar uses CalDAV - return setup instructions instead
          return {
            type: 'caldav_setup',
            instructions: {
              server: 'caldav.icloud.com',
              port: 443,
              path: '/{{apple_id}}/calendars/',
              ssl: true,
              username: 'Apple ID',
              password: 'App-specific password required'
            }
          }
        default:
          throw new Error(`OAuth not supported for ${provider}`)
      }

      return { authUrl, state }

    } catch (error) {
      logger.error('Error initializing calendar auth', { 
        provider, 
        userId, 
        error: error.message 
      })
      throw error
    }
  }

  /**
   * Complete OAuth authentication
   */
  async completeCalendarAuth(code, state, userId) {
    try {
      // Verify state token
      const { data: authState, error: stateError } = await this.supabase
        .from('calendar_auth_states')
        .select('provider, expires_at')
        .eq('user_id', userId)
        .eq('state_token', state)
        .single()

      if (stateError || !authState) {
        throw new Error('Invalid or expired state token')
      }

      if (new Date() > new Date(authState.expires_at)) {
        throw new Error('Authentication session expired')
      }

      const provider = authState.provider
      const integration = this.integrations.get(provider)

      // Exchange code for access token
      let tokenData
      switch (provider) {
        case 'google':
          tokenData = await this.exchangeGoogleCode(code, integration)
          break
        case 'microsoft':
          tokenData = await this.exchangeMicrosoftCode(code, integration)
          break
        default:
          throw new Error(`Token exchange not implemented for ${provider}`)
      }

      // Store calendar integration
      await this.storeCalendarIntegration(userId, provider, tokenData)

      // Clean up auth state
      await this.supabase
        .from('calendar_auth_states')
        .delete()
        .eq('user_id', userId)
        .eq('state_token', state)

      logger.info('Calendar integration completed', { userId, provider })
      return { success: true, provider }

    } catch (error) {
      logger.error('Error completing calendar auth', { error: error.message })
      throw error
    }
  }

  /**
   * Get user's calendar integrations
   */
  async getUserCalendarIntegrations(userId) {
    try {
      const { data: integrations, error } = await this.supabase
        .from('calendar_integrations')
        .select('provider, calendar_name, is_active, created_at, last_sync')
        .eq('user_id', userId)
        .eq('is_active', true)

      if (error) {
        throw error
      }

      return integrations || []

    } catch (error) {
      logger.error('Error getting user calendar integrations', { 
        userId, 
        error: error.message 
      })
      throw error
    }
  }

  /**
   * Sync user calendars to get available time slots
   */
  async syncUserCalendars(userId) {
    try {
      const integrations = await this.getUserCalendarIntegrations(userId)
      const allEvents = []

      for (const integration of integrations) {
        try {
          const events = await this.fetchCalendarEvents(userId, integration.provider)
          allEvents.push(...events)
        } catch (syncError) {
          logger.error('Error syncing calendar', { 
            userId, 
            provider: integration.provider, 
            error: syncError.message 
          })
        }
      }

      // Update last sync time
      await this.supabase
        .from('calendar_integrations')
        .update({ last_sync: new Date().toISOString() })
        .eq('user_id', userId)

      return allEvents

    } catch (error) {
      logger.error('Error syncing user calendars', { userId, error: error.message })
      throw error
    }
  }

  /**
   * Find available time slots for workflow execution
   */
  async findAvailableTimeSlots(userId, startDate, endDate, durationMinutes = 30) {
    try {
      const events = await this.syncUserCalendars(userId)
      const availableSlots = []

      // Convert to date objects
      const start = new Date(startDate)
      const end = new Date(endDate)
      const duration = durationMinutes * 60 * 1000 // Convert to milliseconds

      // Working hours (9 AM to 5 PM by default)
      const workingHours = {
        start: 9, // 9 AM
        end: 17   // 5 PM
      }

      // Iterate through each day
      for (let current = new Date(start); current < end; current.setDate(current.getDate() + 1)) {
        // Skip weekends (optional - could be configurable)
        if (current.getDay() === 0 || current.getDay() === 6) {
          continue
        }

        // Generate potential slots for this day
        const dayStart = new Date(current)
        dayStart.setHours(workingHours.start, 0, 0, 0)

        const dayEnd = new Date(current)
        dayEnd.setHours(workingHours.end, 0, 0, 0)

        // Find free slots
        for (let slotStart = new Date(dayStart); slotStart < dayEnd; slotStart.setMinutes(slotStart.getMinutes() + 30)) {
          const slotEnd = new Date(slotStart.getTime() + duration)

          if (slotEnd > dayEnd) break

          // Check if this slot conflicts with any calendar events
          const hasConflict = events.some(event => {
            const eventStart = new Date(event.start)
            const eventEnd = new Date(event.end)
            
            return (slotStart < eventEnd && slotEnd > eventStart)
          })

          if (!hasConflict) {
            availableSlots.push({
              start: new Date(slotStart),
              end: new Date(slotEnd),
              duration: durationMinutes
            })
          }
        }
      }

      return availableSlots

    } catch (error) {
      logger.error('Error finding available time slots', { 
        userId, 
        error: error.message 
      })
      throw error
    }
  }

  /**
   * Schedule workflow to run during available time slot
   */
  async scheduleWorkflowInAvailableSlot(workflowId, userId, options = {}) {
    try {
      const {
        startDate = new Date(),
        endDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Next 7 days
        durationMinutes = 30,
        preferredTimes = [] // Array of preferred time ranges
      } = options

      // Find available slots
      const availableSlots = await this.findAvailableTimeSlots(
        userId, 
        startDate, 
        endDate, 
        durationMinutes
      )

      if (availableSlots.length === 0) {
        throw new Error('No available time slots found')
      }

      // Select best slot based on preferences
      let selectedSlot = availableSlots[0] // Default to first available

      if (preferredTimes.length > 0) {
        for (const slot of availableSlots) {
          const slotHour = slot.start.getHours()
          
          for (const preferred of preferredTimes) {
            if (slotHour >= preferred.startHour && slotHour <= preferred.endHour) {
              selectedSlot = slot
              break
            }
          }
          
          if (selectedSlot !== availableSlots[0]) break
        }
      }

      // Create schedule configuration
      const scheduleConfig = {
        type: 'one-time',
        scheduledAt: selectedSlot.start.toISOString(),
        duration: durationMinutes,
        calendarIntegrated: true,
        enabled: true
      }

      return {
        selectedSlot,
        scheduleConfig
      }

    } catch (error) {
      logger.error('Error scheduling workflow in available slot', { 
        workflowId, 
        userId, 
        error: error.message 
      })
      throw error
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  /**
   * Build Google OAuth URL
   */
  buildGoogleAuthUrl(integration, state, redirectUri) {
    const params = new URLSearchParams({
      client_id: integration.clientId,
      redirect_uri: redirectUri,
      scope: integration.scopes.join(' '),
      response_type: 'code',
      state,
      access_type: 'offline',
      prompt: 'consent'
    })

    return `${integration.authUrl}?${params.toString()}`
  }

  /**
   * Build Microsoft OAuth URL
   */
  buildMicrosoftAuthUrl(integration, state, redirectUri) {
    const params = new URLSearchParams({
      client_id: integration.clientId,
      redirect_uri: redirectUri,
      scope: integration.scopes.join(' '),
      response_type: 'code',
      state,
      response_mode: 'query'
    })

    return `${integration.authUrl}?${params.toString()}`
  }

  /**
   * Exchange Google authorization code for access token
   */
  async exchangeGoogleCode(code, integration) {
    const tokenUrl = 'https://oauth2.googleapis.com/token'
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: integration.clientId,
        client_secret: integration.clientSecret,
        code,
        grant_type: 'authorization_code'
      })
    })

    if (!response.ok) {
      throw new Error('Failed to exchange Google authorization code')
    }

    return await response.json()
  }

  /**
   * Exchange Microsoft authorization code for access token
   */
  async exchangeMicrosoftCode(code, integration) {
    const tokenUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token'
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: integration.clientId,
        client_secret: integration.clientSecret,
        code,
        grant_type: 'authorization_code'
      })
    })

    if (!response.ok) {
      throw new Error('Failed to exchange Microsoft authorization code')
    }

    return await response.json()
  }

  /**
   * Store calendar integration in database
   */
  async storeCalendarIntegration(userId, provider, tokenData) {
    const integration = {
      user_id: userId,
      provider,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      is_active: true
    }

    const { error } = await this.supabase
      .from('calendar_integrations')
      .upsert([integration], { 
        onConflict: 'user_id,provider'
      })

    if (error) {
      throw error
    }
  }

  /**
   * Fetch calendar events from provider
   */
  async fetchCalendarEvents(userId, provider) {
    try {
      // Get integration details
      const { data: integration, error } = await this.supabase
        .from('calendar_integrations')
        .select('access_token, refresh_token, expires_at')
        .eq('user_id', userId)
        .eq('provider', provider)
        .eq('is_active', true)
        .single()

      if (error || !integration) {
        throw new Error(`No active ${provider} integration found`)
      }

      // Check if token is expired and refresh if needed
      if (new Date() >= new Date(integration.expires_at)) {
        await this.refreshAccessToken(userId, provider, integration.refresh_token)
        // Fetch updated token
        const { data: updated } = await this.supabase
          .from('calendar_integrations')
          .select('access_token')
          .eq('user_id', userId)
          .eq('provider', provider)
          .single()
        
        integration.access_token = updated.access_token
      }

      // Fetch events from the last 30 days to next 30 days
      const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

      let events = []

      switch (provider) {
        case 'google':
          events = await this.fetchGoogleCalendarEvents(integration.access_token, timeMin, timeMax)
          break
        case 'microsoft':
          events = await this.fetchMicrosoftCalendarEvents(integration.access_token, timeMin, timeMax)
          break
        default:
          throw new Error(`Event fetching not implemented for ${provider}`)
      }

      return events

    } catch (error) {
      logger.error('Error fetching calendar events', { 
        userId, 
        provider, 
        error: error.message 
      })
      throw error
    }
  }

  /**
   * Fetch Google Calendar events
   */
  async fetchGoogleCalendarEvents(accessToken, timeMin, timeMax) {
    const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch Google Calendar events')
    }

    const data = await response.json()
    
    return data.items?.map(event => ({
      id: event.id,
      title: event.summary,
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      allDay: !event.start?.dateTime,
      provider: 'google'
    })) || []
  }

  /**
   * Fetch Microsoft Calendar events
   */
  async fetchMicrosoftCalendarEvents(accessToken, timeMin, timeMax) {
    const url = `https://graph.microsoft.com/v1.0/me/events?$filter=start/dateTime ge '${timeMin}' and end/dateTime le '${timeMax}'&$orderby=start/dateTime`
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    if (!response.ok) {
      throw new Error('Failed to fetch Microsoft Calendar events')
    }

    const data = await response.json()
    
    return data.value?.map(event => ({
      id: event.id,
      title: event.subject,
      start: event.start.dateTime,
      end: event.end.dateTime,
      allDay: event.isAllDay,
      provider: 'microsoft'
    })) || []
  }

  /**
   * Generate state token for OAuth security
   */
  generateStateToken(userId, provider) {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    return `${userId}_${provider}_${timestamp}_${random}`
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(userId, provider, refreshToken) {
    // Implementation would depend on the provider
    // This is a placeholder for the refresh token logic
    logger.info('Refreshing access token', { userId, provider })
  }
}