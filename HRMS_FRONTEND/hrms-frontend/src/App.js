import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SearchProvider } from './context/SearchContext';
import AppRoutes from './routes/AppRoutes';
import './styles/global.css';

class ErrorBoundary extends React.Component {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  handleReload = () => window.location.reload();
  render() {
    if (this.state.crashed) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', gap: '1rem', textAlign: 'center',
          fontFamily: 'sans-serif', color: '#111',
        }}>
          <span style={{ fontSize: '3rem' }}>⚠️</span>
          <p style={{ fontWeight: 600 }}>Something went wrong.</p>
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>A page failed to load. This is usually fixed by refreshing.</p>
          <button
            onClick={this.handleReload}
            style={{ padding: '0.5rem 1.25rem', borderRadius: 6, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontSize: '0.9rem' }}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <SearchProvider>
            <AppRoutes />
          </SearchProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
