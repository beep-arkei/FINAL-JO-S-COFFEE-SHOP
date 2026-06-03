import React, { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { Download, Upload, AlertTriangle, FileJson, Trash2, Receipt } from 'lucide-react';
import { validateBackup, backupCounts, type BackupFileV1 } from '@/lib/backup';

type Status = { kind: 'success' | 'error' | 'info'; message: string } | null;

const DataBackup = () => {
  const { exportBackup, importBackup, exportTransactionsBackup, importTransactionsBackup, purgeTransactions } = useData();

  // Export state
  const [exportBusy, setExportBusy] = useState(false);
  const [exportStatus, setExportStatus] = useState<Status>(null);

  // Import state
  const [importFile, setImportFile] = useState<{ name: string; parsed: BackupFileV1 } | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importStatus, setImportStatus] = useState<Status>(null);
  const [confirming, setConfirming] = useState(false);

  // Transactions-only state
  const [txBusy, setTxBusy] = useState<'export' | 'import' | 'purge' | null>(null);
  const [txStatus, setTxStatus] = useState<Status>(null);
  const [txPurgeConfirm, setTxPurgeConfirm] = useState(false);

  const download = (json: string) => {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jos-coffee-backup-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExport = async () => {
    setExportBusy(true); setExportStatus(null);
    try {
      const json = await exportBackup();
      download(json);
      setExportStatus({ kind: 'success', message: 'Backup downloaded successfully (includes user accounts and app settings).' });
    } catch (e: any) {
      setExportStatus({ kind: 'error', message: e?.message || 'Export failed' });
    } finally { setExportBusy(false); }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportStatus(null); setImportFile(null); setConfirming(false);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        const v = validateBackup(parsed);
        if (!v.ok) { setImportStatus({ kind: 'error', message: (v as { ok: false; error: string }).error }); return; }
        setImportFile({ name: file.name, parsed: v.file });
      } catch {
        setImportStatus({ kind: 'error', message: 'File is not valid JSON.' });
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = async () => {
    if (!importFile) return;
    setImportBusy(true); setImportStatus(null);
    const result = await importBackup(JSON.stringify(importFile.parsed));
    setImportBusy(false);
    if (result.success) {
      const c = result.counts || {};
      const lines = Object.entries(c).map(([k, v]) => `${k}: ${v}`).join(', ');
      setImportStatus({ kind: 'success', message: `Restore complete. ${lines}` });
      setImportFile(null); setConfirming(false);
    } else {
      setImportStatus({ kind: 'error', message: result.error || 'Restore failed' });
    }
  };

  const handleTxExport = async () => {
    setTxBusy('export'); setTxStatus(null);
    try {
      const json = await exportTransactionsBackup();
      download(json);
      setTxStatus({ kind: 'success', message: 'Transactions-only backup downloaded.' });
    } catch (e: any) {
      setTxStatus({ kind: 'error', message: e?.message || 'Export failed' });
    } finally { setTxBusy(null); }
  };

  const handleTxImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    setTxBusy('import'); setTxStatus(null);
    try {
      const text = await file.text();
      const result = await importTransactionsBackup(text);
      if (result.success) {
        const lines = Object.entries(result.counts || {}).map(([k, v]) => `${k}: ${v}`).join(', ');
        setTxStatus({ kind: 'success', message: `Transactions restored. ${lines}` });
      } else {
        setTxStatus({ kind: 'error', message: result.error || 'Import failed' });
      }
    } catch (err: any) {
      setTxStatus({ kind: 'error', message: err?.message || 'Import failed' });
    } finally {
      setTxBusy(null);
    }
  };

  const handleTxPurge = async () => {
    setTxBusy('purge'); setTxStatus(null);
    const result = await purgeTransactions();
    setTxBusy(null); setTxPurgeConfirm(false);
    if (result.success) {
      const lines = Object.entries(result.counts || {}).map(([k, v]) => `${k}: ${v}`).join(', ');
      setTxStatus({ kind: 'success', message: `Transactions purged. ${lines}` });
    } else {
      setTxStatus({ kind: 'error', message: result.error || 'Purge failed' });
    }
  };

  const counts = importFile ? backupCounts(importFile.parsed) : null;

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-foreground mb-2">Data Backup & Restore</h2>
      <p className="text-muted-foreground text-sm mb-6">Export or import all system data. Restore will overwrite existing records.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Export */}
        <div className="bg-card rounded-xl border border-border p-6">
          <Download size={32} className="text-primary mb-3" />
          <h3 className="font-display text-lg font-bold text-foreground mb-1">Export Backup</h3>
          <p className="text-muted-foreground text-sm mb-4">Download a complete JSON snapshot of categories, menu, transactions and settings.</p>
          <div className="flex flex-col gap-2">
            <button onClick={handleExport} disabled={exportBusy} className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-50">
              {exportBusy ? 'Exporting…' : 'Download Complete Backup'}
            </button>
          </div>
          {exportStatus && (
            <div className={`mt-4 p-3 rounded-xl text-sm ${exportStatus.kind === 'success' ? 'bg-accent text-accent-foreground' : 'bg-destructive/10 text-destructive'}`}>{exportStatus.message}</div>
          )}
        </div>

        {/* Import */}
        <div className="bg-card rounded-xl border border-border p-6">
          <Upload size={32} className="text-primary mb-3" />
          <h3 className="font-display text-lg font-bold text-foreground mb-1">Restore Backup</h3>
          <p className="text-muted-foreground text-sm mb-2">Replace all data with the contents of a backup file.</p>
          <div className="flex items-center gap-2 text-xs text-destructive mb-4"><AlertTriangle size={14} /><span>This permanently overwrites existing data.</span></div>

          <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm cursor-pointer hover:opacity-90">
            <FileJson size={16} /> Select Backup File
            <input type="file" accept=".json,application/json" onChange={handleFile} className="hidden" />
          </label>

          {importFile && counts && (
            <div className="mt-4 p-4 rounded-xl bg-muted text-sm space-y-2">
              <div className="font-semibold text-foreground">{importFile.name}</div>
              <div className="text-xs text-muted-foreground">Exported: {new Date(importFile.parsed.exported_at).toLocaleString()}</div>
              <div className="text-xs text-muted-foreground">Schema v{importFile.parsed.schema_version} · Users included: {importFile.parsed.users_passwords_included ? 'Yes' : 'No'}</div>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-foreground pt-1">
                <li>Categories: <strong>{counts.categories}</strong></li>
                <li>Menu items: <strong>{counts.menu_items}</strong></li>
                <li>Transactions: <strong>{counts.transactions}</strong></li>
                <li>Order items: <strong>{counts.order_items}</strong></li>
                <li>Users: <strong>{counts.app_users}</strong></li>
              </ul>

              {!confirming ? (
                <button onClick={() => setConfirming(true)} className="mt-3 w-full px-4 py-2 rounded-lg bg-destructive text-destructive-foreground font-semibold text-sm">Restore this backup…</button>
              ) : (
                <div className="mt-3 space-y-2">
                  <div className="text-xs text-destructive font-semibold mb-2">Are you sure you want to restore? This will replace all existing data.</div>
                  <div className="flex gap-2">
                    <button onClick={handleConfirmRestore} disabled={importBusy} className="flex-1 px-3 py-2 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold disabled:opacity-50">
                      {importBusy ? 'Restoring…' : 'Yes, Confirm Restore'}
                    </button>
                    <button onClick={() => setConfirming(false)} className="px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm">Cancel</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {importStatus && (
            <div className={`mt-4 p-3 rounded-xl text-sm ${importStatus.kind === 'success' ? 'bg-accent text-accent-foreground' : 'bg-destructive/10 text-destructive'}`}>{importStatus.message}</div>
          )}
        </div>
      </div>

      {/* Transactions-only backup (sales / orders / exchanges) */}
      <div className="mt-8 bg-card rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-3">
          <Receipt size={28} className="text-primary" />
          <div>
            <h3 className="font-display text-lg font-bold text-foreground">Transactions-Only Backup</h3>
            <p className="text-xs text-muted-foreground">Affects ONLY transactions, order items, and exchanges. Menu, categories, users, and settings are untouched.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button onClick={handleTxExport} disabled={txBusy !== null} className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
            <Download size={16} /> {txBusy === 'export' ? 'Exporting…' : 'Export Transactions'}
          </button>
          <label className={`px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground font-semibold text-sm flex items-center justify-center gap-2 ${txBusy !== null ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'}`}>
            <Upload size={16} /> {txBusy === 'import' ? 'Importing…' : 'Import Transactions'}
            <input type="file" accept=".json,application/json" onChange={handleTxImport} disabled={txBusy !== null} className="hidden" />
          </label>
          {!txPurgeConfirm ? (
            <button onClick={() => setTxPurgeConfirm(true)} disabled={txBusy !== null} className="px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive font-semibold text-sm hover:bg-destructive/20 disabled:opacity-50 flex items-center justify-center gap-2">
              <Trash2 size={16} /> Purge Transactions
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={handleTxPurge} disabled={txBusy !== null} className="flex-1 px-3 py-2.5 rounded-xl bg-destructive text-destructive-foreground text-sm font-semibold disabled:opacity-50">
                {txBusy === 'purge' ? 'Purging…' : 'Confirm Purge'}
              </button>
              <button onClick={() => setTxPurgeConfirm(false)} className="px-3 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm">Cancel</button>
            </div>
          )}
        </div>
        {txStatus && (
          <div className={`mt-4 p-3 rounded-xl text-sm ${txStatus.kind === 'success' ? 'bg-accent text-accent-foreground' : 'bg-destructive/10 text-destructive'}`}>{txStatus.message}</div>
        )}
        <div className="mt-3 flex items-center gap-2 text-xs text-destructive"><AlertTriangle size={14} /><span>Import and Purge permanently overwrite/delete current transactions and exchanges.</span></div>
      </div>
    </div>
  );
};

export default DataBackup;
