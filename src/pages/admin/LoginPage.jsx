import { useState } from 'react';
import { useStore } from '@/store/useStore';
import { IconLock } from '@/components/ui/Icons';
import Logo from '@/components/ui/Logo';

export default function LoginPage() {
  const { login, setPage, addToast } = useStore();
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');

  const handleLogin = () => {
    if (login(email, pass)) {
      addToast('Logged in successfully', 'success');
      setPage('dashboard');
    } else {
      addToast('Invalid credentials', 'error');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 sm:mt-20">
      <div className="gpl-card p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4"><Logo size={56} /></div>
          <h2 className="text-2xl font-bold text-gpl">Admin Login</h2>
          {/* <p className="text-xs text-gpl-muted mt-2">admin@gpl.com / admin123</p> */}
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gpl-muted block mb-1.5 font-medium">Email</label>
            <input type="email" placeholder="user@domain.com" value={email} onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl gpl-input text-sm" onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
          </div>
          <div>
            <label className="text-xs text-gpl-muted block mb-1.5 font-medium">Password</label>
            <input type="password" placeholder="••••••••" value={pass} onChange={(e) => setPass(e.target.value)}
              className="w-full px-4 py-3 rounded-xl gpl-input text-sm" onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
          </div>
          <button onClick={handleLogin}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-colors text-sm">
            Sign In
          </button>
        </div>
      </div>
    </div>
  );
}
