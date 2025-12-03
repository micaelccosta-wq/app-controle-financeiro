
import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, X, ArrowUpCircle, ArrowDownCircle, Wallet, Calendar as CalendarIcon, CheckCircle2, Clock, Trash2 } from 'lucide-react';
import { Transaction, Account, TransactionType, AccountType } from '../types';

interface FinancialCalendarProps {
  transactions: Transaction[];
  accounts: Account[];
  onToggleTransactionStatus: (t: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  onEditTransaction: (t: Transaction) => void;
}

const FinancialCalendar: React.FC<FinancialCalendarProps> = ({ transactions, accounts, onToggleTransactionStatus, onDeleteTransaction, onEditTransaction }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedDayDetails, setSelectedDayDetails] = useState<{ date: string } | null>(null);

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handleMonthChange = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  // --- CALCULATION ENGINE ---

  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Helper: Is this account a credit card?
    const isCreditCard = (accId: string) => {
      const acc = accounts.find(a => a.id === accId);
      return acc?.type === AccountType.CREDIT_CARD;
    };

    // 1. Determine Initial Balance (Start of Time -> Start of Current Month)
    let initialBalance = 0;

    // A. Sum Initial Balances of Accounts (Only BANK accounts contribute to cash flow balance)
    if (selectedAccountId) {
      const acc = accounts.find(a => a.id === selectedAccountId);
      initialBalance = (acc && acc.type === AccountType.BANK) ? acc.initialBalance : 0;
    } else {
      initialBalance = accounts
        .filter(acc => acc.type === AccountType.BANK)
        .reduce((sum, acc) => sum + acc.initialBalance, 0);
    }

    // B. Process all transactions BEFORE this month
    const firstDayOfCurrentMonthStr = new Date(year, month, 1).toISOString().split('T')[0];

    transactions.forEach(t => {
      // Filter logic:
      // 1. If filtering by specific account, match it.
      if (selectedAccountId && t.accountId !== selectedAccountId) return;

      // 2. IMPORTANT: If filtering global (no account selected), IGNORE Credit Card purchase transactions.
      // We only want actual money movements (Bank transactions).
      // If a transaction has an invoiceMonth, it is likely a CC purchase (unless it's the payment itself, which usually doesn't have invoiceMonth set the same way or is manually handled).
      // Ideally, we check the account type of the transaction.
      if (!selectedAccountId && t.accountId && isCreditCard(t.accountId)) return;

      if (t.date < firstDayOfCurrentMonthStr) {
        if (t.type === TransactionType.INCOME) initialBalance += t.amount;
        else initialBalance -= t.amount;
      }
    });

    // 2. Build Daily Data for Current Month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];
    let runningBalance = initialBalance;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = new Date(year, month, day).toISOString().split('T')[0]; // Format YYYY-MM-DD

      // Find transactions for this day
      const daysTransactions = transactions.filter(t => {
        if (selectedAccountId && t.accountId !== selectedAccountId) return false;
        // Exclude CC transactions from Global Flow
        if (!selectedAccountId && t.accountId && isCreditCard(t.accountId)) return false;

        return t.date === dateStr;
      });

      const dayIncome = daysTransactions
        .filter(t => t.type === TransactionType.INCOME)
        .reduce((sum, t) => sum + t.amount, 0);

      const dayExpense = daysTransactions
        .filter(t => t.type === TransactionType.EXPENSE)
        .reduce((sum, t) => sum + t.amount, 0);

      const endBalance = runningBalance + dayIncome - dayExpense;

      days.push({
        day,
        dateStr,
        startBalance: runningBalance,
        income: dayIncome,
        expense: dayExpense,
        endBalance,
        transactions: daysTransactions
      });

