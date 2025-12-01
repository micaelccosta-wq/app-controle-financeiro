
import React, { useState } from 'react';
import { Category, Transaction, Budget, TransactionType } from '../types';
import { ChevronLeft, ChevronRight, AlertCircle, ArrowRightLeft, Wallet, PieChart, TrendingUp, Layers, ShoppingBag, Activity, X, Calendar, Filter } from 'lucide-react';
import BudgetReallocationModal from './BudgetReallocationModal';
import BudgetYearlyEditModal from './BudgetYearlyEditModal';

interface BudgetViewProps {
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  onSaveBudget: (budget: Budget) => void;
  onSaveBudgets: (budgets: Budget[]) => Promise<void>;
}

const BudgetView: React.FC<BudgetViewProps> = ({ categories, transactions, budgets, onSaveBudget, onSaveBudgets }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isYearlyEditOpen, setIsYearlyEditOpen] = useState(false);

  // Date Filters for Global View
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Details Modal State
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsModalType, setDetailsModalType] = useState<'INCOME' | 'BUDGET' | null>(null);

  // Reallocation State
  const [reallocationSource, setReallocationSource] = useState<{ id: string; name: string; remaining: number; currentBudget: number } | null>(null);
  const [isReallocationOpen, setIsReallocationOpen] = useState(false);

  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const handleMonthChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    } else {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
  };

  // --- GLOBAL CALCULATIONS (Filtered by Date Range if set) ---

  const isDateInGlobalRange = (dateStr: string) => {
    if (!filterStartDate && !filterEndDate) return true;
    if (filterStartDate && dateStr < filterStartDate) return false;
    if (filterEndDate && dateStr > filterEndDate) return false;
    return true;
  };

  const isBudgetInGlobalRange = (month: number, year: number) => {
    if (!filterStartDate && !filterEndDate) return true;
    // Check if the 1st of the month is within the range
    const budgetDateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    if (filterStartDate && budgetDateStr < filterStartDate) return false;
    if (filterEndDate && budgetDateStr > filterEndDate) return false;
    return true;
  };

  // 1. Total Global Income (All transactions of type INCOME, filtered by date)
  const globalIncomeTransactions = transactions
    .filter(t => t.type === TransactionType.INCOME && !t.ignoreInBudget && isDateInGlobalRange(t.date));

  const globalTotalIncome = globalIncomeTransactions.reduce((acc, t) => acc + t.amount, 0);

  // 2. Total Global Budgeted (Sum of all budget entries, filtered by date)
  const globalBudgetEntries = budgets.filter(b => isBudgetInGlobalRange(b.month, b.year));

  const globalTotalBudgeted = globalBudgetEntries.reduce((acc, b) => acc + b.amount, 0);

  // 3. Global Available for Allocation
  const globalAvailableForAllocation = globalTotalIncome - globalTotalBudgeted;


  // --- MONTHLY CALCULATIONS (Selected Month) ---

  // 1. Total Budgeted for the specific month view
  const monthlyTotalBudgeted = budgets
    .filter(b => b.month === selectedMonth && b.year === selectedYear)
    .reduce((acc, b) => acc + b.amount, 0);

  // 2. Total Realized for the specific month view (All Expenses)
  // Helper to check if category impacts budget
  const doesCategoryImpactBudget = (catName: string) => {
    const cat = categories.find(c => c.name === catName);
    return cat ? cat.impactsBudget : true; // Default to true if unknown
  };

  const monthlyTotalRealized = transactions
    .filter(t => {
      const [yStr, mStr] = t.date.split('-');
      const tYear = parseInt(yStr);
      const tMonth = parseInt(mStr) - 1;
      return t.type === TransactionType.EXPENSE && tMonth === selectedMonth && tYear === selectedYear;
    })
    .reduce((acc, t) => {
      if (t.split && t.split.length > 0) {
        // Sum only splits that impact budget
        const splitSum = t.split.reduce((sAcc, s) => {
          return doesCategoryImpactBudget(s.categoryName) ? sAcc + s.amount : sAcc;
        }, 0);
        return acc + splitSum;
      } else {
        // Single category
        return doesCategoryImpactBudget(t.category) ? acc + t.amount : acc;
      }
    }, 0);

  // 3. Monthly Status Calc
  const monthlyRemaining = monthlyTotalBudgeted - monthlyTotalRealized;
  const monthlyPercentage = monthlyTotalBudgeted > 0
    ? Math.min((monthlyTotalRealized / monthlyTotalBudgeted) * 100, 100)
    : (monthlyTotalRealized > 0 ? 100 : 0);

  let monthlyBarColor = 'bg-blue-500';
  if (monthlyPercentage > 85) monthlyBarColor = 'bg-amber-500';
  if (monthlyPercentage >= 100 || (monthlyTotalBudgeted === 0 && monthlyTotalRealized > 0)) monthlyBarColor = 'bg-rose-500';


  // 4. Filter Categories for the list
  const expenseCategories = categories.filter(c => c.type === TransactionType.EXPENSE && c.impactsBudget);

  const getPlannedAmount = (categoryId: string) => {
    return budgets.find(b => b.categoryId === categoryId && b.month === selectedMonth && b.year === selectedYear)?.amount || 0;
  };

  const getRealizedAmount = (categoryName: string) => {
    return transactions
      .filter(t => {
        const tMonth = parseInt(t.date.split('-')[1]) - 1;
        const tYear = parseInt(t.date.split('-')[0]);
        return t.type === TransactionType.EXPENSE && tMonth === selectedMonth && tYear === selectedYear;
      })
      .reduce((acc, curr) => {
        if (curr.split && curr.split.length > 0) {
          const splitForCat = curr.split.find(s => s.categoryName === categoryName);
          return acc + (splitForCat ? splitForCat.amount : 0);
        } else {
          return curr.category === categoryName ? acc + curr.amount : acc;
        }
      }, 0);
  };

  const handleBudgetChange = (categoryId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    onSaveBudget({
      id: `${categoryId}-${selectedMonth}-${selectedYear}`,
      categoryId,
      month: selectedMonth,
      year: selectedYear,
      amount: numValue
    });
  };

  // Reallocation Logic
  const handleOpenReallocation = (category: Category, remaining: number, currentBudget: number) => {
    setReallocationSource({
      id: category.id,
      name: category.name,
      remaining,
      currentBudget
    });
    setIsReallocationOpen(true);
  };

  const handleConfirmReallocation = (adjustments: { categoryId: string; delta: number }[]) => {
    const newBudgets: Budget[] = [];

    adjustments.forEach(adj => {
      const currentAmount = getPlannedAmount(adj.categoryId);
      newBudgets.push({
        id: `${adj.categoryId}-${selectedMonth}-${selectedYear}`,
        categoryId: adj.categoryId,
        month: selectedMonth,
        year: selectedYear,
        amount: currentAmount + adj.delta
      });
    });

    onSaveBudgets(newBudgets);
  };

  return (
    <div className="space-y-6">

      {/* Date Filters */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">De</label>
          <input
            type="date"
            value={filterStartDate}
            onChange={e => setFilterStartDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Até</label>
          <input
            type="date"
            value={filterEndDate}
            onChange={e => setFilterEndDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        {(filterStartDate || filterEndDate) && (
          <button
            onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
            className="text-xs text-rose-600 hover:text-rose-700 font-medium hover:underline mb-3"
          >
            Limpar Filtros
          </button>
        )}
      </div>

      {/* 1. Global Header Row: Income, Global Budget, Available */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Income (Global) */}
        <div
          onClick={() => { setDetailsModalType('INCOME'); setDetailsModalOpen(true); }}
          className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all"
        >
          <div className="bg-emerald-100 p-2.5 rounded-lg text-emerald-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Total Receitas (Período)</p>
            <p className="text-xl font-bold text-slate-800">
              {globalTotalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>

        {/* Total Budgeted (Global) */}
        <div
          onClick={() => { setDetailsModalType('BUDGET'); setDetailsModalOpen(true); }}
          className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
        >
          <div className="bg-blue-100 p-2.5 rounded-lg text-blue-600">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Total Orçado (Período)</p>
            <p className="text-xl font-bold text-slate-800">
              {globalTotalBudgeted.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>

        {/* Available (Global) */}
        <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className={`p-2.5 rounded-lg ${globalAvailableForAllocation >= 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'}`}>
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Disponível p/ Alocação</p>
            <p className={`text-xl font-bold ${globalAvailableForAllocation >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
              {globalAvailableForAllocation.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Month Selector */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2">
          <button onClick={() => handleMonthChange('prev')} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
            <ChevronLeft />
          </button>
          <h2 className="text-lg font-bold text-slate-800 w-48 text-center">
            {months[selectedMonth]} <span className="text-slate-500 font-normal">{selectedYear}</span>
          </h2>
          <button onClick={() => handleMonthChange('next')} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
            <ChevronRight />
          </button>
        </div>

        <button
          onClick={() => setIsYearlyEditOpen(true)}
          className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors border border-blue-200"
        >
          <PieChart size={16} />
          Editar Ano Inteiro
        </button>
      </div>

      {/* 3. Monthly Specific Stats (Budgeted vs Realized vs Balance) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Budgeted This Month */}
        <div className="flex items-center gap-4 px-6 py-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="bg-slate-100 p-2 rounded-lg text-slate-600">
            <PieChart size={24} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Orçado (Mês)</p>
            <p className="text-xl font-bold text-slate-800">
              {monthlyTotalBudgeted.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>

        {/* Realized This Month */}
        <div className="flex items-center gap-4 px-6 py-4 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="bg-rose-50 p-2 rounded-lg text-rose-600">
            <ShoppingBag size={24} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Realizado (Mês)</p>
            <p className="text-xl font-bold text-rose-600">
              {monthlyTotalRealized.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>

        {/* Balance / Progress */}
        <div className="flex flex-col justify-center px-6 py-3 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-slate-400" />
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Status do Mês</span>
            </div>
            <span className={`text-xs font-bold ${monthlyPercentage >= 100 ? 'text-rose-600' : 'text-slate-600'}`}>
              {monthlyPercentage.toFixed(1)}%
            </span>
          </div>

          <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden mb-2">
            <div
              className={`absolute top-0 left-0 h-full ${monthlyBarColor} transition-all duration-500 ease-out`}
              style={{ width: `${monthlyPercentage}%` }}
            ></div>
          </div>

          <div className="flex justify-between text-xs">
            {monthlyRemaining >= 0 ? (
              <span className="text-slate-500">Restante: <b className="text-blue-600">{monthlyRemaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b></span>
            ) : (
              <span className="text-rose-600 flex items-center gap-1">
                <AlertCircle size={10} />
                Estourado: <b>{Math.abs(monthlyRemaining).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 4. Budget List */}
      <div className="grid grid-cols-1 gap-4">
        {expenseCategories.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            Nenhuma categoria de despesa marcada para orçamento.
          </div>
        ) : (
          expenseCategories.map(cat => {
            const planned = getPlannedAmount(cat.id);
            const realized = getRealizedAmount(cat.name);
            const percentage = planned > 0 ? Math.min((realized / planned) * 100, 100) : (realized > 0 ? 100 : 0);

            let barColor = 'bg-blue-500';
            if (percentage > 85) barColor = 'bg-amber-500';
            if (percentage >= 100 || (planned === 0 && realized > 0)) barColor = 'bg-rose-500';

            const remaining = Math.max(0, planned - realized);

            return (
              <div key={cat.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 group">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-800">{cat.name}</h3>
                    <span className="text-xs text-slate-500">{cat.subtype}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Reallocation Button - Only if there is surplus budget */}
                    {remaining > 0 && planned > 0 && (
                      <button
                        onClick={() => handleOpenReallocation(cat, remaining, planned)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-600 flex items-center gap-1 text-xs font-medium bg-slate-50 px-2 py-1 rounded border border-slate-200"
                        title="Remanejar saldo restante para outras categorias"
                      >
                        <ArrowRightLeft size={14} />
                        Remanejar
                      </button>
                    )}

                    <div className="flex flex-col items-end">
                      <label className="text-xs text-slate-500 mb-1">Meta Mensal</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2 text-xs text-slate-400">R$</span>
                        <input
                          type="number"
                          value={planned || ''}
                          onChange={(e) => handleBudgetChange(cat.id, e.target.value)}
                          placeholder="0.00"
                          className="w-28 pl-8 pr-2 py-1 text-right text-sm border border-slate-300 rounded focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden mb-2">
                  <div
                    className={`absolute top-0 left-0 h-full ${barColor} transition-all duration-500 ease-out`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>

                <div className="flex justify-between text-sm">
                  <span className={`font-medium ${realized > planned && planned > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                    Realizado: {realized.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </span>
                  <span className="text-slate-500">
                    Restante: <span className="font-medium text-slate-700">{remaining.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </span>
                </div>

                {realized > planned && planned > 0 && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-rose-600 bg-rose-50 p-2 rounded">
                    <AlertCircle size={12} />
                    Orçamento estourado em {(realized - planned).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <BudgetReallocationModal
        isOpen={isReallocationOpen}
        onClose={() => setIsReallocationOpen(false)}
        sourceCategory={reallocationSource}
        targetCategories={expenseCategories.filter(c => c.id !== reallocationSource?.id)}
        onConfirm={handleConfirmReallocation}
      />

      <BudgetYearlyEditModal
        isOpen={isYearlyEditOpen}
        onClose={() => setIsYearlyEditOpen(false)}
        categories={categories}
        budgets={budgets}
        selectedYear={selectedYear}
        onSave={onSaveBudgets}
      />

      {/* Details Modal */}
      {detailsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 text-lg">
                {detailsModalType === 'INCOME' ? 'Detalhamento de Receitas' : 'Detalhamento do Orçamento'}
              </h3>
              <button onClick={() => setDetailsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 shadow-sm">
                  <tr>
                    {detailsModalType === 'INCOME' ? (
                      <>
                        <th className="px-6 py-3">Data</th>
                        <th className="px-6 py-3">Descrição</th>
                        <th className="px-6 py-3">Categoria</th>
                        <th className="px-6 py-3 text-right">Valor</th>
                      </>
                    ) : (
                      <>
                        <th className="px-6 py-3">Mês/Ano</th>
                        <th className="px-6 py-3">Categoria</th>
                        <th className="px-6 py-3 text-right">Valor Orçado</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {detailsModalType === 'INCOME' ? (
                    globalIncomeTransactions.length > 0 ? (
                      globalIncomeTransactions
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map(t => (
                          <tr key={t.id} className="hover:bg-slate-50">
                            <td className="px-6 py-3 text-slate-600">{new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                            <td className="px-6 py-3 font-medium text-slate-800">{t.description}</td>
                            <td className="px-6 py-3 text-slate-500">
                              {t.category}
                              {t.split && t.split.length > 0 && <span className="text-xs text-blue-500 ml-1">(Split)</span>}
                            </td>
                            <td className="px-6 py-3 text-right font-bold text-emerald-600">
                              {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Nenhuma receita no período.</td></tr>
                    )
                  ) : (
                    globalBudgetEntries.length > 0 ? (
                      globalBudgetEntries
                        .sort((a, b) => {
                          if (a.year !== b.year) return b.year - a.year;
                          return b.month - a.month;
                        })
                        .map(b => {
                          const catName = categories.find(c => c.id === b.categoryId)?.name || 'Desconhecida';
                          return (
                            <tr key={b.id} className="hover:bg-slate-50">
                              <td className="px-6 py-3 text-slate-600">{months[b.month]}/{b.year}</td>
                              <td className="px-6 py-3 font-medium text-slate-800">{catName}</td>
                              <td className="px-6 py-3 text-right font-bold text-blue-600">
                                {b.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                            </tr>
                          );
                        })
                    ) : (
                      <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">Nenhum orçamento no período.</td></tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 text-right">
              <span className="text-sm text-slate-500 mr-2">Total:</span>
              <span className="text-lg font-bold text-slate-800">
                {detailsModalType === 'INCOME'
                  ? globalTotalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                  : globalTotalBudgeted.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                }
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetView;
