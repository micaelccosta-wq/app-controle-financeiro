import React from 'react';
import { Transaction, TransactionType } from '../types';
import { X, AlertCircle, Calendar, ArrowRight } from 'lucide-react';

interface PendingTransactionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactions: Transaction[];
    onGoToTransactions: () => void;
}

const PendingTransactionsModal: React.FC<PendingTransactionsModalProps> = ({
    isOpen,
    onClose,
    transactions,
    onGoToTransactions
}) => {
    if (!isOpen) return null;

    const overdue = transactions.filter(t => {
        const tDate = new Date(t.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        // Fix timezone issue
        const tDateLocal = new Date(tDate.getUTCFullYear(), tDate.getUTCMonth(), tDate.getUTCDate());
        return tDateLocal < today;
    });

    const upcoming = transactions.filter(t => !overdue.includes(t));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-full text-amber-600 dark:text-amber-400">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Atenção: Contas Pendentes</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">Verifique seus compromissos financeiros</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto space-y-6">

                    {overdue.length > 0 && (
                        <div>
                            <h4 className="text-sm font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <AlertCircle size={16} />
                                Vencidas ({overdue.length})
                            </h4>
                            <div className="space-y-2">
                                {overdue.map(t => (
                                    <div key={t.id} className="flex justify-between items-center p-3 bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 rounded-lg">
                                        <div>
                                            <p className="font-semibold text-slate-800 dark:text-slate-200">{t.description}</p>
                                            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
                                                Venceu em: {new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                            </p>
                                        </div>
                                        <span className="font-bold text-rose-700 dark:text-rose-400">
                                            {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {upcoming.length > 0 && (
                        <div>
                            <h4 className="text-sm font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                                <Calendar size={16} />
                                Próximos Vencimentos ({upcoming.length})
                            </h4>
                            <div className="space-y-2">
                                {upcoming.map(t => (
                                    <div key={t.id} className="flex justify-between items-center p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-lg">
                                        <div>
                                            <p className="font-semibold text-slate-800 dark:text-slate-200">{t.description}</p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                                Vence em: {new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                            </p>
                                        </div>
                                        <span className="font-bold text-slate-700 dark:text-slate-300">
                                            {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {overdue.length === 0 && upcoming.length === 0 && (
                        <p className="text-center text-slate-500 py-4">Nenhuma conta pendente encontrada.</p>
                    )}

                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        Fechar
                    </button>
                    <button
                        onClick={() => {
                            onGoToTransactions();
                            onClose();
                        }}
                        className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2"
                    >
                        Ir para Transações
                        <ArrowRight size={16} />
                    </button>
                </div>

            </div>
        </div>
    );
};

export default PendingTransactionsModal;
