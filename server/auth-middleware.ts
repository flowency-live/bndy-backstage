import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { storage } from "./storage";

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
    dbUser?: any; // Will contain the user from our database
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
    
    // Get Supabase JWT secret and URL from environment
    const supabaseJwtSecret = process.env.SUPABASE_JWT_SECRET;
    const supabaseUrl = process.env.SUPABASE_URL;
    
    if (!supabaseJwtSecret) {
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