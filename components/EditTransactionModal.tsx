
import React, { useState, useEffect } from 'react';
import { X, Save, Layers, Wallet, GitFork } from 'lucide-react';
import { Transaction, TransactionType, Category, Account, AccountType, TransactionSplit } from '../types';
import TransactionSplitModal from './TransactionSplitModal';

interface EditTransactionModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Transaction, updateBatch: boolean) => void;
  availableCategories: Category[];
  availableAccounts: Account[];
}

const EditTransactionModal: React.FC<EditTransactionModalProps> = ({ 
  transaction, 
  isOpen, 
  onClose, 
  onSave, 
  availableCategories,
  availableAccounts
}) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [category, setCategory] = useState('');
  const [isApplied, setIsApplied] = useState(false);
  const [observations, setObservations] = useState('');
  const [accountId, setAccountId] = useState('');
  
  // Split Logic
  const [splits, setSplits] = useState<TransactionSplit[]>([]);
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);

  // Logic for batch editing
  const [updateBatch, setUpdateBatch] = useState(false);
  const isBatch = transaction?.batchId && (transaction.totalInstallments || 0) > 1;

  useEffect(() => {
    if (transaction) {
      setDescription(transaction.description);
      setAmount(transaction.amount.toString());
      setDate(transaction.date);
      setType(transaction.type);
      setCategory(transaction.category);
      setIsApplied(transaction.isApplied);
      setObservations(transaction.observations || '');
      setAccountId(transaction.accountId || '');
      setSplits(transaction.split || []);
      setUpdateBatch(false);
    }
  }, [transaction]);

  const filteredCategories = availableCategories.filter(c => c.type === type);
  
  // Determine if it is a Credit Card transaction (either by existing account or selection)
  const isCreditCard = availableAccounts.find(a => a.id === accountId)?.type === AccountType.CREDIT_CARD;

  // Filter accounts: If originally CC, only allow CC. 
  const filteredAccounts = availableAccounts.filter(acc => {
     if (transaction?.invoiceMonth) { // It's a CC transaction
        return acc.type === AccountType.CREDIT_CARD;
     }
     return true;
  });

  if (!isOpen || !transaction) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedTransaction: Transaction = {
      ...transaction,
      description,
      amount: parseFloat(amount),
      date,
      type,
      category: splits.length > 0 ? 'Múltiplas Categorias' : category,
      isApplied: isCreditCard ? true : isApplied,
      observations,
      accountId: accountId || undefined,
      split: splits.length > 0 ? splits : undefined
    };
    onSave(updatedTransaction, updateBatch);
    onClose();
  };

  const handleOpenSplit = () => {
     if (!amount) {
       alert("Informe o valor total antes de dividir.");
       return;
     }
     setIsSplitModalOpen(true);
  };

  const handleConfirmSplit = (newSplits: TransactionSplit[]) => {
    setSplits(newSplits);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-800 text-lg">Editar Lançamento</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isBatch && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-3">
                <Layers className="text-blue-600 mt-1" size={18} />
                <div>
                  <p className="text-sm font-medium text-blue-800">Lançamento Parcelado</p>
                  <p className="text-xs text-blue-600 mt-1">Este item pertence a um lote de {transaction.totalInstallments} parcelas.</p>
                  
                  <div className="mt-3 flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="updateMode" 
                        checked={!updateBatch} 
                        onChange={() => setUpdateBatch(false)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">Editar apenas este</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="radio" 
                        name="updateMode" 
                        checked={updateBatch} 
                        onChange={() => setUpdateBatch(true)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700 font-medium">Editar todas ({transaction.totalInstallments})</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Valor</label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Data</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={updateBatch || !!transaction.invoiceMonth} // Disable date if batch or CC Invoice
                title={updateBatch ? "Data não pode ser alterada em edição de lote" : ""}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
              <div className="flex gap-1">
                 {splits.length > 0 ? (
                    <div className="flex-1 px-3 py-2 border border-slate-200 bg-slate-50 rounded-lg flex items-center gap-2 text-slate-600 italic cursor-not-allowed text-xs">
                        <GitFork size={14} className="text-blue-500" />
                        Múltiplas
                    </div>
                 ) : (
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      required
                      className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                      {filteredCategories.map((cat) => (
                        <option key={cat.id} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                 )}
                 <button
                   type="button"
                   onClick={handleOpenSplit}
                   title="Dividir"
                   className={`px-2 rounded-lg border flex items-center justify-center transition-all ${
                      splits.length > 0 
                      ? 'bg-blue-50 border-blue-200 text-blue-600' 
                      : 'bg-white border-slate-300 text-slate-500'
                   }`}
                 >
                   <GitFork size={16} />
                 </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
               <select
                  value={type}
                  onChange={(e) => setType(e.target.value as TransactionType)}
                  disabled={isCreditCard} // CC is always Expense
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-slate-100"
                >
                  <option value={TransactionType.EXPENSE}>Despesa</option>
                  <option value={TransactionType.INCOME}>Receita</option>
                </select>
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Conta / Cartão</label>
             <div className="relative">
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white appearance-none"
                >
                  <option value="">Sem Conta Definida</option>
                  {filteredAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
                <Wallet className="absolute right-3 top-2.5 text-slate-400 w-4 h-4 pointer-events-none" />
             </div>
          </div>

          {!isCreditCard && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer mt-2">
                  <input 
                    type="checkbox" 
                    checked={isApplied}
                    onChange={(e) => setIsApplied(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" 
                  />
                  <span className="text-sm font-medium text-slate-700">Status: Aplicado / Pago</span>
              </label>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
            <textarea
              rows={2}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2"
            >
              <Save size={18} />
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>

      <TransactionSplitModal 
        isOpen={isSplitModalOpen}
        onClose={() => setIsSplitModalOpen(false)}
        totalAmount={parseFloat(amount) || 0}
        availableCategories={filteredCategories}
        initialSplits={splits}
        onConfirm={handleConfirmSplit}
      />
    </div>
  );
};

export default EditTransactionModal;
