/**
 * 🪝 Webhook Integration Test Script  
 * Tests Clerk webhook endpoints and signature verification
 */

import crypto from 'crypto'
import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:3001'
const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET || 'whsec_test_webhook_secret'

/**
 * Generate Svix signature headers for webhook testing
 */
function generateSvixSignature(payload, secret, timestamp) {
  const id = `msg_${crypto.randomBytes(12).toString('hex')}`
  const timestampStr = timestamp.toString()
  
  // Create the signed content (id.timestamp.payload)
  const signedContent = `${id}.${timestampStr}.${payload}`
  
  // Generate signature using HMAC-SHA256
  const signature = crypto
    .createHmac('sha256', secret.replace('whsec_', ''))
    .update(signedContent, 'utf8')
    .digest('base64')
  
  return {
    'svix-id': id,
    'svix-timestamp': timestampStr,
    'svix-signature': `v1,${signature}`
  }
}

/**
 * Test webhook payloads
 */
const testPayloads = {
  userCreated: {
    type: 'user.created',
    data: {
      id: 'user_test_123456',
      email_addresses: [{
        email_address: 'test.user@example.com'
      }],
      first_name: 'Test',
      last_name: 'User',
      created_at: Date.now()
    }
  },
  
  userUpdated: {
    type: 'user.updated',
    data: {
      id: 'user_test_123456',
      email_addresses: [{
        email_address: 'updated.test.user@example.com'
      }],
      first_name: 'Updated',
      last_name: 'User',
      updated_at: Date.now()
    }
  },
  
  organizationCreated: {
    type: 'organization.created',
    data: {
      id: 'org_test_789012',
      name: 'Test Organization',
      slug: 'test-org',
      created_at: Date.now()
    }
  },
  
  organizationMembershipCreated: {
    type: 'organizationMembership.created',
    data: {
      id: 'orgmem_test_345678',
      role: 'admin',
      organization: {
        id: 'org_test_789012',
        name: 'Test Organization'
      },
      public_user_data: {
        user_id: 'user_test_123456'
      },
      created_at: Date.now()
    }
  },
  
  userDeleted: {
    type: 'user.deleted',
    data: {
      id: 'user_test_123456',
      deleted: true,
      deleted_at: Date.now()
    }
  }
}

/**
 * Send webhook test request
 */
async function sendWebhookTest(eventType, payload) {
  try {
    const timestamp = Math.floor(Date.now() / 1000)
    const payloadString = JSON.stringify(payload)
    const headers = generateSvixSignature(payloadString, WEBHOOK_SECRET, timestamp)
    
    console.log(`\n🧪 Testing ${eventType} webhook...`)
    console.log(`   Payload size: ${payloadString.length} bytes`)
    console.log(`   Timestamp: ${timestamp}`)
    console.log(`   Signature headers generated: ✅`)
    
    const response = await fetch(`${WEBHOOK_URL}/api/webhooks/clerk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      body: payloadString
    })
    
    const responseText = await response.text()
    let responseData = {}
    
    try {
      responseData = JSON.parse(responseText)
    } catch (e) {
      responseData = { raw: responseText }
    }
    
    if (response.ok) {
      console.log(`   ✅ ${eventType}: HTTP ${response.status}`)
      console.log(`   Response:`, responseData)
      return { success: true, status: response.status, data: responseData }
    } else {
      console.log(`   ❌ ${eventType}: HTTP ${response.status}`)
      console.log(`   Error:`, responseData)
      return { success: false, status: response.status, error: responseData }
    }
  } catch (error) {
    console.log(`   ❌ ${eventType}: Request failed`)
    console.log(`   Error:`, error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Test webhook server health
 */
async function testWebhookServerHealth() {
  try {
    console.log('\n🏥 Testing webhook server health...')
    
    const response = await fetch(`${WEBHOOK_URL}/health`)
    const data = await response.json()
    
    if (response.ok) {
      console.log('   ✅ Webhook server is healthy')
      console.log('   Status:', data.status)
      console.log('   Environment:', data.env)
      console.log('   Version:', data.version)
      return true
    } else {
      console.log('   ❌ Webhook server health check failed')
      console.log('   Status:', response.status)
      return false
    }
  } catch (error) {
    console.log('   ❌ Cannot connect to webhook server')
    console.log('   Error:', error.message)
    return false
  }
}

/**
 * Test signature verification failure
 */
async function testInvalidSignature() {
  try {
    console.log('\n🔒 Testing invalid signature rejection...')
    
    const payload = JSON.stringify(testPayloads.userCreated)
    
    const response = await fetch(`${WEBHOOK_URL}/api/webhooks/clerk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'svix-id': 'invalid_id',
        'svix-timestamp': Math.floor(Date.now() / 1000).toString(),
        'svix-signature': 'v1,invalid_signature'
      },
      body: payload
    })
    
    if (response.status === 400) {
      console.log('   ✅ Invalid signature correctly rejected')
      return true
    } else {
      console.log(`   ❌ Expected 400, got ${response.status}`)
      return false
    }
  } catch (error) {
    console.log('   ❌ Invalid signature test failed:', error.message)
    return false
  }
}

