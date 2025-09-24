// AWS Cognito Authentication Service
import { Amplify } from '@aws-amplify/core';
import {
  signIn,
  signUp,
  confirmSignUp,
  confirmSignIn,
  signOut,
  getCurrentUser,
  fetchAuthSession,
  signInWithRedirect,
  resendSignUpCode
} from '@aws-amplify/auth';

// Debug environment variables
console.log('🔧 COGNITO ENV VARS:', {
  userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
  clientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID,
  region: import.meta.env.VITE_AWS_REGION,
});

// Configure Amplify with Cognito settings
const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
      userPoolClientId: import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID || '',
      region: import.meta.env.VITE_AWS_REGION || 'us-east-1',
      signUpVerificationMethod: 'code',
      loginWith: {
        oauth: {
          domain: 'eu-west-2lqtkkhs1p.auth.eu-west-2.amazoncognito.com',
          scopes: ['email', 'openid', 'profile', 'phone'],
          redirectSignIn: typeof window !== 'undefined' ? `${window.location.origin}/dashboard` : '',
          redirectSignOut: typeof window !== 'undefined' ? `${window.location.origin}/login` : '',
          responseType: 'code',
          providers: ['Google'],
        },
      },
    },
  },
};

// Initialize Amplify
Amplify.configure(amplifyConfig);

export interface CognitoUser {
  userId: string;
  username: string;
  email?: string;
  phone_number?: string;
  email_verified?: boolean;
  phone_number_verified?: boolean;
}

export interface AuthSession {
  user: CognitoUser;
  tokens: {
    accessToken: string;
    idToken: string;
    refreshToken?: string;
  };
}

class CognitoAuthService {
  // Sign up with phone number
  async signUpWithPhone(phoneNumber: string, password: string) {
    try {
      const result = await signUp({
        username: phoneNumber,
        password,
        options: {
          userAttributes: {
            phone_number: phoneNumber,
          },
        },
      });

      return {
        data: {
          user: result.user,
          nextStep: result.nextStep,
        },
        error: null,
      };
    } catch (error: any) {
      return {
        data: null,
        error: { message: error.message || 'Sign up failed' },
      };
    }
  }

