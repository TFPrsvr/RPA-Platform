# Webhook Setup Instructions

## ✅ What's Been Implemented

Complete webhook system for real-time sync between Clerk and Supabase:

### **User Events:**
- `user.created` - Automatically creates profile in Supabase
- `user.updated` - Updates user email and profile data
- `user.deleted` - Anonymizes user data (preserves workflows)

### **Organization Events:**
- `organization.created` - Creates organization in Supabase
- `organization.updated` - Updates organization name/slug
- `organization.deleted` - Removes organization and cascades

### **Membership Events:**
- `organizationMembership.created` - Adds user to organization
- `organizationMembership.updated` - Updates user role (admin/member)
- `organizationMembership.deleted` - Removes user from organization

## 🚀 Setup Steps

### 1. **Start the Webhook Server**
```bash
# Option A: Run both servers together
npm run dev:all

# Option B: Run webhook server separately
npm run webhook
```

### 2. **Configure Webhooks in Clerk Dashboard**

1. Go to your Clerk dashboard: https://clerk.com
2. Navigate to **Webhooks** in the sidebar
3. Click **"Add Endpoint"**
4. Configure the endpoint:

**Endpoint URL:** `http://localhost:3001/api/webhooks/clerk`

**Events to subscribe to:**
```
✅ user.created
✅ user.updated  
✅ user.deleted
✅ organization.created
✅ organization.updated
✅ organization.deleted
✅ organizationMembership.created
✅ organizationMembership.updated
✅ organizationMembership.deleted
```

5. **Copy the Webhook Secret** (starts with `whsec_`)
6. **Update your .env file:**
```env
CLERK_WEBHOOK_SECRET=whsec_your_actual_secret_here
```

### 3. **For Production Deployment**

Replace localhost with your production URL:
```
https://your-domain.com/api/webhooks/clerk
```

## 🔧 How It Works

1. **User signs up** → Clerk sends `user.created` webhook → Profile created in Supabase
2. **User creates org** → Clerk sends `organization.created` webhook → Organization created in Supabase  
3. **User joins org** → Clerk sends `organizationMembership.created` webhook → Membership recorded in Supabase
4. **All data stays in sync automatically** ✨

## 🎯 Benefits

- **Real-time sync** between Clerk and Supabase
- **No manual profile creation** required
- **Automatic organization setup**
- **Secure webhook verification** with Svix
- **Comprehensive logging** for debugging
- **Error handling** and recovery

## 📊 Monitoring

Check webhook server logs:
```bash
# Webhook server shows real-time processing
🚀 Webhook server running on port 3001
📡 Webhook endpoint: http://localhost:3001/api/webhooks/clerk
💓 Health check: http://localhost:3001/health

Processing user.created: user_xxx
Profile created successfully for user: user_xxx
```

## 🔍 Testing

1. **Sign up a new user** - Check logs for `user.created` processing
2. **Create an organization** - Check logs for `organization.created` 
3. **Invite a user** - Check logs for `organizationMembership.created`
4. **Verify in Supabase** - All data should appear automatically

Your RPA platform now has enterprise-grade real-time user and organization management! 🎉