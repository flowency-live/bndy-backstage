import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import type { User, Band, UserBand } from "@shared/schema";

interface SupabaseJWTPayload {
  sub: string; // Supabase user ID
  email?: string;
  phone?: string;
  app_metadata?: {
    provider?: string;
    providers?: string[];
  };
  user_metadata?: {
    [key: string]: any;
  };
  role?: string;
  aud: string;
  exp: number;
  iat: number;
  iss: string;
}

export interface AuthenticatedRequest extends Request {
  user?: {
    supabaseId: string;
    email?: string;
    phone?: string;
    dbUser?: User; // Will contain the user from our database
  };
}

export interface BandAuthorizedRequest extends AuthenticatedRequest {
  bandContext?: {
    bandId: string;
    band: Band;
    membership: UserBand;
    hasOwnerRole: boolean;
    hasAdminRole: boolean;
  };
}

export async function authenticateSupabaseJWT(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Authorization token required" });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Development mode bypass for god mode authentication
    if (process.env.NODE_ENV === 'development' &&
        (token === 'DEV_GOD_MODE_TOKEN' || token.includes('7758240770'))) {
      console.log('🚀 DEV MODE: God mode authentication bypassed for token:', token);

      // Create a development user for god mode
      const devSupabaseId = 'dev-god-mode-user';
      let dbUser;

      try {
        dbUser = await storage.getUserBySupabaseId(devSupabaseId);
        if (!dbUser) {
          // Create the god mode user in our database with minimal profile (to allow profile completion)
          dbUser = await storage.createOrGetUser({
            supabaseId: devSupabaseId,
            phone: '+447758240770',
            email: null,
            displayName: null,
            firstName: null,
            lastName: null,
            hometown: null,
            instrument: null,
            platformAdmin: false,
            profileCompleted: false
          });
        }
      } catch (error) {
        console.error('Failed to create/get god mode user:', error);
      }

      req.user = {
        supabaseId: devSupabaseId,
        phone: '+447758240770',
        email: undefined,
        dbUser: dbUser,
      };

      return next();
    }
    
    // Development mode bypass for general dev users
    if (process.env.NODE_ENV === 'development' && token.startsWith('DEV_USER_')) {
      const phone = token.replace('DEV_USER_', '');
      // Fix phone normalization: remove leading 0 from UK numbers before adding +44
      const normalizedPhone = phone.startsWith('0') ? phone.substring(1) : phone;
      const fullPhone = `+44${normalizedPhone}`;
      const devSupabaseId = `dev-user-${phone}`;
      
      console.log(`🛠️ DEV MODE: Development authentication bypassed for phone ${phone} -> ${fullPhone}`);
      
      let dbUser;
      try {
        dbUser = await storage.getUserBySupabaseId(devSupabaseId);
        if (!dbUser) {
          // Create the dev user in our database
          dbUser = await storage.createOrGetUser({
            supabaseId: devSupabaseId,
            phone: fullPhone,
            email: null,
            displayName: null,
          });
        }
      } catch (error) {
        console.error(`Failed to create/get dev user for ${phone}:`, error);
      }
      
      req.user = {
        supabaseId: devSupabaseId,
        phone: fullPhone,
        email: undefined,
        dbUser: dbUser,
      };
      
      return next();
    }
    
    // Get Supabase JWT secret and URL from environment for production
    const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
    const supabaseUrl = process.env.SUPABASE_URL;
    
    if (!supabaseJwtSecret) {
      // In development, if no Supabase config, return helpful error
      if (process.env.NODE_ENV === 'development') {
        return res.status(500).json({ 
          message: "Development authentication not configured",
          details: "Use DEV_GOD_MODE_TOKEN for god mode or set up Supabase environment variables"
        });
      }
      
      console.error("SUPABASE_JWT_SECRET not found in environment variables");
      console.error("To fix this:");
      console.error("1. Go to your Supabase project dashboard");
      console.error("2. Navigate to Settings > API");
      console.error("3. Copy the JWT Secret");
      console.error("4. Add SUPABASE_JWT_SECRET=your_jwt_secret to your environment variables");
      return res.status(500).json({ 
        message: "Server configuration error",
        details: "SUPABASE_JWT_SECRET environment variable is required"
      });
    }

    if (!supabaseUrl) {
      console.error("SUPABASE_URL not found in environment variables");
      console.error("Add SUPABASE_URL=your_supabase_url to your environment variables");
      return res.status(500).json({ 
        message: "Server configuration error",
        details: "SUPABASE_URL environment variable is required"
      });
    }

    // Verify the JWT token with strict algorithm validation
    const decoded = jwt.verify(token, supabaseJwtSecret, {
      algorithms: ['HS256'],
      issuer: `${supabaseUrl}/auth/v1`,
      audience: 'authenticated'
    }) as SupabaseJWTPayload;
    
    // Validate that the user ID exists and is non-empty
    if (!decoded.sub || decoded.sub.trim() === '') {
      return res.status(401).json({ message: "Invalid token: missing user ID" });
    }
    
    // Add user info to request
    req.user = {
      supabaseId: decoded.sub,
      email: decoded.email,
      phone: decoded.phone,
    };

    // Try to get the user from our database
    try {
      const dbUser = await storage.getUserBySupabaseId(decoded.sub);
      req.user.dbUser = dbUser;
    } catch (error) {
      console.warn(`Failed to fetch database user for Supabase ID ${decoded.sub}:`, error);
      // Continue without database user - they might not be in our system yet
    }

    next();
  } catch (error) {
    // Handle TokenExpiredError before JsonWebTokenError since it's a subclass
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: "Token expired" });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: "Invalid token" });
    }
    
    console.error("Authentication error:", error);
    return res.status(500).json({ message: "Authentication failed" });
  }
}