  // Sign up with email
  async signUpWithEmail(email: string, password: string) {
    try {
      const result = await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
          },
        },
      });

      return {
        data: {
          user: result.user,
          nextStep: result.nextStep,
        },
        error: null,
      };
    } catch (error: any) {
      return {
        data: null,
        error: { message: error.message || 'Sign up failed' },
      };
    }
  }

  // Confirm sign up with verification code
  async confirmSignUp(username: string, code: string) {
    try {
      const result = await confirmSignUp({
        username,
        confirmationCode: code,
      });

      return {
        data: result,
        error: null,
      };
    } catch (error: any) {
      return {
        data: null,
        error: { message: error.message || 'Confirmation failed' },
      };
    }
  }

  // Resend verification code
  async resendCode(username: string) {
    try {
      const result = await resendSignUpCode({
        username,
      });

      return {
        data: result,
        error: null,
      };
    } catch (error: any) {
      return {
        data: null,
        error: { message: error.message || 'Resend failed' },
      };
    }
  }

  // Sign in with phone/email and password
  async signInWithPassword(username: string, password: string) {
    try {
      const result = await signIn({
        username,
        password,
      });

      if (result.isSignedIn) {
        const session = await this.getCurrentSession();
        return {
          data: session,
          error: null,
        };
      }

      return {
        data: {
          nextStep: result.nextStep,
        },
        error: null,
      };
    } catch (error: any) {
      return {
        data: null,
        error: { message: error.message || 'Sign in failed' },
      };
    }
  }

  // Sign in with Google (using popup instead of redirect)
  async signInWithGoogle() {
    try {
      // Use direct OAuth URL for popup instead of Amplify redirect
      const cognitoDomain = 'https://eu-west-2lqtkkhs1p.auth.eu-west-2.amazoncognito.com';
      const clientId = import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID;
      const redirectUri = window.location.origin + '/dashboard';

      const oauthUrl = `${cognitoDomain}/oauth2/authorize?` +
        `response_type=code&` +
        `client_id=${clientId}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `scope=email+openid+profile&` +
        `identity_provider=Google`;

      // Open popup window
      const popup = window.open(
        oauthUrl,
        'google-login',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      return new Promise((resolve, reject) => {
        const checkPopup = setInterval(() => {
          try {
            if (popup?.closed) {
              clearInterval(checkPopup);
              reject(new Error('Popup was closed'));
            }

            // Check if popup has navigated to redirect URI
            if (popup?.location.href.includes('/dashboard')) {
              const url = new URL(popup.location.href);
              const code = url.searchParams.get('code');

              if (code) {
                clearInterval(checkPopup);
                popup.close();
                // Exchange code for tokens (would need backend endpoint)
                resolve({
                  data: { code },
                  error: null,
                });
              }
            }
          } catch (e) {
            // Cross-origin error means popup is still on OAuth provider
          }
        }, 1000);
      });

    } catch (error: any) {
      return {
        data: null,
        error: { message: error.message || 'Google sign in failed' },
      };
    }
  }

  // Get current session
  async getCurrentSession(): Promise<{ data: AuthSession | null; error: any }> {
    try {
      const user = await getCurrentUser();
      const session = await fetchAuthSession();

      if (user && session.tokens) {
        return {
          data: {
            user: {
              userId: user.userId,
              username: user.username,
              email: user.signInDetails?.loginId?.includes('@') ? user.signInDetails.loginId : undefined,
              phone_number: !user.signInDetails?.loginId?.includes('@') ? user.signInDetails?.loginId : undefined,
            },
            tokens: {
              accessToken: session.tokens.accessToken.toString(),
              idToken: session.tokens.idToken.toString(),
              refreshToken: session.tokens.refreshToken?.toString(),
            },
          },
          error: null,
        };
      }

      return {
        data: null,
        error: null,
      };
    } catch (error: any) {
      return {
        data: null,
        error: { message: error.message || 'Session retrieval failed' },
      };
    }
  }

  // Sign out
  async signOut() {
    try {
      await signOut();
      return {
        error: null,
      };
    } catch (error: any) {
      return {
        error: { message: error.message || 'Sign out failed' },
      };
    }
  }

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: AuthSession | null) => void) {
    // For now, return a mock unsubscribe function
    // In a full implementation, you'd set up Amplify Hub listeners
    return {
      data: {
        subscription: {
          unsubscribe: () => {}
        }
      }
    };
  }

  // Phone-based SMS OTP authentication
  async sendOTP(phone: string) {
    try {
      // Use Amplify's signIn to initiate SMS challenge
      const result = await signIn({
        username: phone,
        options: {
          preferredChallenge: 'SMS_OTP'
        }
      });

      if (result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_SMS_OTP_CODE') {
        return {
          data: { challengeName: 'SMS_OTP', session: result.nextStep },
          error: null
        };
      }

      // If user doesn't exist, we need to sign them up first
      if (result.nextStep?.signInStep === 'CONFIRM_SIGN_UP') {
        // User exists but needs confirmation
        return {
          data: null,
          error: { message: 'User needs to be confirmed first' }
        };
      }

      return {
        data: null,
        error: { message: 'Unexpected challenge type' }
      };

    } catch (error: any) {
      // If user doesn't exist, create them with phone number
      if (error.name === 'UserNotFoundException') {
        try {
          const signUpResult = await signUp({
            username: phone,
            password: this.generateTempPassword(), // Generate temp password
            options: {
              userAttributes: {
                phone_number: phone,
              }
            }
          });

          return {
            data: { challengeName: 'CONFIRM_SIGN_UP', session: signUpResult.nextStep },
            error: null
          };
        } catch (signUpError: any) {
          return {
            data: null,
            error: { message: signUpError.message || 'Sign up failed' }
          };
        }
      }

      return {
        data: null,
        error: { message: error.message || 'OTP send failed' }
      };
    }
  }

  async verifyOTP(phone: string, token: string) {
    try {
      // First try to confirm sign in (for existing users)
      const result = await confirmSignIn({
        challengeResponse: token
      });

      if (result.isSignedIn) {
        const session = await this.getCurrentSession();
        return {
          data: session.data,
          error: null
        };
      }

      return {
        data: null,
        error: { message: 'OTP verification failed' }
      };

    } catch (error: any) {
      // If it's a sign up confirmation, try that instead
      if (error.name === 'InvalidParameterException' || error.message?.includes('confirm')) {
        try {
          await confirmSignUp({
            username: phone,
            confirmationCode: token
          });

          // Now sign them in
          const signInResult = await signIn({
            username: phone,
            options: {
              preferredChallenge: 'SMS_OTP'
            }
          });

          if (signInResult.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_SMS_OTP_CODE') {
            // Need another OTP for sign in
            return {
              data: null,
              error: { message: 'Please request a new login code' }
            };
          }

          const session = await this.getCurrentSession();
          return {
            data: session.data,
            error: null
          };

        } catch (confirmError: any) {
          return {
            data: null,
            error: { message: confirmError.message || 'Confirmation failed' }
          };
        }
      }

      return {
        data: null,
        error: { message: error.message || 'OTP verification failed' }
      };
    }
  }

  // Helper to generate temp password for SMS-only users
  private generateTempPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Ensure it meets password requirements
    return 'Temp!' + password;
  }
}

export const cognitoAuth = new CognitoAuthService();

// Export helper functions for compatibility with existing code
export const authHelpers = {
  signUpWithPhone: cognitoAuth.signUpWithPhone.bind(cognitoAuth),
  signUpWithEmail: cognitoAuth.signUpWithEmail.bind(cognitoAuth),
  confirmSignUp: cognitoAuth.confirmSignUp.bind(cognitoAuth),
  resendCode: cognitoAuth.resendCode.bind(cognitoAuth),
  signInWithPassword: cognitoAuth.signInWithPassword.bind(cognitoAuth),
  signInWithGoogle: cognitoAuth.signInWithGoogle.bind(cognitoAuth),
  signOut: cognitoAuth.signOut.bind(cognitoAuth),
  getSession: cognitoAuth.getCurrentSession.bind(cognitoAuth),
  onAuthStateChange: cognitoAuth.onAuthStateChange.bind(cognitoAuth),

  // Legacy compatibility methods
  sendOTP: cognitoAuth.sendOTP.bind(cognitoAuth),
  verifyOTP: cognitoAuth.verifyOTP.bind(cognitoAuth),
};

// Export for backwards compatibility (replaces supabase export)
export const supabase = null;