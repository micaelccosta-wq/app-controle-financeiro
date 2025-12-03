
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
  const [ignoreInBudget, setIgnoreInBudget] = useState(false);
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

      // Clean category name (remove ": Value" if present)
      let cleanCat = transaction.category;
      if (cleanCat.includes(':')) {
        cleanCat = cleanCat.split(':')[0].trim();
      }
      setCategory(cleanCat);

      setIsApplied(transaction.isApplied);
      setIgnoreInBudget(transaction.ignoreInBudget || false);
      setObservations(transaction.observations || '');

      // Default to existing account, or find first BANK account if none
      let initialAccount = transaction.accountId || '';
      if (!initialAccount && availableAccounts.length > 0) {
        const bankAcc = availableAccounts.find(a => a.type === AccountType.BANK);
        if (bankAcc) initialAccount = bankAcc.id;
      }
      setAccountId(initialAccount);

      setSplits(transaction.split || []);
      setUpdateBatch(false);
    }
  }, [transaction, availableAccounts]);

  const filteredCategories = availableCategories
    .filter(c => c.type === type)
    .sort((a, b) => a.name.localeCompare(b.name));

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
      ignoreInBudget: type === TransactionType.INCOME ? ignoreInBudget : false,
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
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Editar Lançamento</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {isBatch && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg p-3 mb-4">
              <div className="flex items-start gap-3">
                <Layers className="text-blue-600 dark:text-blue-400 mt-1" size={18} />
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-300">Lançamento Parcelado</p>
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
                      <span className="text-sm text-slate-700 dark:text-slate-300">Editar apenas este</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="updateMode"
                        checked={updateBatch}
                        onChange={() => setUpdateBatch(true)}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300 font-medium">Editar todas ({transaction.totalInstallments})</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Descrição</label>
            <input
              type="text"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Valor</label>
              <input
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Data</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={updateBatch || !!transaction.invoiceMonth} // Disable date if batch or CC Invoice
                title={updateBatch ? "Data não pode ser alterada em edição de lote" : ""}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-400 bg-white dark:bg-slate-700 dark:text-white dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Categoria</label>
              <div className="flex gap-1">
                {splits.length > 0 ? (
                  <div className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700/50 rounded-lg flex items-center gap-2 text-slate-600 dark:text-slate-400 italic cursor-not-allowed text-xs">
                    <GitFork size={14} className="text-blue-500" />
                    Múltiplas
                  </div>
                ) : (
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 dark:text-white"
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
                  className={`px-2 rounded-lg border flex items-center justify-center transition-all ${splits.length > 0
                    ? 'bg-blue-50 border-blue-200 text-blue-600 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400'
                    : 'bg-white border-slate-300 text-slate-500 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-400'
                    }`}
                >
                  <GitFork size={16} />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TransactionType)}
                disabled={isCreditCard} // CC is always Expense
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 dark:text-white disabled:bg-slate-100 dark:disabled:bg-slate-800"
              >
                <option value={TransactionType.EXPENSE}>Despesa</option>
                <option value={TransactionType.INCOME}>Receita</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Conta / Cartão</label>
            <div className="relative">
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 dark:text-white appearance-none"
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
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Status: Aplicado / Pago</span>
              </label>
            </div>
          )}

          {type === TransactionType.INCOME && (
            <div>
              <label className="flex items-center gap-2 cursor-pointer mt-2">
                <input
                  type="checkbox"
                  checked={ignoreInBudget}
                  onChange={(e) => setIgnoreInBudget(e.target.checked)}
                  className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Ignorar no Orçamento</span>
              </label>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Observações</label>
            <textarea
              rows={2}
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white dark:bg-slate-700 dark:text-white"
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
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
