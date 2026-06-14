import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useStore } from '@/store/useStore';
import TopBar from '@/components/layout/TopBar';
import ToastContainer from '@/components/ui/ToastContainer';

// Public pages
import PlayersPage from '@/pages/public/PlayersPage';
import PlayerDetailPage from '@/pages/public/PlayerDetailPage';
import TeamSheetsPage from '@/pages/public/TeamSheetsPage';
import GameWeekPage from '@/pages/public/GameWeekPage';
import LeaderboardPage from '@/pages/public/LeaderboardPage';
import PlayerComparePage from '@/pages/public/PlayerComparePage';
import SeasonXIPage from '@/pages/public/SeasonXIPage';

// Admin pages
import LoginPage from '@/pages/admin/LoginPage';
import DashboardPage from '@/pages/admin/DashboardPage';
import PlayerManagementPage from '@/pages/admin/PlayerManagementPage';
import TeamGeneratorPage from '@/pages/admin/TeamGeneratorPage';
import GameWeekManagerPage from '@/pages/admin/GameWeekManagerPage';

const ADMIN_PAGES = ['dashboard', 'playerMgmt', 'teamGen', 'gwManager'];

const ADMIN_PAGE_MAP = {
  dashboard:  DashboardPage,
  playerMgmt: PlayerManagementPage,
  teamGen:    TeamGeneratorPage,
  gwManager:  GameWeekManagerPage,
};

// Scrolls to top on every URL change (public navigation).
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

function AppContent() {
  const { darkMode, currentPage, isAdmin, loading, subscribeToData } = useStore();

  useEffect(() => {
    const unsub = subscribeToData();
    return unsub;
  }, [subscribeToData]);

  // Scroll to top when admin switches between admin pages.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentPage]);

  const showLogin = currentPage === 'login' && !isAdmin;
  const showAdmin = isAdmin && ADMIN_PAGES.includes(currentPage);
  const AdminPage = showAdmin ? ADMIN_PAGE_MAP[currentPage] : null;

  if (loading) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gpl-bg)' }}>
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-sm font-medium" style={{ color: 'var(--gpl-text-muted)' }}>Loading GPL...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={darkMode ? 'dark' : ''}>
      <ScrollToTop />
      <ToastContainer />
      <div className="min-h-screen" style={{ background: 'var(--gpl-bg)' }}>
        <TopBar />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {showLogin && <LoginPage />}
          {showAdmin && AdminPage && <AdminPage />}
          {!showLogin && !showAdmin && (
            <Routes>
              <Route path="/"            element={<PlayersPage />} />
              <Route path="/players/:id" element={<PlayerDetailPage />} />
              <Route path="/compare"     element={<PlayerComparePage />} />
              <Route path="/team-sheets" element={<TeamSheetsPage />} />
              <Route path="/game-weeks"  element={<GameWeekPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/season-xi"   element={<SeasonXIPage />} />
              <Route path="*"            element={<Navigate to="/" replace />} />
            </Routes>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
