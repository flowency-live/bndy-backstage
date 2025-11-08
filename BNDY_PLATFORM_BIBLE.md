# BNDY PLATFORM BIBLE

*The definitive technical reference for all BNDY platform development*

**Last Updated**: October 29, 2025
**Purpose**: Single source of truth for architecture, patterns, and implementation details
**Status**: Production Serverless with Multi-Method Auth (Phone OTP, Email Magic Links, Google OAuth, Apple Sign In)

---

## 🎯 **TARGET ARCHITECTURE** *(Production-Ready Serverless)*

### **Core Platform Vision**
- **100% Serverless**: Lambda + API Gateway + DynamoDB + Cognito + S3
- **Single Domain Strategy**: Amplify proxy patterns eliminate CORS complexity
- **Pay-Per-Use Pricing**: True serverless scaling with 85% cost reduction
- **Production Security**: httpOnly JWT cookies, OAuth providers, IAM roles

### **Target Infrastructure**
```
Frontend Apps (Amplify)
    ↓ (proxy)
API Gateway HTTP v2 → Lambda Functions → DynamoDB + S3
    ↓ (authentication)
Cognito User Pools → JWT Session Management
```

### **Target Application Architecture**
```
{app}.bndy.co.uk → CloudFront (Amplify)
  ├── Path: /api/* → API Gateway → Lambda Functions → DynamoDB/S3
  ├── Path: /auth/* → API Gateway → Auth Lambda → Cognito
  └── Path: /* → React/Next.js SPA
```

### **Target Security Model**
- **Authentication**: Multi-method auth - Phone OTP, Email Magic Links, Google OAuth, Apple Sign In
- **Session Management**: JWT tokens with 90-day expiry, httpOnly cookies on .bndy.co.uk domain
- **Authorization**: Function-level JWT validation with httpOnly cookies
- **Data**: DynamoDB with IAM roles, S3 with presigned URLs
- **Transport**: HTTPS everywhere, SameSite cookies, CORS properly configured

---

## 🏗️ **ACTUAL CURRENT STATE** *(October 3, 2025)*

### **Infrastructure Status**

#### **✅ PRODUCTION SERVICES**

**AWS Lambda Functions** (All via GitHub Actions CI/CD):
- **bndy-serverless-api-AuthFunction-gKJksEC1lGjw**: 🔒 **AUTHENTICATION ONLY** - Multi-method auth + session management
  - **SINGLE RESPONSIBILITY**: Authentication (all methods), JWT sessions, user verification - NOTHING ELSE
  - **Authentication Methods**: Phone OTP (Pinpoint SMS), Email Magic Links (SES), Google OAuth, Apple Sign In (Cognito)
  - **Session Management**: 90-day JWT tokens with httpOnly cookies on .bndy.co.uk domain
  - **User Auto-Creation**: Creates user records in DynamoDB on first successful auth (any method)
  - **Routes**:
    - Phone: `/auth/phone/request-otp`, `/auth/phone/verify-otp`, `/auth/phone/verify-and-onboard`
    - Email: `/auth/email/request-magic`, `/auth/magic/{token}`, `/auth/check-identity`
    - OAuth: `/auth/google`, `/auth/apple`, `/auth/callback`
    - Session: `/api/me`, `/auth/logout`
  - ⚠️ **CRITICAL**: Does NOT return memberships/bands - that's memberships-lambda's job
- **bndy-serverless-api-UsersFunction-HNQeQw7kJO9b**: User profile CRUD & admin management
  - Routes: `/users/profile` (GET, PUT), `/users` (GET - godmode list with membership counts), `/users/{userId}` (DELETE - cascade to memberships)
- **bndy-serverless-api-ArtistsFunction-4wCJA9JLMwF5**: Artist CRUD with membership creation
  - **Artist types**: band, solo, duo, group, dj, collective
  - **Auto-creates owner membership** on artist creation
  - Routes: `/api/artists` (GET, POST), `/api/artists/{id}` (GET, PUT, DELETE)
