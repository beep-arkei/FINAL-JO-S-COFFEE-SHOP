import React, { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import type { User, UserRole } from '@/lib/data';
import { Plus, Trash2, Edit2 } from 'lucide-react';

const UserManagement = ({ onDirtyStateChange }: { onDirtyStateChange?: (dirty: boolean) => void }) => {
  const { users, addUser, updateUser, removeUser } = useData();
  const [editing, setEditing] = useState<User | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState(false);

  useEffect(() => {
    if (onDirtyStateChange) {
      onDirtyStateChange(isFormDirty);
    }
  }, [isFormDirty, onDirtyStateChange]);

  useEffect(() => {
    return () => {
      if (onDirtyStateChange) {
        onDirtyStateChange(false);
      }
    };
  }, [onDirtyStateChange]);

  const handleSave = async (user: User) => {
    if (isNew) {
      if (users.find(u => u.username === user.username)) { alert('Username already exists'); return; }
      await addUser({ username: user.username, password: user.password, role: user.role, active: user.active });
    } else {
      await updateUser(user.id, user);
    }
    setEditing(null); setIsNew(false);
    setIsFormDirty(false);
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Remove user "${user.username}"?`)) return;
    await removeUser(user.id);
  };

  const handleClose = () => {
    setEditing(null);
    setIsNew(false);
    setIsFormDirty(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div><h2 className="font-display text-2xl font-bold text-foreground">User Management</h2><p className="text-muted-foreground text-sm">Manage cashier and admin accounts</p></div>
        <button onClick={() => { setIsNew(true); setEditing({ id: '', username: '', password: '', role: 'cashier', active: true }); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"><Plus size={16} /> Add User</button>
      </div>
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <table className="w-full text-sm"><thead><tr className="border-b border-border bg-muted"><th className="text-left px-4 py-3 font-semibold text-foreground">Username</th><th className="text-left px-4 py-3 font-semibold text-foreground">Privilege</th><th className="text-left px-4 py-3 font-semibold text-foreground">Status</th><th className="text-right px-4 py-3 font-semibold text-foreground">Actions</th></tr></thead>
          <tbody>{users.map(user => (
            <tr key={user.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3 font-medium text-foreground">{user.username}</td>
              <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${user.role === 'admin' ? 'bg-primary/10 text-primary' : 'bg-accent text-accent-foreground'}`}>{user.role === 'admin' ? 'Admin' : 'Cashier'}</span></td>
              <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${user.active ? 'bg-accent text-accent-foreground' : 'bg-muted text-muted-foreground'}`}>{user.active ? 'Active' : 'Inactive'}</span></td>
              <td className="px-4 py-3 text-right"><div className="flex justify-end gap-1">
                <button onClick={() => { setEditing(user); setIsNew(false); }} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"><Edit2 size={14} /></button>
                <button onClick={() => handleDelete(user)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-destructive"><Trash2 size={14} /></button>
              </div></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {editing && (
        <div className="fixed inset-0 bg-foreground/40 flex items-center justify-center z-50" onClick={handleClose}>
          <div className="bg-card rounded-2xl shadow-xl w-96 animate-fade-in" onClick={e => e.stopPropagation()}>
            <UserForm user={editing} isNew={isNew} onSave={handleSave} onClose={handleClose} onDirtyChange={setIsFormDirty} />
          </div>
        </div>
      )}
    </div>
  );
};

function UserForm({ user, isNew, onSave, onClose, onDirtyChange }: { user: User; isNew: boolean; onSave: (u: User) => void; onClose: () => void; onDirtyChange: (dirty: boolean) => void }) {
  const [username, setUsername] = useState(user.username);
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>(user.role);
  const [active, setActive] = useState(user.active);

  const isDirty = username.trim() !== (user.username || '').trim() || password !== '' || role !== user.role || active !== user.active;

  useEffect(() => {
    onDirtyChange(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "Are you sure you want to exit?";
        return "Are you sure you want to exit?";
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault(); if (!username.trim()) return; if (isNew && !password) return;
    onSave({ id: user.id, username: username.trim(), password: password || '', role, active });
  };
  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <h3 className="font-display text-xl font-bold text-foreground">{isNew ? 'Add User' : 'Edit User'}</h3>
      <div><label className="text-sm font-medium text-foreground block mb-1">Username</label><input value={username} onChange={e => setUsername(e.target.value)} disabled={!isNew} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm disabled:opacity-50" required /></div>
      <div><label className="text-sm font-medium text-foreground block mb-1">{isNew ? 'Password' : 'New Password (leave blank to keep)'}</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm" required={isNew} /></div>
      <div><label className="text-sm font-medium text-foreground block mb-1">Privilege</label><select value={role} onChange={e => setRole(e.target.value as UserRole)} className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground text-sm"><option value="cashier">Cashier</option><option value="admin">Admin</option></select></div>
      <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="rounded" /> Active</label>
      <div className="flex gap-2 pt-2"><button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-muted text-muted-foreground font-semibold text-sm">Cancel</button><button type="submit" className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm">Save</button></div>
    </form>
  );
}

export default UserManagement;
