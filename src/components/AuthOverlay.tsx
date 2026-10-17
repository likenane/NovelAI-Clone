import React from 'react';
import { motion } from 'motion/react';
import { User, Sparkles } from 'lucide-react';

interface AuthOverlayProps {
  isAuthReady: boolean;
  user: any;
  handleLogin: () => void;
}

export const AuthOverlay: React.FC<AuthOverlayProps> = ({ isAuthReady, user, handleLogin }) => {
  if (!isAuthReady) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-zinc-950 text-zinc-400 font-sans">
        <motion.div 
          animate={{ opacity: [0.5, 1, 0.5] }} 
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          Initializing...
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 font-sans p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <div className="space-y-2">
            <div className="flex justify-center">
              <div className="p-4 bg-zinc-900 rounded-2xl border border-zinc-800 shadow-2xl">
                <Sparkles className="w-12 h-12 text-indigo-500" />
              </div>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">AI Novelist Studio</h1>
            <p className="text-zinc-400">Your AI-powered writing companion. Start your next masterpiece today.</p>
          </div>
          
          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-zinc-100 text-zinc-950 py-4 px-6 rounded-xl font-medium hover:bg-white transition-all active:scale-[0.98] shadow-lg"
          >
            <User className="w-5 h-5" />
            Sign in with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return null;
};
