import { useEffect } from 'react';
import { useStore } from '@/store/useStore';
import TopBar from '@/components/layout/TopBar';
import ToastContainer from '@/components/ui/ToastContainer';

// Pages
import PlayersPage from '@/pages/public/PlayersPage';
import PlayerDetailPage from '@/pages/public/PlayerDetailPage';
import TeamSheetsPage from '@/pages/public/TeamSheetsPage';
import GameWeekPage from '@/pages/public/GameWeekPage';
import LeaderboardPage from '@/pages/public/LeaderboardPage';
import PlayerComparePage from '@/pages/public/PlayerComparePage';
import SeasonXIPage from '@/pages/public/SeasonXIPage';
import LoginPage from '@/pages/admin/LoginPage';
import DashboardPage from '@/pages/admin/DashboardPage';
import PlayerManagementPage from '@/pages/admin/PlayerManagementPage';
import TeamGeneratorPage from '@/pages/admin/TeamGeneratorPage';
import GameWeekManagerPage from '@/pages/admin/GameWeekManagerPage';

const PAGE_MAP = {
  players: PlayersPage,
  playerDetail: PlayerDetailPage,
  teamSheets: TeamSheetsPage,
  gameWeeks: GameWeekPage,
  leaderboard: LeaderboardPage,
  compare: PlayerComparePage,
  seasonXI: SeasonXIPage,
  login: LoginPage,
  dashboard: DashboardPage,
  playerMgmt: PlayerManagementPage,
  teamGen: TeamGeneratorPage,
  gwManager: GameWeekManagerPage,
};

const ADMIN_PAGES = ['dashboard', 'playerMgmt', 'teamGen', 'gwManager'];

export default function App() {
  const { darkMode, currentPage, isAdmin, loading, subscribeToData } = useStore();

  useEffect(() => {
    const unsub = subscribeToData();
    return unsub;
  }, [subscribeToData]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [currentPage]);

  const effectivePage =
    ADMIN_PAGES.includes(currentPage) && !isAdmin ? 'login' : currentPage;

  const PageComponent = PAGE_MAP[effectivePage] || PlayersPage;

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
      <ToastContainer />

      <div className="min-h-screen" style={{ background: 'var(--gpl-bg)' }}>
        <TopBar />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <PageComponent />
        </main>
      </div>
    </div>
  );
}
