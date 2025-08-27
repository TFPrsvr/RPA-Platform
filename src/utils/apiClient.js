import { HTTP_STATUS, ERROR_MESSAGES } from '../constants/apiEndpoints'

class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

class ApiClient {
  constructor(baseURL = '', options = {}) {
    this.baseURL = baseURL
    this.defaultOptions = {
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
      ...options
    }
    this.interceptors = {
      request: [],
      response: []
    }
  }

  addRequestInterceptor(interceptor) {
    this.interceptors.request.push(interceptor)
  }

  addResponseInterceptor(interceptor) {
    this.interceptors.response.push(interceptor)
  }

  async request(url, options = {}) {
    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`
    let config = {
      ...this.defaultOptions,
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...this.defaultOptions.headers,
        ...options.headers
      }
    }

    // Apply request interceptors
    for (const interceptor of this.interceptors.request) {
      config = await interceptor(config)
    }

    return this.executeRequest(fullUrl, config)
  }

  async executeRequest(url, config, attempt = 1) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), config.timeout)

    try {
      const response = await fetch(url, {
        ...config,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      // Apply response interceptors
      let processedResponse = response
      for (const interceptor of this.interceptors.response) {
        processedResponse = await interceptor(processedResponse)
      }

      if (!processedResponse.ok) {
        return this.handleErrorResponse(processedResponse, url, config, attempt)
      }

      const contentType = processedResponse.headers.get('content-type')
      let data

      if (contentType && contentType.includes('application/json')) {
        data = await processedResponse.json()
      } else {
        data = await processedResponse.text()
      }

      return {
        data,
        status: processedResponse.status,
        statusText: processedResponse.statusText,
        headers: processedResponse.headers
      }

    } catch (error) {
      clearTimeout(timeoutId)
      return this.handleRequestError(error, url, config, attempt)
    }
  }

  async handleErrorResponse(response, url, config, attempt) {
    let errorData = null
    
    try {
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        errorData = await response.json()
      } else {
        errorData = await response.text()
      }
    } catch (parseError) {
      console.warn('Failed to parse error response:', parseError)
    }

    const errorMessage = this.getErrorMessage(response.status, errorData)
    
    // Retry for certain status codes
    if (this.shouldRetry(response.status, attempt, config.retries)) {
      return this.retryRequest(url, config, attempt + 1)
    }

    throw new ApiError(errorMessage, response.status, errorData)
  }

  async handleRequestError(error, url, config, attempt) {
    if (error.name === 'AbortError') {
      const timeoutError = new ApiError('Request timeout', 408)
      
      if (this.shouldRetry(408, attempt, config.retries)) {
        return this.retryRequest(url, config, attempt + 1)
      }
      
      throw timeoutError
    }

    // Network errors
    if (!navigator.onLine) {
      throw new ApiError(ERROR_MESSAGES.NETWORK_ERROR, 0)
    }

    // Retry network errors
    if (this.shouldRetry(0, attempt, config.retries)) {
      return this.retryRequest(url, config, attempt + 1)
    }

    throw new ApiError(
      error.message || ERROR_MESSAGES.NETWORK_ERROR,
      0,
      error
    )
  }

  shouldRetry(status, attempt, maxRetries) {
    if (attempt >= maxRetries) return false
    
    // Retry on network errors, timeouts, and certain server errors
    const retryableStatuses = [0, 408, 429, 500, 502, 503, 504]
    return retryableStatuses.includes(status)
  }

  async retryRequest(url, config, attempt) {
    const delay = config.retryDelay * Math.pow(2, attempt - 1) // Exponential backoff
    await this.sleep(delay)
    return this.executeRequest(url, config, attempt)
  }

  getErrorMessage(status, errorData) {
    // Try to extract message from error data
    if (errorData) {
      if (typeof errorData === 'string') return errorData
      if (errorData.message) return errorData.message
      if (errorData.error) return errorData.error
    }

    // Default messages based on status
    switch (status) {
      case HTTP_STATUS.BAD_REQUEST:
        return ERROR_MESSAGES.VALIDATION_ERROR
      case HTTP_STATUS.UNAUTHORIZED:
        return ERROR_MESSAGES.UNAUTHORIZED
      case HTTP_STATUS.FORBIDDEN:
        return ERROR_MESSAGES.UNAUTHORIZED
      case HTTP_STATUS.NOT_FOUND:
        return 'Resource not found'
      case HTTP_STATUS.INTERNAL_SERVER_ERROR:
        return ERROR_MESSAGES.SERVER_ERROR
      default:
        return ERROR_MESSAGES.GENERIC_ERROR
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  // Convenience methods
  get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' })
  }

  post(url, data = null, options = {}) {
    return this.request(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  put(url, data = null, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  patch(url, data = null, options = {}) {
    return this.request(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    })
  }

  delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' })
  }
}

// Create default instance
const apiClient = new ApiClient()

// Add auth interceptor
apiClient.addRequestInterceptor(async (config) => {
  // Add authentication token if available
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Add response logging in development
if (process.env.NODE_ENV === 'development') {
  apiClient.addResponseInterceptor(async (response) => {
    console.log(`${response.status} ${response.statusText}:`, response.url)
    return response
  })
}

export { ApiClient, ApiError }
export default apiClient