      runningBalance = endBalance;
    }

    return days;
  }, [currentDate, transactions, accounts, selectedAccountId]);

  // Calendar Grid Logic
  const firstDayOfWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(); // 0 (Sun) - 6 (Sat)
  const emptySlots = Array(firstDayOfWeek).fill(null);

  // Filter accounts for dropdown (Show all, but let user know types)
  const bankAccounts = accounts.filter(a => a.type === AccountType.BANK);
  const creditAccounts = accounts.filter(a => a.type === AccountType.CREDIT_CARD);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-8 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-2">
          <div className="bg-blue-100 text-blue-700 p-2 rounded-lg">
            <CalendarIcon size={20} />
          </div>
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">Fluxo de Caixa Mensal</h2>
        </div>

        <div className="flex items-center gap-4">
          {/* Account Filter */}
          <div className="relative">
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="pl-9 pr-4 py-1.5 text-sm border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 dark:text-white appearance-none min-w-[150px]"
            >
              <option value="">Fluxo Global (Bancos)</option>
              <optgroup label="Contas Bancárias">
                {bankAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </optgroup>
              <optgroup label="Cartões (Fatura)">
                {creditAccounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </optgroup>
            </select>
            <Wallet className="absolute left-2.5 top-2 text-slate-400 w-4 h-4 pointer-events-none" />
          </div>

          {/* Month Nav */}
          <div className="flex items-center bg-white dark:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-600 p-0.5">
            <button onClick={() => handleMonthChange('prev')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-600 rounded text-slate-600 dark:text-slate-300">
              <ChevronLeft size={18} />
            </button>
            <span className="px-3 text-sm font-medium text-slate-700 dark:text-slate-200 w-32 text-center">
              {months[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <button onClick={() => handleMonthChange('next')} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-600 rounded text-slate-600 dark:text-slate-300">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Grid Header */}
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
          <div key={day} className="py-2 text-center text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {day}
          </div>
        ))}
      </div>

      {/* Grid Body */}
      <div className="grid grid-cols-7 auto-rows-fr">
        {emptySlots.map((_, index) => (
          <div key={`empty-${index}`} className="bg-slate-50/50 dark:bg-slate-800/30 border-r border-b border-slate-100 dark:border-slate-700 min-h-[80px]" />
        ))}

        {calendarData.map((dayData) => {
          const isNegative = dayData.endBalance < 0;
          const today = new Date();
          const isToday = dayData.day === today.getDate() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getFullYear() === today.getFullYear();

          const allApplied = dayData.transactions.length > 0 && dayData.transactions.every((t: Transaction) => t.isApplied);

          return (
            <div
              key={dayData.dateStr}
              onClick={() => setSelectedDayDetails({ date: dayData.dateStr })}
              className={`min-h-[80px] border-r border-b border-slate-100 dark:border-slate-700 p-2 cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50 flex flex-col justify-between relative group 
                ${isToday ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-inset ring-blue-400 z-10' :
                  (allApplied ? 'bg-slate-100/50 dark:bg-slate-800/50' :
                    (isNegative ? 'bg-red-50/30 dark:bg-red-900/10' : '')
                  )
                }`}
            >
              <div className="flex justify-between items-start">
                <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700'
                  }`}>
                  {dayData.day}
                </span>
                {isNegative && <div className="w-2 h-2 rounded-full bg-rose-500"></div>}
              </div>

              <div className="flex flex-col gap-0.5 text-[10px] mt-2">
                {/* Income/Expense indicators only if > 0 */}
                {dayData.income > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Ent:</span>
                    <span>{dayData.income.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  </div>
                )}
                {dayData.expense > 0 && (
                  <div className="flex justify-between text-rose-600 dark:text-rose-400">
                    <span>Sai:</span>
                    <span>{dayData.expense.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                  </div>
                )}
              </div>

              {/* Balance removed as requested to clean UI */}
            </div>
          );
        })}
      </div>

      {/* Details Modal */}
      {selectedDayDetails && (() => {
        const dayData = calendarData.find(d => d.dateStr === selectedDayDetails.date);
        if (!dayData) return null;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-slate-50 dark:bg-slate-800/50 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">Detalhes do Dia</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                    {new Date(selectedDayDetails.date).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}
                  </p>
                </div>
                <button onClick={() => setSelectedDayDetails(null)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 max-h-[60vh] overflow-y-auto">
                {/* Day Summary */}
                <div className="grid grid-cols-3 gap-2 mb-4 text-center bg-slate-50 dark:bg-slate-700/30 p-3 rounded-lg border border-slate-100 dark:border-slate-700">
                  <div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Saldo Inicial</p>
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {dayData.startBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Movimento</p>
                    <p className={`text-sm font-semibold ${(dayData.income - dayData.expense) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {(dayData.income - dayData.expense).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold">Saldo Final</p>
                    <p className={`text-sm font-bold ${dayData.endBalance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}>
                      {dayData.endBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                </div>

                <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Transações</h4>
                {dayData.transactions.length === 0 ? (
                  <p className="text-center text-slate-400 dark:text-slate-500 text-sm py-4">Nenhuma movimentação neste dia.</p>
                ) : (
                  <div className="space-y-2">
                    {dayData.transactions.map((t: Transaction) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-2 border border-slate-100 dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-700/50 cursor-pointer group"
                        onClick={() => {
                          onEditTransaction(t);
                          setSelectedDayDetails(null); // Close modal to edit
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-full ${t.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'}`}>
                            {t.type === TransactionType.INCOME ? <ArrowUpCircle size={14} /> : <ArrowDownCircle size={14} />}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-100 line-clamp-1 group-hover:text-blue-600 transition-colors">{t.description}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{t.category}</p>
                          </div>
                        </div>
                        <div className="text-right flex items-center gap-3">
                          <div>
                            <p className={`text-sm font-bold ${t.type === TransactionType.INCOME ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                            <div className="flex items-center justify-end gap-1 mt-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => onToggleTransactionStatus(t)}
                                className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full transition-colors ${t.isApplied
                                  ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50'
                                  : 'text-amber-600 bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50'
                                  }`}
                              >
                                {t.isApplied ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                {t.isApplied ? 'Aplicado' : 'Pendente'}
                              </button>
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm('Tem certeza que deseja excluir esta transação?')) {
                                onDeleteTransaction(t.id);
                              }
                            }}
                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default FinancialCalendar;