- **bndy-serverless-api-MembershipsFunction**: ✅ **DEPLOYED** - Artist membership management
  - **SEPARATION OF CONCERNS**: All membership logic lives here, NOT in auth-lambda
  - Handles member invitations, role changes, permission management
  - Profile inheritance from user with context-specific overrides
  - Returns user's artist memberships with resolved profiles
  - Routes: `/api/memberships/me` (GET - current user's memberships), `/api/artists/{id}/members` (GET, POST), `/api/memberships/{id}` (PUT, DELETE)
- **bndy-serverless-api-InvitesFunction**: ✅ **DEPLOYED** - Invite management with SMS
  - General invites (QR codes, shareable links) for artist membership
  - Phone-specific invites sent via AWS Pinpoint SMS
  - Email invites (future feature)
  - Routes: `/api/artists/{artistId}/invites` (GET, POST, DELETE), `/api/artists/{artistId}/invites/phone` (POST), `/api/invites/{token}/accept` (POST)
- **bndy-serverless-api-UploadsFunction**: S3 image uploads with presigned URLs
  - Routes: `/uploads/presigned-url` (POST)
  - S3 bucket: `bndy-images` with public read access
- **bndy-serverless-api-IssuesFunction**: Bug/feature tracking
  - Routes: `/issues` (GET, POST), `/issues/{id}` (PUT, DELETE), `/issues/batch` (POST)
- **bndy-serverless-api-VenuesFunction-z91LnIIRKHhq**: Venue CRUD
  - Routes: `/api/venues` (GET, POST), `/api/venues/{id}` (GET, PUT, DELETE), `/api/venues/search` (GET)
- **bndy-serverless-api-SongsFunction-c3eFxAdsTmeS**: Song CRUD & Playbook management
  - **Global Songs**: `/api/songs` (GET, POST), `/api/songs/{id}` (GET, PUT, DELETE)
  - **Artist Playbooks**: `/api/artists/{artistId}/playbook` (GET, POST), `/api/artists/{artistId}/playbook/{songId}` (GET, PUT, DELETE)
  - **Readiness**: `/api/artists/{artistId}/songs/{songId}/readiness` (POST - update member readiness status)
  - **Veto**: `/api/artists/{artistId}/songs/{songId}/veto` (POST, DELETE - toggle veto)
- **bndy-serverless-api-EventsFunction**: ✅ **DEPLOYED** - Calendar & event management
  - Routes: `/api/artists/{artistId}/events` (GET, POST), `/api/artists/{artistId}/events/{eventId}` (GET, PUT, DELETE)
  - `/api/artists/{artistId}/calendar` (GET - date range query with ?startDate&endDate)
  - `/api/artists/{artistId}/calendar/export/ical` (GET - iCal export)
  - `/api/artists/{artistId}/calendar/url` (GET - calendar subscription URL)
- **bndy-serverless-api-SetlistsFunction**: ✅ **DEPLOYED** - Setlist management
  - Routes: `/api/artists/{artistId}/setlists` (GET, POST), `/api/artists/{artistId}/setlists/{setlistId}` (GET, PUT, DELETE)
  - `/api/artists/{artistId}/setlists/{setlistId}/duplicate` (POST - copy setlist)

**API Gateway**: `qry0k6pmd0` (HTTP API v2)
- Custom domain: `api.bndy.co.uk`
- Region: `eu-west-2` (London)
- CORS configured for all Amplify apps (*.bndy.co.uk)
- 40+ routes operational across all Lambda functions
- Authentication: httpOnly cookies with JWT validation per route

**Database**: DynamoDB (Pay-per-request)
- `bndy-users`: User profiles and authentication
  - GSI: `phone-index` for phone number lookups (phone auth)
- `bndy-otp-codes`: Phone OTP verification codes (5-minute TTL)
- `bndy-magic-tokens`: Email magic link tokens (5-minute TTL)
- `bndy-artist-memberships`: User-artist membership relationships
  - GSI: `user_id-index` for querying user's memberships
  - GSI: `artist_id-index` for querying artist's members
  - Supports profile inheritance (NULL = inherit from user, non-NULL = custom)
- `bndy-invites`: Artist membership invites (7-day TTL)
  - GSI: `artistId-expiresAt-index` for querying active invites
- `bndy-venues`: Venue data
  - Primary key: `id` (UUID)
  - Fields: name, address, city, country, capacity, type, etc.
- `bndy-artists`: Artist data
  - Primary key: `id` (UUID)
  - Fields: name, artist_type (band/solo/duo/group/dj), bio, profile_image_url, etc.
- `bndy-songs`: Global song library
  - Primary key: `id` (UUID)
  - Fields: title, artist_name, album, spotify_url, duration, bpm, key, genre, release_date
- `bndy-artist-songs`: Artist playbooks (many-to-many junction table)
  - Primary key: `id` (UUID)
  - Foreign keys: `artist_id`, `global_song_id`
  - Fields: tuning, notes, custom_duration, guitar_chords_url, additional_url
  - Includes: readiness status per member, veto tracking
  - GSI: `artist_id-index` for querying artist's playbook
- `bndy-events`: Calendar events
  - Primary key: `id` (UUID)
  - Foreign key: `artist_id`
  - Fields: type (gig/practice/recording/other), title, venue, location, date, start_time, end_time, setlist_id
  - GSI: `artist_id-date-index` for date-range queries
- `bndy-setlists`: Setlist definitions
  - Primary key: `id` (UUID)
  - Foreign key: `artist_id`
  - Fields: name, description, songs (JSON array with order, segue info)
  - Song structure: `[{ id, title, artist, duration, tuning, segue_into: bool }]`
- `bndy-issues`: Bug/feature tracking
  - Primary key: `id` (UUID)
  - Fields: title, description, status, priority, created_by, etc.

**Storage**: S3
- `bndy-images`: Public bucket for user-uploaded images
- CORS configured for Amplify frontends
- Presigned URL upload pattern for secure file handling

**Authentication**: Cognito User Pools
- Pool ID: `eu-west-2_LqtkKHs1P`
- Google Identity Provider configured
- JWT sessions with 7-day expiry

#### **✅ FRONTEND APPLICATIONS** (All via Amplify auto-deploy)

**bndy-backstage** (`d3hbhqxqqchzbb`):
- Domain: `backstage.bndy.co.uk`
- Status: ✅ **FULLY OPERATIONAL**
- Features: Authentication, profile management, OAuth profile pictures, image uploads
- Proxy: `/api/*` and `/auth/*` → `api.bndy.co.uk`

**bndy-frontstage** (`d196da2xtqukv2`):
- Domain: `live.bndy.co.uk` (mapped)
- Status: ✅ **OPERATIONAL**
- Features: Venue map via DynamoDB Lambda API (9x performance improvement), Community event wizard
- Proxy: `/api/*` → API Gateway → Lambda → DynamoDB

**bndy-centrestage** (`d11w6zg9bc5o1g`):
- Domain: `centrestage.bndy.co.uk`
- Status: ✅ **FULL ADMIN OPERATIONAL**
- Features: Complete admin interface for venues, artists, songs
- Integration: Service layer → API Gateway → Lambda → DynamoDB

#### **⚠️ LEGACY SERVICES** (Scheduled for shutdown)

**App Runner**: `bndy-api` service
- Status: Running but legacy user management only
- Cost: ~$35/month
- Shutdown plan: After remaining user features migrated to Lambda

### **Current Architecture Data Flow**
```
OPERATIONAL (Serverless):
All Apps → Amplify Proxy → API Gateway → Lambda → DynamoDB + S3

AUTHENTICATION:
Frontend → Auth Lambda → Cognito → JWT Session → DynamoDB User Storage

IMAGE UPLOADS:
Frontend → Uploads Lambda → S3 Presigned URLs → Direct S3 Upload

ADMIN/CORE ENTITIES:
Admin Interface → Lambda APIs → DynamoDB (9x faster than previous)
```

---

## 🚀 **FEATURE STATUS** *(Production Ready)*

### **✅ COMPLETED FEATURES**

#### **Authentication System**
- Google OAuth flow with Cognito User Pools
- JWT session management with httpOnly cookies
- Automatic OAuth profile picture extraction and storage
- Server-side authentication (no client tokens)
- Cross-domain cookie support (.bndy.co.uk)
- Session persistence across page refreshes

#### **User Profile Management**
- Profile creation with OAuth data pre-population
- Image upload via S3 presigned URLs (replaces base64 storage)
- Google profile picture as default avatar
- Form validation with fallback error handling
- Mobile-responsive profile interface

#### **Issues/Bug Tracking**
- Complete CRUD interface for bug reports
- Type/priority/status filtering with search
- Batch operations for issue management
- Error handling for invalid data states
- Image attachments via S3 storage

#### **Admin Interface** (Centrestage)
- Full CRUD for venues, artists, songs
- Service layer architecture with TypeScript interfaces
- Error handling and validation
- Direct DynamoDB integration via Lambda APIs

#### **Performance & UX**
- 9x performance improvement (DynamoDB vs Firestore)
- Immediate visual feedback on interactions
- Loading states for authentication flows
- Error boundary patterns throughout

### **🔄 RECENTLY FIXED ISSUES** *(October 3, 2025)*

#### **Image Upload Infrastructure**
- ✅ **S3 Bucket Creation**: `bndy-images` with proper CORS and public read
- ✅ **Uploads Lambda**: Presigned URL generation with authentication
- ✅ **Frontend Integration**: Direct S3 upload replacing base64 storage
- ✅ **File Validation**: Size limits (5MB) and type validation
- ✅ **Security**: Authenticated presigned URLs with IAM role integration

#### **OAuth Profile Pictures**
- ✅ **ID Token Extraction**: Parse Google profile data from OAuth tokens
- ✅ **DynamoDB Schema**: Added `oauth_profile_picture` field
- ✅ **Smart Fallback**: Custom avatar → OAuth picture → placeholder
- ✅ **Profile Form**: Display OAuth picture as default when available

#### **Issues Management**
- ✅ **React Select Validation**: Fixed empty string value errors
- ✅ **Error Handling**: Graceful fallbacks for invalid issue type/status data
- ✅ **API Request Fix**: Use proper `apiRequest()` function for authentication

#### **Authentication Stability**
- ✅ **Session Persistence**: Fixed redirect loops on page refresh
- ✅ **Google Login UX**: Added loading state for immediate feedback
- ✅ **API Integration**: Consistent authentication across all endpoints

---

## 📂 **CODEBASE STATUS**

### **✅ ACTIVE REPOSITORIES**

#### **bndy-serverless-api** - Primary Backend
- **Local Path**: `C:\VSProjects\bndy-serverless-api`
- **Repository**: https://github.com/flowency-live/bndy-serverless-api
- **Technology**: AWS SAM, Lambda, API Gateway, DynamoDB
- **CI/CD**: ✅ **GitHub Actions** - Auto-deploy on push to main
- **Status**: ✅ **PRODUCTION OPERATIONAL**
- **Functions**: Auth, Users, Uploads, Issues, Venues, Artists, Songs
- **CloudFormation**: `bndy-serverless-api` stack

#### **bndy-backstage** - Artist/Venue Management
- **Local Path**: `C:\VSProjects\bndy-backstage`
- **Repository**: https://github.com/flowency-live/bndy-backstage
- **Technology**: React + Vite + TypeScript
- **Deployment**: ✅ **AWS Amplify** - Auto-deploy on push to main
- **Domain**: https://backstage.bndy.co.uk
- **Status**: ✅ **PRODUCTION READY**
- **Features**: Authentication, profiles, image uploads, OAuth pictures

#### **bndy-frontstage** - Event Discovery
- **Local Path**: `C:\VSProjects\bndy-frontstage` ⚠️ **ALWAYS use this path, NOT bndy.live**
- **Repository**: https://github.com/flowency-live/bndy.live (GitHub repo name differs from local folder)
- **Technology**: Next.js + React
- **Deployment**: ✅ **AWS Amplify** - Auto-deploy on push to main
- **Domain**: https://live.bndy.co.uk
- **Status**: ✅ **OPERATIONAL** - DynamoDB integration complete

#### **bndy-centrestage** - Admin Interface
- **Local Path**: `C:\VSProjects\bndy-centrestage`
- **Repository**: https://github.com/flowency-live/bndy-centrestage
- **Technology**: Next.js
- **Deployment**: ✅ **AWS Amplify** - Auto-deploy on push to main
- **Domain**: https://centrestage.bndy.co.uk
- **Status**: ✅ **FULL ADMIN OPERATIONAL**

#### **bndy-infrastructure** - Infrastructure as Code
- **Purpose**: CloudFormation templates and infrastructure documentation
- **Status**: ✅ **ACTIVE** - Contains production configuration templates

#### **bndy-api** - Legacy Backend
- **Repository**: https://github.com/flowency-live/bndy-api
- **Technology**: Node.js/Express + App Runner
- **Status**: ⚠️ **LEGACY** - Scheduled for shutdown after user migration
- **CI/CD**: Manual deployment only

### **🗑️ DEPRECATED**
- **bndy-dataconsolidation**: Migration complete - safe to delete

---

## 🔐 **AUTHENTICATION ARCHITECTURE DETAIL**

### **Production OAuth Flow**
```
1. User clicks Google login → Redirects to auth-lambda
2. Lambda generates OAuth state → Redirects to Cognito
3. Google OAuth → Redirects to auth-lambda callback
4. Lambda exchanges tokens → Creates/updates user in DynamoDB
5. Lambda sets JWT cookie → Redirects to frontend
6. Frontend authenticated → All API calls use cookie credentials
```

### **Security Implementation**
- **JWT Sessions**: Lightweight tokens with 90-day expiry (effectively unlimited for active users)
- **httpOnly Cookies**: Prevents XSS, secure, SameSite=Lax, domain=.bndy.co.uk
- **Multi-Method Auth**: Phone OTP (5min), Email Magic Links (5min), OAuth (Google/Apple)
- **Cognito Integration**: OAuth token exchange handled server-side
- **DynamoDB Users**: Persistent user storage with OAuth profile data
- **CORS Security**: Strict origin validation per application
- **Auto-Cleanup**: TTL-enabled tables for OTP codes and magic tokens

### **User Data Flow**
```javascript
// OAuth ID Token → Lambda Extraction → DynamoDB Storage
{
  cognito_id: "uuid",
  user_id: "uuid",
  email: "user@gmail.com",
  username: "google_123456789",
  oauth_profile_picture: "https://lh3.googleusercontent.com/...",
  first_name: "John",    // From Google
  last_name: "Smith",    // From Google
  avatar_url: null,      // Custom or defaults to oauth_profile_picture
  profile_complete: false
}
```

---

## 📱 **SMS / PHONE AUTHENTICATION ARCHITECTURE** *(October 14, 2025)*

### **Production SMS System**

**Service**: AWS End User Messaging SMS (Pinpoint SMS v2)
- **Phone Pool ID**: `pool-039d1debc6c84e3ab45e3f5f72adccad`
- **Sender ID**: `BNDY` (free, text-based sender for UK)
- **Message Type**: `TRANSACTIONAL` (high priority, time-sensitive)
- **Configuration Set**: `bndy-sms-config` (for logging/tracking)
- **Status**: ✅ **PRODUCTION OPERATIONAL**
- **Monthly Limit**: $50 USD approved

### **Why Pinpoint (Not SNS)**

⚠️ **CRITICAL**: AWS End User Messaging SMS (Pinpoint v2) is the ONLY approved method for sending SMS.

**SNS is DEPRECATED** for SMS:
- SNS still works but AWS recommends migration to Pinpoint
- Pinpoint offers better deliverability and analytics
- Production SMS requires Pinpoint setup (not SNS alone)

**Migration Complete** (October 14, 2025):
- ✅ Auth Lambda migrated from SNS to Pinpoint
- ✅ Invites Lambda migrated from SNS to Pinpoint
- ✅ All OTP and invite SMS now use Pinpoint API

### **Sender ID vs Phone Number**

**BNDY uses Sender ID** (not dedicated phone number):
- **Sender ID**: Free text-based sender (shows as "BNDY" on recipient's phone)
- **Cost**: $0/month (free for text-based sender IDs)
- **Supported Countries**: UK, most of Europe (NOT USA)
- **Limitation**: One-way only (cannot receive replies)

**Alternative (Not Used)**:
- **Dedicated Phone Number**: ~$1-2/month, supports two-way SMS
- **Use Case**: If we need users to reply to SMS (not needed for OTP)

### **Phone Authentication Flow**

```
1. User enters phone number → POST /auth/phone/request-otp
2. Lambda generates 6-digit OTP → Stores in bndy-otp-codes (5min TTL)
3. Lambda sends SMS via Pinpoint → User receives "Your BNDY verification code is: 123456"
4. User enters OTP → POST /auth/phone/verify-otp
5. Lambda validates OTP → Creates JWT session → Returns authenticated
6. (Optional) New user → POST /auth/phone/verify-and-onboard → Creates user profile
```

### **DynamoDB Tables for Phone Auth**

#### **`bndy-otp-codes` Table**
```javascript
{
  token: "uuid-v4",              // Primary key (request ID)
  phone: "sha256_hash",          // Hashed phone number (security)
  otp: "123456",                 // 6-digit code
  expiresAt: 1729012345,         // Unix timestamp (TTL field)
  createdAt: "2025-10-14T...",   // ISO timestamp
  requestId: "uuid",             // For tracking/logging
  attempts: 0                    // Rate limiting (future)
}
```
- **TTL Enabled**: Auto-deletes expired OTPs after 5 minutes
- **Security**: Phone numbers are hashed (SHA-256) before storage
- **No GSI needed**: Lookup by token only

#### **`bndy-users` Table - Phone Index**
```javascript
// Existing user record with phone support
{
  cognito_id: "uuid",            // Primary key
  user_id: "uuid",
  email: "user@example.com",
  phone: "+447758240770",        // E.164 format
  phone_verified: true,          // Set after OTP verification
  // ... other user fields
}
```
- **GSI**: `phone-index` for phone number lookups
- **Format**: E.164 international format (e.g., +447758240770)
- **Uniqueness**: Enforced at application level

### **Pinpoint SMS API (Lambda Integration)**

#### **Auth Lambda - OTP Sending**
```javascript
const pinpointSMS = new AWS.PinpointSMSVoiceV2({ region: 'eu-west-2' });

await pinpointSMS.sendTextMessage({
  DestinationPhoneNumber: '+447758240770',      // E.164 format
  MessageBody: 'Your BNDY verification code is: 123456\n\nThis code expires in 5 minutes.',
  OriginationIdentity: 'BNDY',                   // Sender ID
  MessageType: 'TRANSACTIONAL',                  // High priority
  ConfigurationSetName: 'bndy-sms-config'        // For logging
}).promise();
```

#### **Invites Lambda - Membership Invites**
```javascript
const message = `${inviterName} invited you to join ${artistName} on bndy!\n\n${inviteLink}\n\n(Link expires in 7 days)`;

await pinpointSMS.sendTextMessage({
  DestinationPhoneNumber: phone,
  MessageBody: message,
  OriginationIdentity: 'BNDY',
  MessageType: 'TRANSACTIONAL',
  ConfigurationSetName: 'bndy-sms-config'
}).promise();
```

### **IAM Permissions Required**

Lambda role `bndy-api-instance-role` needs:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sms-voice:SendTextMessage",
        "sms-voice:SendVoiceMessage"
      ],
      "Resource": "*"
    }
  ]
}
```

**Policy Name**: `PinpointSMSPolicy` (inline policy on role)

### **Phone Invite System**

**Use Case**: Invite users to join artist/band via SMS

```
1. Artist admin creates phone invite → POST /api/artists/{artistId}/invites/phone
2. Lambda creates invite record → bndy-invites table (7-day TTL)
3. Lambda sends SMS → "Alex invited you to join The Ramones on bndy! https://..."
4. User clicks link → Opens backstage.bndy.co.uk/invite/{token}
5. User accepts → Creates membership + onboards if new user
```

#### **`bndy-invites` Table**
```javascript
{
  token: "uuid-v4",                   // Primary key (invite link token)
  artistId: "uuid",                   // Which artist they're joining
  inviteType: "phone" | "general",    // Delivery method
  phone: "+447758240770",             // For phone invites
  status: "pending" | "accepted",
  createdByUserId: "cognito_id",      // Who sent the invite
  expiresAt: 1729617845,              // Unix timestamp (7 days, TTL field)
  createdAt: "2025-10-14T...",
  acceptedAt: "2025-10-15T..." | null,
  acceptedByUserId: "cognito_id" | null
}
```
- **GSI**: `artistId-expiresAt-index` for querying active invites per artist
- **TTL Enabled**: Auto-deletes expired invites after 7 days
- **Invite Link**: `https://backstage.bndy.co.uk/invite/{token}`

