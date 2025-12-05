import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, ArrowRight, CheckCircle2, Wallet } from 'lucide-react';
import { Account, AccountType } from '../types';

interface TransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    accounts: Account[];
    onConfirm: (amount: number, date: string, fromAccountId: string, toAccountId: string, observations: string) => void;
}

const TransferModal: React.FC<TransferModalProps> = ({ isOpen, onClose, accounts, onConfirm }) => {
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [fromAccountId, setFromAccountId] = useState('');
    const [toAccountId, setToAccountId] = useState('');
    const [observations, setObservations] = useState('');

    // Filter valid accounts (BANK and INVESTMENT only)
    const validAccounts = accounts.filter(a =>
        a.type === AccountType.BANK || a.type === AccountType.INVESTMENT
    );

    useEffect(() => {
        if (isOpen) {
            // Reset form on open
            setAmount('');
            setDate(new Date().toISOString().split('T')[0]);
            setObservations('');

            // Smart default selection
            if (validAccounts.length >= 2) {
                setFromAccountId(validAccounts[0].id);
                setToAccountId(validAccounts[1].id);
            } else if (validAccounts.length === 1) {
                setFromAccountId(validAccounts[0].id);
                setToAccountId('');
            }
        }
    }, [isOpen, accounts]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!amount || !fromAccountId || !toAccountId) return;
        if (fromAccountId === toAccountId) {
            alert("A conta de origem e destino devem ser diferentes.");
            return;
        }

        onConfirm(parseFloat(amount), date, fromAccountId, toAccountId, observations);
        onClose();
    };

    const getAccountLabel = (id: string) => {
        const acc = accounts.find(a => a.id === id);
        if (!acc) return '';
        const icon = acc.type === AccountType.INVESTMENT ? '📈' : '🏦';
        return `${icon} ${acc.name}`;
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <div className="flex items-center gap-2">
                        <div className="bg-blue-100 p-1.5 rounded text-blue-600">
                            <ArrowRightLeft size={20} />
                        </div>
                        <h3 className="font-bold text-slate-800 text-lg">Nova Transferência</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Valor da Transferência</label>
                        <div className="relative">
                            <span className="absolute left-4 top-2.5 text-slate-500 font-medium">R$</span>
                            <input
                                type="number"
                                step="0.01"
                                required
                                autoFocus
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0,00"
                                className="w-full pl-10 pr-4 py-2.5 text-lg font-semibold text-slate-800 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Accounts Flow */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">De (Origem)</label>
                            <div className="relative">
                                <select
                                    value={fromAccountId}
                                    onChange={(e) => setFromAccountId(e.target.value)}
                                    required
                                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none bg-white appearance-none"
                                >
                                    <option value="" disabled>Selecione...</option>
                                    {validAccounts.map(acc => (
                                        <option key={acc.id} value={acc.id} disabled={acc.id === toAccountId}>
                                            {acc.name} ({acc.type === AccountType.INVESTMENT ? 'Investimento' : 'Conta Corrente'})
                                        </option>
                                    ))}
                                </select>
                                <Wallet className="absolute left-3 top-2.5 text-rose-500 w-4 h-4 pointer-events-none" />
                            </div>
                        </div>

                        <div className="flex justify-center -my-1 relative z-10">
                            <div className="bg-slate-200 rounded-full p-1 border-2 border-white">
                                <ArrowRight size={16} className="text-slate-500" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Para (Destino)</label>
                            <div className="relative">
                                <select
                                    value={toAccountId}
                                    onChange={(e) => setToAccountId(e.target.value)}
                                    required
                                    className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white appearance-none"
                                >
                                    <option value="" disabled>Selecione...</option>
                                    {validAccounts.map(acc => (
                                        <option key={acc.id} value={acc.id} disabled={acc.id === fromAccountId}>
                                            {acc.name} ({acc.type === AccountType.INVESTMENT ? 'Investimento' : 'Conta Corrente'})
                                        </option>
                                    ))}
                                </select>
                                <Wallet className="absolute left-3 top-2.5 text-emerald-500 w-4 h-4 pointer-events-none" />
                            </div>
                        </div>
                    </div>

                    {/* Date */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
                        <input
                            type="date"
                            required
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    {/* Observations */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Observações (Opcional)</label>
                        <textarea
                            rows={2}
                            value={observations}
                            onChange={(e) => setObservations(e.target.value)}
                            placeholder="Detalhes da transferência..."
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-sm"
                        />
                    </div>

                    {/* Actions */}
                    <div className="pt-2 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-slate-300 bg-white text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg shadow-md transition-all font-medium flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 size={18} />
                            Confirmar
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
};

export default TransferModal;
