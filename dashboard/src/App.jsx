import { Routes, Route, NavLink } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Reports from './pages/Reports';
import MapView from './pages/MapView';
import SpeciesPage from './pages/SpeciesPage';
import SpeciesDetail from './pages/SpeciesDetail';
import Predictions from './pages/Predictions';
import Training from './pages/Training';
import Import from './pages/Import';
import { useApi } from './hooks/useApi';

function Sidebar({ species, syncing, isOpen, onClose }) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/70 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <aside className={`fixed left-0 top-0 bottom-0 w-64 bg-gradient-to-b from-green-50 to-white border-r border-green-200 flex flex-col z-50 overflow-hidden transition-transform duration-300 shadow-lg ${
        isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="p-5 border-b border-green-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-mushroom-gold/30 flex items-center justify-center text-[11px] font-bold tracking-wide text-green-900">
              PNW
            </div>
            <div>
              <h1 className="text-base font-bold text-green-900 tracking-tight">PNW Observation Hub</h1>
              <p className="text-[10px] text-green-600 font-mono uppercase tracking-widest">Reporting Dashboard</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="lg:hidden p-2 text-green-600 hover:text-green-900"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <NavLink to="/" end className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
          Dashboard
        </NavLink>
        <NavLink to="/reports" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-6m3 6V7m3 10v-4M5 21h14a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v15a1 1 0 001 1z" /></svg>
          Reports
        </NavLink>
        <NavLink to="/map" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
          Spatial Analysis
        </NavLink>
        <NavLink to="/forecast" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          Regional Forecast
        </NavLink>
        <NavLink to="/training" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          Reference & Training
        </NavLink>
        <NavLink to="/import" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Species Management
        </NavLink>
        <NavLink to="/species" className={({isActive}) => `nav-link ${isActive ? 'active' : ''}`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          Species Catalog
        </NavLink>

        <div className="pt-4 pb-2 px-2">
          <p className="text-[10px] font-mono uppercase tracking-widest text-green-600">Tracked Taxa</p>
        </div>
        <div className="space-y-0.5 max-h-[400px] overflow-y-auto">
          {species?.map(s => (
            <NavLink
              key={s.id}
              to={`/species/${s.id}`}
              className={({isActive}) =>
                `flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all duration-200 ${
                  isActive
                    ? 'text-mushroom-gold bg-mushroom-gold/20'
                    : 'text-green-700 hover:text-green-900 hover:bg-green-100'
                }`
              }
            >
              <span className="truncate">{s.commonName}</span>
            </NavLink>
          ))}
        </div>
      </nav>

      {syncing && (
        <div className="p-3 border-t border-green-200">
          <div className="flex items-center gap-2 text-xs text-green-600">
            <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
            Data synchronization in progress
          </div>
        </div>
      )}
    </aside>
    </>
  );
}

export default function App() {
  const { data: speciesData } = useApi('/species');
  const [syncing, setSyncing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/sync-progress');
        const data = await res.json();
        setSyncing(data.count > 0);
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-screen">
      <Sidebar 
        species={speciesData?.species} 
        syncing={syncing} 
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="flex-1 lg:ml-64 p-4 lg:p-6">
        {/* Mobile header with hamburger menu */}
        <div className="lg:hidden mb-4 flex items-center justify-between">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-green-700 hover:text-green-900"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-mushroom-gold/30 flex items-center justify-center text-[10px] font-semibold text-green-900">
              PNW
            </div>
            <span className="text-sm font-semibold text-green-900">Observation Hub</span>
          </div>
          <div className="w-10"></div> {/* Spacer for balance */}
        </div>
        
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/forecast" element={<Predictions />} />
          <Route path="/training" element={<Training />} />
          <Route path="/import" element={<Import />} />
          <Route path="/species" element={<SpeciesPage />} />
          <Route path="/species/:id" element={<SpeciesDetail />} />
        </Routes>
      </main>
    </div>
  );
}
