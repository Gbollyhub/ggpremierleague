import { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import Logo from '@/components/ui/Logo';
import {
  IconUsers, IconTrophy, IconCalendar, IconShield, IconChart, IconShuffle,
  IconLock, IconLogout, IconSun, IconMoon, IconSettings, IconMenu, IconX, IconCompare, IconXI,
} from '@/components/ui/Icons';

const NAV_PUBLIC = [
  { label: 'Players',     Icon: IconUsers,    path: '/' },
  { label: 'Compare',     Icon: IconCompare,  path: '/compare' },
  { label: 'Team Sheets', Icon: IconShield,   path: '/team-sheets' },
  { label: 'Game Weeks',  Icon: IconCalendar, path: '/game-weeks' },
  { label: 'Leaderboard', Icon: IconTrophy,   path: '/leaderboard' },
  { label: 'Season XI',   Icon: IconXI,       path: '/season-xi' },
];

const NAV_ADMIN = [
  { id: 'dashboard',  label: 'Dashboard',        Icon: IconChart },
  { id: 'playerMgmt', label: 'Manage Players',   Icon: IconUsers },
  { id: 'teamGen',    label: 'Team Generator',   Icon: IconShuffle },
  { id: 'gwManager',  label: 'GW Manager',       Icon: IconCalendar },
];

const ADMIN_PAGES = ['dashboard', 'playerMgmt', 'teamGen', 'gwManager'];

function isPublicNavActive(item, pathname) {
  if (item.path === '/') return pathname === '/' || pathname.startsWith('/players');
  return pathname.startsWith(item.path);
}

export default function TopBar() {
  const { currentPage, setPage, isAdmin, logout, darkMode, toggleTheme, addToast } = useStore();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [adminOpen, setAdminOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setAdminOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Navigate to a public URL; exit admin mode first if needed.
  const goPublic = (path) => {
    if (ADMIN_PAGES.includes(currentPage)) setPage('players');
    navigate(path);
    setMobileOpen(false);
  };

  const isAdminTab = NAV_ADMIN.some((n) => n.id === currentPage);

  return (
    <header style={{ background: 'var(--gpl-surface)' }} className="border-b border-gpl sticky top-0 z-50">
      {/* Top row */}
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">

          {/* Left: mobile menu + theme */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-gpl-muted hover:text-gpl-secondary transition-colors"
            >
              {mobileOpen ? <IconX className="w-5 h-5" /> : <IconMenu className="w-5 h-5" />}
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gpl-muted hover:text-gpl-secondary transition-colors"
              title={darkMode ? 'Light mode' : 'Dark mode'}
            >
              {darkMode ? <IconSun className="w-4.5 h-4.5" /> : <IconMoon className="w-4.5 h-4.5" />}
            </button>
          </div>

          {/* Center: Logo */}
          <button
            onClick={() => goPublic('/')}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <Logo size={36} />
            <div className="hidden sm:block text-left">
              <div className="text-sm font-black text-gpl tracking-tight leading-tight">George Green</div>
              <div className="text-[10px] text-gpl-muted uppercase tracking-[0.2em] leading-tight">Premier League</div>
            </div>
          </button>

          {/* Right: Admin */}
          <div className="flex items-center gap-2" ref={dropdownRef}>
            {isAdmin ? (
              <div className="relative">
                <button
                  onClick={() => setAdminOpen(!adminOpen)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isAdminTab || adminOpen
                      ? 'bg-blue-600 text-white'
                      : 'text-gpl-muted hover:text-gpl-secondary hover:bg-gpl-inset'
                  }`}
                >
                  <IconSettings className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                </button>

                {adminOpen && (
                  <div className="absolute right-0 top-full mt-2 w-52 gpl-card-solid rounded-xl shadow-xl overflow-hidden py-1 z-50">
                    {NAV_ADMIN.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => { setPage(item.id); setAdminOpen(false); }}
                        className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium transition-colors text-left ${
                          currentPage === item.id
                            ? 'text-blue-600 bg-blue-50 dark:bg-blue-500/10'
                            : 'text-gpl-secondary hover:bg-gpl-inset'
                        }`}
                      >
                        <item.Icon className="w-4 h-4 flex-shrink-0" />
                        {item.label}
                      </button>
                    ))}
                    <div className="border-t border-gpl my-1" />
                    <button
                      onClick={() => {
                        logout();
                        setPage('players');
                        navigate('/');
                        addToast('Logged out', 'info');
                        setAdminOpen(false);
                      }}
                      className="flex items-center gap-2.5 w-full px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors text-left"
                    >
                      <IconLogout className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setPage('login')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === 'login'
                    ? 'bg-blue-600 text-white'
                    : 'text-gpl-muted hover:text-gpl-secondary hover:bg-gpl-inset'
                }`}
              >
                <IconLock className="w-4 h-4" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Public nav — desktop */}
      <div className="hidden md:block border-t border-gpl">
        <div className="max-w-7xl mx-auto px-4">
          <nav className="flex items-center gap-1 py-2 overflow-x-auto">
            {NAV_PUBLIC.map((item) => {
              const active = isPublicNavActive(item, pathname);
              return (
                <button
                  key={item.path}
                  onClick={() => goPublic(item.path)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all whitespace-nowrap ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gpl-secondary hover:bg-gpl-inset hover:text-gpl'
                  }`}
                >
                  <item.Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gpl" style={{ background: 'var(--gpl-surface)' }}>
          <div className="px-4 py-3 space-y-1">
            {NAV_PUBLIC.map((item) => {
              const active = isPublicNavActive(item, pathname);
              return (
                <button
                  key={item.path}
                  onClick={() => goPublic(item.path)}
                  className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? 'bg-blue-600 text-white'
                      : 'text-gpl-secondary hover:bg-gpl-inset'
                  }`}
                >
                  <item.Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
            {isAdmin && (
              <>
                <div className="border-t border-gpl my-2" />
                <div className="text-[10px] font-bold uppercase tracking-widest text-gpl-muted px-3 py-1">Admin</div>
                {NAV_ADMIN.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => { setPage(item.id); setMobileOpen(false); }}
                    className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      currentPage === item.id
                        ? 'bg-blue-600 text-white'
                        : 'text-gpl-secondary hover:bg-gpl-inset'
                    }`}
                  >
                    <item.Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
