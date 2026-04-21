import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@/theme';
import { I18nProvider } from '@/i18n';
import { AppShell } from '@/components/layout/AppShell.jsx';
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
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<HomePage />} />
              <Route path="home" element={<Navigate to="/" replace />} />

              {/* Temari: nom canònic, §5 ARCHITECTURE. Mantenim /temes com
                  a alias per no trencar bookmarks del període previ. */}
              <Route path="temari" element={<TopicsIndexPage />} />
              <Route path="temari/:topicId" element={<TopicPage />} />
              <Route path="temari/:topicId/:stepId" element={<TopicPage />} />
              <Route path="temes" element={<Navigate to="/temari" replace />} />
              <Route path="temes/:topicId" element={<TopicPage />} />
              <Route path="temes/:topicId/:stepId" element={<TopicPage />} />

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
