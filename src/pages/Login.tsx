import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import DbStatus from '@/components/DbStatus';
import logo from '@/assets/logo.png';

const Login = () => {
  const { login, dbConnected, settings, users } = useData();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const result = await login(username, password);
    if (!result.success) setError(result.error || 'Login failed');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute bottom-0 left-0 w-[50%] max-w-[500px] pointer-events-none z-0 opacity-90">
        <img src={logo} alt="" className="w-full h-auto" referrerPolicy="no-referrer" />
      </div>
      <div className="w-full max-w-sm animate-fade-in relative z-10">
        <div className="bg-card rounded-2xl shadow-lg border border-border p-8">
          <div className="flex flex-col items-center mb-6">
            <img src={logo} alt={settings.name} className="w-28 h-28 object-contain mb-3" referrerPolicy="no-referrer" />
            <h1 className="font-display text-2xl font-bold text-foreground">{settings.name}</h1>
            <p className="text-muted-foreground text-sm mt-1">Point of Sale System</p>
            <div className="mt-2"><DbStatus connected={dbConnected} /></div>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Username</label>
              <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                placeholder="Enter username" autoFocus />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground block mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                placeholder="Enter password" />
            </div>
            {error && <p className="text-destructive text-sm text-center">{error}</p>}
            <button type="submit"
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
              Sign In
            </button>
          </form>

          {/* Temporary Development Login Section */}
          {users && users.length > 0 && (
            <div className="mt-6 pt-5 border-t border-border">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5 text-center">
                Development Quick Access
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {users.map(user => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={async () => {
                      setError('');
                      const result = await login(user.username, '_dev_bypass_');
                      if (!result.success) {
                        setError(result.error || 'Quick login failed');
                      }
                    }}
                    className="flex flex-col items-start px-3 py-2 rounded-lg border border-border bg-muted/40 hover:bg-muted font-medium text-foreground text-left transition-colors cursor-pointer"
                  >
                    <span className="font-semibold truncate w-full">{user.username}</span>
                    <span className="text-[10px] text-primary font-bold uppercase tracking-wide">
                      {user.role === 'admin' ? 'Admin' : 'Cashier'}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;
