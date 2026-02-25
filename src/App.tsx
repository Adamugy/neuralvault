import React, { useEffect, useRef, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ResourceBoard } from './components/ResourceBoard';
import { ChatInterface } from './components/ChatInterface';
import { ImageAnalysis } from './components/ImageAnalysis';
import { AcademicHelper } from './components/AcademicHelper';
import { Settings } from './components/Settings';
import { ViewState, Resource, UserProfile, AppSettings, PlanTier } from './types';
import { useAuth, useUser } from './contexts/AuthContext';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { SignInPage, SignUpPage, VerifyEmailPage } from './components/AuthComponents';
import LandingPage from './components/LandingPage';
import { motion, AnimatePresence } from 'framer-motion';

// Initial Mock Data Removed
const INITIAL_RESOURCES: Resource[] = [];

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn } = useAuth();
  
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  if (!isSignedIn) {
    return <Navigate to="/sign-in" replace />;
  }
  
  return <>{children}</>;
};

const AppContent: React.FC = () => {
  const { user, isLoaded } = useUser();
  const { isLoaded: authLoaded, getToken } = useAuth();
  const lastSyncedUserIdRef = useRef<string | null>(null);

  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  

  // Settings & User State
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '',
    lastName: '',
    email: '',
    role: '',
    plan: 'free',
    avatarUrl: ''
  });

  useEffect(() => {
    const syncPlan = async () => {
      if (!authLoaded || !isLoaded || !user) return;
      const token = await getToken();
      if (!token) return;

      const res = await fetch('/api/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) return;

      const data = await res.json();
      const plan = data?.user?.plan;
      if (plan === 'free' || plan === 'researcher' || plan === 'lab') {
        setUserProfile(prev => ({ ...prev, plan: plan as PlanTier }));
      }
    };

    syncPlan();
  }, [authLoaded, isLoaded, user, getToken]);



  useEffect(() => {
    if (!isLoaded || !user) return;

    const userName = user.name || '';
    const userEmail = user.email || '';
    const userEmailVerified = user.emailVerified || false;

    // Fetch full profile from our DB to get role and avatar
    const fetchFullProfile = async () => {
        const token = await getToken();
        if (!token) return;
        const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
            const data = await res.json();
            setUserProfile(prev => ({
                ...prev,
                name: data.user.name || userName || prev.name,
                lastName: data.user.lastName || '',
                email: userEmail || prev.email,
                role: data.user.role || '',
                avatarUrl: data.user.avatarUrl || '',
                plan: data.user.plan || prev.plan,
                emailVerified: data.user.emailVerified ?? userEmailVerified
            }));
        }
    };

    if (lastSyncedUserIdRef.current !== user.id) {
        fetchFullProfile();
        lastSyncedUserIdRef.current = user.id;
    } else {
        // Just sync existing data if ID is the same but object changed (e.g. emailVerified)
        setUserProfile(prev => ({
            ...prev,
            emailVerified: user.emailVerified
        }));
    }
  }, [isLoaded, user, getToken]);

  const [appSettings, setAppSettings] = useState<AppSettings>({
    theme: 'dark',
    resourceLayout: 'grid',
    compactMode: false,
    notifications: true,
    twoFactorEnabled: false
  });




  const handleSaveProfile = async (profile: UserProfile) => {
    if (!authLoaded) return;
    const token = await getToken();
    if (!token) return;

    const res = await fetch('/api/auth/me', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: profile.name,
        lastName: profile.lastName,
        role: profile.role,
        avatarUrl: profile.avatarUrl
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.message || 'Failed to save profile');
    }

    const data = await res.json();
    setUserProfile(prev => ({
      ...prev,
      name: data.user.name || prev.name,
      lastName: data.user.lastName || prev.lastName,
      role: data.user.role || prev.role,
      avatarUrl: data.user.avatarUrl || prev.avatarUrl
    }));
  };

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const renderContent = () => {
    return (
      <AnimatePresence mode="wait">
        <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="h-full w-full"
        >
            {(() => {
                switch (currentView) {
                  case ViewState.DASHBOARD:
                    return (
                      <ResourceBoard 
                        resources={resources} 
                        setResources={setResources} 
                        appSettings={appSettings} 
                        userProfile={userProfile}
                      />
                    );
                  case ViewState.CHAT:
                    return <ChatInterface userProfile={userProfile} resources={resources} />;
                  case ViewState.IMAGE_ANALYSIS:
                    return <ImageAnalysis userProfile={userProfile} resources={resources} />;
                  case ViewState.ACADEMIC_HELPER:
                    return <AcademicHelper resources={resources} userProfile={userProfile} />;
                  case ViewState.SETTINGS:
                    return (
                      <Settings 
                        userProfile={userProfile} 
                        setUserProfile={setUserProfile} 
                        appSettings={appSettings} 
                        setAppSettings={setAppSettings}
                        onSaveProfile={handleSaveProfile}
                      />
                    );
                  default:
                    return <ResourceBoard resources={resources} setResources={setResources} appSettings={appSettings} userProfile={userProfile} />;
                }
            })()}
        </motion.div>
      </AnimatePresence>
    );
  };

  return (
    <div className={`flex h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 ${appSettings.compactMode ? 'text-sm' : ''} overflow-hidden`}>
      <Sidebar 
        currentView={currentView} 
        onNavigate={(view) => {
          setCurrentView(view);
          setIsMobileMenuOpen(false);
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isMobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />
      
      <main className="flex-1 overflow-hidden relative flex flex-col h-full w-full">
        {/* Mobile Header */}
        <div className="lg:hidden h-16 border-b border-white/10 flex items-center justify-between px-4 bg-slate-900/50 backdrop-blur-md z-40 flex-shrink-0">
            <div className="flex items-center gap-2">
                <div className="text-[var(--neon-primary)]">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-brain-circuit"><path d="M12 4.5a2.5 2.5 0 0 0-4.96-.46 2.5 2.5 0 0 0-1.98 3 2.5 2.5 0 0 0-1.32 3 2.5 2.5 0 0 0-.02 3 2.5 2.5 0 0 0 1.2 3 2.5 2.5 0 0 0 2.02 3 2.5 2.5 0 0 0 4.96.46 2.5 2.5 0 0 0 1.98-3 2.5 2.5 0 0 0 1.32-3 2.5 2.5 0 0 0 .02-3 2.5 2.5 0 0 0-1.2-3 2.5 2.5 0 0 0-2.02-3"/><path d="M12 2v2"/><path d="M12 22v-2"/><path d="M12 12h.01"/></svg>
                </div>
                <span className="font-bold text-lg text-white">NeuralVault</span>
            </div>
            <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="p-2 text-slate-400 hover:text-white"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
            </button>
        </div>

        {/* Ambient Glow Effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-600/5 rounded-full blur-[100px] pointer-events-none -z-10" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-600/5 rounded-full blur-[100px] pointer-events-none -z-10" />
        
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-0">
           {renderContent()}
        </div>
      </main>
    </div>
  );
};

function App() {
  const { isLoaded, isSignedIn } = useAuth();
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        {/* Rota da Landing Page - Página inicial não autenticada */}
        <Route
          path="/"
          element={
            <div className="w-full h-full overflow-hidden">
                {isLoaded && isSignedIn ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                  >
                    <LandingPage />
                  </motion.div>
                )}
            </div>
          }
        />
        {/* Rotas de autenticação */}
        <Route
          path="/sign-in"
          element={
            <div className="w-full h-full overflow-hidden">
                {isLoaded && isSignedIn ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <SignInPage />
                  </motion.div>
                )}
            </div>
          }
        />
        <Route
          path="/verify-email"
          element={
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
                <VerifyEmailPage />
            </motion.div>
          }
        />
        <Route
          path="/sign-up"
          element={
            <div className="w-full h-full overflow-hidden">
                {isLoaded && isSignedIn ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.02 }}
                    transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <SignUpPage />
                  </motion.div>
                )}
            </div>
          }
        />
        {/* Rotas protegidas */}
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <AppContent />
            </ProtectedRoute>
          }
        />
        {/* Redirecionamento para a página inicial */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
}


export default App;