/**
 * Test missing headers
 */
async function testMissingHeaders() {
  try {
    console.log('\n📋 Testing missing headers rejection...')
    
    const payload = JSON.stringify(testPayloads.userCreated)
    
    const response = await fetch(`${WEBHOOK_URL}/api/webhooks/clerk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
        // Missing svix headers
      },
      body: payload
    })
    
    if (response.status === 400) {
      console.log('   ✅ Missing headers correctly rejected')
      return true
    } else {
      console.log(`   ❌ Expected 400, got ${response.status}`)
      return false
    }
  } catch (error) {
    console.log('   ❌ Missing headers test failed:', error.message)
    return false
  }
}

/**
 * Run all webhook tests
 */
async function runWebhookTests() {
  console.log('🚀 Starting Clerk Webhook Integration Tests')
  console.log('=============================================')
  console.log(`Webhook URL: ${WEBHOOK_URL}`)
  console.log(`Secret configured: ${WEBHOOK_SECRET ? 'Yes' : 'No'}`)
  
  const results = {
    health: false,
    invalidSignature: false,
    missingHeaders: false,
    webhookTests: []
  }
  
  // Test server health
  results.health = await testWebhookServerHealth()
  
  if (!results.health) {
    console.log('\n❌ Webhook server is not accessible - skipping other tests')
    return results
  }
  
  // Test security validations
  results.invalidSignature = await testInvalidSignature()
  results.missingHeaders = await testMissingHeaders()
  
  // Test each webhook type
  console.log('\n📡 Testing webhook event handling...')
  
  for (const [eventType, payload] of Object.entries(testPayloads)) {
    const result = await sendWebhookTest(eventType, payload)
    results.webhookTests.push({ eventType, ...result })
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  // Summary
  console.log('\n📊 Test Results Summary')
  console.log('=======================')
  console.log(`Server Health: ${results.health ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Invalid Signature: ${results.invalidSignature ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Missing Headers: ${results.missingHeaders ? '✅ PASS' : '❌ FAIL'}`)
  
  const passedWebhooks = results.webhookTests.filter(t => t.success).length
  const totalWebhooks = results.webhookTests.length
  console.log(`Webhook Events: ${passedWebhooks}/${totalWebhooks} passed`)
  
  results.webhookTests.forEach(test => {
    console.log(`  ${test.eventType}: ${test.success ? '✅ PASS' : '❌ FAIL'}`)
  })
  
  const allPassed = results.health && 
                    results.invalidSignature && 
                    results.missingHeaders && 
                    results.webhookTests.every(t => t.success)
  
  console.log(`\n${allPassed ? '🎉 ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED'}`)
  
  return results
}

// Install node-fetch if not available
async function ensureNodeFetch() {
  try {
    await import('node-fetch')
  } catch (error) {
    console.error('❌ node-fetch is required for webhook tests')
    console.error('   Install with: npm install node-fetch')
    process.exit(1)
  }
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  await ensureNodeFetch()
  runWebhookTests()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Test runner error:', error)
      process.exit(1)
    })
}

export { runWebhookTests }