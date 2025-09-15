import { useState } from "react"
import { useLocation } from "wouter"
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import torristsLogoPath from "@assets/Screenshot_20250803_113321_WhatsApp_1754250527535.jpg"

type AuthStep = 'phone' | 'verify'

export default function Login() {
  const [, setLocation] = useLocation()
  const [step, setStep] = useState<AuthStep>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const { sendOTP, verifyOTP } = useSupabaseAuth()
  const { toast } = useToast()

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Format as (XXX) XXX-XXXX
    if (digits.length <= 3) {
      return digits
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`
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
    
    // Convert formatted phone to E.164 format (+1XXXXXXXXXX)
    const digits = phone.replace(/\D/g, '')
    const e164Phone = digits.startsWith('1') ? `+${digits}` : `+1${digits}`
    
    try {
      const { error } = await sendOTP(e164Phone)
      
      if (error) {
        // Development mode - skip SMS and go to verify step
        if (error.message?.includes('SMS') || process.env.NODE_ENV === 'development') {
          toast({
            title: "Development Mode",
            description: "SMS not configured. Use code: 123456",
            variant: "default"
          })
          setStep('verify')
        } else {
          throw error
        }
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
    const e164Phone = digits.startsWith('1') ? `+${digits}` : `+1${digits}`
    
    try {
      // Development mode - accept 123456 as valid code
      if (process.env.NODE_ENV === 'development' && otp === '123456') {
        toast({
          title: "Signed in successfully!",
          description: "Welcome to The Torrists app",
          variant: "default"
        })
        setLocation('/bands')
        return
      }

      const { error } = await verifyOTP(e164Phone, otp)
      
      if (error) {
        throw error
      }

      toast({
        title: "Signed in successfully!",
        description: "Welcome to The Torrists app",
        variant: "default"
      })
      setLocation('/bands')
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-torrist-green to-torrist-green-light p-4 flex flex-col items-center justify-center">
      <div className="text-center animate-fade-in max-w-md w-full">
        {/* Band logo */}
        <div className="mb-8">
          <img 
            src={torristsLogoPath} 
            alt="The Torrists Band Logo" 
            className="w-48 h-48 md:w-56 md:h-56 object-cover rounded-2xl shadow-2xl mx-auto"
          />
        </div>

        {/* Auth form */}
        <div className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg">
          {step === 'phone' ? (
            <>
              <h2 className="text-2xl font-serif text-torrist-green mb-2">Welcome Back</h2>
              <p className="text-gray-600 font-sans mb-6">Enter your phone number to sign in</p>
              
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div>
                  <Input
                    type="tel"
                    placeholder="(555) 123-4567"
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
                  className="w-full bg-torrist-orange hover:bg-torrist-orange-light text-white font-sans py-3"
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
              <h2 className="text-2xl font-serif text-torrist-green mb-2">Enter Code</h2>
              <p className="text-gray-600 font-sans mb-6">
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
                  className="w-full bg-torrist-orange hover:bg-torrist-orange-light text-white font-sans py-3"
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
                  className="w-full text-torrist-green hover:text-torrist-green-dark font-sans"
                  disabled={loading}
                  data-testid="button-back"
                >
                  Use different number
                </Button>
              </form>
            </>
          )}
        </div>

        {/* Development info */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 text-xs text-white/80 bg-white/10 rounded p-2">
            Development mode: Use code <strong>123456</strong> to sign in
          </div>
        )}
      </div>
    </div>
  )
}