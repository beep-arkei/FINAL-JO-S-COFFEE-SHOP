import { useState } from 'react';
import { ArrowLeft, Package, Users, BarChart3, Database, Settings } from 'lucide-react';
import MenuManagement from '@/components/admin/MenuManagement';
import UserManagement from '@/components/admin/UserManagement';
import SalesReports from '@/components/admin/SalesReports';
import DataBackup from '@/components/admin/DataBackup';
import StoreSettings from '@/components/admin/StoreSettings';
import DbStatus from '@/components/DbStatus';
import { useData } from '@/contexts/DataContext';
import logo from '@/assets/logo.png';

interface AdminProps { onBack: () => void; }

const tabs = [
  { id: 'menu', label: 'Menu', icon: Package },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'backup', label: 'Backup', icon: Database },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const Admin = ({ onBack }: AdminProps) => {
  const [activeTab, setActiveTab] = useState('menu');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { session, dbConnected } = useData();

  const handleTabChange = (tabId: string) => {
    if (tabId === activeTab) return;
    setHasUnsavedChanges(false);
    setActiveTab(tabId);
  };

  const handleBack = () => {
    setHasUnsavedChanges(false);
    onBack();
  };

  return (
    <div className="h-screen flex bg-background">
      <aside className="w-56 bg-sidebar flex flex-col border-r border-sidebar-border">
        <div className="p-4 flex items-center gap-3">
          <img src={logo} alt="Logo" className="w-9 h-9 object-contain" referrerPolicy="no-referrer" />
          <div>
            <h1 className="font-display text-sm font-bold text-sidebar-foreground leading-tight">Admin Panel</h1>
            <p className="text-[11px] text-sidebar-foreground/60">{session?.username}</p>
          </div>
        </div>
        <div className="px-4 pb-2"><DbStatus connected={dbConnected} /></div>
        <nav className="flex-1 px-3 space-y-1">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => handleTabChange(tab.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                activeTab === tab.id ? 'bg-sidebar-accent text-sidebar-accent-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              }`}>
              <tab.icon size={18} /> {tab.label}
            </button>
          ))}
        </nav>
        <div className="p-3">
          <button onClick={handleBack}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors">
            <ArrowLeft size={18} /> Back to POS
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        {activeTab === 'menu' && <MenuManagement onDirtyStateChange={setHasUnsavedChanges} />}
        {activeTab === 'users' && <UserManagement onDirtyStateChange={setHasUnsavedChanges} />}
        {activeTab === 'reports' && <SalesReports />}
        {activeTab === 'backup' && <DataBackup />}
        {activeTab === 'settings' && <StoreSettings onDirtyStateChange={setHasUnsavedChanges} />}
      </main>
    </div>
  );
};

export default Admin;
