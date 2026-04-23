import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/theme';
import { I18nProvider } from '@/i18n';
import { AppShell } from '@/components/layout/AppShell.jsx';
import { BackgroundMusicPlayer } from '@/components/layout/BackgroundMusicPlayer.jsx';
import { HomePage } from '@/pages/HomePage.jsx';
import { PlaceholderPage } from '@/pages/PlaceholderPage.jsx';
import { TopicsIndexPage } from '@/pages/TopicsIndexPage.jsx';
import { TopicPage } from '@/pages/TopicPage.jsx';
import { ProgressPage } from '@/pages/ProgressPage.jsx';
import { SettingsPage } from '@/pages/SettingsPage.jsx';

export default function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <HashRouter>
          {/*
            BackgroundMusicPlayer muntat a nivell de Router perquè
            sobrevisqui a qualsevol canvi de ruta — incloses les rutes
            `/temari/:topicId` que estan fora d'AppShell (la reader
            ocupa la viewport sencera). Si es muntés dins AppShell,
            la música s'aturaria en entrar a una lliçó. §111 fix.
          */}
          <BackgroundMusicPlayer />
          <Routes>
            {/*
              El FocusReader ocupa la viewport sencera i no vol el shell
              a sota, per això /temari/:topicId queda fora del grup AppShell.
            */}
            <Route path="temari/:topicId" element={<TopicPage />} />
            <Route path="temari/:topicId/:stepId" element={<TopicPage />} />
            <Route path="temes/:topicId" element={<TopicPage />} />
            <Route path="temes/:topicId/:stepId" element={<TopicPage />} />

            <Route element={<AppShell />}>
              <Route index element={<HomePage />} />
              <Route path="home" element={<Navigate to="/" replace />} />
              <Route path="temari" element={<TopicsIndexPage />} />
              <Route path="temes" element={<Navigate to="/temari" replace />} />
              <Route path="rutes" element={<PlaceholderPage titleKey="nav.paths" />} />
              <Route path="progres" element={<ProgressPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<PlaceholderPage />} />
            </Route>
          </Routes>
        </HashRouter>
      </ThemeProvider>
    </I18nProvider>
  );
}
