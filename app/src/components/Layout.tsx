import React from 'react';

type Tab = 'heute' | 'woche' | 'monat' | 'einstellungen';

interface LayoutProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  children: React.ReactNode;
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'heute', label: 'Heute' },
  { id: 'woche', label: 'Woche' },
  { id: 'monat', label: 'Monat' },
  { id: 'einstellungen', label: 'Einstellungen' },
];

export default function Layout({ activeTab, onTabChange, children }: LayoutProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <header className="app-header">
        <div className="app-header__logo">
          Kale<span>i</span>dos
        </div>
        <nav className="app-nav">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`app-nav__tab${activeTab === tab.id ? ' app-nav__tab--active' : ''}`}
              onClick={() => onTabChange(tab.id)}
              type="button"
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}

export type { Tab };
