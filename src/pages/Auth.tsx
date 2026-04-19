import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, Phone, ArrowRight, Eye, EyeOff, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { lovable } from '@/integrations/lovable/index';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { z } from 'zod';

const emailSchema = z.string().email('Invalid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

type AuthMode = 'signin' | 'signup' | 'phone';

const Auth = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp, signInWithGoogle, signInWithPhone, verifyOtp } = useAuth();
  
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; phone?: string }>({});

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const validateForm = () => {
    const newErrors: typeof errors = {};
    
    if (mode !== 'phone') {
      const emailResult = emailSchema.safeParse(email);
      if (!emailResult.success) {
        newErrors.email = emailResult.error.errors[0].message;
      }
      
      const passwordResult = passwordSchema.safeParse(password);
      if (!passwordResult.success) {
        newErrors.password = passwordResult.error.errors[0].message;
      }
    } else {
      if (!phone || phone.length < 10) {
        newErrors.phone = 'Please enter a valid phone number';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    if (mode === 'signin') {
      await signIn(email, password);
    } else {
      await signUp(email, password, { display_name: displayName || undefined });
    }
    setLoading(false);
  };

  const handlePhoneAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    if (!showOtpInput) {
      const { error } = await signInWithPhone(phone);
      if (!error) setShowOtpInput(true);
    } else {
      await verifyOtp(phone, otp);
    }
    setLoading(false);
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    await signInWithGoogle();
    setLoading(false);
  };

  const handleAppleAuth = async () => {
    setLoading(true);
    const { error } = await lovable.auth.signInWithOAuth('apple', {
      redirect_uri: window.location.origin,
    });
    if (error) {
      const { toast: toastFn } = await import('sonner');
      toastFn.error((error as Error).message || 'Apple sign-in failed');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-primary/20 via-transparent to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-accent/20 via-transparent to-transparent rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        {/* Glass card */}
        <div className="glass rounded-3xl p-8 backdrop-blur-xl border border-glass-border">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', bounce: 0.5 }}
              className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center"
            >
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </motion.div>
            <h1 className="text-2xl font-bold text-foreground">
              {mode === 'signin' ? 'Welcome Back' : mode === 'signup' ? 'Create Account' : 'Phone Login'}
            </h1>
            <p className="text-muted-foreground mt-1">
              {mode === 'signin' ? 'Sign in to continue' : mode === 'signup' ? 'Join the community' : 'Quick & secure access'}
            </p>
          </div>

          {/* Auth Mode Tabs */}
          <div className="flex gap-2 mb-6 p-1 rounded-xl bg-muted/50">
            {(['signin', 'signup', 'phone'] as AuthMode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setErrors({});
                  setShowOtpInput(false);
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  mode === m
                    ? 'bg-primary text-primary-foreground shadow-lg'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {m === 'signin' ? 'Sign In' : m === 'signup' ? 'Sign Up' : 'Phone'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {mode !== 'phone' ? (
              <motion.form
                key="email-form"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleEmailAuth}
                className="space-y-4"
              >
                {mode === 'signup' && (
                  <div className="space-y-2">
                    <Label htmlFor="displayName">Display Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                      <Input
                        id="displayName"
                        type="text"
                        placeholder="Your name"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="pl-10 h-12 bg-muted/50 border-glass-border"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 bg-muted/50 border-glass-border"
                    />
                  </div>
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-12 bg-muted/50 border-glass-border"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>

                <Button
                  type="submit"
                  variant="glow"
                  className="w-full h-12 text-base"
                  disabled={loading}
                >
                  {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.form>
            ) : (
              <motion.form
                key="phone-form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onSubmit={handlePhoneAuth}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 234 567 8900"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10 h-12 bg-muted/50 border-glass-border"
                      disabled={showOtpInput}
                    />
                  </div>
                  {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
                </div>

                {showOtpInput && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2"
                  >
                    <Label htmlFor="otp">Verification Code</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="Enter 6-digit code"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      className="h-12 bg-muted/50 border-glass-border text-center text-2xl tracking-widest"
                      maxLength={6}
                    />
                  </motion.div>
                )}

                <Button
                  type="submit"
                  variant="glow"
                  className="w-full h-12 text-base"
                  disabled={loading}
                >
                  {loading ? 'Loading...' : showOtpInput ? 'Verify Code' : 'Send OTP'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-glass-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="glass"
              className="w-full h-12"
              onClick={handleGoogleAuth}
              disabled={loading}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Continue with Google
            </Button>

            <Button
              type="button"
              variant="glass"
              className="w-full h-12"
              onClick={handleAppleAuth}
              disabled={loading}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
              </svg>
              Continue with Apple
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
