import React, { useEffect, useRef, useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ResourceBoard } from './components/ResourceBoard';
import { ChatInterface } from './components/ChatInterface';
import { ImageAnalysis } from './components/ImageAnalysis';
import { AcademicHelper } from './components/AcademicHelper';
import { Settings } from './components/Settings';
import { UpgradeModal } from './components/UpgradeModal';
import { ViewState, Resource, UserProfile, AppSettings, PlanTier } from './types';
import { SignedIn, SignedOut, RedirectToSignIn, useAuth, useUser } from '@clerk/clerk-react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SignInPage } from './components/AuthComponents';
import { SignUpPage } from './components/AuthComponents';
import { LandingPage } from './components/LandingPage';
import PricingPage from './components/PricingPage';

// Initial Mock Data Removed
const INITIAL_RESOURCES: Resource[] = [];

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <>
      <SignedIn>
        {children}
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
};

const AppContent: React.FC = () => {
  const { isLoaded, user } = useUser();
  const { isLoaded: authLoaded, getToken } = useAuth();
  const lastSyncedClerkUserIdRef = useRef<string | null>(null);

  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [resources, setResources] = useState<Resource[]>([]);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  
  

  // Settings & User State
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: '',
    email: '',
    role: '',
    plan: 'free'
  });

  useEffect(() => {
    const syncPlan = async () => {
      if (!authLoaded || !isLoaded || !user) return;
      const token = await getToken();
      if (!token) return;

      const res = await fetch('/api/me', {
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
    // Check for billing success/cancel in URL
    const params = new URLSearchParams(window.location.search);
    if (params.get('billing') === 'success') {
      // Re-trigger plan sync
      const sync = async () => {
          const token = await getToken();
          if (!token) return;
          const res = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } });
          if (res.ok) {
              const data = await res.json();
              setUserProfile(prev => ({ ...prev, plan: data?.user?.plan }));
          }
      };
      sync();
      
      // Clear query param
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // Simple alert for feedback
      alert("Subscription successful! Your features are now unlocked.");
    }
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded || !user) return;
    if (lastSyncedClerkUserIdRef.current === user.id) return;

    const clerkName = user.fullName || user.firstName || '';
    const clerkEmail = user.primaryEmailAddress?.emailAddress || '';

    setUserProfile(prev => ({
      ...prev,
      name: clerkName || prev.name,
      email: clerkEmail || prev.email,
      avatarUrl: user.imageUrl || prev.avatarUrl,
    }));

    lastSyncedClerkUserIdRef.current = user.id;
  }, [isLoaded, user]);

  const [appSettings, setAppSettings] = useState<AppSettings>({
    theme: 'dark',
    resourceLayout: 'grid',
    compactMode: false,
    notifications: true,
    twoFactorEnabled: false
  });


  const handleUpgrade = async (plan: PlanTier) => {
    if (plan !== 'researcher' && plan !== 'researcher_pro' && plan !== 'lab') return;
    if (!authLoaded) return;

    const token = await getToken();
    if (!token) return;

    const res = await fetch('/api/billing/checkout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ plan }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Checkout failed');
    if (!data?.url) throw new Error('Missing checkout url');
    window.location.href = data.url;
  };

  const handleOpenBillingPortal = async () => {
    if (!authLoaded) return;
    const token = await getToken();
    if (!token) return;

    const res = await fetch('/api/billing/portal', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || 'Billing portal failed');
    if (!data?.url) throw new Error('Missing portal url');
    window.location.href = data.url;
  };

  const renderContent = () => {
    const commonProps = {
      onOpenUpgrade: () => setIsUpgradeModalOpen(true)
    };

    switch (currentView) {
      case ViewState.DASHBOARD:
        return (
          <ResourceBoard 
            resources={resources} 
            setResources={setResources} 
            appSettings={appSettings} 
            userProfile={userProfile} 
            {...commonProps}
          />
        );
      case ViewState.CHAT:
        return <ChatInterface userProfile={userProfile} {...commonProps} />;
      case ViewState.IMAGE_ANALYSIS:
        return <ImageAnalysis userProfile={userProfile} {...commonProps} />;
      case ViewState.ACADEMIC_HELPER:
        return <AcademicHelper resources={resources} userProfile={userProfile} {...commonProps} />;
      case ViewState.SETTINGS:
        return (
          <Settings 
            userProfile={userProfile} 
            setUserProfile={setUserProfile} 
            appSettings={appSettings} 
            setAppSettings={setAppSettings} 
            onOpenUpgrade={() => setIsUpgradeModalOpen(true)}
            onOpenBillingPortal={handleOpenBillingPortal}
          />
        );
      default:
        return <ResourceBoard resources={resources} setResources={setResources} appSettings={appSettings} userProfile={userProfile} {...commonProps} />;
    }
  };

  return (
    <div className={`flex h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 ${appSettings.compactMode ? 'text-sm' : ''}`}>
      <Sidebar currentView={currentView} onNavigate={setCurrentView} />
      
      <main className="flex-1 overflow-hidden relative">
        {/* Ambient Glow Effects */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary-600/5 rounded-full blur-[100px] pointer-events-none -z-10" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-600/5 rounded-full blur-[100px] pointer-events-none -z-10" />
        
        {renderContent()}
      </main>

      <UpgradeModal 
        isOpen={isUpgradeModalOpen} 
        onClose={() => setIsUpgradeModalOpen(false)}
        currentPlan={userProfile.plan}
        onUpgrade={handleUpgrade}
        onOpenBillingPortal={handleOpenBillingPortal}
      />
    </div>
  );
};
function App() {
  return (
    <Routes>
      <Route
        path="/pricing"
        element={<PricingPage />}
      />
      {/* Rota da Landing Page - Página inicial não autenticada */}
      <Route
        path="/"
        element={
          <>
            <SignedIn>
              <Navigate to="/dashboard" replace />
            </SignedIn>
            <SignedOut>
              <LandingPage />
            </SignedOut>
          </>
        }
      />
      {/* Rotas de autenticação */}
      <Route
        path="/sign-in"
        element={
          <>
            <SignedIn>
              <Navigate to="/dashboard" replace />
            </SignedIn>
            <SignedOut>
              <SignInPage />
            </SignedOut>
          </>
        }
      />
      <Route
        path="/sign-up"
        element={
          <>
            <SignedIn>
              <Navigate to="/dashboard" replace />
            </SignedIn>
            <SignedOut>
              <SignUpPage />
            </SignedOut>
          </>
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