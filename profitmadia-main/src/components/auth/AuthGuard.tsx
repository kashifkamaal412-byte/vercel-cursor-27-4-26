import { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, X, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
  action?: string;
}

export const AuthGuard = ({ children, fallback, action = 'continue' }: AuthGuardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showPrompt, setShowPrompt] = useState(false);

  if (user) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <>
      <div onClick={() => setShowPrompt(true)} className="cursor-pointer">
        {children}
      </div>
      
      <AnimatePresence>
        {showPrompt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
            onClick={() => setShowPrompt(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="relative glass rounded-3xl p-8 max-w-sm w-full text-center border border-primary/20 shadow-2xl"
            >
              <button
                onClick={() => setShowPrompt(false)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
              
              <motion.div 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg"
              >
                <Sparkles className="w-10 h-10 text-primary-foreground" />
              </motion.div>
              
              <motion.h3 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-xl font-bold text-foreground mb-2"
              >
                Join the Community
              </motion.h3>
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-muted-foreground mb-8 leading-relaxed"
              >
                Sign in to <span className="text-primary font-medium">{action}</span> and unlock all features
              </motion.p>
              
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="flex flex-col gap-3"
              >
                <Button
                  variant="glow"
                  size="lg"
                  className="w-full gap-2 text-base"
                  onClick={() => navigate('/auth')}
                >
                  <LogIn className="w-5 h-5" />
                  Sign In
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="w-full text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPrompt(false)}
                >
                  Maybe Later
                </Button>
              </motion.div>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-xs text-muted-foreground mt-6"
              >
                Free to join • Your data stays safe
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
