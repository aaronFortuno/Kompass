import { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ThemeProvider } from '@/theme';
import { I18nProvider } from '@/i18n';
import { AppShell } from '@/components/layout/AppShell.jsx';
import { BackgroundMusicPlayer } from '@/components/layout/BackgroundMusicPlayer.jsx';
import { SettingsModal } from '@/components/settings/SettingsModal.jsx';
import { useSettingsStore } from '@/store/useSettingsStore.js';
import { HomePage } from '@/pages/HomePage.jsx';
import { PlaceholderPage } from '@/pages/PlaceholderPage.jsx';
import { TopicsIndexPage } from '@/pages/TopicsIndexPage.jsx';
import { TopicPage } from '@/pages/TopicPage.jsx';
import { ProgressPage } from '@/pages/ProgressPage.jsx';

/*
 * /settings URL — compatibilitat enrere: abans hi havia una pàgina
 * dedicada. Ara obrim el modal i redirigim a /. Manté els bookmarks
 * dels usuaris i l'enllaç del header.
 */
function SettingsRedirect() {
  const navigate = useNavigate();
  const setSettingsOpen = useSettingsStore((s) => s.setSettingsOpen);
  useEffect(() => {
    setSettingsOpen(true);
    navigate('/', { replace: true });
  }, [navigate, setSettingsOpen]);
  return null;
}

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
          {/* Modal d'ajustaments global · §112. Un sol punt d'entrada,
              obert des del header, del reader o de la URL /settings. */}
          <SettingsModal />
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
              <Route path="settings" element={<SettingsRedirect />} />
              <Route path="*" element={<PlaceholderPage />} />
            </Route>
          </Routes>
        </HashRouter>
      </ThemeProvider>
    </I18nProvider>
  );
}
