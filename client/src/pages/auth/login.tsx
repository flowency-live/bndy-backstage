import { useState } from "react"
import { useLocation } from "wouter"
import { useServerAuth } from "@/hooks/useServerAuth"
import { authService } from "@/lib/services/auth-service"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import BndyLogo from "@/components/ui/bndy-logo"
import Footer from "@/components/ui/footer"
import { useForceDarkMode } from "@/hooks/use-force-dark-mode"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Phone, Mail } from "lucide-react"
import { queryClient } from "@/lib/queryClient"

type AuthStep = 'phone' | 'verify'
type EmailStep = 'email' | 'check-inbox'

export default function Login() {
  // Force dark mode for branding consistency
  useForceDarkMode()

  const [, setLocation] = useLocation()
  const [step, setStep] = useState<AuthStep>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [email, setEmail] = useState('')
  const [emailStep, setEmailStep] = useState<EmailStep>('email')
  const [welcomeMessage, setWelcomeMessage] = useState('Welcome!')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [appleLoading, setAppleLoading] = useState(false)
  const [error, setError] = useState('')
  // Server auth handles authentication server-side
  const { toast } = useToast()

  const sendOTP = async (phone: string) => {
    try {
      await authService.requestPhoneOTP(phone)
      return { error: null }
    } catch (error: any) {
      return { error }
    }
  }

  const verifyOTP = async (phone: string, otp: string) => {
    try {
      const result = await authService.verifyPhoneOTP(phone, otp)

      if (result.requiresOnboarding) {
        // User doesn't exist yet - needs to complete onboarding
        return { data: { requiresOnboarding: true }, error: null }
      }

      // User exists and is logged in
      return { data: result, error: null }
    } catch (error: any) {
      return { data: null, error }
    }
  }

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Format UK mobile numbers as 07XXX XXXXXX
    if (digits.length <= 5) {
      return digits
    } else if (digits.length <= 8) {
      return `${digits.slice(0, 5)} ${digits.slice(5)}`
    } else {
      return `${digits.slice(0, 5)} ${digits.slice(5, 11)}`
    }
  }

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!phone.trim()) {
      toast({
        title: "Phone number required",
        description: "Please enter your phone number to continue",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    // Convert formatted phone to E.164 format (+44XXXXXXXXXX)
    const digits = phone.replace(/\D/g, '')
    // UK mobile numbers start with 07, convert to +44 7
    const e164Phone = digits.startsWith('07') ? `+44${digits.slice(1)}` : `+44${digits}`

    try {
      // Check if user exists to customize welcome message
      const identity = await authService.checkIdentity(e164Phone, undefined)

      if (identity.exists && identity.displayName) {
        setWelcomeMessage(`Welcome back, ${identity.displayName}!`)
      } else {
        setWelcomeMessage('Welcome to bndy!')
      }

      const { error } = await sendOTP(e164Phone)

      if (error) {
        throw error
      } else {
        toast({
          title: "Code sent!",
          description: "Check your phone for the verification code",
          variant: "default"
        })
        setStep('verify')
      }
    } catch (error: any) {
      toast({
        title: "Error sending code",
        description: error.message || "Please try again",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otp.trim()) {
      toast({
        title: "Verification code required",
        description: "Please enter the 6-digit code",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    const digits = phone.replace(/\D/g, '')
    // UK mobile numbers start with 07, convert to +44 7
    const e164Phone = digits.startsWith('07') ? `+44${digits.slice(1)}` : `+44${digits}`

    try {
      const { data, error } = await verifyOTP(e164Phone, otp)

      if (error) {
        throw error
      }

      // Successful authentication
      toast({
        title: "Signed in successfully!",
        description: "Welcome to bndy",
        variant: "default"
      })

      // Invalidate auth queries for fresh session data
      queryClient.invalidateQueries({ queryKey: ['/api/me'] })

      // Check for pending invite and validate before redirecting
      const pendingInvite = localStorage.getItem('pendingInvite')
      if (pendingInvite) {
        try {
          // Check if user is already a member of the invite's artist
          const inviteResponse = await fetch(`https://api.bndy.co.uk/api/invites/${pendingInvite}`, {
            credentials: 'include'
          })

          if (!inviteResponse.ok) {
            // Invalid invite - clear and go to dashboard
            localStorage.removeItem('pendingInvite')
            setLocation('/dashboard')
            return
          }

          const inviteDetails = await inviteResponse.json()

          // Check current memberships
          const membershipsResponse = await fetch('https://api.bndy.co.uk/api/memberships/me', {
            credentials: 'include'
          })

          if (membershipsResponse.ok) {
            const memberships = await membershipsResponse.json()
            const alreadyMember = memberships.artists?.some((a: any) => a.id === inviteDetails.artistId)

            if (alreadyMember) {
              // Already a member - clear stale invite and go to dashboard
              localStorage.removeItem('pendingInvite')
              setLocation('/dashboard')
              return
            }
          }

          // Still need to accept invite
          setLocation(`/invite/${pendingInvite}`)
        } catch (error) {
          // Error checking invite - clear and go to dashboard
          localStorage.removeItem('pendingInvite')
          setLocation('/dashboard')
        }
      } else {
        setLocation('/dashboard')
      }
    } catch (error: any) {
      toast({
        title: "Invalid code",
        description: "Please check your code and try again",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setStep('phone')
    setOtp('')
  }

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      // Simple redirect to OAuth flow
      const oauthUrl = authService.getGoogleAuthUrl();
      window.location.href = oauthUrl;
    } catch (error) {
      setGoogleLoading(false);
      toast({
        title: "Error",
        description: "Failed to start Google sign-in. Please try again.",
        variant: "destructive"
      });
    }
  }

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    try {
      // Simple redirect to OAuth flow
      const oauthUrl = authService.getAppleAuthUrl();
      window.location.href = oauthUrl;
    } catch (error) {
      setAppleLoading(false);
      toast({
        title: "Error",
        description: "Failed to start Apple sign-in. Please try again.",
        variant: "destructive"
      });
    }
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast({
        title: "Email required",
        description: "Please enter your email address to continue",
        variant: "destructive"
      })
      return
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      // Check if user exists to customize welcome message
      const identity = await authService.checkIdentity(undefined, email)

      if (identity.exists && identity.displayName) {
        setWelcomeMessage(`Welcome back, ${identity.displayName}!`)
      } else {
        setWelcomeMessage('Welcome to bndy!')
      }

      // Send magic link
      await authService.requestEmailMagicLink(email)

      toast({
        title: "Check your email!",
        description: "We sent you a magic link to sign in",
        variant: "default"
      })

      setEmailStep('check-inbox')
    } catch (error: any) {
      toast({
        title: "Error sending magic link",
        description: error.message || "Please try again",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEmailBack = () => {
    setEmailStep('email')
    setEmail('')
  }

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20">
      {/* Main content - with bottom padding to account for fixed footer */}
      <div className="flex flex-col items-center justify-start sm:justify-center p-3 pt-4 sm:p-4">
        <div className="text-center animate-fade-in max-w-md w-full overflow-y-auto">
          {/* Band logo - LARGER on mobile as requested */}
          <div className="mb-3 sm:mb-6" data-testid="logo-container">
            <div className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 flex items-center justify-center mx-auto flex-shrink-0">
              <BndyLogo
                className="w-32 h-32 sm:w-32 sm:h-32 md:w-40 md:h-40"
                holeColor="rgb(30 41 59)"
              />
            </div>
          </div>

          {/* Auth form with tabs - compact on mobile */}
          <div className="bg-card rounded-xl p-4 sm:p-6 shadow-lg border border-border min-h-[240px] sm:min-h-[320px] flex flex-col flex-shrink-0 mb-3">
          <Tabs defaultValue="phone" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="social">
                Socials
              </TabsTrigger>
            </TabsList>

            <TabsContent value="phone">
              {step === 'phone' ? (
            <>
              <h2 className="text-2xl font-serif text-foreground mb-2">{welcomeMessage}</h2>
              <p className="text-muted-foreground font-sans mb-6">Enter your phone number to sign in</p>
              
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div>
                  <Input
                    type="tel"
                    placeholder="07123 456789"
                    value={phone}
                    onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                    maxLength={14}
                    className="text-center text-lg font-sans"
                    data-testid="input-phone"
                    disabled={loading}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-brand-accent hover:bg-brand-accent-light text-white font-sans py-3"
                  disabled={loading}
                  data-testid="button-send-code"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Sending code...
                    </div>
                  ) : (
                    "Send verification code"
                  )}
                </Button>
              </form>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-serif text-foreground mb-2">Enter Code</h2>
              <p className="text-muted-foreground font-sans mb-6">
                We sent a code to {phone}
              </p>
              
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div>
                  <Input
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    className="text-center text-2xl font-mono tracking-widest"
                    data-testid="input-otp"
                    disabled={loading}
                  />
                </div>
                
                <Button 
                  type="submit" 
                  className="w-full bg-brand-accent hover:bg-brand-accent-light text-white font-sans py-3"
                  disabled={loading}
                  data-testid="button-verify-code"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Verifying...
                    </div>
                  ) : (
                    "Sign in"
                  )}
                </Button>
                
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={handleBack}
                  className="w-full text-muted-foreground hover:text-foreground font-sans"
                  disabled={loading}
                  data-testid="button-back"
                >
                  Use different number
                </Button>
              </form>
            </>
          )}
            </TabsContent>

            <TabsContent value="email">
              {emailStep === 'email' ? (
                <>
                  <h2 className="text-2xl font-serif text-foreground mb-2">{welcomeMessage}</h2>
                  <p className="text-muted-foreground font-sans mb-6">Enter your email to receive a magic link</p>

                  <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <div>
                      <Input
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="text-center text-lg font-sans"
                        data-testid="input-email"
                        disabled={loading}
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-brand-accent hover:bg-brand-accent-light text-white font-sans py-3"
                      disabled={loading}
                      data-testid="button-send-magic-link"
                    >
                      {loading ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Sending magic link...
                        </div>
                      ) : (
                        "Send magic link"
                      )}
                    </Button>
                  </form>
                </>
              ) : (
                <>
                  <h2 className="text-2xl font-serif text-foreground mb-2">Check your email</h2>
                  <p className="text-muted-foreground font-sans mb-6">
                    We sent a magic link to {email}
                  </p>

                  <div className="space-y-4">
                    <div className="bg-muted/50 rounded-lg p-4 text-center">
                      <Mail className="h-12 w-12 mx-auto mb-2 text-brand-accent" />
                      <p className="text-sm text-muted-foreground">
                        Click the link in your email to sign in
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={async () => {
                          setLoading(true)
                          try {
                            await authService.requestEmailMagicLink(email)
                            toast({
                              title: "Magic link resent!",
                              description: "Check your email for the new link",
                              variant: "default"
                            })
                          } catch (error: any) {
                            toast({
                              title: "Error resending",
                              description: error.message || "Please try again",
                              variant: "destructive"
                            })
                          } finally {
                            setLoading(false)
                          }
                        }}
                        className="flex-1"
                        disabled={loading}
                        data-testid="button-resend-magic-link"
                      >
                        {loading ? "Resending..." : "Resend link"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleEmailBack}
                        className="flex-1"
                        data-testid="button-email-back"
                      >
                        Use different email
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="social">
              <h2 className="text-2xl font-serif text-foreground mb-2">Welcome Back</h2>
              <p className="text-muted-foreground font-sans mb-6">Sign in with your social account</p>

              <div className="space-y-3">
                <Button
                  onClick={handleGoogleSignIn}
                  className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 font-sans py-3"
                  disabled={googleLoading}
                  data-testid="button-google-signin"
                >
                  {googleLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
                      Redirecting to Google...
                    </div>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        <path fill="none" d="M1 1h22v22H1z"/>
                      </svg>
                      Continue with Google
                    </>
                  )}
                </Button>

                <Button
                  onClick={handleAppleSignIn}
                  className="w-full bg-black hover:bg-gray-900 text-white border border-gray-800 font-sans py-3"
                  disabled={appleLoading}
                  data-testid="button-apple-signin"
                >
                  {appleLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Redirecting to Apple...
                    </div>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                      </svg>
                      Continue with Apple
                    </>
                  )}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}