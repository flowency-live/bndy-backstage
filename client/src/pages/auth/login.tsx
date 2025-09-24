import { useState } from "react"
import { useLocation } from "wouter"
import { useServerAuth } from "@/hooks/useServerAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import BndyLogo from "@/components/ui/bndy-logo"
import { useForceDarkMode } from "@/hooks/use-force-dark-mode"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Phone, Mail } from "lucide-react"

type AuthStep = 'phone' | 'verify'

export default function Login() {
  // Force dark mode for branding consistency
  useForceDarkMode()
  
  const [, setLocation] = useLocation()
  const [step, setStep] = useState<AuthStep>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  // Server auth handles authentication server-side
  const { toast } = useToast()

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
      console.log('🔍 CLAUDE DEBUG: Login calling verifyOTP', { e164Phone, otp })
      const { data, error } = await verifyOTP(e164Phone, otp)
      console.log('🔍 CLAUDE DEBUG: Login verifyOTP result', { data, error })

      if (error) {
        throw error
      }

      console.log('🔍 CLAUDE DEBUG: Login success')

      toast({
        title: "Signed in successfully!",
        description: "Welcome to bndy",
        variant: "default"
      })

      console.log('🔍 CLAUDE DEBUG: About to redirect to /dashboard')
      setLocation('/dashboard')
      console.log('🔍 CLAUDE DEBUG: setLocation called with /dashboard')
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
    try {
      console.log('🔧 LOGIN: Starting server-side Google OAuth');

      // Redirect to backend OAuth endpoint
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.bndy.co.uk';
      const oauthUrl = `${apiBaseUrl}/auth/google`;

      console.log('🔧 LOGIN: Redirecting to:', oauthUrl);
      window.location.href = oauthUrl;

    } catch (error) {
      console.error('🔧 LOGIN: Google OAuth redirect failed:', error);
      toast({
        title: "Google sign in failed",
        description: "Unable to start authentication process",
        variant: "destructive"
      });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-subtle p-4 flex flex-col items-center justify-center">
      <div className="text-center animate-fade-in max-w-md w-full">
        {/* Band logo */}
        <div className="mb-4 sm:mb-8" data-testid="logo-container">
          <div className="w-32 h-32 sm:w-48 sm:h-48 md:w-56 md:h-56 flex items-center justify-center mx-auto">
            <BndyLogo 
              className="w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40"
              holeColor="rgb(30 41 59)" 
            />
          </div>
        </div>

        {/* Auth form with tabs */}
        <div className="bg-card rounded-xl p-6 shadow-lg border border-border">
          <Tabs defaultValue="phone" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </TabsTrigger>
              <TabsTrigger value="social" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Social
              </TabsTrigger>
            </TabsList>

            <TabsContent value="phone">
              {step === 'phone' ? (
            <>
              <h2 className="text-2xl font-serif text-foreground mb-2">Welcome Back</h2>
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

            <TabsContent value="social">
              <h2 className="text-2xl font-serif text-foreground mb-2">Welcome Back</h2>
              <p className="text-muted-foreground font-sans mb-6">Sign in with your social account</p>

              <div className="space-y-3">
                <Button
                  onClick={handleGoogleSignIn}
                  className="w-full bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 font-sans py-3"
                  disabled={loading}
                  data-testid="button-google-signin"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    <path fill="none" d="M1 1h22v22H1z"/>
                  </svg>
                  Continue with Google
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>

      </div>
    </div>
  )
}