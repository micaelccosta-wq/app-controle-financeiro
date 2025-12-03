
import React, { useState, useEffect } from 'react';
import { Category, Transaction, Budget, TransactionType, Account } from '../types';
import { ChevronLeft, ChevronRight, AlertCircle, ArrowRightLeft, Wallet, PieChart, TrendingUp, Layers, ShoppingBag, Activity, X, Calendar, Filter, RefreshCw, BarChart2, Search } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import BudgetReallocationModal from './BudgetReallocationModal';
import BudgetYearlyEditModal from './BudgetYearlyEditModal';
import { CategorySubtype } from '../types';

interface BudgetViewProps {
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  accounts: Account[];
  onSaveBudget: (budget: Budget) => void;
  onSaveBudgets: (budgets: Budget[]) => Promise<void>;
}

interface BudgetInputProps {
  initialValue: number;
  onSave: (value: string) => void;
}

const BudgetInput: React.FC<BudgetInputProps> = ({ initialValue, onSave }) => {
  const [localValue, setLocalValue] = useState(initialValue === 0 ? '' : initialValue.toString());

  useEffect(() => {
    setLocalValue(initialValue === 0 ? '' : initialValue.toString());
  }, [initialValue]);

  const handleBlur = () => {
    onSave(localValue);
  };

  return (
    <input
      type="number"
      value={localValue}
      onChange={(e) => setLocalValue(e.target.value)}
      onBlur={handleBlur}
      placeholder="0.00"
      className="w-28 pl-8 pr-2 py-1 text-right text-sm border border-slate-300 dark:border-slate-600 rounded focus:ring-1 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 dark:text-white"
    />
  );
};

