import { useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { LogOut, User as UserIcon, Users, Shield, Home, BarChart3, Calendar } from 'lucide-react';
import { resolveAssetUrl } from '../lib/utils';
import { profileAPI, teamsAPI } from '../lib/api';
import PushInstallPrompt from './PushInstallPrompt';
import TeamVoteLogo from './TeamVoteLogo';

interface Organization {
  id: number;
  name: string;
  short_name?: string | null;
  logo?: string;
  timezone: string;
  setup_completed: number;
}

interface LayoutProps {
  organization?: Organization | null;
}

export default function Layout({ organization }: LayoutProps) {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const prefersReducedMotion = useReducedMotion();
  const organizationName = organization?.name || 'Dein Verein';
  const organizationLogo = organization?.logo;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.scrollingElement?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      document.getElementById('root')?.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.pathname]);

  const { data: teams } = useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await teamsAPI.getAll();
      return response.data;
    },
    enabled: user?.role !== 'admin',
    staleTime: Infinity,
  });

  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await profileAPI.getProfile();
      return response.data;
    },
    enabled: !!user,
    staleTime: Infinity,
  });

  const teamsMenuLabel = teams?.length === 1 ? 'Mein Team' : 'Meine Teams';
  const menuProfilePicture = profile?.profile_picture || user?.profile_picture;

  return (
    <div className="min-h-screen bg-gray-900">
      {/* ── Skip to main content (keyboard / screen reader) ── */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[70] focus:top-3 focus:left-3 focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-medium focus:shadow-modal focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
      >
        Zum Hauptinhalt springen
      </a>

      {/* ── Top navigation bar ── */}
      <nav className="relative z-30 border-b border-gray-800/80 bg-gray-900/95 pt-safe shadow-[0_8px_22px_rgba(0,0,0,0.18)] backdrop-blur-xl supports-[backdrop-filter]:bg-gray-900/88">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex justify-between min-h-[3.5rem] sm:h-14">

            {/* Left: Logo + Org */}
            <div className="flex items-center min-w-0 flex-1">
              <Link
                to={user?.role === 'admin' ? '/admin' : '/'}
                className="group flex min-h-11 w-full min-w-0 items-center justify-center gap-2 rounded-xl px-1 py-1 transition-colors hover:bg-gray-800/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900 sm:w-auto sm:justify-start sm:gap-2.5 sm:px-1.5 sm:py-0 sm:-ml-1.5"
                aria-label="Zur Startseite"
              >
                <TeamVoteLogo
                  className="shrink-0"
                  iconClassName="h-8 w-8 rounded-lg sm:h-9 sm:w-9 sm:rounded-xl"
                  textClassName="text-xl sm:text-2xl"
                />
                {organizationLogo && (
                  <>
                    <span className="h-8 w-px shrink-0 bg-gray-700/80 sm:h-9" aria-hidden="true" />
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-gray-700/70 bg-gray-800/70 px-1">
                      <img
                        src={resolveAssetUrl(organizationLogo)}
                        alt="Vereinslogo"
                        className="max-h-6 w-auto object-contain"
                      />
                    </span>
                  </>
                )}
                {organizationName !== 'Dein Verein' && (
                  <span className="min-w-0 flex-1 text-sm font-semibold leading-tight text-gray-100 sm:max-w-[360px] sm:flex-none sm:text-base sm:text-gray-200">
                    <span className="block whitespace-normal break-words sm:whitespace-nowrap sm:truncate">
                      {organizationName}
                    </span>
                  </span>
                )}
                {organizationName === 'Dein Verein' && !organizationLogo && (
                  <span className="sr-only">teamvote+</span>
                )}
              </Link>
            </div>

            {/* Right side */}
            <div className="hidden lg:flex items-center gap-1 shrink-0">

              {/* Desktop nav links */}
              <div className="flex items-center gap-0.5">
                {user?.role !== 'admin' && (
                  <Link
                    to="/"
                    aria-current={isActive('/') ? 'page' : undefined}
                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                      isActive('/') ? 'text-primary-400 bg-gray-700/60 font-semibold' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/40'
                    }`}
                  >
                    <Home className="w-4 h-4" />
                    <span>Dashboard</span>
                  </Link>
                )}
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    aria-current={isActive('/admin') ? 'page' : undefined}
                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                      isActive('/admin') ? 'text-primary-400 bg-gray-700/60 font-semibold' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/40'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>Admin-Panel</span>
                  </Link>
                )}
                {user?.role !== 'admin' && (
                  <Link
                    to="/events"
                    aria-current={isActive('/events') ? 'page' : undefined}
                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                      isActive('/events') ? 'text-primary-400 bg-gray-700/60 font-semibold' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/40'
                    }`}
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Meine Termine</span>
                  </Link>
                )}
                {user?.role !== 'admin' && (
                  <Link
                    to="/meine-tabelle"
                    aria-current={isActive('/meine-tabelle') ? 'page' : undefined}
                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                      isActive('/meine-tabelle') ? 'text-primary-400 bg-gray-700/60 font-semibold' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/40'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>Meine Tabelle</span>
                  </Link>
                )}
                {user?.role !== 'admin' && (
                  <Link
                    to="/teams"
                    aria-current={isActive('/teams') ? 'page' : undefined}
                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
                      isActive('/teams') ? 'text-primary-400 bg-gray-700/60 font-semibold' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/40'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>{teamsMenuLabel}</span>
                  </Link>
                )}
              </div>

              {/* Desktop: Profile */}
              <div className="flex items-center gap-2 pl-2">
                <Link to="/settings" aria-label="Zu den Einstellungen" className="icon-button rounded-full">
                  {menuProfilePicture ? (
                    <img
                      src={resolveAssetUrl(menuProfilePicture)}
                      alt="Profilbild"
                      className="w-8 h-8 rounded-full object-cover border-2 border-gray-600 hover:border-primary-500 transition-colors"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-700 border-2 border-gray-600 hover:border-primary-500 flex items-center justify-center transition-colors">
                      <UserIcon className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                </Link>
              </div>

            </div>
          </div>
        </div>
      </nav>

      {/* ── Page content ── */}
      <main id="main-content" className="max-w-7xl mx-auto px-safe sm:px-6 lg:px-8 pt-4 sm:pt-6 pwa-main-safe">
        <motion.div
          key={location.pathname}
          initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
        >
          <Outlet />
        </motion.div>
      </main>

      <PushInstallPrompt userId={user?.id} />

      {/* ── Mobile bottom tab bar ── */}
      <nav className="bottom-nav lg:hidden" aria-label="Hauptnavigation">
        {user?.role !== 'admin' ? (
          <>
            <Link
              to="/"
              className={`bottom-nav-item ${isActive('/') ? 'active' : ''}`}
              aria-label="Start"
              aria-current={isActive('/') ? 'page' : undefined}
            >
              <Home className="w-5 h-5" strokeWidth={isActive('/') ? 2.5 : 1.8} />
              <span className="bottom-nav-label">Start</span>
            </Link>
            <Link
              to="/events"
              className={`bottom-nav-item ${isActive('/events') ? 'active' : ''}`}
              aria-label="Termine"
              aria-current={isActive('/events') ? 'page' : undefined}
            >
              <Calendar className="w-5 h-5" strokeWidth={isActive('/events') ? 2.5 : 1.8} />
              <span className="bottom-nav-label">Termine</span>
            </Link>
            <Link
              to="/teams"
              className={`bottom-nav-item ${isActive('/teams') ? 'active' : ''}`}
              aria-label="Teams"
              aria-current={isActive('/teams') ? 'page' : undefined}
            >
              <Users className="w-5 h-5" strokeWidth={isActive('/teams') ? 2.5 : 1.8} />
              <span className="bottom-nav-label">Teams</span>
            </Link>
            <Link
              to="/meine-tabelle"
              className={`bottom-nav-item ${isActive('/meine-tabelle') ? 'active' : ''}`}
              aria-label="Tabelle"
              aria-current={isActive('/meine-tabelle') ? 'page' : undefined}
            >
              <BarChart3 className="w-5 h-5" strokeWidth={isActive('/meine-tabelle') ? 2.5 : 1.8} />
              <span className="bottom-nav-label">Tabelle</span>
            </Link>
            <Link
              to="/settings"
              className={`bottom-nav-item ${isActive('/settings') ? 'active' : ''}`}
              aria-label="Profil"
              aria-current={isActive('/settings') ? 'page' : undefined}
            >
              {menuProfilePicture ? (
                <img
                  src={resolveAssetUrl(menuProfilePicture)}
                  alt=""
                  className={`w-5 h-5 rounded-full object-cover ${isActive('/settings') ? 'ring-2 ring-primary-400' : ''}`}
                />
              ) : (
                <UserIcon className="w-5 h-5" strokeWidth={isActive('/settings') ? 2.5 : 1.8} />
              )}
              <span className="bottom-nav-label">Profil</span>
            </Link>
          </>
        ) : (
          <>
            <Link
              to="/admin"
              className={`bottom-nav-item ${isActive('/admin') ? 'active' : ''}`}
              aria-label="Admin"
              aria-current={isActive('/admin') ? 'page' : undefined}
            >
              <Shield className="w-5 h-5" strokeWidth={isActive('/admin') ? 2.5 : 1.8} />
              <span className="bottom-nav-label">Admin</span>
            </Link>
            <Link
              to="/settings"
              className={`bottom-nav-item ${isActive('/settings') ? 'active' : ''}`}
              aria-label="Profil"
              aria-current={isActive('/settings') ? 'page' : undefined}
            >
              <UserIcon className="w-5 h-5" strokeWidth={isActive('/settings') ? 2.5 : 1.8} />
              <span className="bottom-nav-label">Profil</span>
            </Link>
            <button
              onClick={handleLogout}
              className="bottom-nav-item"
              aria-label="Logout"
            >
              <LogOut className="w-5 h-5" strokeWidth={1.8} />
              <span className="bottom-nav-label">Logout</span>
            </button>
          </>
        )}
      </nav>
    </div>
  );
}
