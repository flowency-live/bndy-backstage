# The Torrists Band Calendar

## Overview

The Torrists Band Calendar is a web application designed for managing band practices, gigs, and member availability. It provides a mobile-optimized calendar interface where band members can select their persona, view schedules, and manage events with conflict detection capabilities. The application features a vintage rock band aesthetic with custom branding and is built as a full-stack React application with Express backend.

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

The application follows a page-based routing structure with persona selection, calendar view, and admin management. Custom components handle date/time picking, event modals, and calendar rendering with conflict detection.

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

The schema includes band members (with roles, icons, and colors) and events (practices, gigs, unavailable periods) with proper relationships and constraints.

### Authentication and Authorization
Currently implements a simplified persona-based authentication system:

- **Persona Selection**: Users select from predefined band member profiles
- **Session Management**: Client-side user context management
- **No Traditional Auth**: Simplified approach suitable for trusted band member usage
- **Future Extensibility**: Architecture supports adding proper authentication mechanisms

### External Dependencies
The application integrates several key external services and libraries:

- **Database**: Neon Database (@neondatabase/serverless) for PostgreSQL hosting
- **UI Components**: Extensive Radix UI ecosystem for accessible component primitives
- **Fonts**: Google Fonts (Playfair Display, Source Sans Pro, Fredoka One) for typography
- **Icons**: Font Awesome for iconography
- **Date Handling**: date-fns for date manipulation and formatting
- **Development Tools**: ESBuild for server bundling, PostCSS for CSS processing
- **Deployment**: Replit-specific plugins for development environment integration

The application is designed to be mobile-first with responsive design patterns and uses CSS custom properties for consistent theming across the vintage rock band aesthetic.