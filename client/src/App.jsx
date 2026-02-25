import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { Toaster } from 'react-hot-toast';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import DashboardPage from './pages/DashboardPage';
import GroupsPage from './pages/GroupsPage';
import GroupPage from './pages/GroupPage';
import WalletPage from './pages/WalletPage';
import AuthPage from './pages/AuthPage';

// ── Stub Pages ──────────────────────────────────────────────
const ComingSoonPage = ({ title, emoji }) => (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="text-6xl">{emoji}</div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        <p className="text-slate-400 max-w-sm">This section is under development. Check back soon!</p>
    </div>
);

// ── Shell Layout ─────────────────────────────────────────────
const Shell = () => (
    <div className="min-h-screen bg-background text-slate-900 font-sans flex">
        <Sidebar />
        <div className="flex-1 flex flex-col min-h-screen md:ml-64">
            <Navbar />
            <main className="flex-1 pt-20 p-4 md:p-8 max-w-[1600px] w-full mx-auto">
                {/* Render Marker */}
                <div id="render-marker" style={{ display: 'none' }}>App Rendered</div>
                <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/groups" element={<GroupsPage />} />
                    <Route path="/groups/:id" element={<GroupPage />} />
                    <Route path="/wallet" element={<WalletPage />} />
                    <Route path="/activity" element={<ComingSoonPage title="Activity Feed" emoji="📋" />} />
                    <Route path="/settlements" element={<ComingSoonPage title="Settlements" emoji="🤝" />} />
                    <Route path="*" element={<Navigate to="/" />} />
                </Routes>
            </main>
        </div>
    </div>
);

// ── Route Guard ───────────────────────────────────────────────
const AppRoutes = () => {
    const { user, loading } = useAuth();
    if (loading) return (
        <div className="h-screen w-screen flex items-center justify-center bg-background">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent" />
        </div>
    );
    return (
        <Routes>
            <Route path="/login" element={!user ? <AuthPage /> : <Navigate to="/" />} />
            <Route path="/*" element={user ? <Shell /> : <Navigate to="/login" />} />
        </Routes>
    );
};

export default function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <SocketProvider>
                    <AppRoutes />
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            style: {
                                background: '#fff',
                                color: '#333',
                                padding: '14px 18px',
                                borderRadius: '12px',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                fontSize: '14px',
                                fontWeight: '500',
                            },
                        }}
                    />
                </SocketProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}
