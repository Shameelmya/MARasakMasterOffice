import { useState, useEffect, FormEvent } from 'react';
import { Shield, ChevronRight, User as UserIcon, Key } from 'lucide-react';
import { User as UserType } from '../types';
import { ISLAMIC_QUOTES } from '../utils/constants';
import { LiveClock } from '../components/Shared/LiveClock';

interface LoginScreenProps {
  onLogin: (user: UserType) => void;
  users: UserType[];
}

export function LoginScreen({ onLogin, users }: LoginScreenProps) {
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPass, setShowPass] = useState(false);
  const activeUsers = users.filter(u => u.enabled);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!selectedUser) {
      setError('Please select a profile to continue');
      return;
    }

    if (selectedUser.pass === password) {
      onLogin(selectedUser);
    } else {
      setError('Incorrect Password. Please check and try again.');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col justify-start items-center font-['Outfit'] bg-[#F4F7FB] text-slate-800">
      
      {/* Subtle light ambient blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none opacity-60">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-200/40 blur-[120px]"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-fuchsia-200/30 blur-[150px]"></div>
      </div>



      <div className="flex-1 w-full flex items-center justify-center p-4 sm:p-6 md:p-10 z-10">
        
        {/* Main Login Card Wrapper */}
        <div className="bg-white/90 backdrop-blur-2xl rounded-[32px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] border border-white max-w-5xl w-full overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[450px] transition-all">
          
          {/* Left Column: Premium Corporate Purple Gradient */}
          <div className="md:col-span-5 col-span-1 bg-[#3B0764] text-white flex flex-col justify-end items-center relative overflow-hidden">
            
            <div className="absolute inset-0 z-10 w-full h-full">
              <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
            </div>

          </div>

          {/* Right Column */}
          <div className="md:col-span-7 p-8 sm:p-10 md:p-12 flex flex-col justify-center bg-white relative">
            <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
              <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-bold text-[10px] sm:text-xs text-slate-600 shadow-sm transition-all">
                <LiveClock className="text-slate-600 flex items-center justify-center gap-1.5" />
              </div>
            </div>

            <div className="w-full max-w-md mx-auto mt-4 sm:mt-0">
              
              {/* Profile Cards Selection Grid */}
              {!selectedUser ? (
                <div className="space-y-8">
                  <div className="mb-8 text-left">
                    <h3 className="text-3xl font-bold text-slate-900 tracking-tight leading-tight">
                      Sign In
                    </h3>
                    <p className="text-slate-500 mt-2 text-sm font-medium">Select your profile to access the system</p>
                  </div>

                  {/* Profile Cards list - exact match with 2-column gap-2 spacing */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeUsers.map(u => {
                      const isAdmin = u.role === 'admin';
                      return (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setSelectedUser(u);
                            setPassword('');
                            setError('');
                          }}
                          className={`w-full p-5 flex items-center gap-5 border rounded-[28px] text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_12px_24px_rgba(0,0,0,0.06)] cursor-pointer group ${
                            isAdmin 
                              ? 'bg-purple-50/50 border-purple-100 hover:bg-purple-50 hover:border-purple-200' 
                              : 'bg-slate-50 border-slate-100 hover:bg-slate-100'
                          }`}
                        >
                          {/* Profile rounded icon area */}
                          <div className={`h-14 w-14 rounded-[20px] flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110 ${
                            isAdmin ? 'bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white' : 'bg-white text-slate-400 border border-slate-200'
                          }`}>
                            {isAdmin ? <Shield size={24} /> : <UserIcon size={24} />}
                          </div>
                          
                          {/* Profile name and tag details */}
                          <div className="flex-1 min-w-0">
                            <p className="text-lg font-bold text-slate-800 tracking-tight whitespace-normal break-words leading-tight mb-1.5">
                              {u.name}
                            </p>
                            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-widest block">
                              {isAdmin ? 'Super Admin' : 'Officer Login'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Password Entrance Frame (Exact Match to Screens) */
                <div className="space-y-6 animate-in fade-in duration-300">
                  
                  {/* Pill Back Button */}
                  <div className="flex justify-start">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUser(null);
                        setPassword('');
                        setError('');
                      }}
                      className="bg-slate-50 hover:bg-slate-100 text-slate-600 transition-all px-4 py-2 rounded-xl text-xs font-bold cursor-pointer tracking-wide border border-slate-200 shadow-sm"
                    >
                      ← Back
                    </button>
                  </div>

                  {/* Profile Indicator Card */}
                  <div className="bg-slate-50 border border-slate-100 p-5 rounded-[28px] flex items-center gap-5 shadow-sm">
                    <div className="h-14 w-14 rounded-[20px] flex items-center justify-center shrink-0 bg-gradient-to-br from-purple-600 to-fuchsia-600 text-white shadow-sm">
                      {selectedUser.role === 'admin' ? <Shield size={24} /> : <UserIcon size={24} />}
                    </div>
                    <div className="text-left">
                      <h4 className="font-bold text-slate-800 text-lg leading-tight">
                        {selectedUser.name}
                      </h4>
                      <p className="text-sm font-medium text-slate-500 mt-1">
                        Enter passcode
                      </p>
                    </div>
                  </div>

                  {/* Error Notification Alert */}
                  {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-2xl text-sm font-semibold leading-normal shadow-sm">
                      {error}
                    </div>
                  )}

                  {/* Password Entry Area */}
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="relative group">
                      <input 
                        type={showPass ? 'text' : 'password'} 
                        placeholder="••••••••••••" 
                        value={password} 
                        onChange={e => {
                          setPassword(e.target.value);
                          setError('');
                        }}
                        autoFocus
                        className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-[24px] font-bold text-slate-800 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-lg tracking-widest text-center sm:text-left shadow-inner placeholder:text-slate-300" 
                      />
                      
                      {password && (
                        <button 
                          type="button" 
                          onClick={() => setShowPass(!showPass)} 
                          className="absolute right-5 top-1/2 -translate-y-1/2 text-sm font-bold text-purple-600 hover:text-purple-700 outline-none cursor-pointer px-3 py-1 bg-purple-50 rounded-lg"
                        >
                          {showPass ? 'Hide' : 'Show'}
                        </button>
                      )}
                    </div>

                    <button 
                      type="submit" 
                      className="w-full bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 active:scale-[0.98] text-white font-bold py-5 px-6 rounded-[24px] transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-[0.15em] cursor-pointer shadow-[0_8px_20px_rgba(147,51,234,0.25)] mt-8"
                    >
                      <span>Secure Login</span>
                      <ChevronRight size={18} className="text-purple-100" />
                    </button>
                  </form>

                </div>
              )}

              {/* Spacing alignment */}
              <div className="pt-2"></div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

