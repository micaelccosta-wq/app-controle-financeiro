
import React, { useRef, useState } from 'react';
import { X, Download, Upload, Save, RefreshCw, AlertTriangle, CheckCircle2, ShieldCheck, HardDrive, Cloud, Settings, HelpCircle, FileJson, ArrowRight } from 'lucide-react';
import { Transaction, Account, Category, Budget, BackupData, FinancialGoal, WealthConfig, GoogleDriveConfig } from '../types';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: {
    transactions: Transaction[];
    accounts: Account[];
    categories: Category[];
    budgets: Budget[];
    goals: FinancialGoal[];
    wealthConfig: WealthConfig;
  };
  onRestore: (data: BackupData) => void;
  driveConfig: GoogleDriveConfig;
  onSaveDriveConfig: (config: GoogleDriveConfig) => void;
  onManualDriveBackup: () => void;
}

const BackupModal: React.FC<BackupModalProps> = ({ 
  isOpen, onClose, data, onRestore, driveConfig, onSaveDriveConfig, onManualDriveBackup 
}) => {
  const [activeTab, setActiveTab] = useState<'export' | 'import' | 'cloud'>('export');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Restore State
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'preview' | 'success' | 'error'>('idle');
  const [previewData, setPreviewData] = useState<BackupData | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Drive Config State
  const [clientId, setClientId] = useState(driveConfig.clientId);
  const [folderId, setFolderId] = useState(driveConfig.folderId);
  const [driveEnabled, setDriveEnabled] = useState(driveConfig.enabled);

  if (!isOpen) return null;

  const handleTabChange = (tab: 'export' | 'import' | 'cloud') => {
      setActiveTab(tab);
      setRestoreStatus('idle');
      setPreviewData(null);
      setErrorMessage('');
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleExport = () => {
    const backup: BackupData = {
      version: 1,
      timestamp: new Date().toISOString(),
      transactions: data.transactions,
      accounts: data.accounts,
      categories: data.categories,
      budgets: data.budgets,
      goals: data.goals,
      wealthConfig: data.wealthConfig,
      googleDriveConfig: driveConfig
    };

    const jsonString = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    const dateStr = new Date().toISOString().split('T')[0];
    link.download = `financas-backup-${dateStr}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);

        // Basic Validation
        if (!Array.isArray(parsed.transactions) || !Array.isArray(parsed.accounts) || !Array.isArray(parsed.categories)) {
           throw new Error("Formato de arquivo inválido. Estrutura de dados corrompida ou antiga.");
        }

        setPreviewData(parsed as BackupData);
        setRestoreStatus('preview');
        setErrorMessage('');
      } catch (err) {
        setRestoreStatus('error');
        setErrorMessage("Erro ao ler o arquivo JSON. Verifique se é um backup válido.");
        setPreviewData(null);
      }
    };
    reader.readAsText(file);
  };

  const confirmRestore = () => {
      if (previewData) {
          onRestore(previewData);
          setRestoreStatus('success');
          onClose();
      }
  };

  const handleSaveConfig = () => {
     onSaveDriveConfig({
        enabled: driveEnabled,
        clientId,
        folderId
     });
     alert("Configurações salvas!");
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-100 p-1.5 rounded text-indigo-600">
              <HardDrive size={20} />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">Backup e Restauração</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
           <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
              <button 
                 onClick={() => handleTabChange('export')}
                 className={`flex-1 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'export' ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}
              >
                 <Download size={16}/> Exportar
              </button>
              <button 
                 onClick={() => handleTabChange('import')}
                 className={`flex-1 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'import' ? 'bg-white shadow text-emerald-700' : 'text-slate-500'}`}
              >
                 <Upload size={16}/> Restaurar
              </button>
              <button 
                 onClick={() => handleTabChange('cloud')}
                 className={`flex-1 py-2 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'cloud' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}
              >
                 <Cloud size={16}/> Nuvem
              </button>
           </div>

           {activeTab === 'export' && (
             <div className="text-center space-y-4 py-4 animate-in fade-in">
                <div className="bg-indigo-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-indigo-500 mb-2">
                   <ShieldCheck size={40} />
                </div>
                <div>
                   <h4 className="font-bold text-slate-800 text-lg">Salvar cópia local</h4>
                   <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                     Baixe um arquivo JSON com todos os seus dados.
                   </p>
                </div>
                
                <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 border border-slate-200 text-left space-y-1 mx-4">
                   <p>• {data.transactions.length} Movimentações</p>
                   <p>• {data.accounts.length} Contas</p>
                   <p>• {data.categories.length} Categorias</p>
                   <p>• {data.budgets.length} Orçamentos</p>
                </div>

                <button 
                  onClick={handleExport}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-3 rounded-xl font-medium shadow-md transition-all flex items-center gap-2 mx-auto"
                >
                   <Save size={18} />
                   Baixar Arquivo .JSON
                </button>
             </div>
           )}

           {activeTab === 'import' && (
             <div className="text-center space-y-4 py-4 animate-in fade-in">
                
                {/* State: IDLE (No file selected) */}
                {restoreStatus === 'idle' && (
                  <>
                    <div className="bg-emerald-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto text-emerald-500 mb-2">
                      <RefreshCw size={40} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-lg">Restaurar de um arquivo</h4>
                      <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                        Selecione um arquivo de backup (.json) para recuperar seus dados.
                      </p>
                      <p className="text-xs text-rose-500 font-bold mt-2 flex items-center justify-center gap-1">
                        <AlertTriangle size={12}/>
                        Isso substituirá os dados atuais.
                      </p>
                    </div>

                    <input 
                       type="file" 
                       accept=".json,.bkp"
                       ref={fileInputRef}
                       onChange={handleFileChange}
                       className="hidden"
                    />
                    
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-xl font-medium shadow-md transition-all flex items-center gap-2 mx-auto"
                    >
                      <Upload size={18} />
                      Selecionar Arquivo
                    </button>
                  </>
                )}

                {/* State: PREVIEW (File loaded, waiting confirmation) */}
                {restoreStatus === 'preview' && previewData && (
                    <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 text-left animate-in slide-in-from-bottom-2">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
                            <FileJson className="text-emerald-600" size={20} />
                            Resumo do Arquivo
                        </h4>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm mb-6">
                            <div className="bg-white p-3 rounded border border-slate-200">
                                <p className="text-xs text-slate-500 uppercase font-bold">Movimentações</p>
                                <p className="text-lg font-bold text-slate-700">{previewData.transactions?.length || 0}</p>
                            </div>
                            <div className="bg-white p-3 rounded border border-slate-200">
                                <p className="text-xs text-slate-500 uppercase font-bold">Contas</p>
                                <p className="text-lg font-bold text-slate-700">{previewData.accounts?.length || 0}</p>
                            </div>
                            <div className="bg-white p-3 rounded border border-slate-200">
                                <p className="text-xs text-slate-500 uppercase font-bold">Categorias</p>
                                <p className="text-lg font-bold text-slate-700">{previewData.categories?.length || 0}</p>
                            </div>
                            <div className="bg-white p-3 rounded border border-slate-200">
                                <p className="text-xs text-slate-500 uppercase font-bold">Orçamentos</p>
                                <p className="text-lg font-bold text-slate-700">{previewData.budgets?.length || 0}</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => { setRestoreStatus('idle'); setPreviewData(null); }}
                                className="flex-1 px-4 py-2 border border-slate-300 bg-white text-slate-600 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
                            >
                                Cancelar
                            </button>
                            <button 
                                onClick={confirmRestore}
                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg shadow-sm transition-colors text-sm font-medium flex items-center justify-center gap-2"
                            >
                                <CheckCircle2 size={16} />
                                Confirmar Restauração
                            </button>
                        </div>
                    </div>
                )}

                {/* State: ERROR */}
                {restoreStatus === 'error' && (
                    <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 text-rose-700">
                        <div className="flex flex-col items-center gap-2">
                            <AlertTriangle size={32} />
                            <p className="font-bold">Falha na leitura</p>
                            <p className="text-sm">{errorMessage}</p>
                            <button 
                                onClick={() => setRestoreStatus('idle')}
                                className="mt-2 text-xs underline hover:text-rose-900"
                            >
                                Tentar novamente
                            </button>
                        </div>
                    </div>
                )}
             </div>
           )}

           {activeTab === 'cloud' && (
             <div className="space-y-4 animate-in fade-in">
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4">
                   <h4 className="font-bold text-blue-800 text-sm flex items-center gap-2">
                      <Settings size={16} /> Configuração Google Drive
                   </h4>
                   <p className="text-xs text-blue-600 mt-1">
                      Para backup automático, você precisa de um <b>Client ID</b> do Google Cloud Console.
                   </p>
                </div>

                <div className="space-y-3">
                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Status</label>
                      <label className="flex items-center gap-2 cursor-pointer">
                         <input 
                           type="checkbox" 
                           checked={driveEnabled}
                           onChange={e => setDriveEnabled(e.target.checked)}
                           className="w-4 h-4 rounded border-slate-300 text-blue-600"
                         />
                         <span className="text-sm font-medium text-slate-700">Habilitar Backup Automático no Drive</span>
                      </label>
                   </div>

                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1">Google Client ID</label>
                      <input 
                        type="text" 
                        value={clientId}
                        onChange={e => setClientId(e.target.value)}
                        placeholder="Ex: 12345...apps.googleusercontent.com"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono outline-none focus:border-blue-500"
                      />
                   </div>

                   <div>
                      <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                         Folder ID <HelpCircle size={12} title="O ID da pasta é a parte final da URL quando você abre a pasta no Drive." className="text-slate-400"/>
                      </label>
                      <input 
                        type="text" 
                        value={folderId}
                        onChange={e => setFolderId(e.target.value)}
                        placeholder="Ex: 1A2b3C..."
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono outline-none focus:border-blue-500"
                      />
                   </div>
                </div>

                <div className="flex gap-3 pt-2">
                   <button 
                     onClick={handleSaveConfig}
                     className="flex-1 bg-slate-800 text-white py-2 rounded-lg text-sm font-medium hover:bg-slate-900 transition-colors"
                   >
                     Salvar Configuração
                   </button>
                   <button 
                     onClick={onManualDriveBackup}
                     disabled={!driveEnabled}
                     className="flex-1 border border-blue-200 text-blue-700 bg-blue-50 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
                   >
                     Testar Backup Agora
                   </button>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default BackupModal;