const BudgetView: React.FC<BudgetViewProps> = ({ categories, transactions, budgets, accounts, onSaveBudget, onSaveBudgets }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isYearlyEditOpen, setIsYearlyEditOpen] = useState(false);

  // Date Filters for Global View
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Details Modal State
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsModalType, setDetailsModalType] = useState<'INCOME' | 'BUDGET' | 'EXPENSE_REALIZED' | null>(null);
  const [detailsModalData, setDetailsModalData] = useState<{ title: string; total: number; items: Transaction[] } | null>(null);

  // Reallocation State
  const [reallocationSource, setReallocationSource] = useState<{ id: string; name: string; remaining: number; currentBudget: number } | null>(null);
  const [isReallocationOpen, setIsReallocationOpen] = useState(false);

  // X-Ray State
  const [xRayCategoryId, setXRayCategoryId] = useState<string>('');
  const [xRayDetailsOpen, setXRayDetailsOpen] = useState(false);
  const [xRayDetailsData, setXRayDetailsData] = useState<{ month: number; year: number; categoryId: string; categoryName: string } | null>(null);

  // Filter Categories for the list (Moved up to be available for calculations)
  const expenseCategories = categories.filter(c => c.type === TransactionType.EXPENSE && c.impactsBudget);
  const fixedCategories = expenseCategories.filter(c => c.subtype === CategorySubtype.FIXED);
  const variableCategories = expenseCategories.filter(c => c.subtype === CategorySubtype.VARIABLE);

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

  const isTransactionInMonth = (t: Transaction, targetMonth: number, targetYear: number) => {
    if (t.invoiceMonth) {
      const [mStr, yStr] = t.invoiceMonth.split('/');
      return parseInt(mStr) === targetMonth + 1 && parseInt(yStr) === targetYear;
    }
    const [yStr, mStr] = t.date.split('-');
    return parseInt(mStr) === targetMonth + 1 && parseInt(yStr) === targetYear;
  };

  const monthlyTotalRealized = transactions
    .filter(t => {
      return t.type === TransactionType.EXPENSE && isTransactionInMonth(t, selectedMonth, selectedYear);
    })
    .reduce((acc, t) => {
      if (t.split && t.split.length > 0) {
        // Sum all splits that are expenses (which they should be if type is EXPENSE)
        // We include ALL expenses now, regardless of whether they are in the displayed categories
        const splitSum = t.split.reduce((sAcc, s) => sAcc + s.amount, 0);
        return acc + splitSum;
      } else {
        return acc + t.amount;
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




  const getPlannedAmount = (categoryId: string) => {
    return budgets.find(b => b.categoryId === categoryId && b.month === selectedMonth && b.year === selectedYear)?.amount || 0;
  };

  const getRealizedAmount = (categoryName: string) => {
    return transactions
      .filter(t => {
        return t.type === TransactionType.EXPENSE && isTransactionInMonth(t, selectedMonth, selectedYear);
      })
      .reduce((acc, curr) => {
        if (curr.split && curr.split.length > 0) {
          const splitForCat = curr.split.find(s => {
            let sName = s.categoryName;
            if (sName.includes(':')) sName = sName.split(':')[0].trim();
            return sName === categoryName;
          });
          return acc + (splitForCat ? splitForCat.amount : 0);
        } else {
          let cName = curr.category;
          if (cName.includes(':')) cName = cName.split(':')[0].trim();
          return cName === categoryName ? acc + curr.amount : acc;
        }
      }, 0);
  };

  const handleBudgetChange = (categoryId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const existingBudget = budgets.find(b => b.categoryId === categoryId && b.month === selectedMonth && b.year === selectedYear);

    onSaveBudget({
      id: existingBudget ? existingBudget.id : `${categoryId}-${selectedMonth}-${selectedYear}`,
      categoryId,
      month: selectedMonth, // API expects 0-indexed month
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

  const handleOpenDetails = (category: Category) => {
    const categoryTransactions = transactions.filter(t => {
      // Filter by month/year
      if (!isTransactionInMonth(t, selectedMonth, selectedYear)) return false;

      // Filter by category (handling splits)
      if (t.split && t.split.length > 0) {
        return t.split.some(s => {
          let sName = s.categoryName;
          if (sName.includes(':')) sName = sName.split(':')[0].trim();
          return sName === category.name;
        });
      } else {
        let cName = t.category;
        if (cName.includes(':')) cName = cName.split(':')[0].trim();
        return cName === category.name;
      }
    });

    setDetailsModalData({
      title: `Detalhes: ${category.name}`,
      total: getRealizedAmount(category.name),
      items: categoryTransactions
    });
    setDetailsModalType('EXPENSE_REALIZED');
    setDetailsModalOpen(true);
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

  const handleOpenRealizedMonthDetails = () => {
    const monthTransactions = transactions.filter(t => {
      return t.type === TransactionType.EXPENSE && isTransactionInMonth(t, selectedMonth, selectedYear);
    });

    setDetailsModalData({
      title: `Realizado em ${months[selectedMonth]}/${selectedYear}`,
      total: monthlyTotalRealized,
      items: monthTransactions
    });
    setDetailsModalType('EXPENSE_REALIZED');
    setDetailsModalOpen(true);
  };

  return (
    <div className="space-y-6">

      {/* Date Filters */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">De</label>
          <input
            type="date"
            value={filterStartDate}
            onChange={e => setFilterStartDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Até</label>
          <input
            type="date"
            value={filterEndDate}
            onChange={e => setFilterEndDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 dark:text-white"
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

      {/* Category X-Ray Section */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
            <BarChart2 size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Raio-X da Categoria</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Acompanhe a evolução do planejado vs realizado</p>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Selecione uma Categoria</label>
          <select
            value={xRayCategoryId}
            onChange={(e) => setXRayCategoryId(e.target.value)}
            className="w-full md:w-1/3 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white dark:bg-slate-700 dark:text-white"
          >
            <option value="">Selecione...</option>
            {expenseCategories.sort((a, b) => a.name.localeCompare(b.name)).map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {xRayCategoryId && (
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={(() => {
                  const data = [];
                  let startM = 0;
                  let startY = selectedYear;
                  let endM = 11;
                  let endY = selectedYear;

                  if (filterStartDate && filterEndDate) {
                    const start = new Date(filterStartDate);
                    const end = new Date(filterEndDate);
                    startM = start.getMonth();
                    startY = start.getFullYear();
                    endM = end.getMonth();
                    endY = end.getFullYear();
                  }

                  let currentM = startM;
                  let currentY = startY;

                  while (currentY < endY || (currentY === endY && currentM <= endM)) {
                    const planned = budgets.find(b => b.categoryId === xRayCategoryId && b.month === currentM && b.year === currentY)?.amount || 0;

                    const catName = categories.find(c => c.id === xRayCategoryId)?.name || '';

                    const realized = transactions
                      .filter(t => {
                        return t.type === TransactionType.EXPENSE && isTransactionInMonth(t, currentM, currentY);
                      })
                      .reduce((acc, curr) => {
                        if (curr.split && curr.split.length > 0) {
                          const splitForCat = curr.split.find(s => {
                            let sName = s.categoryName;
                            if (sName.includes(':')) sName = sName.split(':')[0].trim();
                            return sName === catName;
                          });
                          return acc + (splitForCat ? splitForCat.amount : 0);
                        } else {
                          let cName = curr.category;
                          if (cName.includes(':')) cName = cName.split(':')[0].trim();
                          return cName === catName ? acc + curr.amount : acc;
                        }
                      }, 0);

                    data.push({
                      name: `${months[currentM].substring(0, 3)}/${currentY}`,
                      month: currentM,
                      year: currentY,
                      Planejado: planned,
                      Realizado: realized
                    });

                    currentM++;
                    if (currentM > 11) {
                      currentM = 0;
                      currentY++;
                    }
                  }
                  return data;
                })()}
                onClick={(data) => {
                  if (data && data.activePayload && data.activePayload[0]) {
                    const payload = data.activePayload[0].payload;
                    setXRayDetailsData({
                      month: payload.month,
                      year: payload.year,
                      categoryId: xRayCategoryId,
                      categoryName: categories.find(c => c.id === xRayCategoryId)?.name || ''
                    });
                    setXRayDetailsOpen(true);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} tickFormatter={(value) => `R$ ${value}`} />
                <Tooltip
                  formatter={(value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Line type="monotone" dataKey="Planejado" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Realizado" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: '#f43f5e', strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 1. Global Header Row: Income, Global Budget, Available */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Income (Global) */}
        <div
          onClick={() => { setDetailsModalType('INCOME'); setDetailsModalOpen(true); }}
          className="flex items-center gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-md transition-all"
        >
          <div className="bg-emerald-100 p-2.5 rounded-lg text-emerald-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide">Total Receitas (Período)</p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {globalTotalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>

        {/* Total Budgeted (Global) */}
        <div
          onClick={() => { setDetailsModalType('BUDGET'); setDetailsModalOpen(true); }}
          className="flex items-center gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-md transition-all"
        >
          <div className="bg-blue-100 p-2.5 rounded-lg text-blue-600">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide">Total Orçado (Período)</p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {globalTotalBudgeted.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>

        {/* Available (Global) */}
        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className={`p-2.5 rounded-lg ${globalAvailableForAllocation >= 0 ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'}`}>
            <Wallet size={24} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide">Disponível p/ Alocação</p>
            <p className={`text-xl font-bold ${globalAvailableForAllocation >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {globalAvailableForAllocation.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>
      </div>

      {/* 2. Month Selector */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <button onClick={() => handleMonthChange('prev')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 transition-colors">
            <ChevronLeft />
          </button>
          <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 w-48 text-center flex items-center justify-center gap-2">
            {months[selectedMonth]}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-transparent border-none outline-none cursor-pointer hover:text-blue-600 focus:ring-0 text-lg font-bold appearance-none"
            >
              {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() - 5 + i).map(year => (
                <option key={year} value={year} className="text-slate-800 bg-white dark:bg-slate-800">
                  {year}
                </option>
              ))}
            </select>
          </h2>
          <button onClick={() => handleMonthChange('next')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-600 dark:text-slate-300 transition-colors">
            <ChevronRight />
          </button>
        </div>

        <button
          onClick={() => setIsYearlyEditOpen(true)}
          className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-3 py-1.5 rounded-lg transition-colors border border-blue-200 dark:border-blue-800"
        >
          <PieChart size={16} />
          Editar Ano Inteiro
        </button>


      </div>

      {/* 3. Monthly Specific Stats (Budgeted vs Realized vs Balance) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Budgeted This Month */}
        <div className="flex items-center gap-4 px-6 py-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="bg-slate-100 dark:bg-slate-700 p-2 rounded-lg text-slate-600 dark:text-slate-300">
            <PieChart size={24} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide">Orçado (Mês)</p>
            <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
              {monthlyTotalBudgeted.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>

        {/* Realized This Month */}
        <div
          onClick={handleOpenRealizedMonthDetails}
          className="flex items-center gap-4 px-6 py-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:border-rose-300 dark:hover:border-rose-700 hover:shadow-md transition-all"
        >
          <div className="bg-rose-50 dark:bg-rose-900/20 p-2 rounded-lg text-rose-600 dark:text-rose-400">
            <ShoppingBag size={24} />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide">Realizado (Mês)</p>
            <p className="text-xl font-bold text-rose-600 dark:text-rose-400">
              {monthlyTotalRealized.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>

        {/* Balance / Progress */}
        <div className="flex flex-col justify-center px-6 py-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-slate-400" />
              <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wide">Status do Mês</span>
            </div>
            <span className={`text-xs font-bold ${monthlyPercentage >= 100 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'}`}>
              {monthlyPercentage.toFixed(1)}%
            </span>
          </div>

          <div className="relative h-2.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
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
      {/* 4. Budget List - Grouped by Fixed/Variable */}
      <div className="space-y-8">
        {/* Fixed Expenses */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-6 bg-white dark:bg-slate-800 shadow-sm">
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
            <span className="w-2 h-8 bg-blue-500 rounded-full"></span>
            Despesas Fixas
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {fixedCategories.length === 0 ? (
              <div className="text-center py-8 text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                Nenhuma despesa fixa encontrada.
              </div>
            ) : (
              fixedCategories.map(cat => (
                <BudgetCard
                  key={cat.id}
                  cat={cat}
                  planned={getPlannedAmount(cat.id)}
                  realized={getRealizedAmount(cat.name)}
                  onBudgetChange={handleBudgetChange}
                  onReallocate={handleOpenReallocation}
                  onOpenDetails={handleOpenDetails}
                />
              ))
            )}
          </div>
        </div>

        {/* Variable Expenses */}
        <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-6 bg-white dark:bg-slate-800 shadow-sm">
          <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center gap-2">
            <span className="w-2 h-8 bg-amber-500 rounded-full"></span>
            Despesas Variáveis
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {variableCategories.length === 0 ? (
              <div className="text-center py-8 text-slate-400 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                Nenhuma despesa variável encontrada.
              </div>
            ) : (
              variableCategories.map(cat => (
                <BudgetCard
                  key={cat.id}
                  cat={cat}
                  planned={getPlannedAmount(cat.id)}
                  realized={getRealizedAmount(cat.name)}
                  onBudgetChange={handleBudgetChange}
                  onReallocate={handleOpenReallocation}
                  onOpenDetails={handleOpenDetails}
                />
              ))
            )}
          </div>
        </div>
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
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">
                {detailsModalType === 'INCOME' ? 'Detalhamento de Receitas' :
                  detailsModalType === 'EXPENSE_REALIZED' ? detailsModalData?.title : 'Detalhamento do Orçamento'}
              </h3>
              <button onClick={() => setDetailsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium sticky top-0 shadow-sm">
                  <tr>
                    {detailsModalType === 'INCOME' ? (
                      <>
                        <th className="px-6 py-3">Data</th>
                        <th className="px-6 py-3">Descrição</th>
                        <th className="px-6 py-3">Categoria</th>
                        <th className="px-6 py-3 text-right">Valor</th>
                      </>
                    ) : detailsModalType === 'EXPENSE_REALIZED' ? (
                      <>
                        <th className="px-6 py-3">Data / Fatura</th>
                        <th className="px-6 py-3">Descrição</th>
                        <th className="px-6 py-3">Conta / Tipo</th>
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
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {detailsModalType === 'INCOME' ? (
                    globalIncomeTransactions.length > 0 ? (
                      globalIncomeTransactions
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map(t => (
                          <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                            <td className="px-6 py-3 text-slate-600 dark:text-slate-300">{new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                            <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-100">{t.description}</td>
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
                  ) : detailsModalType === 'EXPENSE_REALIZED' ? (
                    detailsModalData?.items && detailsModalData.items.length > 0 ? (
                      detailsModalData.items
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map(t => {
                          const accountName = accounts.find(a => a.id === t.accountId)?.name || '-';
                          let amount = t.amount;
                          // Handle split amount if needed
                          if (t.split && t.split.length > 0) {
                            // Find the split part that matches the category
                            // Note: detailsModalData.title contains "Detalhes: CategoryName"
                            const catName = detailsModalData.title.replace('Detalhes: ', '');
                            const split = t.split.find(s => {
                              let sName = s.categoryName;
                              if (sName.includes(':')) sName = sName.split(':')[0].trim();
                              return sName === catName;
                            });
                            if (split) amount = split.amount;
                          }

                          return (
                            <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                              <td className="px-6 py-3 text-slate-600 dark:text-slate-300">
                                {t.invoiceMonth ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
                                    Fatura {t.invoiceMonth}
                                  </span>
                                ) : (
                                  new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                                )}
                              </td>
                              <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-100">
                                {t.description}
                                {t.split && t.split.length > 0 && <span className="text-xs text-blue-500 ml-1">(Split)</span>}
                              </td>
                              <td className="px-6 py-3 text-slate-500">
                                <div className="flex flex-col">
                                  <span>{accountName}</span>
                                  <span className="text-[10px] text-slate-400">
                                    {t.invoiceMonth ? 'Cartão de Crédito' : 'Conta Corrente'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-3 text-right font-bold text-rose-600">
                                {amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                            </tr>
                          );
                        })
                    ) : (
                      <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400">Nenhuma transação encontrada.</td></tr>
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
                            <tr key={b.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                              <td className="px-6 py-3 text-slate-600 dark:text-slate-300">{months[b.month]} / {b.year}</td>
                              <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-100">{catName}</td>
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
                  : detailsModalType === 'EXPENSE_REALIZED'
                    ? detailsModalData?.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    : globalTotalBudgeted.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                }
              </span>
            </div>
          </div>
        </div>
      )}

      {/* X-Ray Details Modal */}
      {xRayDetailsOpen && xRayDetailsData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Detalhamento: {xRayDetailsData.categoryName}</h3>
                <p className="text-sm text-slate-500">{months[xRayDetailsData.month]}/{xRayDetailsData.year}</p>
              </div>
              <button onClick={() => setXRayDetailsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-0">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 shadow-sm">
                  <tr>
                    <th className="px-6 py-3">Data</th>
                    <th className="px-6 py-3">Descrição</th>
                    <th className="px-6 py-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const txs = transactions.filter(t => {
                      if (t.type !== TransactionType.EXPENSE) return false;
                      if (!isTransactionInMonth(t, xRayDetailsData.month, xRayDetailsData.year)) return false;

                      if (t.split && t.split.length > 0) {
                        return t.split.some(s => {
                          let sName = s.categoryName;
                          if (sName.includes(':')) sName = sName.split(':')[0].trim();
                          return sName === xRayDetailsData.categoryName;
                        });
                      } else {
                        let cName = t.category;
                        if (cName.includes(':')) cName = cName.split(':')[0].trim();
                        return cName === xRayDetailsData.categoryName;
                      }
                    });

                    if (txs.length === 0) {
                      return <tr><td colSpan={3} className="px-6 py-8 text-center text-slate-400">Nenhuma transação encontrada.</td></tr>;
                    }

                    return txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(t => {
                      let amount = t.amount;
                      if (t.split && t.split.length > 0) {
                        const split = t.split.find(s => {
                          let sName = s.categoryName;
                          if (sName.includes(':')) sName = sName.split(':')[0].trim();
                          return sName === xRayDetailsData.categoryName;
                        });
                        amount = split ? split.amount : 0;
                      }

                      return (
                        <tr key={t.id} className="hover:bg-slate-50">
                          <td className="px-6 py-3 text-slate-600">{new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                          <td className="px-6 py-3 font-medium text-slate-800">
                            {t.description}
                            {t.split && t.split.length > 0 && <span className="text-xs text-blue-500 ml-1">(Split)</span>}
                          </td>
                          <td className="px-6 py-3 text-right font-bold text-rose-600">
                            {amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <div className="text-sm">
                <span className="text-slate-500 mr-2">Orçado:</span>
                <span className="font-bold text-blue-600">
                  {(budgets.find(b => b.categoryId === xRayDetailsData.categoryId && b.month === xRayDetailsData.month && b.year === xRayDetailsData.year)?.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-slate-500 mr-2">Realizado Total:</span>
                <span className="font-bold text-rose-600">
                  {(() => {
                    const txs = transactions.filter(t => {
                      if (t.type !== TransactionType.EXPENSE) return false;
                      if (!isTransactionInMonth(t, xRayDetailsData.month, xRayDetailsData.year)) return false;

                      if (t.split && t.split.length > 0) {
                        return t.split.some(s => {
                          let sName = s.categoryName;
                          if (sName.includes(':')) sName = sName.split(':')[0].trim();
                          return sName === xRayDetailsData.categoryName;
                        });
                      } else {
                        let cName = t.category;
                        if (cName.includes(':')) cName = cName.split(':')[0].trim();
                        return cName === xRayDetailsData.categoryName;
                      }
                    });

                    return txs.reduce((acc, t) => {
                      let amount = t.amount;
                      if (t.split && t.split.length > 0) {
                        const split = t.split.find(s => {
                          let sName = s.categoryName;
                          if (sName.includes(':')) sName = sName.split(':')[0].trim();
                          return sName === xRayDetailsData.categoryName;
                        });
                        amount = split ? split.amount : 0;
                      }
                      return acc + amount;
                    }, 0);
                  })().toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetView;

interface BudgetCardProps {
  cat: Category;
  planned: number;
  realized: number;
  onBudgetChange: (categoryId: string, value: string) => void;
  onReallocate: (category: Category, remaining: number, currentBudget: number) => void;
  onOpenDetails: (category: Category) => void;
}

const BudgetCard: React.FC<BudgetCardProps> = ({ cat, planned, realized, onBudgetChange, onReallocate, onOpenDetails }) => {
  const percentage = planned > 0 ? Math.min((realized / planned) * 100, 100) : (realized > 0 ? 100 : 0);

  let barColor = 'bg-blue-500';
  if (percentage > 85) barColor = 'bg-amber-500';
  if (percentage >= 100 || (planned === 0 && realized > 0)) barColor = 'bg-rose-500';

  const remaining = Math.max(0, planned - realized);

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 group">
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-slate-800">{cat.name}</h3>
          <span className="text-xs text-slate-500">{cat.subtype}</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Reallocation Button - Only if there is surplus budget */}
          {remaining > 0 && planned > 0 && (
            <button
              onClick={() => onReallocate(cat, remaining, planned)}
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
              <BudgetInput
                initialValue={planned}
                onSave={(val) => onBudgetChange(cat.id, val)}
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
        <span className={`font-medium ${realized > planned && planned > 0 ? 'text-rose-600' : 'text-slate-600'} flex items-center gap-2`}>
          Realizado: {realized.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          <button
            onClick={() => onOpenDetails(cat)}
            className="text-slate-400 hover:text-blue-600 transition-colors p-1 rounded hover:bg-slate-50"
            title="Ver detalhes"
          >
            <Search size={14} />
          </button>
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
};
