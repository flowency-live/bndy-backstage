# bndy Product Roadmap & Development Notes

## **⚠️ Mobile-First Design Priority**
**ALL features must be designed mobile-first and mobile-optimized. Desktop is secondary.**
- Touch-friendly interfaces with proper tap targets
- Swipe gestures for navigation where appropriate
- Responsive layouts that work perfectly on phone screens
- Fast loading and smooth interactions on mobile networks

## **🚀 Beta Phase (Current)**

### **Authentication Strategy**
- **Phone OTP Only**: Simple, familiar phone number + SMS verification
- **Invite-Only Platform**: Limited to first 10 bands with platform admin control
- **Single-Use Magic Links**: Individual invitations tied to specific phone numbers
- **Session Persistence**: Long-term sessions for PWA "set it and forget it" experience

### **Beta Features**
- Band calendar management (practices, gigs, unavailable periods)
- Song practice lists with Spotify integration
- Member availability tracking
- Song readiness system (red/amber/green status per member)
- Mobile-optimized swipe navigation
- Dark slate blue theme with orange/cyan highlights

### **Beta Limitations**
- Phone authentication only
- Admin must manually create band records
- Individual phone-based invitations only
- No self-service band creation

## **🔄 Post-Beta Phases**

### **Phase 1: Multi-Provider Authentication**
- **Google/Facebook/Apple SSO**: One-tap social login options
- **Account Linking**: Members can add multiple auth methods for recovery
- **Email Magic Links**: Backup authentication method
- **Recovery Flows**: Handle phone number changes and lost access scenarios

### **Phase 2: Enhanced Invitation System**
- **Generic Band Links**: Shareable links not tied to phone numbers (`bndy.app/join/band-name/token`)
- **Admin Join Controls**: Toggle band joining on/off, rotate invitation links
- **Ban Management**: Prevent specific members from rejoining
- **Flexible Invitations**: Both targeted and generic invitation options

### **Phase 3: Self-Service Band Management**
- **Public Registration**: Open platform beyond initial 10 bands
- **Band Creation Flow**: Musicians can create their own bands
- **Advanced Admin Tools**: Member management, role assignments, band settings
- **Multi-Band Support**: Enhanced experience for members in multiple bands

### **Phase 4: Advanced Features**
- **Venue Integration**: Location management for gigs and practices
- **Equipment Tracking**: Who brings what to each event
- **Setlist Builder**: Collaborative setlist creation and management
- **Analytics**: Band activity insights and attendance tracking

## **🎯 Key Design Principles**

### **User Experience**
- **Familiar Patterns**: Use established UI patterns (like WhatsApp groups)
- **Mobile PWA**: Native app-like experience without app store friction
- **One-Time Setup**: Members join once, then seamless access forever
- **Admin Control**: Band leaders have full management capabilities

### **Technical Architecture**
- **Multi-Tenant**: Strict band-scoped data isolation
- **Scalable Auth**: Supabase authentication with custom backend authorization
- **Progressive Enhancement**: Core features work, enhanced features improve experience
- **Mobile Performance**: Optimized for mobile networks and devices

## **🔧 Implementation Notes**

### **Current Tech Stack**
- **Frontend**: React + TypeScript, Tailwind CSS, Radix UI components
- **Backend**: Express.js + TypeScript, Drizzle ORM, PostgreSQL
- **Authentication**: Supabase Auth (currently phone OTP only)
- **Database**: Neon Database (serverless PostgreSQL)
- **Deployment**: Replit platform

### **Schema Evolution Path**
- **Current**: users, bands, userBands, events, songs, songReadiness
- **Phase 1**: Add auth provider tracking to users table
- **Phase 2**: Add joinEnabled, joinToken, defaultRole to bands; add band_bans table
- **Phase 3**: Add public band discovery and advanced role management
- **Phase 4**: Add venue, equipment, setlist tables

### **Migration Strategy**
- **Backward Compatible**: New features don't break existing functionality
- **Feature Flags**: Gradual rollout of new capabilities
- **Data Migration**: Careful schema updates with proper rollback plans
- **User Communication**: Clear messaging about new features and changes

## **📱 Mobile-First Development Checklist**

### **Every New Feature Must:**
- [ ] Work perfectly on mobile devices first
- [ ] Have appropriate touch targets (minimum 44px)
- [ ] Support swipe gestures where natural
- [ ] Load quickly on mobile networks
- [ ] Use mobile-friendly form inputs
- [ ] Handle mobile keyboards appropriately
- [ ] Test on various screen sizes (small phones to tablets)
- [ ] Optimize images and assets for mobile
- [ ] Implement proper PWA patterns
- [ ] Consider offline functionality where relevant

### **UI/UX Standards**
- **Primary Actions**: Large, thumb-friendly buttons
- **Navigation**: Bottom tab bars or slide-out menus
- **Content**: Scannable layouts with clear hierarchy
- **Input**: Large form fields with proper keyboard types
- **Feedback**: Immediate visual feedback for all interactions
- **Loading**: Skeleton screens and progress indicators

This roadmap ensures bndy grows thoughtfully from a focused beta to a comprehensive band management platform while maintaining the core mobile-first, user-friendly experience that makes it valuable to UK bands.