### **Cost Management**

**Current Status**:
- **Spending Limit**: $50/month (AWS approved)
- **Current Usage**: ~$0/month (low volume, Sender ID is free)
- **Per-Message Cost**: ~$0.008/SMS (UK mobile networks)
- **Monthly Capacity**: ~6,250 SMS at current limit

**Cost Optimization**:
- Sender ID is free (no monthly fees for origination identity)
- Transactional messages only (no marketing spam)
- TTL-based cleanup (no storage costs for old OTPs/invites)
- Rate limiting prevents abuse (future enhancement)

### **Security & Best Practices**

1. **Phone Number Hashing**: OTP table stores SHA-256 hashes (not plaintext)
2. **Short TTL**: OTPs expire after 5 minutes
3. **No Phone Number Exposure**: Logs show `+4477****` (masked)
4. **TRANSACTIONAL Type**: High priority, not marketing
5. **E.164 Format Enforcement**: All phone numbers validated before storage
6. **Rate Limiting**: (Future) Prevent OTP spam attacks

### **Troubleshooting**

**SMS Not Received**:
1. Check Lambda logs: `/aws/lambda/bndy-serverless-api-AuthFunction-gKJksEC1lGjw`
2. Verify Pinpoint permissions: IAM policy `PinpointSMSPolicy` attached
3. Confirm phone number format: E.164 (e.g., +447758240770)
4. Check Sender ID exists: `aws pinpoint-sms-voice-v2 describe-sender-ids --filters Name=iso-country-code,Values=GB`
5. Verify pool status: `aws pinpoint-sms-voice-v2 describe-pools --pool-ids pool-039d1debc6c84e3ab45e3f5f72adccad`

**Permission Denied Error**:
- Error: `User is not authorized to perform: sms-voice:SendTextMessage`
- Fix: Add `PinpointSMSPolicy` to `bndy-api-instance-role` (see IAM Permissions above)

**Invalid Phone Number**:
- Ensure E.164 format: `+[country_code][number]`
- UK mobile example: `+447758240770` (NOT `07758240770`)
- Validation regex: `^\+[1-9]\d{1,14}$`

---

## 📧 **EMAIL MAGIC LINK AUTHENTICATION** *(October 29, 2025)*

### **Production Email System**

**Service**: AWS Simple Email Service (SES)
- **Verified Domain**: `bndy.co.uk` (domain-level verification)
- **Sender Email**: `noreply@bndy.co.uk`
- **Message Type**: Transactional authentication emails
- **Status**: ✅ **PRODUCTION OPERATIONAL**
- **Sandbox Mode**: Production access approved (can send to any email)

### **Why SES Domain Verification**

**Domain Verification** (not individual email verification):
- Verify entire `bndy.co.uk` domain via Route 53 TXT record
- Send from ANY email@bndy.co.uk without individual verification
- No need for actual email inbox at noreply@bndy.co.uk
- More scalable than verifying individual email addresses

