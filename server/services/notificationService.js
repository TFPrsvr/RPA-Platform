/**
 * 🔔 Notification Service
 * Multi-channel notifications with user preferences and real-time updates
 */

import { EventEmitter } from 'events'
import { logger } from '../middleware/errorHandler.js'

export class NotificationService extends EventEmitter {
  constructor(supabase, websocketService) {
    super()
    this.supabase = supabase
    this.websocketService = websocketService
    this.channels = new Map()
    this.userPreferences = new Map()
    
    this.setupNotificationChannels()
    this.setupEventListeners()
  }

  /**
   * Setup notification channels
   */
  setupNotificationChannels() {
    // In-app notifications (via WebSocket)
    this.channels.set('in-app', {
      name: 'In-App Notifications',
      enabled: true,
      handler: this.sendInAppNotification.bind(this)
    })

    // Email notifications
    this.channels.set('email', {
      name: 'Email',
      enabled: Boolean(process.env.SMTP_HOST),
      handler: this.sendEmailNotification.bind(this)
    })

    // SMS notifications (via Twilio or similar)
    this.channels.set('sms', {
      name: 'SMS',
      enabled: Boolean(process.env.TWILIO_ACCOUNT_SID),
      handler: this.sendSMSNotification.bind(this)
    })

    // Push notifications (via Firebase or similar)
    this.channels.set('push', {
      name: 'Push Notifications',
      enabled: Boolean(process.env.FIREBASE_SERVER_KEY),
      handler: this.sendPushNotification.bind(this)
    })

    // Slack notifications
    this.channels.set('slack', {
      name: 'Slack',
      enabled: Boolean(process.env.SLACK_WEBHOOK_URL),
      handler: this.sendSlackNotification.bind(this)
    })

    // Microsoft Teams notifications
    this.channels.set('teams', {
      name: 'Microsoft Teams',
      enabled: Boolean(process.env.TEAMS_WEBHOOK_URL),
      handler: this.sendTeamsNotification.bind(this)
    })

    // Discord notifications
    this.channels.set('discord', {
      name: 'Discord',
      enabled: Boolean(process.env.DISCORD_WEBHOOK_URL),
      handler: this.sendDiscordNotification.bind(this)
    })
  }

