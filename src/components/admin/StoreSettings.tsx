import React, { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { Lock, Unlock } from 'lucide-react';

const StoreSettings = ({ onDirtyStateChange }: { onDirtyStateChange?: (dirty: boolean) => void }) => {
  const { settings, saveSettings, uploadLogo } = useData();
  const [name, setName] = useState(settings.name);
  const [saved, setSaved] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);

  const isDirty = name !== settings.name;

  useEffect(() => {
    if (onDirtyStateChange) {
      onDirtyStateChange(isDirty);
    }
  }, [isDirty, onDirtyStateChange]);

  useEffect(() => {
    return () => {
      if (onDirtyStateChange) {
        onDirtyStateChange(false);
      }
    };
  }, [onDirtyStateChange]);

  const handleSave = async () => { 
    await saveSettings({ name }); 
    setSaved(true); 
    setTimeout(() => setSaved(false), 2000); 
  };
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
    setLogoBusy(true); setLogoError(null);
    try { await uploadLogo(file); }
    catch (err: any) { setLogoError(err?.message || 'Logo upload failed'); }
    finally { setLogoBusy(false); }
  };
  const handleToggleLock = async () => { await saveSettings({ locked: !settings.locked }); };

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-foreground mb-2">Store Settings</h2>
      <p className="text-muted-foreground text-sm mb-6">Customize store name and branding</p>
      <div className="bg-card rounded-xl border border-border p-6 max-w-md space-y-4">
        <div><label className="text-sm font-medium text-foreground block mb-1">Store Name</label><input value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" /></div>
        <div>
          <label className="text-sm font-medium text-foreground block mb-1">Logo</label>
          {settings.logo && <div className="mb-2"><img src={settings.logo} alt="Current logo" className="w-20 h-20 object-contain rounded-lg border border-border" referrerPolicy="no-referrer" /></div>}
          <label className={`inline-block px-4 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm hover:opacity-90 ${logoBusy ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}>
            {logoBusy ? 'Uploading…' : 'Upload Logo'}
            <input type="file" accept="image/*" onChange={handleLogoChange} disabled={logoBusy} className="hidden" />
          </label>
          {logoError && <p className="mt-2 text-xs text-destructive">{logoError}</p>}
        </div>
        <div className="border-t border-border pt-4">
          <label className="text-sm font-medium text-foreground block mb-2">Store Lock</label>
          <p className="text-xs text-muted-foreground mb-3">When locked, cashiers cannot log in. Admins can still access the system.</p>
          <button onClick={handleToggleLock} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${settings.locked ? 'bg-destructive text-destructive-foreground' : 'bg-accent text-accent-foreground'}`}>
            {settings.locked ? <><Lock size={16} /> Store Locked — Click to Unlock</> : <><Unlock size={16} /> Store Open — Click to Lock</>}
          </button>
        </div>
        <button onClick={handleSave} className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90">Save Settings</button>
        {saved && <p className="text-sm text-[hl(var(--success))] font-medium">Settings saved!</p>}
      </div>
    </div>
  );
};

export default StoreSettings;