**DNS Record Added**:
```
Name: _amazonses.bndy.co.uk
Type: TXT
Value: BD1sTDPO8KdlvWUTXp7jiVwI9J8osJC2ap6+JVNUl3s=
```

### **Email Magic Link Flow**

```
1. User enters email → POST /auth/email/request-magic
2. Lambda checks if user exists → Sets welcome message ("Welcome!" vs "Welcome back, [Name]!")
3. Lambda generates UUID token → Stores in bndy-magic-tokens (5min TTL)
4. Lambda sends email via SES → User receives magic link
5. User clicks link → GET /auth/magic/{token} (via api.bndy.co.uk)
6. Lambda validates token → Creates/logs in user → Sets 90-day JWT cookie → Redirects to /dashboard
```

### **DynamoDB Table: bndy-magic-tokens**

```javascript
{
  token: "uuid-v4",                        // Primary key (magic link token)
  email: "user@example.com",               // Email address for this token
  expiresAt: 1730201234567,                // Unix timestamp in ms (5 min from creation)
  attempts: 0,                             // Login attempts (future: rate limiting)
  createdAt: "2025-10-29T10:17:51.572Z",   // ISO timestamp
  requestId: "uuid-v4",                    // Request tracking ID
  type: "email-magic-link"                 // Token type
}
```

- **Primary Key**: `token` (String - UUID v4)
- **TTL Enabled**: `expiresAt` attribute (Unix timestamp in **milliseconds**)
- **One-Time Use**: Token deleted immediately after successful validation
- **Auto-Cleanup**: DynamoDB TTL removes expired tokens automatically

⚠️ **IMPORTANT**: `expiresAt` is stored in **milliseconds** for code simplicity (Date.now() + 5min), but DynamoDB TTL expects **seconds**. This is intentional - tokens are deleted manually on use, TTL is just backup cleanup.

### **Email Template**

**Subject**: "Sign in to bndy"

**Body** (HTML):
```html
<h2>Sign in to bndy</h2>
<p>Click the link below to sign in to your account:</p>
<p>
  <a href="https://api.bndy.co.uk/auth/magic/{token}"
     style="background: #f97316; color: white; padding: 12px 24px;
            text-decoration: none; border-radius: 6px; display: inline-block;">
    Sign In to bndy
  </a>
</p>
<p style="color: #666; font-size: 12px;">This link expires in 5 minutes.</p>
```

