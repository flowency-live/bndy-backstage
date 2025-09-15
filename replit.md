# bndy - Multi-Tenant Band Calendar Platform

## Overview

bndy is a comprehensive multi-tenant web platform designed for band calendar management with real phone-based authentication and secure band-scoped data isolation. The platform enables individual bands to manage practices, gigs, member availability, and song practice lists through a mobile-optimized interface with shared calendar functionality, conflict detection capabilities, and collaborative song practice with readiness tracking. The application features a professional dark slate blue aesthetic with orange and cyan highlights, swipe gesture navigation for mobile devices, Spotify API integration for song search, and is built as a full-stack React application with Express backend and PostgreSQL database.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
The frontend is built using React with TypeScript, utilizing a modern component-based architecture:

- **UI Framework**: React with TypeScript for type safety and modern development patterns
- **Styling**: Tailwind CSS with custom CSS variables for consistent theming and responsive design
- **Component Library**: Radix UI components via shadcn/ui for accessibility and consistency
- **State Management**: React Query (@tanstack/react-query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Build Tool**: Vite for fast development and optimized production builds

The application follows a page-based routing structure with persona selection, calendar view, song management, and admin management. Custom components handle date/time picking, event modals, calendar rendering with conflict detection, mobile-friendly swipe gesture navigation, Spotify search integration, and song readiness tracking. The calendar supports intuitive left/right swipe gestures for month navigation on touch devices. A slide-out navigation drawer provides easy access to all main sections of the application.

### Backend Architecture
The backend uses Express.js with TypeScript in a RESTful API pattern:

- **Framework**: Express.js with TypeScript for type-safe server development
- **Database Layer**: Drizzle ORM with PostgreSQL for type-safe database operations
- **Schema Definition**: Shared schema definitions between frontend and backend using Drizzle and Zod
- **Storage Abstraction**: Interface-based storage layer allowing for multiple implementations (currently in-memory with database migration path)
- **API Design**: RESTful endpoints for band members and events with proper HTTP status codes

The server implements middleware for request logging, error handling, and serves both API endpoints and static frontend assets.

### Data Storage Solutions
The application uses a dual-approach data storage strategy:

- **Database**: PostgreSQL with Drizzle ORM for production data persistence
- **Schema Management**: Drizzle Kit for database migrations and schema evolution
- **Development Storage**: In-memory storage implementation for rapid development and testing
- **Connection**: Neon Database serverless PostgreSQL for cloud deployment

The schema includes band members (with roles, icons, and colors), events (practices, gigs, unavailable periods), songs (with Spotify integration), song readiness tracking (red/amber/green status per member), and song veto system with proper relationships and constraints.

### Authentication and Authorization
Implements production-ready multi-tenant authentication system:

- **Supabase Authentication**: Phone-based OTP authentication with JWT tokens
- **Band-Scoped Authorization**: All API endpoints enforce band membership verification
- **Secure Session Management**: Server-side JWT validation with proper middleware
- **Multi-Tenant Data Isolation**: Complete separation of band data with authorization checks

### External Dependencies
The application integrates several key external services and libraries:

- **Database**: Neon Database (@neondatabase/serverless) for PostgreSQL hosting
- **Music Integration**: Spotify Web API for song search and metadata retrieval
- **UI Components**: Extensive Radix UI ecosystem for accessible component primitives
- **Fonts**: Google Fonts (Playfair Display, Source Sans Pro, Fredoka One) for typography
- **Icons**: Font Awesome for iconography
- **Date Handling**: date-fns for date manipulation and formatting
- **Development Tools**: ESBuild for server bundling, PostCSS for CSS processing
- **Deployment**: Replit-specific plugins for development environment integration

### Recent Major Features (January 2025)
- **Song Management System**: Complete Spotify-integrated song practice list with search, add, and readiness tracking
- **Readiness Tracking**: Red/Amber/Green status system for each band member per song
- **Song Veto System**: Members can mark songs with poo emoji to indicate rejection
- **Mobile Navigation**: Slide-out drawer navigation accessible via bndy logo click
- **Smart Song Sorting**: Practice list automatically sorts by readiness level and pushes vetoed songs to bottom
- **Spotify Integration**: Real-time song search with album artwork, artist info, and direct Spotify links

### Recent Major Features (September 2025)
- **Complete Authentication System**: Supabase phone OTP authentication with real user accounts
- **Multi-Tenant Architecture**: Secure band-scoped data isolation and authorization
- **Band Creation & Management**: Complete onboarding flow with band switching capabilities
- **Professional Branding**: Dark slate blue theme with orange/cyan highlights and bndy logo integration
- **BandGate Routing**: Smart routing system for 0/1/multiple band scenarios
- **Magic Link Invitations**: WhatsApp-shareable band invitations (in development)

The application is designed to be mobile-first with responsive design patterns and uses CSS custom properties for consistent theming across the professional bndy platform aesthetic.