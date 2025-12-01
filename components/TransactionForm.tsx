
import React, { useState, useEffect, useMemo } from 'react';
import { PlusCircle, Check, Layers, Wallet, CreditCard, ArrowDownCircle, GitFork } from 'lucide-react';
import { Transaction, TransactionType, Category, Account, AccountType, TransactionSplit } from '../types';
import TransactionSplitModal from './TransactionSplitModal';

interface TransactionFormProps {
  onAddTransactions: (transactions: Transaction[]) => void;
  availableCategories: Category[];
  availableAccounts: Account[];
  transactions?: Transaction[]; // Needed to check closed invoices
}

const TransactionForm: React.FC<TransactionFormProps> = ({ onAddTransactions, availableCategories, availableAccounts, transactions = [] }) => {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [category, setCategory] = useState<string>('');
  const [accountId, setAccountId] = useState<string>('');
  const [isApplied, setIsApplied] = useState(true);
  const [ignoreInBudget, setIgnoreInBudget] = useState(false);
  const [observations, setObservations] = useState('');
  const [installments, setInstallments] = useState<number>(1);

  // Split State
  const [isSplitModalOpen, setIsSplitModalOpen] = useState(false);
  const [splits, setSplits] = useState<TransactionSplit[]>([]);

  // Credit Card Specific
  const [invoiceMonth, setInvoiceMonth] = useState(''); // "MM/YYYY"

  // Filter categories based on selected type
  const filteredCategories = availableCategories.filter(c => c.type === type);

  const selectedAccount = availableAccounts.find(a => a.id === accountId);
  const isCreditCard = selectedAccount?.type === AccountType.CREDIT_CARD;

  useEffect(() => {
    if (splits.length === 0) { // Only change category default if not split
      if (filteredCategories.length > 0 && !filteredCategories.find(c => c.name === category)) {
        // Don't auto-select first category if we are typing (wait for user or history)
        // But if type changed explicitly, maybe good to reset
      } else if (filteredCategories.length === 0) {
        setCategory('');
      }
    }
  }, [type, availableCategories, filteredCategories, category, splits]);

  // Set default account if available
  useEffect(() => {
    if (availableAccounts.length > 0 && !accountId) {
      setAccountId(availableAccounts[0].id);
    }
  }, [availableAccounts, accountId]);

  // Logic to handle Credit Card specifics
  useEffect(() => {
    if (isCreditCard) {
      // Force type to Expense
      setType(TransactionType.EXPENSE);

      // Calculate default invoice month (Next Open Invoice)
      const today = new Date();
      const currentMonth = today.getMonth() + 1;
      const currentYear = today.getFullYear();

      let targetMonth = currentMonth;
      let targetYear = currentYear;

      if (selectedAccount?.closingDay && today.getDate() >= selectedAccount.closingDay) {
        targetMonth++;
        if (targetMonth > 12) { targetMonth = 1; targetYear++; }
      }

      // Check if this calculated month is closed, if so, move forward
      let safetyCheck = 0;
      while (safetyCheck < 12) {
        const mStr = `${String(targetMonth).padStart(2, '0')}/${targetYear}`;
        const invoiceName = `Fatura ${selectedAccount.name} - ${mStr}`;
        const isClosed = transactions.some(t => t.description === invoiceName);

        if (!isClosed) {
          setInvoiceMonth(mStr);
          break;
        }
        targetMonth++;
        if (targetMonth > 12) { targetMonth = 1; targetYear++; }
        safetyCheck++;
      }
    }
  }, [isCreditCard, selectedAccount, transactions]);

  // Generate Invoice Options for Dropdown (Next 12 months)
  const invoiceOptions = useMemo(() => {
    if (!isCreditCard || !selectedAccount) return [];
    const options = [];
    const today = new Date();
    let m = today.getMonth() + 1;
    let y = today.getFullYear();

    // Start from 1 month back to allow late entry, go up to 12 months forward
    m -= 1;
    if (m < 1) { m = 12; y--; }

    for (let i = 0; i < 18; i++) {
      const mStr = `${String(m).padStart(2, '0')}/${y}`;
      const dateObj = new Date(y, m - 1, 1);
      const label = dateObj.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).toUpperCase().replace('.', '');

      // Check if closed
      const invoiceName = `Fatura ${selectedAccount.name} - ${mStr}`;
      const isClosed = transactions.some(t => t.description === invoiceName);

      if (!isClosed) {
        options.push({ value: mStr, label });
      }

      m++;
      if (m > 12) { m = 1; y++; }
    }
    return options;
  }, [isCreditCard, selectedAccount, transactions]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate
    if (!description || !amount || (!category && splits.length === 0)) return;
    if (!isCreditCard && !date) return;
    if (isCreditCard && !invoiceMonth) return;

    const numInstallments = Math.max(1, Math.floor(installments));
    const batchId = numInstallments > 1 ? crypto.randomUUID() : undefined;
    const baseAmount = parseFloat(amount);

    const newTransactions: Transaction[] = [];

    let baseDateObj = new Date(date);
    let ccMonthPart = 0;
    let ccYearPart = 0;

    if (isCreditCard) {
      // Parse MM/YYYY
      const parts = invoiceMonth.split('/');
      ccMonthPart = parseInt(parts[0]);
      ccYearPart = parseInt(parts[1]);
      baseDateObj = new Date(); // Transaction date is creation date
    }

    for (let i = 0; i < numInstallments; i++) {
      let finalDateStr = '';
      let finalInvoiceMonth = '';

      if (isCreditCard) {
        // Increment month for invoice
        let currentM = ccMonthPart + i;
        let currentY = ccYearPart;
        while (currentM > 12) {
          currentM -= 12;
          currentY++;
        }
        finalInvoiceMonth = `${String(currentM).padStart(2, '0')}/${currentY}`;
        finalDateStr = new Date().toISOString().split('T')[0];
      } else {
        // Increment date month
        const currentDate = new Date(baseDateObj);
        currentDate.setMonth(baseDateObj.getMonth() + i);
        if (currentDate.getDate() !== baseDateObj.getDate()) {
          currentDate.setDate(0);
        }
        finalDateStr = currentDate.toISOString().split('T')[0];
      }

      // Format observation
      let finalObs = observations;
      if (numInstallments > 1) {
        const suffix = `Parcela ${i + 1}/${numInstallments}`;
        finalObs = finalObs ? `${finalObs} - ${suffix}` : suffix;
      }

      newTransactions.push({
        id: crypto.randomUUID(),
        description,
        amount: baseAmount,
        date: finalDateStr,
        category: splits.length > 0 ? 'Múltiplas Categorias' : category,
        type,
        isApplied: isCreditCard ? true : (i === 0 ? isApplied : false),
        ignoreInBudget: type === TransactionType.INCOME ? ignoreInBudget : false,
        observations: finalObs,
        batchId,
        installmentNumber: i + 1,
        totalInstallments: numInstallments,
        accountId: accountId || undefined,
        invoiceMonth: isCreditCard ? finalInvoiceMonth : undefined,
        split: splits.length > 0 ? splits : undefined
      });
    }

    onAddTransactions(newTransactions);

    // Reset form
    setDescription('');
    setAmount('');
    setObservations('');
    setInstallments(1);
    setIsApplied(true);
    setIgnoreInBudget(false);
    setSplits([]);
  };

  const handleDescriptionBlur = () => {
    if (!description || category || splits.length > 0) return;

    // Search for existing transaction with same description
    const match = transactions.find(t => t.description.toLowerCase() === description.toLowerCase());

    if (match) {
      // Found a history match
      if (isCreditCard) {
        // If current is CC, force expense, but take category
        if (match.type === TransactionType.EXPENSE) {
          setCategory(match.category);
        }
      } else {
        // Normal account, take both type and category
        setType(match.type);
        setCategory(match.category);
      }
    }
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
    // Optionally update main category to first split or a placeholder
    // But logic handles display based on splits array presence
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <PlusCircle className="w-5 h-5 text-blue-600" />
          Nova Movimentação
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <label className="block text-sm font-medium text-slate-700 mb-1">Descrição</label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                placeholder="Ex: Compra Supermercado..."
                className="flex-1 w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Valor (Parcela)</label>
            <input
              type="number"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
            {isCreditCard ? (
              <div className="w-full px-4 py-2 bg-rose-50 border border-rose-100 text-rose-700 rounded-lg font-medium text-sm flex items-center justify-center gap-2 cursor-not-allowed h-[42px]">
                <ArrowDownCircle size={16} />
                Despesa
              </div>
            ) : (
              <div className="flex bg-slate-100 p-1 rounded-lg h-[42px]">
                <button
                  type="button"
                  onClick={() => setType(TransactionType.INCOME)}
                  className={`flex-1 flex items-center justify-center gap-1 rounded-md text-sm font-medium transition-all ${type === TransactionType.INCOME ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'
                    }`}
                >
                  Receita
                </button>
                <button
                  type="button"
                  onClick={() => setType(TransactionType.EXPENSE)}
                  className={`flex-1 flex items-center justify-center gap-1 rounded-md text-sm font-medium transition-all ${type === TransactionType.EXPENSE ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'
                    }`}
                >
                  Despesa
                </button>
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Categoria</label>
            <div className="flex gap-2">
              {splits.length > 0 ? (
                <div className="flex-1 px-4 py-2 border border-slate-200 bg-slate-50 rounded-lg h-[42px] flex items-center gap-2 text-slate-600 italic cursor-not-allowed">
                  <GitFork size={16} className="text-blue-500" />
                  Múltiplas Categorias ({splits.length})
                </div>
              ) : (
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white h-[42px]"
                >
                  <option value="" disabled>Selecione...</option>
                  {filteredCategories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              )}
              <button
                type="button"
                onClick={handleOpenSplit}
                title="Dividir em múltiplas categorias"
                className={`px-3 rounded-lg border flex items-center gap-2 transition-all ${splits.length > 0
                  ? 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100'
                  : 'bg-white border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-300'
                  }`}
              >
                <GitFork size={18} />
                <span className="text-xs font-semibold hidden lg:inline">Dividir</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Account Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Conta / Cartão</label>
            <div className="relative">
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white appearance-none h-[42px]"
              >
                <option value="">Sem Conta Definida</option>
                {availableAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>
                    {acc.type === AccountType.CREDIT_CARD ? `💳 ${acc.name}` : acc.name}
                  </option>
                ))}
              </select>
              <Wallet className="absolute right-3 top-3 text-slate-400 w-4 h-4 pointer-events-none" />
            </div>
          </div>

          {/* Conditional Date / Invoice Picker */}
          <div>
            {isCreditCard ? (
              <>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fatura (1ª Parc.)</label>
                <select
                  required
                  value={invoiceMonth}
                  onChange={(e) => setInvoiceMonth(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white h-[42px]"
                >
                  <option value="" disabled>Selecione a fatura...</option>
                  {invoiceOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data (1ª Parc.)</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-[42px]"
                />
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Parcelas</label>
            <div className="relative">
              <input
                type="number"
                min="1"
                max="360"
                value={installments}
                onChange={(e) => setInstallments(parseInt(e.target.value) || 1)}
                className="w-full px-4 py-2 pl-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none h-[42px]"
              />
              <Layers className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isCreditCard ? (
            <div className="flex items-center gap-2 p-2 px-3 bg-purple-50 border border-purple-100 rounded-lg h-[42px]">
              <CreditCard size={16} className="text-purple-600" />
              <span className="text-sm text-purple-700 font-medium">Lançamento em Fatura</span>
            </div>
          ) : (
            <div>
              <label className="flex items-center p-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors bg-white h-[42px]">
                <input
                  type="checkbox"
                  checked={isApplied}
                  onChange={(e) => setIsApplied(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-slate-700">Aplicado / Pago</span>
              </label>
            </div>
          )}

          {type === TransactionType.INCOME && (
            <div>
              <label className="flex items-center p-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors bg-white h-[42px]">
                <input
                  type="checkbox"
                  checked={ignoreInBudget}
                  onChange={(e) => setIgnoreInBudget(e.target.checked)}
                  className="w-4 h-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                />
                <span className="ml-2 text-sm text-slate-700">Ignorar no Orçamento</span>
              </label>
            </div>
          )}

          <div className="flex-1">
            {/* Spacer */}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Observações</label>
          <textarea
            rows={2}
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            placeholder="Detalhes..."
          ></textarea>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg shadow-sm transition-all flex items-center gap-2 active:scale-95"
          >
            <Check className="w-5 h-5" />
            Salvar Lançamento{installments > 1 ? 's' : ''}
          </button>
        </div>
      </form>

      {/* Split Modal */}
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

export default TransactionForm;