// Optional middleware - doesn't fail if no token provided
export async function optionalAuthenticateSupabaseJWT(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No token provided, continue without authentication
    return next();
  }

  try {
    const token = authHeader.replace('Bearer ', '');
    
    // Get Supabase JWT secret and URL from environment
    const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
    const supabaseUrl = process.env.SUPABASE_URL;
    
    if (!supabaseJwtSecret || !supabaseUrl) {
      // Log configuration issue but continue without authentication
      console.warn("Missing Supabase configuration for optional auth");
      return next();
    }

    // Verify the JWT token with strict algorithm validation
    const decoded = jwt.verify(token, supabaseJwtSecret, {
      algorithms: ['HS256'],
      issuer: `${supabaseUrl}/auth/v1`,
      audience: 'authenticated'
    }) as SupabaseJWTPayload;
    
    // Validate that the user ID exists and is non-empty
    if (!decoded.sub || decoded.sub.trim() === '') {
      console.warn("Optional authentication failed: missing user ID in token");
      return next();
    }
    
    // Add user info to request
    req.user = {
      supabaseId: decoded.sub,
      email: decoded.email,
      phone: decoded.phone,
    };

    // Try to get the user from our database
    try {
      const dbUser = await storage.getUserBySupabaseId(decoded.sub);
      req.user.dbUser = dbUser;
    } catch (error) {
      console.warn(`Failed to fetch database user for Supabase ID ${decoded.sub}:`, error);
      // Continue without database user - they might not be in our system yet
    }

    next();
  } catch (error) {
    // Log the error but continue without authentication - don't emit any HTTP errors
    console.warn("Optional authentication failed:", error);
    next();
  }
}

// Band membership verification middleware
// Must be used after authenticateSupabaseJWT middleware
export async function requireMembership(
  req: BandAuthorizedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Ensure user is authenticated first
    if (!req.user || !req.user.dbUser) {
      return res.status(401).json({ 
        message: "Authentication required",
        details: "User must be authenticated before checking band membership"
      });
    }

    // Extract bandId from route parameters
    const bandId = req.params.bandId;
    if (!bandId) {
      return res.status(400).json({ 
        message: "Band ID required",
        details: "Band ID must be provided in the route parameters as :bandId"
      });
    }

    // Get user's band memberships
    const userBands = await storage.getUserBands(req.user.dbUser.id);
    
    // Find membership for this specific band
    const membership = userBands.find(ub => ub.bandId === bandId);
    if (!membership) {
      return res.status(403).json({ 
        message: "Access denied",
        details: "User is not a member of this band"
      });
    }

    // Add band context to request
    req.bandContext = {
      bandId,
      band: membership.band,
      membership,
      hasOwnerRole: membership.role === 'owner',
      hasAdminRole: membership.role === 'owner' || membership.role === 'admin',
    };

    next();
  } catch (error) {
    console.error("Band membership verification error:", error);
    return res.status(500).json({ 
      message: "Failed to verify band membership",
      details: "An error occurred while checking band access"
    });
  }
}

// Helper middleware to require specific roles within a band
export function requireBandRole(allowedRoles: string[]) {
  return (req: BandAuthorizedRequest, res: Response, next: NextFunction) => {
    if (!req.bandContext) {
      return res.status(500).json({ 
        message: "Band context missing",
        details: "requireBandRole must be used after requireMembership middleware"
      });
    }

    if (!allowedRoles.includes(req.bandContext.membership.role)) {
      return res.status(403).json({ 
        message: "Insufficient permissions",
        details: `This action requires one of the following roles: ${allowedRoles.join(', ')}`
      });
    }

    next();
  };
}

// Convenience middleware for admin-only actions
export const requireBandAdmin = requireBandRole(['owner', 'admin']);

// Convenience middleware for owner-only actions  
export const requireBandOwner = requireBandRole(['owner']);