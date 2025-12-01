
import React, { useState } from 'react';
import { Category, Transaction, Budget, TransactionType } from '../types';
import { ChevronLeft, ChevronRight, AlertCircle, ArrowRightLeft, Wallet, PieChart, TrendingUp, Layers, ShoppingBag, Activity } from 'lucide-react';
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

  // --- GLOBAL CALCULATIONS (All Time) ---

  // 1. Total Global Income (All transactions of type INCOME, regardless of date or status)
  const globalTotalIncome = transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((acc, t) => acc + t.amount, 0);

  // 2. Total Global Budgeted (Sum of all budget entries across all months/years)
  const globalTotalBudgeted = budgets.reduce((acc, b) => acc + b.amount, 0);

  // 3. Global Available for Allocation
  const globalAvailableForAllocation = globalTotalIncome - globalTotalBudgeted;


  // --- MONTHLY CALCULATIONS (Selected Month) ---

  // 1. Total Budgeted for the specific month view
  const monthlyTotalBudgeted = budgets
    .filter(b => b.month === selectedMonth && b.year === selectedYear)
    .reduce((acc, b) => acc + b.amount, 0);

  // 2. Total Realized for the specific month view (All Expenses)
  const monthlyTotalRealized = transactions
    .filter(t => {
      const [yStr, mStr] = t.date.split('-');
      const tYear = parseInt(yStr);
      const tMonth = parseInt(mStr) - 1;
      return t.type === TransactionType.EXPENSE && tMonth === selectedMonth && tYear === selectedYear;
    })
    .reduce((acc, t) => acc + t.amount, 0);

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

      {/* 1. Global Header Row: Income, Global Budget, Available */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Income (Global) */}
        <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="bg-emerald-100 p-2.5 rounded-lg text-emerald-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Total Receitas (Geral)</p>
            <p className="text-xl font-bold text-slate-800">
              {globalTotalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>

        {/* Total Budgeted (Global) */}
        <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="bg-blue-100 p-2.5 rounded-lg text-blue-600">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Total Orçado (Geral)</p>
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
    </div>
  );
};

export default BudgetView;
