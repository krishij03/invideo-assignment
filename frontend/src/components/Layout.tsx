import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { FileText, Image, Palette, Library, Sparkles, Menu, X, LogOut, User, Crown } from 'lucide-react';
import { useAuth } from '../lib/auth';

const navItems = [
  { to: '/script', icon: FileText, label: 'Script' },
  { to: '/thumbnail', icon: Image, label: 'Thumbnail' },
  { to: '/editor', icon: Palette, label: 'Editor' },
  { to: '/library', icon: Library, label: 'Library' },
];

export function Layout() {
  const navigate = useNavigate();
  const { user, usage, signOut, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Format remaining count
  const formatRemaining = (remaining: number | 'unlimited') => {
    if (remaining === 'unlimited') return '∞';
    return remaining;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
                <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              </div>
              <span className="text-lg sm:text-xl font-bold text-slate-50 tracking-tight">
                <span className="hidden sm:inline">InVideo AI Studio</span>
                <span className="sm:hidden">InVideo</span>
              </span>
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-slate-800 text-slate-50'
                        : 'text-slate-400 hover:text-slate-50 hover:bg-slate-800/50'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>

            {/* User Menu */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Usage Stats (Desktop) */}
              {isAuthenticated && usage && (
                <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 bg-slate-800/50 rounded-lg text-xs">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-violet-400" />
                    <span className="text-slate-400">Scripts:</span>
                    <span className="text-white font-medium">{formatRemaining(usage.scripts.remaining)}</span>
                  </div>
                  <div className="w-px h-4 bg-slate-700" />
                  <div className="flex items-center gap-1.5">
                    <Image className="w-3.5 h-3.5 text-pink-400" />
                    <span className="text-slate-400">Images:</span>
                    <span className="text-white font-medium">{formatRemaining(usage.images.remaining)}</span>
                  </div>
                </div>
              )}

              {/* User Dropdown */}
              {isAuthenticated && user && (
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                      {user.is_admin ? (
                        <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                      ) : (
                        <User className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-white" />
                      )}
                    </div>
                    <span className="hidden sm:block text-sm text-slate-200 max-w-[100px] truncate">
                      {user.username}
                    </span>
                  </button>

                  {userMenuOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40" 
                        onClick={() => setUserMenuOpen(false)} 
                      />
                      <div className="absolute right-0 mt-2 w-64 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                        {/* User Info */}
                        <div className="px-4 py-3 border-b border-slate-700">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-white truncate">{user.email}</p>
                            {user.is_admin && (
                              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-medium rounded">
                                ADMIN
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">@{user.username}</p>
                        </div>

                        {/* Usage Stats */}
                        {usage && (
                          <div className="px-4 py-3 border-b border-slate-700">
                            <p className="text-xs text-slate-500 mb-2">Usage</p>
                            <div className="space-y-2">
                              <div>
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-slate-400">Scripts</span>
                                  <span className="text-white">
                                    {usage.scripts.used} / {usage.scripts.limit ?? '∞'}
                                  </span>
                                </div>
                                {usage.scripts.limit && (
                                  <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-violet-500 rounded-full transition-all"
                                      style={{ width: `${Math.min(100, (usage.scripts.used / usage.scripts.limit) * 100)}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="flex items-center justify-between text-xs mb-1">
                                  <span className="text-slate-400">Images</span>
                                  <span className="text-white">
                                    {usage.images.used} / {usage.images.limit ?? '∞'}
                                  </span>
                                </div>
                                {usage.images.limit && (
                                  <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-pink-500 rounded-full transition-all"
                                      style={{ width: `${Math.min(100, (usage.images.used / usage.images.limit) * 100)}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Sign Out */}
                        <button
                          onClick={handleSignOut}
                          className="w-full px-4 py-3 flex items-center gap-2 text-sm text-red-400 hover:bg-slate-700/50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-400 hover:text-slate-50 hover:bg-slate-800 transition-colors"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-800 bg-slate-900/95 backdrop-blur-sm">
            {/* Mobile Usage Stats */}
            {isAuthenticated && usage && (
              <div className="px-4 py-3 border-b border-slate-800">
                <div className="flex items-center justify-around">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-violet-400" />
                    <span className="text-xs text-slate-400">Scripts:</span>
                    <span className="text-sm text-white font-medium">{formatRemaining(usage.scripts.remaining)}</span>
                  </div>
                  <div className="w-px h-6 bg-slate-700" />
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4 text-pink-400" />
                    <span className="text-xs text-slate-400">Images:</span>
                    <span className="text-sm text-white font-medium">{formatRemaining(usage.images.remaining)}</span>
                  </div>
                </div>
              </div>
            )}
            
            <nav className="px-4 py-3 space-y-1">
              {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-slate-800 text-slate-50'
                        : 'text-slate-400 hover:text-slate-50 hover:bg-slate-800/50'
                    }`
                  }
                >
                  <Icon className="w-5 h-5" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          <Outlet />
        </div>
      </main>

      {/* Footer - hidden on mobile */}
      <footer className="hidden sm:block border-t border-slate-800 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-slate-500">
            Powered by Elixir Phoenix + React + Rust WASM + Gemini AI
          </p>
        </div>
      </footer>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 z-50">
        <div className="flex justify-around items-center h-16 px-2">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-all min-w-[60px] ${
                  isActive
                    ? 'text-violet-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Bottom padding for mobile nav */}
      <div className="md:hidden h-16" />
    </div>
  );
}
