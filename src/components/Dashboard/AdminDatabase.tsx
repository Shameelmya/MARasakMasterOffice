import { useState, ChangeEvent } from 'react';
import { Download, Upload, AlertOctagon, Trash2, AlertTriangle, List } from 'lucide-react';
import { deleteDoc, setDoc } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { Task, User, BackupMeta } from '../../types';
import { getDocRef, firebaseConfig } from '../../services/firebase';
import { formatDate, getNow } from '../../utils/formatters';
import { ShieldAlert } from 'lucide-react';

interface AdminDatabaseProps {
  tasks: Task[];
  users: User[];
  backupMeta: BackupMeta;
  updateBackupMeta: (updates: Partial<BackupMeta>) => Promise<void>;
  triggerConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    isDanger?: boolean,
    confirmText?: string
  ) => void;
  categories: string[];
  designations: string[];
  inputTypes: string[];
}

export function AdminDatabase({
  tasks,
  users,
  backupMeta,
  updateBackupMeta,
  triggerConfirm,
  categories,
  designations,
  inputTypes
}: AdminDatabaseProps) {
  const [backupTarget, setBackupTarget] = useState('all');
  const [resetTarget, setResetTarget] = useState('all');
  const [resetText, setResetText] = useState('');
  const [migrateText, setMigrateText] = useState('');
  const [listType, setListType] = useState<'categories' | 'designations' | 'inputTypes'>('categories');
  const [deleteItemText, setDeleteItemText] = useState('');

  const handleBackup = async () => {
    const exportData = backupTarget === 'all' 
      ? tasks 
      : tasks.filter(t => t.assignedTo.includes(backupTarget));
    
    if (exportData.length === 0) {
      alert("No data to backup for this selection.");
      return;
    }
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `MLA_Backup_${backupTarget}_${new Date().toISOString()}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();

    const targetName = backupTarget === 'all' ? 'All Data' : users.find(u => u.id === backupTarget)?.name || backupTarget;
    await updateBackupMeta({ lastBackup: getNow(), lastBackupType: targetName });
  };

  const handleImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!Array.isArray(data)) {
          alert("Invalid Backup File Format.");
          return;
        }
        triggerConfirm(
          "Confirm File Import", 
          `Are you sure you want to restore ${data.length} records into your database? Note that files with existing matching IDs will be rewritten.`, 
          async () => {
            let count = 0;
            for (const task of data) {
              if (task.id) {
                const targetCol = (task.status === 'Completed' || task.status === 'Unsolved') ? 'archived_tasks' : 'tasks';
                await setDoc(getDocRef(targetCol, task.id), task);
                count++; 
              }
            }
            await updateBackupMeta({ lastImport: getNow(), lastImportCount: count });
            alert(`Successfully imported and updated ${count} records!`);
          }, 
          false, 
          "Import Data"
        );
        e.target.value = '';
      } catch(err) {
        alert("Error parsing JSON file. Make sure it's a valid backup file.");
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleReset = () => {
    const targetName = resetTarget === 'all' ? 'All' : users.find(u => u.id === resetTarget)?.name || resetTarget;
    const expectedPhrase = resetTarget === 'all' ? 'Delete Data All' : `Delete Data of ${targetName}`;
    if (resetText !== expectedPhrase) {
      alert(`Verification text does not match! You must type exactly:\n${expectedPhrase}`);
      return;
    }
    triggerConfirm(
      "PERMANENT DATABASE ERASE WARNING", 
      `You are performing a highly critical action. Erasing ${targetName} data is permanent. Are you absolutely certain you want to proceed?`, 
      async () => {
        const tasksToDelete = resetTarget === 'all' 
          ? tasks 
          : tasks.filter(t => t.assignedTo.includes(resetTarget));
        let count = 0;
        for (const t of tasksToDelete) {
          const targetCol = (t.status === 'Completed' || t.status === 'Unsolved') ? 'archived_tasks' : 'tasks';
          await deleteDoc(getDocRef(targetCol, t.id));
          count++;
        }
        setResetText('');
        alert(`Successfully cleared ${count} records from database.`);
      }, 
      true, 
      "Permanently Erase"
    );
  };

  const currentList = listType === 'categories' ? categories : listType === 'designations' ? designations : inputTypes;

  const handleDeleteListItem = (item: string) => {
    if (deleteItemText.toLowerCase() !== 'delete') {
      alert("You must type exactly 'Delete' to confirm removal.");
      return;
    }
    triggerConfirm(
      "Confirm Removal",
      `Are you sure you want to completely remove '${item}' from the global list?`,
      async () => {
        const docRef = getDocRef('settings', 'globals');
        const newList = currentList.filter(i => i !== item);
        await setDoc(docRef, { [listType]: newList }, { merge: true });
        setDeleteItemText('');
        alert(`Successfully removed '${item}'.`);
      },
      true,
      "Remove Item"
    );
  };

  const handleMigration = async () => {
    if (migrateText !== 'MIGRATE NOW') {
      alert("You must type exactly 'MIGRATE NOW' to confirm.");
      return;
    }
    triggerConfirm(
      "Start Security Migration",
      "This will create secure Firebase Auth accounts for all users and remove their plaintext passwords. Make sure the app is in maintenance mode.",
      async () => {
        try {
          const secondaryApp = initializeApp(firebaseConfig, 'SecondaryMigrationApp' + Date.now());
          const secondaryAuth = getAuth(secondaryApp);
          let count = 0;

          for (const u of users) {
            if (!u.email) {
              const email = `${u.id.toLowerCase().replace(/[^a-z0-9]/g, '')}@marazak.local`;
              const basePass = u.pass || '123456';
              const password = basePass.length < 6 ? basePass.padEnd(6, '0') : basePass;

              try {
                const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
                const updatedUser = { ...u, email, authUid: cred.user.uid };
                delete (updatedUser as any).pass;
                await setDoc(getDocRef('users', u.id), updatedUser);
                count++;
                await signOut(secondaryAuth);
              } catch (err: any) {
                console.error(`Failed to migrate user ${u.name}:`, err);
                if (err.code === 'auth/email-already-in-use') {
                   const updatedUser = { ...u, email };
                   delete (updatedUser as any).pass;
                   await setDoc(getDocRef('users', u.id), updatedUser);
                }
              }
            }
          }
          alert(`Successfully migrated ${count} users to secure authentication!`);
          setMigrateText('');
        } catch (e) {
          console.error("Migration Error", e);
          alert("Migration failed. See console.");
        }
      },
      true,
      "Begin Migration"
    );
  };

  return (
    <div id="admin-database" className="space-y-6 animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-6">
          <Download className="text-purple-600"/> Data Backup (Export JSON)
        </h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Select Data to Backup</label>
            <select 
              value={backupTarget} 
              onChange={e => setBackupTarget(e.target.value)} 
              className="w-full px-4 py-3 bg-[#F4F7FB] border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 mb-4 bg-white"
            >
              <option value="all">Entire Database (All Officers & Admin)</option>
              {users.map(u => <option key={u.id} value={u.id}>Only {u.name}'s Data</option>)}
            </select>
            <button 
              onClick={handleBackup} 
              className="bg-purple-600 text-white font-bold py-3 px-6 rounded-2xl hover:bg-purple-700 hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2 shadow transition-colors"
            >
              <Download size={18}/> Generate & Download JSON
            </button>
          </div>
          <div className="bg-blue-50 p-5 rounded-2xl border border-blue-100 h-full flex flex-col justify-center">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Last Backup Information</p>
            {backupMeta?.lastBackup ? (
              <>
                <p className="font-bold text-blue-900 text-lg">{formatDate(backupMeta.lastBackup)}</p>
                <p className="text-sm font-medium text-blue-700">Type: <span className="font-bold">{backupMeta.lastBackupType}</span></p>
              </>
            ) : (
              <p className="font-bold text-blue-900">No previous backups recorded.</p>
            )}
          </div>
        </div>
      </div>
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-6">
          <Upload className="text-indigo-600"/> Data Restore (Import JSON)
        </h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Upload JSON File</label>
            <input 
              type="file" 
              accept=".json" 
              onChange={handleImport} 
              className="w-full px-4 py-3 bg-[#F4F7FB] border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 mb-4 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 bg-white" 
            />
            <p className="text-xs font-medium text-slate-500 flex items-center gap-1">
              <AlertTriangle size={12}/> If importing duplicated IDs, existing records will be perfectly overwritten without loss of new data.
            </p>
          </div>
          <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 h-full flex flex-col justify-center">
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Last Import Information</p>
            {backupMeta?.lastImport ? (
              <>
                <p className="font-bold text-indigo-900 text-lg">{formatDate(backupMeta.lastImport)}</p>
                <p className="text-sm font-medium text-indigo-700">Records Restored: <span className="font-bold">{backupMeta.lastImportCount}</span></p>
              </>
            ) : (
              <p className="font-bold text-indigo-900">No previous imports recorded.</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-8">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2 mb-6">
          <List className="text-pink-600"/> Manage Dropdown Lists
        </h2>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest block mb-2">Select List to Manage</label>
            <select 
              value={listType} 
              onChange={e => {
                setListType(e.target.value as any);
                setDeleteItemText('');
              }} 
              className="w-full px-4 py-3 bg-[#F4F7FB] border border-slate-200 rounded-2xl font-bold text-slate-700 outline-none focus:ring-2 focus:ring-pink-500 mb-6 bg-white"
            >
              <option value="categories">Categories</option>
              <option value="designations">Designations</option>
              <option value="inputTypes">Input Types</option>
            </select>
            
            <label className="text-[10px] font-bold text-pink-500 uppercase tracking-widest block mb-2">
              Type <span className="font-mono bg-pink-100 px-1 text-pink-700">Delete</span> below to enable item removal:
            </label>
            <input 
              type="text" 
              value={deleteItemText} 
              onChange={e => setDeleteItemText(e.target.value)} 
              placeholder="Type 'Delete' here..." 
              className="w-full px-4 py-3 bg-white border border-pink-200 rounded-2xl font-bold text-pink-900 outline-none focus:ring-2 focus:ring-pink-500 text-pink-800 bg-white" 
            />
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-h-[300px] overflow-y-auto">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-200 pb-2">
              Current {listType} ({currentList.length})
            </h3>
            <ul className="space-y-2">
              {currentList.map(item => (
                <li key={item} className="flex justify-between items-center bg-white border border-slate-200 p-2.5 rounded-xl shadow-sm hover:shadow transition-shadow">
                  <span className="text-sm font-semibold text-slate-700">{item}</span>
                  <button 
                    onClick={() => handleDeleteListItem(item)}
                    disabled={deleteItemText.toLowerCase() !== 'delete'}
                    className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-500 hover:text-white disabled:opacity-30 disabled:hover:bg-red-50 disabled:hover:text-red-500 transition-colors"
                    title={deleteItemText.toLowerCase() === 'delete' ? 'Remove Item' : "Type 'Delete' to enable"}
                  >
                    <Trash2 size={16}/>
                  </button>
                </li>
              ))}
              {currentList.length === 0 && (
                <li className="text-sm font-semibold text-slate-400 text-center py-4">No items found.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-3xl shadow-sm border-2 border-red-200 p-8 relative overflow-hidden">
        <div className="absolute -right-10 -top-10 opacity-5 scale-150 text-red-600 pointer-events-none">
          <AlertOctagon size={200}/>
        </div>
        
        <h2 className="text-2xl font-bold text-red-700 flex items-center gap-2 mb-6 relative z-10">
          <ShieldAlert className="text-red-600"/> Security Migration (One-Time)
        </h2>
        <div className="bg-red-50 p-8 rounded-[20px] border border-red-100 relative z-10 mb-8">
          <p className="text-sm font-medium text-red-800 mb-4">
            Convert all plaintext passwords to secure Firebase Auth accounts. Generates internal emails and enforces 6-character passwords.
          </p>
          <label className="text-[10px] font-bold text-red-500 uppercase tracking-widest block mb-2">
            Type <span className="font-mono bg-red-200 px-1 text-red-800">MIGRATE NOW</span> to confirm:
          </label>
          <input 
            type="text" 
            value={migrateText} 
            onChange={e => setMigrateText(e.target.value)} 
            placeholder="Type 'MIGRATE NOW' here..." 
            className="w-full px-4 py-3 bg-white border border-red-200 rounded-2xl font-bold text-red-900 outline-none focus:ring-2 focus:ring-red-500 mb-4 text-red-800 bg-white" 
          />
          <button 
            onClick={handleMigration} 
            className="w-full bg-red-600 text-white font-bold py-3 px-6 rounded-2xl hover:bg-red-700 flex items-center justify-center gap-2 shadow transition-colors"
          >
            <ShieldAlert size={18}/> MIGRATE SYSTEM SECURITY
          </button>
        </div>

        <h2 className="text-2xl font-bold text-red-700 flex items-center gap-2 mb-6 relative z-10 border-t border-red-200 pt-8">
          <AlertOctagon className="text-red-600"/> Danger Zone: System Erase
        </h2>
        <div className="bg-red-50 p-8 rounded-[20px] border border-red-100 relative z-10">
          <label className="text-xs font-bold text-red-500 uppercase tracking-widest block mb-2">Select Data to Delete Permanently</label>
          <select 
            value={resetTarget} 
            onChange={e => setResetTarget(e.target.value)} 
            className="w-full px-4 py-3 bg-white border border-red-200 rounded-2xl font-bold text-red-900 outline-none focus:ring-2 focus:ring-red-500 mb-6 text-red-800"
          >
            <option value="all">Entire Database (All Officers & Admin)</option>
            {users.map(u => <option key={u.id} value={u.id}>Only {u.name}'s Data</option>)}
          </select>
          <label className="text-[10px] font-bold text-red-500 uppercase tracking-widest block mb-2">
            Type <span className="font-mono bg-red-200 px-1 text-red-800">{resetTarget === 'all' ? 'Delete Data All' : `Delete Data of ${users.find(u => u.id === resetTarget)?.name || resetTarget}`}</span> to confirm:
          </label>
          <input 
            type="text" 
            value={resetText} 
            onChange={e => setResetText(e.target.value)} 
            placeholder="Strict verification text..." 
            className="w-full px-4 py-3 bg-white border border-red-200 rounded-2xl font-bold text-red-900 outline-none focus:ring-2 focus:ring-red-500 mb-4 text-red-800 bg-white" 
          />
          <button 
            onClick={handleReset} 
            className="w-full bg-red-600 text-white font-bold py-3 px-6 rounded-2xl hover:bg-red-700 flex items-center justify-center gap-2 shadow transition-colors"
          >
            <Trash2 size={18}/> PERMANENTLY DELETE DATA
          </button>
        </div>
      </div>
    </div>
  );
}
