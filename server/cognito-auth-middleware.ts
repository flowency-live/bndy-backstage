import { type Request, type Response, type NextFunction } from "express";
import { CognitoJwtVerifier } from "aws-jwt-verify";
import { storage } from "./storage";
import type { User, Band, UserBand } from "@shared/schema";

// Cognito JWT payload interface
interface CognitoJWTPayload {
  sub: string; // Cognito User ID
  email?: string;
  phone_number?: string;
  email_verified?: boolean;
  phone_number_verified?: boolean;
  username: string;
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  token_use: 'id' | 'access';
}

export interface AuthenticatedRequest extends Request {
  user?: {
    cognitoId: string;
    email?: string;
    phone?: string;
    username: string;
    dbUser?: User;
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

// Create Cognito JWT verifiers
let idTokenVerifier: CognitoJwtVerifier | null = null;
let accessTokenVerifier: CognitoJwtVerifier | null = null;

function getVerifiers() {
  const userPoolId = process.env.COGNITO_USER_POOL_ID;
  const clientId = process.env.COGNITO_USER_POOL_CLIENT_ID;
  const region = process.env.AWS_REGION || 'us-east-1';

  if (!userPoolId || !clientId) {
    console.warn('Cognito configuration missing:', {
      userPoolId: !!userPoolId,
      clientId: !!clientId,
      region
    });
    return { idTokenVerifier: null, accessTokenVerifier: null };
  }

  if (!idTokenVerifier) {
    idTokenVerifier = CognitoJwtVerifier.create({
      userPoolId,
      clientId,
      tokenUse: "id",
    });
  }

  if (!accessTokenVerifier) {
    accessTokenVerifier = CognitoJwtVerifier.create({
      userPoolId,
      clientId,
      tokenUse: "access",
    });
  }

  return { idTokenVerifier, accessTokenVerifier };
}

export async function authenticateCognitoJWT(
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

    // Development mode bypass for your phone number
    if (process.env.NODE_ENV === 'development' &&
        (token === 'DEV_GOD_MODE_TOKEN' || token.includes('7758240770'))) {
      console.log('🚀 DEV MODE: God mode authentication bypassed for token:', token);

      const devCognitoId = 'dev-god-mode-user';
      let dbUser;

      try {
        // Try to find existing user by the old supabaseId field
        dbUser = await storage.getUserBySupabaseId(devCognitoId);

        if (!dbUser) {
          // Create new user with cognito ID
          dbUser = await storage.createOrGetUser({
            supabaseId: devCognitoId, // Keep using this field for now
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
        cognitoId: devCognitoId,
        username: 'god-mode',
        phone: '+447758240770',
        email: undefined,
        dbUser: dbUser,
      };

      return next();
    }

    // Get Cognito verifiers
    const { idTokenVerifier, accessTokenVerifier } = getVerifiers();

    if (!idTokenVerifier || !accessTokenVerifier) {
      if (process.env.NODE_ENV === 'development') {
        return res.status(500).json({
          message: "Development authentication not configured",
          details: "Set COGNITO_USER_POOL_ID and COGNITO_USER_POOL_CLIENT_ID environment variables"
        });
      }

      console.error("Cognito configuration missing:");
      console.error("- COGNITO_USER_POOL_ID");
      console.error("- COGNITO_USER_POOL_CLIENT_ID");
      console.error("- AWS_REGION (optional, defaults to us-east-1)");
      return res.status(500).json({
        message: "Server configuration error",
        details: "Cognito configuration missing"
      });
    }

    // Try to verify as ID token first, then access token
    let payload: CognitoJWTPayload;
    try {
      payload = await idTokenVerifier.verify(token);
    } catch (idError) {
      try {
        payload = await accessTokenVerifier.verify(token);
      } catch (accessError) {
        console.warn('Token verification failed:', { idError: idError.message, accessError: accessError.message });
        return res.status(401).json({ message: "Invalid token" });
      }
    }

    // Validate that the user ID exists
    if (!payload.sub || payload.sub.trim() === '') {
      return res.status(401).json({ message: "Invalid token: missing user ID" });
    }

    // Extract phone number and email
    const phone = payload.phone_number;
    const email = payload.email;

    // Add user info to request
    req.user = {
      cognitoId: payload.sub,
      username: payload.username,
      email: email,
      phone: phone,
    };

    // Try to get the user from our database using the cognito ID
    try {
      // For now, we'll use the supabaseId field to store Cognito IDs for compatibility
      let dbUser = await storage.getUserBySupabaseId(payload.sub);

      if (!dbUser && (phone || email)) {
        // Try to find existing user by phone or email and link them
        if (phone) {
          const users = await storage.getUsersByPhone(phone);
          if (users.length > 0) {
            dbUser = users[0];
            // Update the user to link with Cognito ID
            await storage.updateUser(dbUser.id, { supabaseId: payload.sub });
          }
        }

        if (!dbUser && email) {
          const users = await storage.getUsersByEmail(email);
          if (users.length > 0) {
            dbUser = users[0];
            // Update the user to link with Cognito ID
            await storage.updateUser(dbUser.id, { supabaseId: payload.sub });
          }
        }
      }

      req.user.dbUser = dbUser;
    } catch (error) {
      console.warn(`Failed to fetch database user for Cognito ID ${payload.sub}:`, error);
      // Continue without database user - they might not be in our system yet
    }

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(500).json({ message: "Authentication failed" });
  }
}

// Optional middleware - doesn't fail if no token provided
export async function optionalAuthenticateCognitoJWT(
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
    // Delegate to the main authentication middleware
    await authenticateCognitoJWT(req, res, next);
  } catch (error) {
    // Log the error but continue without authentication
    console.warn("Optional authentication failed:", error);
    next();
  }
}

// Band membership verification middleware
export async function requireMembership(
  req: BandAuthorizedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user || !req.user.dbUser) {
      return res.status(401).json({
        message: "Authentication required",
        details: "User must be authenticated before checking band membership"
      });
    }

    const bandId = req.params.bandId;
    if (!bandId) {
      return res.status(400).json({
        message: "Band ID required",
        details: "Band ID must be provided in the route parameters as :bandId"
      });
    }

    const userBands = await storage.getUserBands(req.user.dbUser.id);
    const membership = userBands.find(ub => ub.bandId === bandId);

    if (!membership) {
      return res.status(403).json({
        message: "Access denied",
        details: "User is not a member of this band"
      });
    }

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