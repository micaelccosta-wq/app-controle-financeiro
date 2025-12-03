import React, { useState, useEffect } from 'react';
import { X, Settings, Bell, Cloud, Moon, Sun, Save, HelpCircle, CheckCircle2 } from 'lucide-react';
import { GoogleDriveConfig } from '../types';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    // Notification Settings
    notificationDays: number;
    onSaveNotificationDays: (days: number) => void;
    // Cloud Settings
    driveConfig: GoogleDriveConfig;
    onSaveDriveConfig: (config: GoogleDriveConfig) => void;
    onManualDriveBackup: () => void;
    driveStatus?: string;
    // Dark Mode Settings
    darkMode: boolean;
    onToggleDarkMode: (enabled: boolean) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
    isOpen,
    onClose,
    notificationDays,
    onSaveNotificationDays,
    driveConfig,
    onSaveDriveConfig,
    onManualDriveBackup,
    driveStatus,
    darkMode,
    onToggleDarkMode
}) => {
    const [activeTab, setActiveTab] = useState<'general' | 'cloud' | 'appearance'>('general');

    // Local state for inputs
    const [localNotificationDays, setLocalNotificationDays] = useState(notificationDays);

    // Drive Config State
    const [folderId, setFolderId] = useState(driveConfig.folderId);
    const [driveEnabled, setDriveEnabled] = useState(driveConfig.enabled);

    useEffect(() => {
        if (isOpen) {
            setLocalNotificationDays(notificationDays);
            setFolderId(driveConfig.folderId);
            setDriveEnabled(driveConfig.enabled);
        }
    }, [isOpen, notificationDays, driveConfig]);

    if (!isOpen) return null;

    const handleSaveGeneral = () => {
        onSaveNotificationDays(localNotificationDays);
        alert("Configurações gerais salvas!");
    };

    const handleSaveCloud = () => {
        onSaveDriveConfig({
            enabled: driveEnabled,
            clientId: '', // Client ID is now global
            folderId
        });
        alert("Configurações de nuvem salvas!");
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                    <div className="flex items-center gap-2">
                        <div className="bg-slate-200 dark:bg-slate-700 p-1.5 rounded text-slate-700 dark:text-slate-200">
                            <Settings size={20} />
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Configurações</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex flex-col md:flex-row h-full overflow-hidden">
                    {/* Sidebar Tabs */}
                    <div className="w-full md:w-48 bg-slate-50 dark:bg-slate-900/50 border-r border-slate-100 dark:border-slate-700 p-2 flex flex-row md:flex-col gap-1 overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('general')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'general'
                                ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            <Bell size={16} /> Geral
                        </button>
                        <button
                            onClick={() => setActiveTab('cloud')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'cloud'
                                ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            <Cloud size={16} /> Nuvem
                        </button>
                        <button
                            onClick={() => setActiveTab('appearance')}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'appearance'
                                ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                        >
                            {darkMode ? <Moon size={16} /> : <Sun size={16} />} Aparência
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 p-6 overflow-y-auto bg-white dark:bg-slate-800">

                        {/* GENERAL TAB */}
                        {activeTab === 'general' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                        <Bell size={18} className="text-blue-500" /> Notificações
                                    </h4>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                                Alerta de Contas a Pagar (dias de antecedência)
                                            </label>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                                O app irá verificar contas pendentes ao iniciar.
                                            </p>
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max="30"
                                                    value={localNotificationDays}
                                                    onChange={(e) => setLocalNotificationDays(parseInt(e.target.value) || 0)}
                                                    className="w-20 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 dark:text-white"
                                                />
                                                <span className="text-sm text-slate-600 dark:text-slate-400">dias</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                                    <button
                                        onClick={handleSaveGeneral}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                                    >
                                        <Save size={16} /> Salvar Alterações
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* CLOUD TAB */}
                        {activeTab === 'cloud' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-4 mb-4">
                                    <h4 className="font-bold text-blue-800 dark:text-blue-300 text-sm flex items-center gap-2">
                                        <Cloud size={16} /> Configuração Google Drive
                                    </h4>
                                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                                        O backup utiliza a autenticação padrão do aplicativo. Você só precisa informar a pasta de destino.
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">Status</label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={driveEnabled}
                                                onChange={e => setDriveEnabled(e.target.checked)}
                                                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Habilitar Backup Automático no Drive</span>
                                        </label>
                                    </div>

                                    {/* Client ID removed - using global config */}

                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
                                            Folder ID <HelpCircle size={12} title="O ID da pasta é a parte final da URL quando você abre a pasta no Drive." className="text-slate-400" />
                                        </label>
                                        <input
                                            type="text"
                                            value={folderId}
                                            onChange={e => setFolderId(e.target.value)}
                                            placeholder="Ex: 1A2b3C..."
                                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-mono outline-none focus:border-blue-500 bg-white dark:bg-slate-700 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-700">
                                    <button
                                        onClick={handleSaveCloud}
                                        className="flex-1 bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                    >
                                        <Save size={16} /> Salvar Configuração
                                    </button>
                                    <button
                                        onClick={onManualDriveBackup}
                                        disabled={!driveEnabled}
                                        className="flex-1 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Testar Backup Agora
                                    </button>
                                </div>

                                {driveStatus && (
                                    <div className={`text-xs text-center font-medium p-2 rounded ${driveStatus === 'Backup OK' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' :
                                        (driveStatus.includes('Erro') || driveStatus.includes('Falha') ? 'bg-rose-50 text-rose-500 dark:bg-rose-900/20 dark:text-rose-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400')
                                        }`}>
                                        Status: {driveStatus}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* APPEARANCE TAB */}
                        {activeTab === 'appearance' && (
                            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                                        {darkMode ? <Moon size={18} className="text-indigo-400" /> : <Sun size={18} className="text-amber-500" />}
                                        Aparência
                                    </h4>

                                    <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium text-slate-800 dark:text-slate-200">Modo Escuro</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                                    Alterne entre temas claro e escuro para melhor conforto visual.
                                                </p>
                                            </div>

                                            <button
                                                onClick={() => onToggleDarkMode(!darkMode)}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${darkMode ? 'bg-indigo-600' : 'bg-slate-200'
                                                    }`}
                                            >
                                                <span
                                                    className={`${darkMode ? 'translate-x-6' : 'translate-x-1'
                                                        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