**Key Design Decisions**:
- Magic link points to **API domain** (`api.bndy.co.uk`), not frontend
- Lambda handles validation, sets cookie, then redirects to frontend dashboard
- Orange button (#f97316) matches BNDY brand colors
- Simple, clean, mobile-friendly design

### **User Auto-Creation**

When a user signs in via email magic link for the first time:

```javascript
// New user created in bndy-users
{
  cognito_id: "email_uuid",           // Format: email_{uuid}
  user_id: "uuid-v4",
  email: "user@example.com",
  username: "user_username",          // Format: user_{email_prefix}
  profile_complete: false,
  created_at: "2025-10-29T...",
  updated_at: "2025-10-29T..."
}
```

**Important**: Only `cognito_id`, `user_id`, `email`, `username`, `profile_complete`, `created_at`, `updated_at` are set.

**Attributes NOT included** (to avoid DynamoDB GSI null value errors):
- `phone` - Would trigger phone-index GSI validation error
- `first_name`, `last_name`, `display_name`, `hometown`, `avatar_url`, `instrument` - Added later during profile completion

### **Dynamic Welcome Messages**

Frontend calls `/auth/check-identity` before sending magic link:

```javascript
// Request
POST /auth/check-identity
{ "email": "user@example.com" }

// Response - Existing user
{ "exists": true, "displayName": "John", "method": "email" }

// Response - New user
{ "exists": false, "method": "email" }
```

**UI Behavior**:
- New user: "Welcome to bndy!"
- Existing user: "Welcome back, John!"
- Works for both email and phone authentication

### **IAM Permissions Required**

Lambda role `bndy-api-instance-role` needs SES permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

**Policy Name**: `SESEmailSendPolicy` (inline policy on role)

### **Cost Management**

**Current Status**:
- **Free Tier**: 62,000 emails/month (first 12 months)
- **After Free Tier**: $0.10 per 1,000 emails
- **Domain Verification**: Free (no monthly fees)
- **Current Usage**: ~0 emails/month (early stage)

### **Security & Best Practices**

1. **Short TTL**: Magic tokens expire after 5 minutes
2. **One-Time Use**: Token deleted immediately after successful validation
3. **HTTPS Only**: All magic links use https://
4. **No Token Reuse**: Deleted tokens return `invalid_token` error
5. **Email Validation**: RFC 5322 email format validation before sending
6. **Rate Limiting**: (Future) Prevent magic link spam attacks

### **Troubleshooting**

**Email Not Received**:
1. Check SES sending status: `aws ses get-account-sending-enabled --region eu-west-2`
2. Verify domain: `aws ses get-identity-verification-attributes --identities bndy.co.uk --region eu-west-2`
3. Check Lambda logs for SES errors: `/aws/lambda/bndy-serverless-api-AuthFunction-gKJksEC1lGjw`
4. Confirm recipient email is valid (not in sandbox mode restrictions)

**Permission Denied Error**:
- Error: `User is not authorized to perform: ses:SendEmail`
- Fix: Add `SESEmailSendPolicy` to `bndy-api-instance-role` (see IAM Permissions above)

**Invalid Token Error**:
- Token not found in DynamoDB (expired, already used, or never created)
- Token expired (> 5 minutes old)
- Check CloudWatch logs for `[EMAIL_AUTH] Token not found` or `[EMAIL_AUTH] Token expired`

**DynamoDB GSI Error (Type Mismatch for phone)**:
- Error: `Type mismatch for Index Key phone Expected: S Actual: NULL`
- Cause: Attempting to create user with `phone: null` triggers phone-index GSI validation
- Fix: Don't include `phone` attribute at all if it's null (omit from Item object)

---

## 🍎 **APPLE SIGN IN AUTHENTICATION** *(October 29, 2025)*

### **Production Apple Sign In**

**Service**: AWS Cognito User Pools with Apple Identity Provider
- **Provider Name**: `SignInWithApple`
- **Team ID**: `YN2NBQK228`
- **Key ID**: `Q255RQCNGB`
- **Service ID**: `YN2NBQK228.uk.co.bndy.backstage`
- **Status**: ✅ **CONFIGURED** (pending Apple Developer approval)

### **Cognito Configuration**

**Identity Provider Setup**:
- Added Apple as identity provider in Cognito User Pool `eu-west-2_LqtkKHs1P`
- Provider name: `SignInWithApple` (used in OAuth URLs)
- Client ID: Apple Service ID
- Private key: Apple Sign In key (PEM format)
- Scopes: `email`, `name`

**App Client Configuration**:
- Updated Cognito app client to support both Google and Apple providers
- OAuth flows: `code` (authorization code flow)
- Callback URLs: `https://api.bndy.co.uk/auth/callback`
- Scopes: `email`, `openid`, `profile`, `phone`

### **Apple Sign In Flow**

```
1. User clicks "Continue with Apple" → GET /auth/apple
2. Lambda generates state token → Redirects to Cognito /oauth2/authorize
3. Cognito redirects to Apple Sign In → User authenticates with Apple
4. Apple redirects back to Cognito → Cognito validates & issues token
5. Cognito redirects to Lambda callback → GET /auth/callback?code=...&state=...
6. Lambda exchanges code for tokens → Extracts user profile → Creates/updates user in DynamoDB
7. Lambda sets 90-day JWT cookie → Redirects to /dashboard
```

### **OAuth State Management**

Lambda uses in-memory state store to prevent CSRF attacks:

```javascript
const stateStore = new Map();

// Generate state
const state = crypto.randomUUID();
stateStore.set(state, { timestamp: Date.now(), origin: FRONTEND_URL });

// Validate state (in callback)
if (!stateStore.has(state)) {
  return redirect to /login?error=invalid_state
}
```

**Auto-Cleanup**: States older than 10 minutes are cleaned up automatically

### **Apple Developer Requirements**

**Service ID Configuration** (in Apple Developer Portal):
- Service ID: `YN2NBQK228.uk.co.bndy.backstage`
- Domain: `bndy.co.uk`
- Return URLs: `https://bndy-serverless.auth.eu-west-2.amazoncognito.com/oauth2/idpresponse`

**Sign In with Apple Key**:
- Key ID: `Q255RQCNGB`
- Downloaded from Apple Developer Portal
- Uploaded to Cognito as PEM format private key

### **Cost**

**Apple Sign In**: FREE
- No Apple Developer Program fee for Sign In with Apple
- No per-authentication charges
- Cognito is also free (within AWS free tier or < 50,000 MAU)

### **API Endpoints**

**Phone Authentication** (Auth Lambda):
- `POST /auth/phone/request-otp` - Request OTP code
- `POST /auth/phone/verify-otp` - Verify code and create session
- `POST /auth/phone/verify-and-onboard` - Verify code and create user profile

**Email Authentication** (Auth Lambda):
- `POST /auth/email/request-magic` - Request magic link email
- `GET /auth/magic/{token}` - Validate magic link and create session
- `POST /auth/check-identity` - Check if email/phone exists (for welcome messages)

**OAuth Authentication** (Auth Lambda):
- `GET /auth/google` - Initiate Google OAuth flow
- `GET /auth/apple` - Initiate Apple Sign In flow
- `GET /auth/callback` - OAuth callback handler (Google & Apple)

**Session Management** (Auth Lambda):
- `GET /api/me` - Get current user profile
- `POST /auth/logout` - Clear session cookie
- `POST /auth/phone/verify-and-onboard` - Verify + create new user profile

**Phone Invites** (Invites Lambda):
- `POST /api/artists/{artistId}/invites/phone` - Send phone invite
- `GET /api/artists/{artistId}/invites` - List all invites (phone + general)
- `POST /api/invites/{token}/accept` - Accept invite via link
- `DELETE /api/invites/{token}` - Revoke invite

### **Configuration Reference**

**Pinpoint Resources**:
- **Phone Pool**: `pool-039d1debc6c84e3ab45e3f5f72adccad`
- **Sender ID ARN**: `arn:aws:sms-voice:eu-west-2:771551874768:sender-id/BNDY/GB`
- **Configuration Set ARN**: `arn:aws:sms-voice:eu-west-2:771551874768:configuration-set/bndy-sms-config`
- **Region**: `eu-west-2` (London)

**Lambda Functions Using Pinpoint**:
- `bndy-serverless-api-AuthFunction-gKJksEC1lGjw` (OTP codes)
- `bndy-serverless-api-InvitesFunction` (Membership invites)

**DynamoDB Tables**:
- `bndy-otp-codes` (TTL: 5 minutes)
- `bndy-invites` (TTL: 7 days)
- `bndy-users` (GSI: `phone-index`)

---

## 💾 **DATA ARCHITECTURE**

### **Primary Database**: DynamoDB (Pay-per-request)
- **bndy-users**: Authentication and profiles
- **bndy-artists**: Artist/band data with type classification (band, solo, duo, dj, etc.)
- **bndy-artist-memberships**: User-artist relationships with role-based permissions (NEW)
- **bndy-venues**: Venue data (281 records, loaded ~100ms)
- **bndy-songs**: Song catalog
- **bndy-issues**: Bug/feature tracking
- **bndy-user-bands**: Legacy table (deprecated - use bndy-artist-memberships)

### **File Storage**: S3
- **bndy-images**: User-uploaded images (avatars, attachments)
- **Public read access** with CORS for Amplify domains
- **Presigned URLs** for secure authenticated uploads
- **Size limits**: 5MB per file with validation

### **Performance Metrics**
- **9x faster** than previous Firestore implementation
- **85% cost reduction** from Aurora migration
- **Sub-500ms** authentication response times
- **Sub-100ms** venue map loading

---

## 🛠️ **DEPLOYMENT ARCHITECTURE**

### **CI/CD Status**
- **Serverless API**: ✅ GitHub Actions → SAM → CloudFormation
- **All Frontends**: ✅ Amplify Auto-Deploy on git push
- **Infrastructure**: CloudFormation managed via SAM
- **Secrets**: AWS Parameter Store + GitHub Secrets

### **Domain Strategy**
```
Target Production Domains:
- backstage.bndy.co.uk → bndy-backstage (✅ LIVE)
- live.bndy.co.uk → bndy-frontstage (✅ MAPPED)
- centrestage.bndy.co.uk → bndy-centrestage (✅ LIVE)
- api.bndy.co.uk → API Gateway (✅ LIVE)

Legacy:
- bndy.live → Redirect to live.bndy.co.uk (pending)
```

### **Single-Domain Proxy Pattern** (All Apps)
```
{app}.bndy.co.uk/api/* → api.bndy.co.uk/api/*
{app}.bndy.co.uk/auth/* → api.bndy.co.uk/auth/*
{app}.bndy.co.uk/* → React/Next.js SPA
```

---

## 📊 **COST & PERFORMANCE STATUS**

### **Current Monthly Costs** (Estimated)
- **Lambda Functions**: ~$5-8 (pay-per-request)
- **DynamoDB**: ~$3-5 (pay-per-request)
- **API Gateway**: ~$3-5 (per million requests)
- **S3**: ~$1-2 (storage + transfers)
- **Cognito**: ~$0-2 (under 50K MAU free tier)
- **Pinpoint SMS**: ~$0-5 (pay-per-SMS, $50/month limit, Sender ID is free)
- **Legacy App Runner**: ~$35 (scheduled for shutdown)
- **Total Current**: ~$47-62/month
- **Target (post-shutdown)**: ~$12-27/month

### **Performance Benchmarks**
- **Venue Map Loading**: 281 venues in ~100ms (9x improvement)
- **Authentication Flow**: ~500ms Google OAuth complete
- **API Response Times**: <200ms for CRUD operations
- **Image Upload**: <2s for 5MB files via S3 presigned URLs

---

## 🎯 **IMMEDIATE PRIORITIES** *(October 2025)*

### **Phase 1: Complete Serverless Migration**
1. **User Management Migration**: Move remaining App Runner features to Lambda
2. **App Runner Shutdown**: Eliminate $35/month cost
3. **Domain Redirect**: Set up bndy.live → live.bndy.co.uk

### **Phase 2: Feature Expansion**
1. **Band Management**: Implement band creation/joining workflows
2. **Profile Completion**: Build guided profile setup flows
3. **Events Migration**: Move event data from Firebase to DynamoDB
4. ✅ **Phone Authentication**: OTP integration complete (Pinpoint SMS operational)

### **Phase 3: Production Hardening**
1. **Monitoring**: CloudWatch dashboards and alerting
2. **Backup Strategy**: Cross-region backup implementation
3. **Security Audit**: Penetration testing and security review
4. **Performance Optimization**: Cold start reduction, caching strategies

---

## 🚨 **CRITICAL DECISIONS & PATTERNS**

### **Architecture Principles**
- ✅ **Serverless First**: Pay-per-use, no always-running costs
- ✅ **Single Domain**: Eliminate CORS complexity with proxy patterns
- ✅ **Security by Default**: httpOnly cookies, JWT sessions, IAM roles
- ✅ **Performance Focus**: DynamoDB + Lambda for speed and cost
- ✅ **CI/CD Everything**: All deployments automated via git push
- ✅ **Separation of Concerns**: ONE responsibility per Lambda function

### **🔒 SEPARATION OF CONCERNS - SACRED PRINCIPLE**

**THE RULE**: Each Lambda function has ONE clear responsibility. Never mix concerns.

**Lambda Function Responsibilities** (ENFORCED):
- **Auth Lambda**: Authentication, OAuth, JWT sessions - **PERIOD**
  - ✅ Valid routes: `/auth/google`, `/auth/callback`, `/auth/logout`, `/api/me` (user + auth data only)
  - ❌ NEVER add: Memberships, artists, events, business logic
  - ❌ NEVER query: Memberships table, artists table, business domain tables

- **Memberships Lambda**: Artist membership business logic - **ONLY**
  - ✅ Valid concerns: User-artist relationships, roles, permissions, profile inheritance
  - ✅ Valid routes: `/api/memberships/*`, `/api/artists/{id}/members`
  - ❌ NEVER add: Authentication logic, user profile management

- **Artists Lambda**: Artist CRUD operations - **ONLY**
  - ✅ Valid concerns: Artist creation, updates, deletion, basic data
  - ❌ NEVER add: Complex membership logic (delegate to memberships-lambda)

**How Frontend Should Work**:
```typescript
// ✅ CORRECT: Separate calls for separate concerns
const user = await fetch('/api/me');              // Auth lambda
const memberships = await fetch('/api/memberships/me');  // Memberships lambda

// ❌ WRONG: Expecting auth lambda to return memberships
const everything = await fetch('/api/me');  // Auth lambda returning bands/memberships
```

**Why This Matters**:
1. **Maintainability**: Changes to memberships don't require touching auth code
2. **Scalability**: Each lambda can scale independently based on its specific load
3. **Testing**: Unit tests remain focused and simple
4. **Security**: Auth logic stays isolated from business logic
5. **Performance**: Auth checks stay fast without expensive membership queries

**Real Incident** (October 3, 2025):
- ❌ **Violation**: Added membership queries to `/api/me` in auth-lambda
- 🔥 **Impact**: Broke authentication (Cognito domain typo in same change)
- ✅ **Fix**: Reverted auth-lambda, added `/api/memberships/me` endpoint
- 📚 **Lesson**: Never mix concerns even if it seems "convenient"

### **🔐 AUTH LAMBDA - CRITICAL IMPLEMENTATION DETAILS**

⚠️ **BREAKING THIS LAMBDA BREAKS THE ENTIRE PLATFORM** - Read carefully before making ANY changes.

**Working Version**: Commit `0af2c18` (October 3, 2025)
**Deployed SHA**: `rZSMhktMmwMP8/Xc6Pe8gu0/tVwCax9ZVwuVaxSAxV0=`

#### **Critical Requirements (MUST NEVER CHANGE)**

1. **HTTP API v2 Event Format Support**
   - API Gateway sends HTTP API v2 format (NOT REST API v1)
   - Event structure:
     - `event.requestContext.http.method` (NOT `event.httpMethod`)
     - `event.requestContext.http.path` (NOT `event.resource`)
     - `event.cookies` array (NOT `event.headers.Cookie`)
   - Code MUST support both v1 and v2 for backwards compatibility

2. **Cookie Parsing for HTTP API v2**
   ```javascript
   // CRITICAL: HTTP API v2 sends cookies in event.cookies array
   let cookieHeader = event.headers?.Cookie || event.headers?.cookie;
   if (!cookieHeader && event.cookies && event.cookies.length > 0) {
     cookieHeader = event.cookies.join('; ');
   }
   const cookies = parseCookies(cookieHeader);
   ```

3. **Routing Pattern**
   ```javascript
   // CRITICAL: Build routeKey from v2 or v1 event
   const method = event.requestContext?.http?.method || event.httpMethod;
   const path = event.requestContext?.http?.path || event.rawPath || event.path;
   const routeKey = `${method} ${path}`;

   // Match routes like 'GET /auth/google'
   if (routeKey === 'GET /auth/google') { /* ... */ }
   ```

4. **Lightweight Session (Cookie Size Limit)**
   ```javascript
   // ✅ CORRECT: Lightweight session (cookie ~250 bytes)
   const sessionData = {
     userId,
     username,
     email,
     issuedAt: Date.now()
   };

   // ❌ WRONG: Including Cognito tokens (cookie >4KB = MALFORMED)
   const sessionData = {
     userId, username, email,
     accessToken: access_token,    // HUGE token
     idToken: id_token,             // HUGE token
     refreshToken: refresh_token,   // HUGE token
     issuedAt: Date.now()
   };
   ```
   **Why**: Browsers reject cookies >4KB. Cognito tokens are 2-3KB each.

5. **200 + HTML Redirect (NOT 302)**
   ```javascript
   // ✅ CORRECT: 200 with HTML+JS redirect for reliable cookie setting
   const redirectHtml = `
   <!DOCTYPE html>
   <html>
   <head><title>Redirecting...</title></head>
   <body>
     <p>Authentication successful. Redirecting...</p>
     <script>
       window.location.href = '${FRONTEND_URL}/dashboard';
     </script>
   </body>
   </html>`;

   return {
     statusCode: 200,
     headers: {
       'Content-Type': 'text/html',
       'Set-Cookie': cookieOptions
     },
     body: redirectHtml
   };

   // ❌ WRONG: 302 redirect (cookies not reliably set for fetch requests)
   return {
     statusCode: 302,
     headers: {
       Location: `${FRONTEND_URL}/dashboard`,
       'Set-Cookie': cookieOptions
     }
   };
   ```
   **Why**: 302 redirects don't guarantee cookie storage before subsequent fetch requests. The 200+HTML pattern ensures cookies are set before browser navigates.

6. **NO EMOJIS IN LOGS**
   - CloudWatch logs fail with emoji encoding errors
   - Use plain text only: `console.log('AUTH: Message')`
   - NOT: `console.log('🔐 AUTH: Message')`

#### **Routes (ONLY These 4)**
1. `GET /auth/google` - Initiate OAuth flow
2. `GET /auth/callback` - OAuth callback handler (sets session cookie)
3. `GET /api/me` - Return authenticated user data (NO memberships)
4. `POST /auth/logout` - Clear session cookie

#### **Environment Variables (REQUIRED)**
- `COGNITO_USER_POOL_CLIENT_ID`: `tb6qcc6a4suk2pv58rd40klh7`
- `COGNITO_USER_POOL_CLIENT_SECRET`: `1vk3rd8chd3mmn0ndn40kos0nbr77pjq5tkib4rlljf0n2ra633e`
- `JWT_SECRET`: (from environment)

**MUST be in template.yaml** to prevent CloudFormation from wiping them.

#### **What This Lambda Does NOT Do**
- ❌ Return artist memberships (that's `/api/memberships/me`)
- ❌ Return bands/artists list (that's memberships lambda)
- ❌ Profile completion logic (that's frontend MemberGate)
- ❌ Any business domain queries beyond user auth data

#### **Disaster Recovery**
If auth is broken:
1. Check commit `0af2c18` - this is the working version
2. Deploy using direct lambda update (NOT CloudFormation)
3. Verify environment variables are set
4. Test with: `aws logs tail /aws/lambda/bndy-serverless-api-AuthFunction-gKJksEC1lGjw --since 5m`

#### **Deployment Strategy (ACTIVE DEVELOPMENT PHASE)**

⚠️ **CURRENT APPROACH: Manual Lambda Deployments**

**Status**: GitHub Actions auto-deploy **DISABLED** (as of Oct 3, 2025)
- Reason: CloudFormation Globals section overrides function-specific env vars
- Impact: Pushing to git does NOT trigger auto-deployment
- Duration: Until feature development stabilizes

**Why Manual Deployments During Development:**
1. Fast iteration (5 seconds vs 60 seconds)
2. Surgical updates (only touch changed lambda)
3. Lower risk (bad deploy = one function, not entire platform)
4. Easy rollbacks (just redeploy previous zip)

**CRITICAL: Current Deployed State (DO NOT LOSE THIS)**
- **Auth Lambda SHA**: `3cUxMIJF4vCOQi234HwsU/dS/WmJN/QFaMHX6rlNP6w=`
- **Last Modified**: 2025-10-03T18:10:12
- **Environment Variables** (MUST be manually restored after any SAM deploy):
  ```json
  {
    "JWT_SECRET": "2c7fccb87d98f68d36b19d528aa81a61afacf91058c18ee49738c35b50b81aa5",
    "NODE_ENV": "production",
    "COGNITO_USER_POOL_CLIENT_ID": "tb6qcc6a4suk2pv58rd40klh7",
    "COGNITO_USER_POOL_CLIENT_SECRET": "1vk3rd8chd3mmn0ndn40kos0nbr77pjq5tkib4rlljf0n2ra633e"
  }
  ```

#### **Manual Lambda Deployment Commands**

```bash
# Auth Lambda (most common)
cd /c/VSProjects/bndy-serverless-api/auth-lambda
powershell "Compress-Archive -Path handler.js,package.json,package-lock.json,node_modules -DestinationPath ../auth-lambda-clean.zip -Force"
aws lambda update-function-code --function-name bndy-serverless-api-AuthFunction-gKJksEC1lGjw --zip-file fileb://auth-lambda-clean.zip

# Restore environment variables (if wiped by SAM deploy)
aws lambda update-function-configuration \
  --function-name bndy-serverless-api-AuthFunction-gKJksEC1lGjw \
  --environment "Variables={JWT_SECRET=2c7fccb87d98f68d36b19d528aa81a61afacf91058c18ee49738c35b50b81aa5,NODE_ENV=production,COGNITO_USER_POOL_CLIENT_ID=tb6qcc6a4suk2pv58rd40klh7,COGNITO_USER_POOL_CLIENT_SECRET=1vk3rd8chd3mmn0ndn40kos0nbr77pjq5tkib4rlljf0n2ra633e}"

# Users Lambda
cd /c/VSProjects/bndy-serverless-api/users-lambda
powershell "Compress-Archive -Path handler.js,package.json,node_modules -DestinationPath ../users-lambda.zip -Force"
aws lambda update-function-code --function-name bndy-serverless-api-UsersFunction-HNQeQw7kJO9b --zip-file fileb://users-lambda.zip

# Uploads Lambda (when route is connected)
cd /c/VSProjects/bndy-serverless-api/uploads-lambda
powershell "Compress-Archive -Path handler.js,package.json,node_modules -DestinationPath ../uploads-lambda.zip -Force"
aws lambda update-function-code --function-name bndy-serverless-api-UploadsFunction --zip-file fileb://uploads-lambda.zip
```

#### **CloudFormation Deployment (DISABLED - Use Only for Infrastructure Changes)**

⚠️ **DO NOT USE during active development** - Will overwrite manual lambda deployments

```bash
# For infrastructure changes ONLY (new routes, tables, etc.)
# 1. Verify template.yaml matches current deployed state
# 2. Update template.yaml with infrastructure change
# 3. Deploy
aws cloudformation package --template-file template.yaml --s3-bucket bndy-lambda-deployments --output-template-file packaged-template.yaml
aws cloudformation deploy --template-file packaged-template.yaml --stack-name bndy-serverless-api --capabilities CAPABILITY_IAM

# 4. CRITICAL: Manually restore auth lambda environment variables (SAM wipes them)
aws lambda update-function-configuration --function-name bndy-serverless-api-AuthFunction-gKJksEC1lGjw --environment "Variables={JWT_SECRET=2c7fccb87d98f68d36b19d528aa81a61afacf91058c18ee49738c35b50b81aa5,NODE_ENV=production,COGNITO_USER_POOL_CLIENT_ID=tb6qcc6a4suk2pv58rd40klh7,COGNITO_USER_POOL_CLIENT_SECRET=1vk3rd8chd3mmn0ndn40kos0nbr77pjq5tkib4rlljf0n2ra633e}"
```

#### **When to Switch Back to CloudFormation**
- ✅ Feature development stabilized
- ✅ All manual changes documented in template.yaml
- ✅ Fixed Globals env var conflict in template.yaml
- ✅ Ready for production release
- ✅ Re-enable `.github/workflows/deploy.yml`

### **What NOT to Do**
- ❌ **Never separate API domains**: Use proxy patterns only
- ❌ **Never client-side tokens**: httpOnly cookies for security
- ❌ **Never always-running services**: Serverless for cost efficiency
- ❌ **Never skip authentication**: JWT validation on every Lambda
- ❌ **Never hardcode secrets**: Use environment variables always
- ❌ **Never mix lambda concerns**: ONE responsibility per function

### **Service Integration Patterns**

#### **Frontend Service Layer Architecture** *(November 3, 2025 - 100% COMPLIANT)*

⚠️ **MANDATORY**: All API calls MUST go through service layer. Direct fetch() in components is FORBIDDEN.

**Service Layer Files** (`client/src/lib/services/`):
```
auth-service.ts       - Authentication, OAuth, sessions
users-service.ts      - User profile management
bands-service.ts      - Artist/band management, memberships
songs-service.ts      - Song CRUD, readiness, veto
events-service.ts     - Calendar, events, gigs
setlists-service.ts   - Setlist management
invites-service.ts    - Invitation management
issues-service.ts     - Bug/feature tracking
spotify-service.ts    - Spotify integration
godmode-service.ts    - Admin operations
```

**Service Pattern Template**:
```typescript
// ✅ Standard service class pattern
import { API_BASE_URL } from '../../config/api';

class SongsService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  /**
   * Centralized API request handler
   * - Handles authentication (credentials: 'include')
   * - Consistent error handling
   * - Type-safe responses
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultOptions: RequestInit = {
      credentials: 'include',  // httpOnly cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, defaultOptions);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Handle empty responses (DELETE, etc.)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return {} as T;
    }

    return await response.json();
  }

  /**
   * Public API methods
   */
  async getArtistSongs(artistId: string): Promise<Song[]> {
    return this.apiRequest<Song[]>(`/api/artists/${artistId}/playbook`);
  }

  async addSong(artistId: string, song: CreateSongRequest): Promise<Song> {
    return this.apiRequest<Song>(`/api/artists/${artistId}/playbook`, {
      method: 'POST',
      body: JSON.stringify(song),
    });
  }

  async updateSong(artistId: string, songId: string, updates: UpdateSongRequest): Promise<Song> {
    return this.apiRequest<Song>(`/api/artists/${artistId}/playbook/${songId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteSong(artistId: string, songId: string): Promise<void> {
    return this.apiRequest<void>(`/api/artists/${artistId}/playbook/${songId}`, {
      method: 'DELETE',
    });
  }
}

// Export singleton instance
export const songsService = new SongsService();
export default songsService;
```

**Component Usage Pattern** (React Query + Services):
```typescript
// ✅ CORRECT: Component uses service layer
import { useQuery, useMutation } from '@tanstack/react-query';

function SongsPage({ artistId }: { artistId: string }) {
  // Query - fetch data
  const { data: songs = [], isLoading } = useQuery({
    queryKey: ["/api/artists", artistId, "songs"],
    queryFn: async () => {
      const { songsService } = await import("@/lib/services/songs-service");
      return songsService.getArtistSongs(artistId);
    },
    enabled: !!artistId,
  });

  // Mutation - modify data
  const updateSongMutation = useMutation({
    mutationFn: async ({ songId, updates }) => {
      const { songsService } = await import("@/lib/services/songs-service");
      return songsService.updateSong(artistId, songId, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/artists", artistId, "songs"] });
    },
  });

  return <div>{/* UI */}</div>;
}
```

**❌ FORBIDDEN: Direct API calls in components**:
```typescript
// ❌ WRONG - Never do this
const response = await fetch('https://api.bndy.co.uk/api/artists/123/songs', {
  credentials: 'include',
});
const data = await response.json();
```

**Service Layer Benefits**:
- ✅ **No API URL duplication** across components
- ✅ **Centralized authentication** (credentials: 'include')
- ✅ **Consistent error handling** and request patterns
- ✅ **Environment-agnostic** (API_BASE_URL configuration)
- ✅ **Type safety** with TypeScript interfaces
- ✅ **Code splitting** - Services lazy-loaded on demand (~1-2KB each)
- ✅ **Testability** - Easy to mock services
- ✅ **Maintainability** - Single place to update API logic

**Compliance Status** *(November 3, 2025)*:
- ✅ **100% Compliant** - All major components refactored
- ✅ dashboard.tsx - events-service
- ✅ songs.tsx - songs-service, bands-service
- ✅ setlist-editor.tsx - setlists-service, songs-service
- ✅ setlists.tsx - setlists-service
- ✅ add-song-modal.tsx - songs-service
- ✅ Services are code-split (1-2KB each, lazy-loaded)

#### **Next.js Client vs Server Component API Patterns** *(November 5, 2025)*

⚠️ **CRITICAL**: Next.js has TWO execution contexts with DIFFERENT API access patterns.

**Understanding the Architecture:**
```
Browser (Client Components)
    ↓ /api/* requests
Amplify CloudFront Proxy
    ↓ rewrites to
API Gateway (api.bndy.co.uk)
    ↓
Lambda Functions

Next.js Server (Server Components)
    ↓ Direct HTTPS requests
API Gateway (api.bndy.co.uk)
    ↓
Lambda Functions
```

**Key Insight**: The `/api/*` proxy pattern ONLY works for browser requests through Amplify. Server-side fetches from Next.js bypass Amplify entirely.

**✅ CLIENT COMPONENTS (Browser Execution)**

Use `/api/*` proxy pattern through service layer:

```typescript
// client/src/lib/services/artist-service.ts
export async function getArtistById(artistId: string): Promise<Artist | null> {
  try {
    // Browser → /api/* → Amplify proxy → api.bndy.co.uk
    const response = await fetch(`/api/artists/${artistId}`, {
      credentials: 'include',  // httpOnly cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch artist: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching artist:', error);
    throw error;
  }
}
```

**Component Usage:**
```typescript
"use client";  // Client component

import { useQuery } from '@tanstack/react-query';
import { getArtistById } from '@/lib/services/artist-service';

function ArtistProfile({ artistId }: { artistId: string }) {
  const { data: artist } = useQuery({
    queryKey: ['artist', artistId],
    queryFn: () => getArtistById(artistId),
  });

  return <div>{artist?.name}</div>;
}
```

**✅ SERVER COMPONENTS (Next.js SSR)**

Use direct `https://api.bndy.co.uk` API calls (NO proxy):

```typescript
// app/artists/[artistId]/page.tsx
import { Artist } from "@/lib/types";

export default async function ArtistProfilePage({
  params
}: {
  params: Promise<{ artistId: string }>
}) {
  const { artistId } = await params;

  // Server components must use direct API URL
  // This matches the pattern used in bndy-backstage godmode-service.ts
  const response = await fetch(`https://api.bndy.co.uk/api/artists/${artistId}`, {
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',  // or 'no-cache' or { next: { revalidate: 300 } }
  });

  if (!response.ok) {
    console.error("Failed to fetch artist:", response.status);
    return <ErrorComponent />;
  }

  const artist = await response.json() as Artist;

  return <ArtistView artist={artist} />;
}
```

**Why This Works:**
- ✅ **Client components**: Browser → Amplify proxy → API Gateway (single domain, no CORS)
- ✅ **Server components**: Next.js server → API Gateway (direct HTTPS, no proxy needed)
- ✅ **Both patterns**: Match existing working code (frontstage client hooks, backstage godmode-service)

**❌ COMMON MISTAKES:**

```typescript
// ❌ WRONG: Using /api/* in server component
export default async function Page() {
  const response = await fetch('/api/artists/123');  // 500 ERROR - proxy doesn't exist on server
  // ...
}

// ❌ WRONG: Using direct URL in client component without service layer
"use client";
function Component() {
  const response = await fetch('https://api.bndy.co.uk/api/artists/123');  // CORS issues, no cookie forwarding
  // ...
}
```

**Decision Matrix:**

| Context | Pattern | Example |
|---------|---------|---------|
| Client Component (browser) | `/api/*` via service layer | `useQuery(() => getArtistById(id))` |
| Server Component (SSR) | Direct `https://api.bndy.co.uk` | `fetch('https://api.bndy.co.uk/api/artists/123')` |
| API Route Handler | Direct `https://api.bndy.co.uk` | `fetch('https://api.bndy.co.uk/api/artists/123')` |
| Backstage (client-only React) | Direct `https://api.bndy.co.uk` | `godmode-service.ts` pattern |

**Real-World Examples:**
- ✅ `src/hooks/useArtist.ts` - Client hook using `/api/artists/${id}` *(works)*
- ✅ `src/app/api/artists/[artistId]/route.ts` - API route using direct URL *(works)*
- ✅ `src/app/artists/[artistId]/page.tsx` - Server component using direct URL *(works)*
- ✅ `bndy-backstage/client/src/lib/services/godmode-service.ts` - Direct URL *(works)*

#### **Backend Lambda Patterns**
```typescript
// ✅ Correct authentication check (all protected routes)
const authResult = requireAuth(event);
if (authResult.error) return createResponse(401, { error: authResult.error });

// ✅ Correct image upload pattern
const uploadUrl = await apiRequest('POST', '/uploads/presigned-url', metadata);
await fetch(uploadUrl, { method: 'PUT', body: file });
```

#### **Key Service Layer Benefits**
- **No API URL duplication** across components
- **Centralized authentication** (credentials: 'include')
- **Consistent error handling** and request patterns
- **Environment-agnostic** (API_BASE_URL configuration)
- **Type safety** with TypeScript interfaces

---

## 🎭 **ARTIST MEMBERSHIP ARCHITECTURE** *(October 3, 2025)*

### **Core Concept: Artist is the Domain Entity**

⚠️ **CRITICAL DOMAIN RULE**: "Band" is NOT an entity - it's an artist type classification.

**The Domain Model:**
- ✅ **Primary Entity**: `Artist` (with `artist_type` field)
- ❌ **NEVER**: Create `Band` tables, models, or separate entities
- ❌ **FORBIDDEN**: `/api/bands` endpoints (use `/api/artists`)
- ❌ **FORBIDDEN**: `bndy-bands` tables (use `bndy-artists`)
- ✅ **ALLOWED**: UI can say "band" for user-facing terminology
- ✅ **PATTERN**: Backend always uses `Artist` entity with type classification

**Artist Types** (via `artist_type` field):
- **band** (default) - Rock bands, pop groups, multi-member acts
- **solo** - Individual performers
- **duo** - Two-person acts
- **group** - Larger ensembles, orchestras
- **dj** - DJs and electronic artists
- **collective** - Umbrella organizations (future feature)

**Example**: A rock band is `{ artist_type: "band", name: "The Ramones" }`, NOT a separate "Band" entity.

### **Data Model**

#### **`bndy-artists` Table**
```javascript
{
  id: "uuid", // Primary key
  name: "The Velvet Underground",
  bio: "Experimental rock band...",
  artist_type: "band", // band|solo|duo|group|dj|collective

  // Ownership tracking
  owner_user_id: "cognito_id", // User who created the artist
  member_count: 4, // Cached count

  // Standard fields
  location: "London, UK",
  genres: ["Rock", "Alternative"],
  profileImageUrl: "https://...",
  socialMediaUrls: [...],
  isVerified: false,
  created_at: "timestamp"
}
```

#### **`bndy-artist-memberships` Table** (NEW)
```javascript
{
  membership_id: "uuid", // Primary key
  user_id: "cognito_id", // GSI: user_id-index
  artist_id: "uuid", // GSI: artist_id-index

  // Membership type
  membership_type: "performer" | "agent" | "manager" | "guest",
  role: "owner" | "admin" | "member" | "pending",

  // Context-specific profile (NULL = inherit from user)
  display_name: "Johnny Ramone" | null, // Override user.display_name
  avatar_url: "https://..." | null, // Override user.avatar_url
  instrument: "Lead Guitar" | null, // Override user.instrument
  bio: "Been playing for 20 years..." | null,

  // UI identifiers
  icon: "fa-guitar",
  color: "#6B8E23",

  // Permissions
  permissions: ["manage_members", "manage_gigs", "manage_songs"],

  // Metadata
  status: "active" | "inactive" | "pending_invitation",
  joined_at: "timestamp",
  invited_by_user_id: "cognito_id" | null
}
```

### **Profile Inheritance Pattern**

**Rule**: NULL values in membership = inherit from user profile

**Example**:
```javascript
// User profile (global defaults)
user.display_name = "Alex Thompson"
user.avatar_url = "https://s3.../alex.jpg"
user.instrument = "Guitar/Vocals"

// Membership 1: Rock Band (uses defaults)
{
  display_name: null, // → "Alex Thompson"
  avatar_url: null,  // → "https://s3.../alex.jpg"
  instrument: null   // → "Guitar/Vocals"
}

// Membership 2: Metal Band (custom persona)
{
  display_name: "Axe Slayer", // CUSTOM
  avatar_url: "https://s3.../metal.jpg", // CUSTOM
  instrument: "Lead Guitar" // CUSTOM
}
```

### **API Patterns**

#### **Create Artist (Auto-creates Owner Membership)**
```javascript
POST /api/artists
{
  name: "The Ramones",
  bio: "Punk rock pioneers",
  artistType: "band",
  profileImageUrl: "https://...",

  // Optional member customization
  memberDisplayName: "Joey Ramone", // null = inherit
  memberInstrument: "Vocals",
  memberIcon: "fa-microphone",
  memberColor: "#DC143C"
}

Response:
{
  artist: { id, name, artist_type, owner_user_id, ... },
  membership: { membership_id, role: "owner", ... }
}
```

#### **Get User's Artists (Profile Resolution)**
```javascript
GET /api/me

Response:
{
  user: { id, email, displayName, avatarUrl, ... },
  artists: [
    {
      membershipId: "uuid",
      artistId: "uuid",

      // Resolved profile (inheritance applied)
      displayName: "Joey Ramone", // Custom
      avatarUrl: "https://.../user.jpg", // Inherited
      instrument: "Vocals", // Custom

      // Customization flags
      hasCustomDisplayName: true,
      hasCustomAvatar: false,
      hasCustomInstrument: true,

      // Artist details
      artist: {
        id, name, artistType: "band", ...
      }
    }
  ]
}
```

### **Use Cases**

1. **Musicians in Multiple Bands**: Different stage names/roles per band
2. **Agents/Managers**: Manage multiple artists without performing
3. **Session Musicians**: Guest appearances with limited permissions
4. **Band Evolution**: Members leave/join without losing history

### **Migration from Legacy**
- Old `bndy-user-bands` table **deprecated**
- Frontend uses `/api/artists` (not `/api/bands`)
- "bands" terminology remains in UI for familiarity
- `bands` array in `/api/me` maintained for backwards compatibility

---

## 📝 **OCTOBER 3, 2025 SESSION SUMMARY**

### **Major Accomplishments**
- ✅ **Artist Membership Architecture**: Complete data model for user-artist relationships
- ✅ **Profile Inheritance System**: Context-specific profiles with user defaults
- ✅ **Memberships Lambda**: CRUD endpoints for member management (code complete, pending deployment)
- ✅ **Artists Lambda Enhancement**: Auto-creates owner membership on artist creation
- ✅ **Auth Lambda Integration**: `/api/me` returns artists with resolved membership profiles
- ✅ **Frontend Onboarding Refactor**: Uses `/api/artists` endpoint with proper authentication
- ✅ **S3 Image Storage**: Complete infrastructure for user uploads
- ✅ **OAuth Profile Pictures**: Automatic extraction and storage from Google
- ✅ **Issues Management**: Full CRUD with error handling and filtering
- ✅ **Authentication Polish**: Loading states and session persistence fixes
- ✅ **Service Layer**: Consistent API patterns across all applications

### **Infrastructure Maturity**
- Production-ready serverless architecture deployed
- Artist membership system designed and implemented (pending infrastructure deployment)
- DynamoDB table `bndy-artist-memberships` designed with GSIs for efficient querying
- Cost-optimized Lambda + DynamoDB + S3 stack operational
- Authentication system with OAuth provider integration
- Image handling via secure S3 presigned URLs
- Comprehensive error handling and user feedback

### **Pending Deployment**
1. **MembershipsFunction Lambda** - Code complete in `memberships-lambda/`
2. **bndy-artist-memberships DynamoDB table** - Schema defined in template.yaml
3. **API Gateway routes** for membership endpoints
4. **CloudFormation stack update** via SAM deploy

### **Ready for Production Use**
All core platform functionality is operational with proper security, performance monitoring, and CI/CD automation. The platform can handle real users and scale automatically with demand. Artist membership system is code-complete and ready for infrastructure deployment.

---

*This document represents the definitive current state as of October 3, 2025*
*Single source of truth for BNDY platform architecture and implementation*

---

## SETLISTS FEATURE (October 24, 2025)

### Implementation Status

**Backend (Complete)**
- DynamoDB table: bndy-setlists with artist_id-created_at-index
- Lambda: SetlistsFunction with full CRUD + copy endpoint
- API Routes:
  - GET /api/artists/{artistId}/setlists
  - POST /api/artists/{artistId}/setlists
  - GET /api/artists/{artistId}/setlists/{setlistId}
  - PUT /api/artists/{artistId}/setlists/{setlistId}
  - DELETE /api/artists/{artistId}/setlists/{setlistId}
  - POST /api/artists/{artistId}/setlists/{setlistId}/copy

**Frontend**
- ✅ Setlists list view (/setlists)
- ✅ Create/copy/delete functionality
- ✅ Duration tracking with color-coded variance
- ✅ Tab navigation (Playbook/Setlists/Pipeline)
- ⏳ Setlist editor with drag-and-drop (IN PROGRESS)
- ⏳ Multi-select songs from playbook (PLANNED)
- ⏳ Create setlist from selection (PLANNED)

### Data Structure

```json
{
  "id": "uuid",
  "artist_id": "uuid",
  "name": "Summer Tour 2025",
  "sets": [
    {
      "id": "uuid",
      "name": "Set 1",
      "targetDuration": 3600,
      "songs": [
        {
          "id": "uuid",
          "song_id": "global-song-id",
          "title": "Song Title",
          "artist": "Artist Name",
          "duration": 240,
          "position": 0
        }
      ]
    }
  ],
  "created_by_membership_id": "uuid",
  "created_at": "ISO-8601",
  "updated_at": "ISO-8601"
}
```

### Duration Variance Color Coding
- Blue: ≤5% of target (spot on)
- Yellow: ≤20% of target (close)
- Red: >20% of target (way off)


