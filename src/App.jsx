import { HashRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/theme';
import { I18nProvider } from '@/i18n';
import { AppShell } from '@/components/layout/AppShell.jsx';
import { HomePage } from '@/pages/HomePage.jsx';
import { PlaceholderPage } from '@/pages/PlaceholderPage.jsx';
import { TopicsIndexPage } from '@/pages/TopicsIndexPage.jsx';
import { TopicPage } from '@/pages/TopicPage.jsx';

export default function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <HashRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<HomePage />} />
              <Route path="temes" element={<TopicsIndexPage />} />
              <Route path="temes/:topicId" element={<TopicPage />} />
              <Route path="temes/:topicId/:stepId" element={<TopicPage />} />
              <Route path="rutes" element={<PlaceholderPage titleKey="nav.paths" />} />
              <Route path="progres" element={<PlaceholderPage titleKey="nav.progress" />} />
              <Route path="*" element={<PlaceholderPage />} />
            </Route>
          </Routes>
        </HashRouter>
      </ThemeProvider>
    </I18nProvider>
  );
}
