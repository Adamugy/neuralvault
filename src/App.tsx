import React, { useEffect, useRef, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ResourceBoard } from './components/ResourceBoard';
import { ChatInterface } from './components/ChatInterface';
import { ImageAnalysis } from './components/ImageAnalysis';
import { AcademicHelper } from './components/AcademicHelper';
import { Settings } from './components/Settings';
import { ViewState, Resource, UserProfile, AppSettings, PlanTier } from './types';
import { useAuth, useUser } from './contexts/AuthContext';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SignInPage, SignUpPage, VerifyEmailPage } from './components/AuthComponents';
import LandingPage from './components/LandingPage';

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

  const renderContent = () => {

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
  };

  return (
    <div className={`flex h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 ${appSettings.compactMode ? 'text-sm' : ''}`}>
      <Sidebar 
        currentView={currentView} 
        onNavigate={setCurrentView} 
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      
      <main className="flex-1 overflow-hidden relative">
        {/* Ambient Glow Effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-600/5 rounded-full blur-[100px] pointer-events-none -z-10" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-600/5 rounded-full blur-[100px] pointer-events-none -z-10" />
        
        {renderContent()}
      </main>
    </div>
  );
};

function App() {
  const { isLoaded, isSignedIn } = useAuth();
  
  return (
    <Routes>
      {/* Rota da Landing Page - Página inicial não autenticada */}
      <Route
        path="/"
        element={
          isLoaded && isSignedIn ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LandingPage />
          )
        }
      />
      {/* Rotas de autenticação */}
      <Route
        path="/sign-in"
        element={
          isLoaded && isSignedIn ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <SignInPage />
          )
        }
      />
      <Route
        path="/verify-email"
        element={<VerifyEmailPage />}
      />
      <Route
        path="/sign-up"
        element={
          isLoaded && isSignedIn ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <SignUpPage />
          )
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
  );
}


export default App;