  /**
   * Setup event listeners for workflow events
   */
  setupEventListeners() {
    // This will be called when workflow engine and scheduler events occur
    this.on('workflow.execution.started', this.handleExecutionStarted.bind(this))
    this.on('workflow.execution.completed', this.handleExecutionCompleted.bind(this))
    this.on('workflow.execution.failed', this.handleExecutionFailed.bind(this))
    this.on('workflow.execution.cancelled', this.handleExecutionCancelled.bind(this))
    this.on('workflow.scheduled', this.handleWorkflowScheduled.bind(this))
    this.on('workflow.schedule.missed', this.handleScheduleMissed.bind(this))
    this.on('system.maintenance', this.handleSystemMaintenance.bind(this))
  }

  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId) {
    try {
      // Check cache first
      if (this.userPreferences.has(userId)) {
        const cached = this.userPreferences.get(userId)
        if (Date.now() - cached.lastUpdate < 5 * 60 * 1000) { // 5 minutes cache
          return cached.preferences
        }
      }

      const { data: preferences, error } = await this.supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code !== 'PGRST301') {
        throw error
      }

      // Default preferences if none exist
      const defaultPreferences = {
        user_id: userId,
        channels: {
          'in-app': {
            enabled: true,
            events: ['all'] // all, execution-start, execution-complete, execution-failed, schedule-missed
          },
          email: {
            enabled: true,
            events: ['execution-failed', 'schedule-missed'],
            frequency: 'immediate' // immediate, hourly, daily
          },
          sms: {
            enabled: false,
            events: ['execution-failed'],
            frequency: 'immediate'
          },
          push: {
            enabled: true,
            events: ['execution-complete', 'execution-failed'],
            frequency: 'immediate'
          },
          slack: {
            enabled: false,
            events: [],
            webhook_url: ''
          },
          teams: {
            enabled: false,
            events: [],
            webhook_url: ''
          },
          discord: {
            enabled: false,
            events: [],
            webhook_url: ''
          }
        },
        quiet_hours: {
          enabled: false,
          start: '22:00',
          end: '08:00',
          timezone: 'UTC'
        },
        created_at: new Date().toISOString()
      }

      const finalPreferences = preferences || defaultPreferences

      // Cache preferences
      this.userPreferences.set(userId, {
        preferences: finalPreferences,
        lastUpdate: Date.now()
      })

      // Create default preferences in database if they don't exist
      if (!preferences) {
        await this.supabase
          .from('notification_preferences')
          .upsert([defaultPreferences])
      }

      return finalPreferences

    } catch (error) {
      logger.error('Error getting user notification preferences', { 
        userId, 
        error: error.message 
      })
      
      // Return basic defaults on error
      return {
        user_id: userId,
        channels: {
          'in-app': { enabled: true, events: ['all'] }
        }
      }
    }
  }

  /**
   * Update user notification preferences
   */
  async updateUserPreferences(userId, updates) {
    try {
      const currentPreferences = await this.getUserPreferences(userId)
      
      const updatedPreferences = {
        ...currentPreferences,
        ...updates,
        updated_at: new Date().toISOString()
      }

      const { error } = await this.supabase
        .from('notification_preferences')
        .upsert([updatedPreferences], { 
          onConflict: 'user_id'
        })

      if (error) {
        throw error
      }

      // Update cache
      this.userPreferences.set(userId, {
        preferences: updatedPreferences,
        lastUpdate: Date.now()
      })

      logger.info('Updated user notification preferences', { userId })
      return updatedPreferences

    } catch (error) {
      logger.error('Error updating user notification preferences', { 
        userId, 
        error: error.message 
      })
      throw error
    }
  }

  /**
   * Send notification to user via multiple channels
   */
  async sendNotification(userId, notification) {
    try {
      const preferences = await this.getUserPreferences(userId)
      const { type, title, message, data = {}, priority = 'normal' } = notification

      // Check quiet hours
      if (this.isInQuietHours(preferences)) {
        // Store notification for later delivery unless it's critical
        if (priority !== 'critical') {
          await this.storeNotificationForLater(userId, notification)
          return
        }
      }

      const promises = []

      // Send through each enabled channel
      for (const [channelId, channelConfig] of Object.entries(preferences.channels)) {
        const channel = this.channels.get(channelId)
        
        if (!channel || !channel.enabled || !channelConfig.enabled) {
          continue
        }

        // Check if this event type is enabled for this channel
        if (!this.isEventEnabledForChannel(type, channelConfig.events)) {
          continue
        }

        // Check frequency limits
        if (!this.shouldSendBasedOnFrequency(userId, channelId, channelConfig.frequency)) {
          continue
        }

        try {
          const promise = channel.handler(userId, notification, channelConfig)
          promises.push(promise)
        } catch (channelError) {
          logger.error('Error sending notification via channel', {
            userId,
            channel: channelId,
            error: channelError.message
          })
        }
      }

      // Wait for all channels to complete
      const results = await Promise.allSettled(promises)
      
      // Log results
      const successful = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      logger.info('Notification sent', {
        userId,
        type,
        channels: {
          successful,
          failed,
          total: promises.length
        }
      })

      // Store notification in history
      await this.storeNotificationHistory(userId, notification, {
        channels_attempted: promises.length,
        channels_successful: successful
      })

    } catch (error) {
      logger.error('Error sending notification', {
        userId,
        notification: notification.type,
        error: error.message
      })
    }
  }

  /**
   * Send bulk notifications to multiple users
   */
  async sendBulkNotification(userIds, notification) {
    const promises = userIds.map(userId => 
      this.sendNotification(userId, notification).catch(error => {
        logger.error('Bulk notification failed for user', { userId, error: error.message })
      })
    )

    await Promise.all(promises)
    logger.info('Bulk notification completed', { userCount: userIds.length })
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  async handleExecutionStarted({ context }) {
    await this.sendNotification(context.userId, {
      type: 'execution-started',
      title: '🚀 Workflow Started',
      message: `"${context.workflow.name}" execution has begun`,
      data: {
        workflowId: context.workflowId,
        executionId: context.id,
        workflowName: context.workflow.name
      },
      priority: 'low'
    })
  }

  async handleExecutionCompleted({ context }) {
    await this.sendNotification(context.userId, {
      type: 'execution-completed',
      title: '✅ Workflow Completed',
      message: `"${context.workflow.name}" completed successfully in ${Math.round(context.duration / 1000)}s`,
      data: {
        workflowId: context.workflowId,
        executionId: context.id,
        workflowName: context.workflow.name,
        duration: context.duration,
        stepsCompleted: context.stepResults.filter(r => r.success).length
      },
      priority: 'normal'
    })
  }

  async handleExecutionFailed({ context, error }) {
    await this.sendNotification(context.userId, {
      type: 'execution-failed',
      title: '❌ Workflow Failed',
      message: `"${context.workflow.name}" failed: ${error.message}`,
      data: {
        workflowId: context.workflowId,
        executionId: context.id,
        workflowName: context.workflow.name,
        error: error.message,
        stepsCompleted: context.stepResults.filter(r => r.success).length,
        stepsFailed: context.stepResults.filter(r => !r.success).length
      },
      priority: 'high'
    })
  }

  async handleExecutionCancelled({ context, reason }) {
    await this.sendNotification(context.userId, {
      type: 'execution-cancelled',
      title: '⚠️ Workflow Cancelled',
      message: `"${context.workflow.name}" was cancelled: ${reason}`,
      data: {
        workflowId: context.workflowId,
        executionId: context.id,
        workflowName: context.workflow.name,
        reason
      },
      priority: 'normal'
    })
  }

  async handleWorkflowScheduled({ workflowId, userId, scheduleConfig }) {
    await this.sendNotification(userId, {
      type: 'workflow-scheduled',
      title: '📅 Workflow Scheduled',
      message: `Your workflow has been scheduled`,
      data: {
        workflowId,
        scheduleConfig
      },
      priority: 'low'
    })
  }

  async handleScheduleMissed({ workflowId, userId, reason }) {
    await this.sendNotification(userId, {
      type: 'schedule-missed',
      title: '⏰ Scheduled Workflow Missed',
      message: `A scheduled workflow execution was missed: ${reason}`,
      data: {
        workflowId,
        reason
      },
      priority: 'high'
    })
  }

  async handleSystemMaintenance({ message, scheduledTime }) {
    // Send to all active users
    const { data: users } = await this.supabase
      .from('profiles')
      .select('id')
      .not('last_sign_in_at', 'is', null)

    if (users) {
      await this.sendBulkNotification(users.map(u => u.id), {
        type: 'system-maintenance',
        title: '🔧 System Maintenance',
        message,
        data: { scheduledTime },
        priority: 'normal'
      })
    }
  }

  // ============================================================================
  // NOTIFICATION CHANNEL HANDLERS
  // ============================================================================

  /**
   * Send in-app notification via WebSocket
   */
  async sendInAppNotification(userId, notification, config) {
    if (!this.websocketService) {
      throw new Error('WebSocket service not available')
    }

    const inAppNotification = {
      type: 'notification',
      notification: {
        id: this.generateNotificationId(),
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
        data: notification.data,
        timestamp: new Date().toISOString(),
        read: false
      }
    }

    // Send to user's WebSocket connections
    this.websocketService.broadcastToRoom(`user-notifications:${userId}`, inAppNotification)

    logger.debug('In-app notification sent', { userId, type: notification.type })
  }

  /**
   * Send email notification
   */
  async sendEmailNotification(userId, notification, config) {
    if (!process.env.SMTP_HOST) {
      throw new Error('SMTP not configured')
    }

    // Get user email
    const { data: profile, error } = await this.supabase
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single()

    if (error || !profile?.email) {
      throw new Error('User email not found')
    }

    const emailContent = this.generateEmailContent(notification)

    // Here you would integrate with your email service (SendGrid, AWS SES, etc.)
    // For now, we'll simulate the email sending
    logger.info('Email notification sent', { 
      userId, 
      email: profile.email, 
      subject: notification.title 
    })

    // In a real implementation, you would use something like:
    // await this.emailService.send({
    //   to: profile.email,
    //   subject: notification.title,
    //   html: emailContent,
    //   text: notification.message
    // })
  }

  /**
   * Send SMS notification
   */
  async sendSMSNotification(userId, notification, config) {
    if (!process.env.TWILIO_ACCOUNT_SID) {
      throw new Error('Twilio not configured')
    }

    // Get user phone number
    const { data: profile, error } = await this.supabase
      .from('profiles')
      .select('phone_number')
      .eq('id', userId)
      .single()

    if (error || !profile?.phone_number) {
      throw new Error('User phone number not found')
    }

    const smsMessage = `${notification.title}: ${notification.message}`

    // Here you would integrate with Twilio or similar SMS service
    logger.info('SMS notification sent', { 
      userId, 
      phone: profile.phone_number,
      message: smsMessage.substring(0, 50) + '...'
    })
  }

  /**
   * Send push notification
   */
  async sendPushNotification(userId, notification, config) {
    if (!process.env.FIREBASE_SERVER_KEY) {
      throw new Error('Firebase not configured')
    }

    // Get user's device tokens
    const { data: devices, error } = await this.supabase
      .from('user_devices')
      .select('push_token')
      .eq('user_id', userId)
      .eq('push_enabled', true)

    if (error || !devices?.length) {
      throw new Error('No push-enabled devices found')
    }

    const pushPayload = {
      notification: {
        title: notification.title,
        body: notification.message,
        icon: '/icon-192x192.png'
      },
      data: notification.data
    }

    // Here you would send to Firebase Cloud Messaging
    logger.info('Push notification sent', { 
      userId, 
      deviceCount: devices.length,
      title: notification.title
    })
  }

  /**
   * Send Slack notification
   */
  async sendSlackNotification(userId, notification, config) {
    const webhookUrl = config.webhook_url || process.env.SLACK_WEBHOOK_URL
    if (!webhookUrl) {
      throw new Error('Slack webhook URL not configured')
    }

    const slackPayload = {
      text: notification.title,
      attachments: [
        {
          color: this.getSlackColorForType(notification.type),
          fields: [
            {
              title: 'Message',
              value: notification.message,
              short: false
            }
          ],
          ts: Math.floor(Date.now() / 1000)
        }
      ]
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackPayload)
    })

    if (!response.ok) {
      throw new Error('Failed to send Slack notification')
    }

    logger.debug('Slack notification sent', { userId, type: notification.type })
  }

  /**
   * Send Microsoft Teams notification
   */
  async sendTeamsNotification(userId, notification, config) {
    const webhookUrl = config.webhook_url || process.env.TEAMS_WEBHOOK_URL
    if (!webhookUrl) {
      throw new Error('Teams webhook URL not configured')
    }

    const teamsPayload = {
      '@type': 'MessageCard',
      '@context': 'http://schema.org/extensions',
      summary: notification.title,
      themeColor: this.getTeamsColorForType(notification.type),
      sections: [
        {
          activityTitle: notification.title,
          activitySubtitle: notification.message,
          facts: Object.entries(notification.data || {}).map(([key, value]) => ({
            name: key,
            value: String(value)
          }))
        }
      ]
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teamsPayload)
    })

    if (!response.ok) {
      throw new Error('Failed to send Teams notification')
    }

    logger.debug('Teams notification sent', { userId, type: notification.type })
  }

  /**
   * Send Discord notification
   */
  async sendDiscordNotification(userId, notification, config) {
    const webhookUrl = config.webhook_url || process.env.DISCORD_WEBHOOK_URL
    if (!webhookUrl) {
      throw new Error('Discord webhook URL not configured')
    }

    const discordPayload = {
      embeds: [
        {
          title: notification.title,
          description: notification.message,
          color: this.getDiscordColorForType(notification.type),
          timestamp: new Date().toISOString(),
          fields: Object.entries(notification.data || {}).map(([key, value]) => ({
            name: key,
            value: String(value),
            inline: true
          }))
        }
      ]
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(discordPayload)
    })

    if (!response.ok) {
      throw new Error('Failed to send Discord notification')
    }

    logger.debug('Discord notification sent', { userId, type: notification.type })
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Check if current time is in user's quiet hours
   */
  isInQuietHours(preferences) {
    if (!preferences.quiet_hours?.enabled) {
      return false
    }

    const now = new Date()
    const currentHour = now.getHours()
    const currentMinute = now.getMinutes()
    const currentTime = currentHour * 60 + currentMinute

    const [startHour, startMinute] = preferences.quiet_hours.start.split(':').map(Number)
    const [endHour, endMinute] = preferences.quiet_hours.end.split(':').map(Number)
    
    const startTime = startHour * 60 + startMinute
    const endTime = endHour * 60 + endMinute

    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (startTime > endTime) {
      return currentTime >= startTime || currentTime <= endTime
    }

    return currentTime >= startTime && currentTime <= endTime
  }

  /**
   * Check if event type is enabled for channel
   */
  isEventEnabledForChannel(eventType, enabledEvents) {
    return enabledEvents.includes('all') || enabledEvents.includes(eventType)
  }

  /**
   * Check if notification should be sent based on frequency limits
   */
  shouldSendBasedOnFrequency(userId, channelId, frequency) {
    // TODO: Implement frequency limiting logic
    // For now, allow all immediate notifications
    return frequency === 'immediate'
  }

  /**
   * Store notification for later delivery (quiet hours)
   */
  async storeNotificationForLater(userId, notification) {
    await this.supabase
      .from('delayed_notifications')
      .insert([{
        user_id: userId,
        notification_data: notification,
        scheduled_for: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() // 8 hours later
      }])
  }

  /**
   * Store notification in history
   */
  async storeNotificationHistory(userId, notification, metadata) {
    await this.supabase
      .from('notification_history')
      .insert([{
        user_id: userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        data: notification.data,
        metadata,
        created_at: new Date().toISOString()
      }])
  }

  /**
   * Generate unique notification ID
   */
  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Generate email content
   */
  generateEmailContent(notification) {
    return `
      <h2>${notification.title}</h2>
      <p>${notification.message}</p>
      ${notification.data ? `
        <h3>Details:</h3>
        <ul>
          ${Object.entries(notification.data).map(([key, value]) => 
            `<li><strong>${key}:</strong> ${value}</li>`
          ).join('')}
        </ul>
      ` : ''}
      <hr>
      <p><small>Sent by RPA Platform - <a href="${process.env.CLIENT_URL}">Manage your notification preferences</a></small></p>
    `
  }

  /**
   * Get color codes for different platforms
   */
  getSlackColorForType(type) {
    const colors = {
      'execution-completed': 'good',
      'execution-failed': 'danger',
      'execution-started': '#36a64f',
      'execution-cancelled': 'warning'
    }
    return colors[type] || '#36a64f'
  }

  getTeamsColorForType(type) {
    const colors = {
      'execution-completed': '00FF00',
      'execution-failed': 'FF0000',
      'execution-started': '0078D4',
      'execution-cancelled': 'FFA500'
    }
    return colors[type] || '0078D4'
  }

  getDiscordColorForType(type) {
    const colors = {
      'execution-completed': 0x00FF00,
      'execution-failed': 0xFF0000,
      'execution-started': 0x0078D4,
      'execution-cancelled': 0xFFA500
    }
    return colors[type] || 0x0078D4
  }

  /**
   * Get available notification channels
   */
  getAvailableChannels() {
    return Array.from(this.channels.entries()).map(([id, channel]) => ({
      id,
      name: channel.name,
      enabled: channel.enabled
    }))
  }

  /**
   * Get notification history for user
   */
  async getNotificationHistory(userId, options = {}) {
    const { page = 1, limit = 50, type = null } = options
    const offset = (page - 1) * limit

    let query = this.supabase
      .from('notification_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (type) {
      query = query.eq('type', type)
    }

    const { data: notifications, error, count } = await query

    if (error) {
      throw error
    }

    return {
      notifications: notifications || [],
      pagination: {
        page,
        limit,
        total: count,
        pages: Math.ceil(count / limit)
      }
    }
  }
}