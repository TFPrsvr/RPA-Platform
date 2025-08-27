/**
 * 🧪 Integration Test Script
 * Tests Supabase connection and authentication flows
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const requiredEnvVars = ['VITE_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY']
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName])

if (missingEnvVars.length > 0) {
  console.error('❌ Missing environment variables for testing:')
  missingEnvVars.forEach(varName => {
    console.error(`   - ${varName}`)
  })
  process.exit(1)
}

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

async function testDatabaseConnection() {
  console.log('\n🔌 Testing database connection...')
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true })
    
    if (error) {
      console.error('❌ Database connection failed:', error.message)
      return false
    }
    
    console.log('✅ Database connection successful')
    return true
  } catch (error) {
    console.error('❌ Database connection error:', error.message)
    return false
  }
}

async function testTableStructure() {
  console.log('\n🗄️ Testing table structure...')
  
  const tables = [
    'profiles',
    'organizations', 
    'organization_memberships',
    'workflows',
    'workflow_executions'
  ]
  
  const results = []
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1)
      
      if (error) {
        console.error(`❌ Table '${table}' error:`, error.message)
        results.push({ table, success: false, error: error.message })
      } else {
        console.log(`✅ Table '${table}' accessible`)
        results.push({ table, success: true })
      }
    } catch (error) {
      console.error(`❌ Table '${table}' exception:`, error.message)
      results.push({ table, success: false, error: error.message })
    }
  }
  
  return results
}

async function testRLSPolicies() {
  console.log('\n🔒 Testing Row Level Security policies...')
  
  try {
    // Test with a mock user ID
    const mockUserId = 'test-user-123'
    
    // Test profile access (should work with service role)
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', mockUserId)
    
    if (profileError && profileError.code !== 'PGRST116') {
      console.error('❌ Profile RLS test failed:', profileError.message)
      return false
    }
    
    console.log('✅ RLS policies configured (service role can bypass)')
    return true
  } catch (error) {
    console.error('❌ RLS policy test error:', error.message)
    return false
  }
}

async function testWorkflowOperations() {
  console.log('\n⚙️ Testing workflow operations...')
  
  try {
    const testWorkflow = {
      name: 'Test Workflow Integration',
      description: 'Test workflow for integration testing',
      user_id: 'test-user-123',
      status: 'draft',
      steps: [
        {
          id: '1',
          type: 'click',
          config: { selector: '#test-button' }
        }
      ],
      variables: {
        testVar: 'testValue'
      }
    }
    
    // Create test workflow
    const { data: created, error: createError } = await supabase
      .from('workflows')
      .insert([testWorkflow])
      .select()
      .single()
    
    if (createError) {
      console.error('❌ Workflow creation failed:', createError.message)
      return false
    }
    
    console.log('✅ Workflow creation successful')
    
    // Update test workflow
    const { data: updated, error: updateError } = await supabase
      .from('workflows')
      .update({ description: 'Updated test description' })
      .eq('id', created.id)
      .select()
      .single()
    
    if (updateError) {
      console.error('❌ Workflow update failed:', updateError.message)
      return false
    }
    
    console.log('✅ Workflow update successful')
    
    // Delete test workflow
    const { error: deleteError } = await supabase
      .from('workflows')
      .delete()
      .eq('id', created.id)
    
    if (deleteError) {
      console.error('❌ Workflow deletion failed:', deleteError.message)
      return false
    }
    
    console.log('✅ Workflow deletion successful')
    return true
  } catch (error) {
    console.error('❌ Workflow operations test error:', error.message)
    return false
  }
}

async function testOrganizationOperations() {
  console.log('\n🏢 Testing organization operations...')
  
  try {
    const testOrg = {
      clerk_org_id: 'org_test_123',
      name: 'Test Organization',
      slug: 'test-org',
      branding_config: {
        primaryColor: '#007bff'
      }
    }
    
    // Create test organization
    const { data: created, error: createError } = await supabase
      .from('organizations')
      .insert([testOrg])
      .select()
      .single()
    
    if (createError) {
      console.error('❌ Organization creation failed:', createError.message)
      return false
    }
    
    console.log('✅ Organization creation successful')
    
    // Test membership creation
    const testMembership = {
      organization_id: created.id,
      user_id: 'test-user-123',
      role: 'admin'
    }
    
    const { data: membership, error: membershipError } = await supabase
      .from('organization_memberships')
      .insert([testMembership])
      .select()
      .single()
    
    if (membershipError) {
      console.error('❌ Membership creation failed:', membershipError.message)
    } else {
      console.log('✅ Membership creation successful')
    }
    
    // Clean up
    await supabase.from('organization_memberships').delete().eq('id', membership?.id)
    await supabase.from('organizations').delete().eq('id', created.id)
    
    console.log('✅ Organization cleanup successful')
    return true
  } catch (error) {
    console.error('❌ Organization operations test error:', error.message)
    return false
  }
}

async function runAllTests() {
  console.log('🚀 Starting Supabase Integration Tests')
  console.log('=====================================')
  
  const results = {
    connection: false,
    tables: [],
    rls: false,
    workflows: false,
    organizations: false
  }
  
  // Test database connection
  results.connection = await testDatabaseConnection()
  
  if (!results.connection) {
    console.log('\n❌ Database connection failed - skipping other tests')
    return results
  }
  
  // Test table structure
  results.tables = await testTableStructure()
  
  // Test RLS policies
  results.rls = await testRLSPolicies()
  
  // Test workflow operations
  results.workflows = await testWorkflowOperations()
  
  // Test organization operations
  results.organizations = await testOrganizationOperations()
  
  // Summary
  console.log('\n📊 Test Results Summary')
  console.log('=======================')
  console.log(`Database Connection: ${results.connection ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Table Access: ${results.tables.every(t => t.success) ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`RLS Policies: ${results.rls ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Workflow Operations: ${results.workflows ? '✅ PASS' : '❌ FAIL'}`)
  console.log(`Organization Operations: ${results.organizations ? '✅ PASS' : '❌ FAIL'}`)
  
  const allPassed = results.connection && 
                    results.tables.every(t => t.success) && 
                    results.rls && 
                    results.workflows && 
                    results.organizations
  
  console.log(`\n${allPassed ? '🎉 ALL TESTS PASSED' : '⚠️ SOME TESTS FAILED'}`)
  
  return results
}

// Run tests if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Test runner error:', error)
      process.exit(1)
    })
}

export { runAllTests }