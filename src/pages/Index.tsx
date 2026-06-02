import { useState } from 'react';
import { DataProvider, useData } from '@/contexts/DataContext';
import Login from './Login';
import POS from './POS';
import Admin from './Admin';
import Credits from './Credits';

type View = 'pos' | 'admin' | 'credits';

const IndexContent = () => {
  const { session, loading } = useData();
  const [view, setView] = useState<View>('pos');

  // If not logged in and still loading initial credentials, show a clean full-screen brand loader.
  if (!session && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">Loading Jo's Coffee POS...</p>
        </div>
      </div>
    );
  }

  if (!session) return <Login />;

  switch (view) {
    case 'admin': return <Admin onBack={() => setView('pos')} />;
    case 'credits': return <Credits onBack={() => setView('pos')} />;
    default: return <POS onAdmin={() => setView('admin')} onCredits={() => setView('credits')} />;
  }
};

const Index = () => (
  <DataProvider>
    <IndexContent />
  </DataProvider>
);

export default Index;
