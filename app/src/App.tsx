import { useEffect, useState } from 'react';
import Layout, { type Tab } from './components/Layout';
import DayView from './components/DayView';
import WeekView from './components/WeekView';
import MonthView from './components/MonthView';
import Settings from './components/Settings';
import { useApi } from './hooks/useApi';
import type { Settings as SettingsType } from './types';
import { format } from 'date-fns';

const DEFAULT_SETTINGS: SettingsType = { daily_calories: 2000, deficit: 500 };

export default function App() {
  const api = useApi();
  const [activeTab, setActiveTab] = useState<Tab>('heute');
  const [settings, setSettings] = useState<SettingsType>(DEFAULT_SETTINGS);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const today = format(new Date(), 'yyyy-MM-dd');
  const [viewDate, setViewDate] = useState(today);

  useEffect(() => {
    api
      .getSettings()
      .then((s) => {
        setSettings(s);
        setSettingsLoading(false);
      })
      .catch((err) => {
        setSettingsError(err instanceof Error ? err.message : 'Fehler');
        setSettingsLoading(false);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function renderContent() {
    if (settingsLoading) {
      return <div className="loading-state">Lade Einstellungen...</div>;
    }
    if (settingsError) {
      return (
        <div className="error-state">
          Fehler beim Laden der Einstellungen: {settingsError}
          <br />
          <small style={{ fontWeight: 400 }}>
            Stellen Sie sicher, dass der Worker läuft (cd worker &amp;&amp; npm run dev).
          </small>
        </div>
      );
    }
    switch (activeTab) {
      case 'heute':
        return <DayView date={viewDate} settings={settings} onDateChange={setViewDate} />;
      case 'woche':
        return <WeekView settings={settings} onDaySelect={(d) => { setViewDate(d); setActiveTab('heute'); }} />;
      case 'monat':
        return <MonthView settings={settings} />;
      case 'einstellungen':
        return <Settings settings={settings} onSettingsUpdate={setSettings} />;
      default:
        return null;
    }
  }

  function handleTabChange(tab: Tab) {
    if (tab === 'heute') setViewDate(today);
    setActiveTab(tab);
  }

  return (
    <Layout activeTab={activeTab} onTabChange={handleTabChange}>
      {renderContent()}
    </Layout>
  );
}
