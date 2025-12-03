
import React, { useState, useMemo } from 'react';
import { Account, Transaction, Category, FinancialGoal, WealthConfig, TransactionType, AccountType, CategorySubtype } from '../types';
import { Target, TrendingUp, DollarSign, Calendar, Save, Trash2, Milestone, Percent, AlertCircle, TrendingDown, Activity } from 'lucide-react';

interface WealthViewProps {
   accounts: Account[];
   transactions: Transaction[];
   categories: Category[];
   goals: FinancialGoal[];
   onSaveGoal: (goal: FinancialGoal) => void;
   onDeleteGoal: (id: string) => void;
   wealthConfig: WealthConfig;
   onSaveWealthConfig: (config: WealthConfig) => void;
}

const WealthView: React.FC<WealthViewProps> = ({
   accounts,
   transactions,
   categories,
   goals,
   onSaveGoal,
   onDeleteGoal,
   wealthConfig,
   onSaveWealthConfig
}) => {
   const [editingGoal, setEditingGoal] = useState<Partial<FinancialGoal>>({});
   const [passiveIncomeTargetInput, setPassiveIncomeTargetInput] = useState(wealthConfig.passiveIncomeGoal.toString());

   // --- HELPER: TIME SPAN ---
   const monthSpan = useMemo(() => {
      if (transactions.length === 0) return 1;
      const dates = transactions.map(t => new Date(t.date).getTime());
      const minDate = new Date(Math.min(...dates));
      const maxDate = new Date();

      let monthsDiff = (maxDate.getFullYear() - minDate.getFullYear()) * 12 + (maxDate.getMonth() - minDate.getMonth()) + 1;
      // Cap at 12 months for "current average" calculations, or use actual if less
      return Math.min(Math.max(1, monthsDiff), 12);
   }, [transactions]);

   // --- SECTION 1: FINANCIAL GOALS ---

   const bankAccounts = accounts.filter(a => a.type === AccountType.BANK);

   const calculateCurrentBalance = (accountId: string) => {
      const acc = accounts.find(a => a.id === accountId);
      if (!acc) return 0;

      const accountTransactions = transactions.filter(t => t.accountId === accountId && t.isApplied);
      const totalIncome = accountTransactions
         .filter(t => t.type === TransactionType.INCOME)
         .reduce((acc, t) => acc + t.amount, 0);
      const totalExpense = accountTransactions
         .filter(t => t.type === TransactionType.EXPENSE)
         .reduce((acc, t) => acc + t.amount, 0);

      return acc.initialBalance + totalIncome - totalExpense;
   };

   const calculateAverageGrowth = (accountId: string) => {
      const accTxs = transactions.filter(t => t.accountId === accountId && t.isApplied);
      if (accTxs.length === 0) return 0;

      // Group net change by month
      const monthlyChanges: Record<string, number> = {};
      accTxs.forEach(t => {
         const key = t.date.substring(0, 7); // YYYY-MM
         const val = t.type === TransactionType.INCOME ? t.amount : -t.amount;
         monthlyChanges[key] = (monthlyChanges[key] || 0) + val;
      });

      const monthsWithActivity = Object.keys(monthlyChanges).length;
      const totalNetChange = Object.values(monthlyChanges).reduce((a, b) => a + b, 0);

      // If less than 1 month of data, just return total change
      if (monthsWithActivity <= 1) return totalNetChange;

      // Average monthly growth
      return totalNetChange / monthsWithActivity;
   };

   const handleGoalSubmit = () => {
      if (!editingGoal.accountId || !editingGoal.targetAmount || !editingGoal.targetDate) return;

      onSaveGoal({
         id: editingGoal.id || crypto.randomUUID(),
         accountId: editingGoal.accountId,
         targetAmount: Number(editingGoal.targetAmount),
         targetDate: editingGoal.targetDate
      });
      setEditingGoal({});
   };

   const getDaysRemaining = (targetDate: string) => {
      const target = new Date(targetDate);
      const today = new Date();
      const diffTime = target.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
   };

   // --- SECTION 2: FINANCIAL INDEPENDENCE MAP ---

   const averageMonthlyPassiveIncome = useMemo(() => {
      // Filter income transactions classified as 'Rendimentos' or containing a split with 'Rendimentos'
      // We only consider the last 12 months (or monthSpan) for this average to be relevant
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - monthSpan);

      const relevantTransactions = transactions.filter(t =>
         t.type === TransactionType.INCOME &&
         t.isApplied &&
         new Date(t.date) >= cutoffDate
      );

      if (relevantTransactions.length === 0) return 0;

      const total = relevantTransactions.reduce((acc, t) => {
         if (t.category === 'Rendimentos') return acc + t.amount;
         if (t.split && t.split.length > 0) {
            const splitSum = t.split.reduce((sAcc, s) => {
               return s.categoryName === 'Rendimentos' ? sAcc + s.amount : sAcc;
            }, 0);
            return acc + splitSum;
         }
         return acc;
      }, 0);

      return total / monthSpan;
   }, [transactions, monthSpan]);

   const averageFixedExpenses = useMemo(() => {
      // Identify FIXED categories
      const fixedCategoryNames = categories
         .filter(c => c.type === TransactionType.EXPENSE && c.subtype === CategorySubtype.FIXED)
         .map(c => c.name);

      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - monthSpan);

      const relevantTransactions = transactions.filter(t =>
         t.type === TransactionType.EXPENSE &&
         t.isApplied &&
         new Date(t.date) >= cutoffDate
      );

      const total = relevantTransactions.reduce((acc, t) => {
         if (fixedCategoryNames.includes(t.category)) return acc + t.amount;
         if (t.split && t.split.length > 0) {
            const splitSum = t.split.reduce((sAcc, s) => {
               let sName = s.categoryName;
               if (sName.includes(':')) sName = sName.split(':')[0].trim();
               return fixedCategoryNames.includes(sName) ? sAcc + s.amount : sAcc;
            }, 0);
            return acc + splitSum;
         }
         return acc;
      }, 0);

      return total / monthSpan;
   }, [transactions, categories, monthSpan]);

   const freedomDegree = wealthConfig.passiveIncomeGoal > 0
      ? (averageMonthlyPassiveIncome / wealthConfig.passiveIncomeGoal) * 100
      : 0;


   // --- SECTION 3: PERSONAL INFLATION INDEX ---

   const inflationData = useMemo(() => {
      const currentYear = new Date().getFullYear();
      const prevYear = currentYear - 1;
      const prevPrevYear = currentYear - 2;

      // Only categories that impact budget
      const relevantCategories = categories.filter(c => c.impactsBudget && c.type === TransactionType.EXPENSE);

      // Helper to sum by year and category
      const getSum = (year: number, catName?: string) => {
         return transactions
            .filter(t => {
               const tYear = new Date(t.date).getFullYear();
               const isMatch = tYear === year && t.type === TransactionType.EXPENSE && t.isApplied;
               if (!isMatch) return false;
               return true;
            })
            .reduce((acc, t) => {
               // Handle Splits
               if (t.split && t.split.length > 0) {
                  const splitSum = t.split.reduce((sAcc, s) => {
                     let sName = s.categoryName;
                     if (sName.includes(':')) sName = sName.split(':')[0].trim();

                     // Filter by specific category if provided
                     if (catName && sName !== catName) return sAcc;

                     // If no specific category, check if it impacts budget
                     if (!catName) {
                        const cat = categories.find(c => c.name === sName);
                        if (!cat || !cat.impactsBudget) return sAcc;
                     }

                     return sAcc + s.amount;
                  }, 0);
                  return acc + splitSum;
               }

               // Handle Normal Transaction
               if (catName && t.category !== catName) return acc;
               if (!catName) {
                  const cat = categories.find(c => c.name === t.category);
                  if (!cat || !cat.impactsBudget) return acc;
               }
               return acc + t.amount;
            }, 0);
      };

      const list = relevantCategories.map(cat => {
         const sumCurrent = getSum(currentYear, cat.name);
         const sumPrev = getSum(prevYear, cat.name);
         const sumPrevPrev = getSum(prevPrevYear, cat.name);

         // Calculate Inflation: (Current / Prev) - 1
         const inflation1yr = sumPrev > 0 ? ((sumCurrent / sumPrev) - 1) * 100 : null;
         const inflation2yr = sumPrevPrev > 0 ? ((sumPrev / sumPrevPrev) - 1) * 100 : null;

         return {
            category: cat.name,
            sumCurrent,
            sumPrev,
            inflation1yr,
            inflation2yr
         };
      }).filter(d => d.sumCurrent > 0 || d.sumPrev > 0); // Hide empty rows

      // Weighted Average
      const totalCurrent = getSum(currentYear);
      const totalPrev = getSum(prevYear);
      const totalPrevPrev = getSum(prevPrevYear);

      const avgInflation1yr = totalPrev > 0 ? ((totalCurrent / totalPrev) - 1) * 100 : 0;
      const avgInflation2yr = totalPrevPrev > 0 ? ((totalPrev / totalPrevPrev) - 1) * 100 : 0;

      return { list, avgInflation1yr, avgInflation2yr };
   }, [transactions, categories]);


   return (
      <div className="space-y-8">

         {/* 1. METAS DE PATRIMÔNIO */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
               <Target className="text-blue-600" size={24} />
               Metas de Patrimônio
            </h3>

            {/* Goals List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
               {goals.map(goal => {
                  const account = accounts.find(a => a.id === goal.accountId);
                  const current = calculateCurrentBalance(goal.accountId);
                  const growth = calculateAverageGrowth(goal.accountId);
                  const progress = Math.min((current / goal.targetAmount) * 100, 100);
                  const daysLeft = getDaysRemaining(goal.targetDate);

                  return (
                     <div key={goal.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-slate-50/50">
                        <div className="flex justify-between items-start mb-2">
                           <div>
                              <p className="font-bold text-slate-800 line-clamp-1" title={account?.name}>{account?.name || 'Conta Removida'}</p>
                              <p className="text-xs text-slate-500">Alvo: {new Date(goal.targetDate).toLocaleDateString('pt-BR')}</p>
                           </div>
                           <button onClick={() => onDeleteGoal(goal.id)} className="text-slate-300 hover:text-rose-500">
                              <Trash2 size={16} />
                           </button>
                        </div>

                        <div className="flex justify-between text-sm mb-1">
                           <span className="font-medium text-emerald-600">{current.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                           <span className="text-slate-500">Meta: {goal.targetAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                        </div>

                        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3">
                           <div className={`h-full ${progress >= 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${progress}%` }}></div>
                        </div>

                        <div className="flex justify-between items-end border-t border-slate-200 pt-2">
                           <div className="flex flex-col">
                              <span className="text-[10px] text-slate-400 uppercase font-bold">Ritmo Histórico</span>
                              <span className={`text-xs font-semibold flex items-center gap-1 ${growth >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                 {growth >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                 {Math.abs(growth).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/mês
                              </span>
                           </div>
                           <div className="text-right text-xs">
                              {progress >= 100 ? (
                                 <span className="text-emerald-600 font-bold flex items-center justify-end gap-1"><Target size={12} /> Atingida!</span>
                              ) : (
                                 <span className="text-slate-500">{daysLeft} dias restantes</span>
                              )}
                           </div>
                        </div>
                     </div>
                  );
               })}
            </div>

            {/* Add Goal Form */}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
               <h4 className="text-sm font-bold text-slate-700 mb-3">Definir Nova Meta</h4>
               <div className="flex flex-col md:flex-row gap-3 items-end">
                  <div className="flex-1 w-full">
                     <label className="block text-xs text-slate-500 mb-1">Conta Bancária</label>
                     <select
                        className="w-full p-2 text-sm border border-slate-300 rounded outline-none"
                        value={editingGoal.accountId || ''}
                        onChange={e => setEditingGoal({ ...editingGoal, accountId: e.target.value })}
                     >
                        <option value="">Selecione...</option>
                        {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                     </select>
                  </div>
                  <div className="w-full md:w-40">
                     <label className="block text-xs text-slate-500 mb-1">Valor Alvo (R$)</label>
                     <input
                        type="number"
                        className="w-full p-2 text-sm border border-slate-300 rounded outline-none"
                        value={editingGoal.targetAmount || ''}
                        onChange={e => setEditingGoal({ ...editingGoal, targetAmount: parseFloat(e.target.value) })}
                     />
                  </div>
                  <div className="w-full md:w-40">
                     <label className="block text-xs text-slate-500 mb-1">Data Alvo</label>
                     <input
                        type="date"
                        className="w-full p-2 text-sm border border-slate-300 rounded outline-none"
                        value={editingGoal.targetDate || ''}
                        onChange={e => setEditingGoal({ ...editingGoal, targetDate: e.target.value })}
                     />
                  </div>
                  <button
                     onClick={handleGoalSubmit}
                     disabled={!editingGoal.accountId}
                     className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded w-full md:w-auto flex items-center justify-center"
                  >
                     <Save size={18} />
                  </button>
               </div>
            </div>
         </div>

         {/* 2. INDEPENDÊNCIA FINANCEIRA */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
               <Milestone className="text-indigo-600" size={24} />
               Mapa de Independência Financeira
            </h3>

            <div className="flex flex-col lg:flex-row gap-8 items-start lg:items-center">
               {/* Input / Config */}
               <div className="flex-1 w-full space-y-6">
                  <div>
                     <label className="block text-sm font-medium text-slate-700 mb-2">Meta de Renda Passiva Mensal</label>
                     <div className="flex gap-2">
                        <input
                           type="number"
                           className="flex-1 p-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                           value={passiveIncomeTargetInput}
                           onChange={e => setPassiveIncomeTargetInput(e.target.value)}
                        />
                        <button
                           onClick={() => onSaveWealthConfig({ passiveIncomeGoal: parseFloat(passiveIncomeTargetInput) || 0 })}
                           className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                        >
                           Salvar
                        </button>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100">
                        <p className="text-xs text-slate-500 font-medium">Média Atual de Rendimentos</p>
                        <p className="text-lg font-bold text-emerald-700">
                           {averageMonthlyPassiveIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} <span className="text-xs font-normal text-slate-500">/ mês</span>
                        </p>
                     </div>

                     <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                        <p className="text-xs text-slate-500 font-medium">Média Despesa Fixa</p>
                        <p className="text-lg font-bold text-amber-700">
                           {averageFixedExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} <span className="text-xs font-normal text-slate-500">/ mês</span>
                        </p>
                     </div>
                  </div>
               </div>

               {/* Gauge / Visualization */}
               <div className="flex-1 flex flex-col items-center justify-center w-full">
                  <div className="relative w-48 h-24 overflow-hidden">
                     <div className="absolute top-0 left-0 w-48 h-48 rounded-full border-[20px] border-slate-100 border-b-0 border-l-0 border-r-0 origin-center rotate-0" style={{ transform: 'rotate(-180deg)' }}></div>
                     <div
                        className="absolute top-0 left-0 w-48 h-48 rounded-full border-[20px] border-indigo-500 border-b-0 border-l-0 border-r-0 transition-transform duration-1000 ease-out"
                        style={{
                           transform: `rotate(${Math.min(freedomDegree, 100) * 1.8 - 180}deg)`,
                           borderRightColor: 'transparent',
                           borderBottomColor: 'transparent'
                        }}
                     ></div>
                  </div>
                  <div className="text-center -mt-8">
                     <p className="text-3xl font-bold text-slate-800">{freedomDegree.toFixed(1)}%</p>
                     <p className="text-sm text-slate-500 font-medium">Grau de Liberdade</p>
                  </div>
               </div>
            </div>
         </div>

         {/* 3. INFLAÇÃO PESSOAL */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
               <TrendingUp className="text-rose-600" size={24} />
               Índice de Inflação Pessoal
            </h3>

            <div className="mb-4 bg-rose-50 p-4 rounded-lg flex items-center gap-3 text-rose-800 border border-rose-100">
               <AlertCircle size={24} />
               <div>
                  <p className="text-sm font-bold">Inflação Pessoal Média (Último Ano): {inflationData.avgInflation1yr.toFixed(2)}%</p>
                  <p className="text-xs opacity-80">Calculada com base na variação do seu gasto médio anual nas categorias de orçamento.</p>
               </div>
            </div>

            <div className="overflow-x-auto">
               <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200">
                     <tr>
                        <th className="px-4 py-3 font-medium text-slate-600">Categoria</th>
                        <th className="px-4 py-3 font-medium text-slate-600 text-right">Gasto {new Date().getFullYear() - 1}</th>
                        <th className="px-4 py-3 font-medium text-slate-600 text-right">Gasto {new Date().getFullYear()}</th>
                        <th className="px-4 py-3 font-medium text-slate-600 text-right">Inflação Pessoal</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {inflationData.list.map(item => (
                        <tr key={item.category} className="hover:bg-slate-50">
                           <td className="px-4 py-3 font-medium text-slate-700">{item.category}</td>
                           <td className="px-4 py-3 text-right text-slate-500">{item.sumPrev.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                           <td className="px-4 py-3 text-right text-slate-500">{item.sumCurrent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                           <td className={`px-4 py-3 text-right font-bold ${(item.inflation1yr || 0) > 0 ? 'text-rose-600' : 'text-emerald-600'
                              }`}>
                              {item.inflation1yr !== null ? `${item.inflation1yr.toFixed(2)}%` : '-'}
                           </td>
                        </tr>
                     ))}
                     {inflationData.list.length === 0 && (
                        <tr>
                           <td colSpan={4} className="p-4 text-center text-slate-400 italic">
                              Dados insuficientes para cálculo de inflação anual.
                           </td>
                        </tr>
                     )}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
   );
};

export default WealthView;
