
import React, { useState, useMemo } from 'react';
import { Transaction, TransactionType, Category, Budget } from '../types';
import { PieChart, BarChart as BarChartIcon, TrendingUp, X, Filter } from 'lucide-react';
import {
   LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
   BarChart, Bar, Cell
} from 'recharts';

interface ReportsViewProps {
   transactions: Transaction[];
   categories: Category[];
   budgets: Budget[];
}

const ReportsView: React.FC<ReportsViewProps> = ({ transactions, categories, budgets }) => {
   // Date Filters
   const [startDate, setStartDate] = useState('');
   const [endDate, setEndDate] = useState('');

   // Modal State
   const [detailsModalOpen, setDetailsModalOpen] = useState(false);
   const [selectedPointData, setSelectedPointData] = useState<{
      label: string;
      income: number;
      expense: number;
      transactions: Transaction[];
   } | null>(null);

   // Helper: Date Filtering
   const isDateInRange = (dateStr: string) => {
      if (!startDate && !endDate) return true;
      if (startDate && dateStr < startDate) return false;
      if (endDate && dateStr > endDate) return false;
      return true;
   };

   // Helper: Check if budget is in range (approximate by month)
   const isBudgetInRange = (month: number, year: number) => {
      if (!startDate && !endDate) return true;
      const budgetDateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      // Simple logic: if budget month starts within range or overlaps
      // For simplicity, let's check if the 1st of the month is in range
      if (startDate && budgetDateStr < startDate) return false;
      if (endDate && budgetDateStr > endDate) return false;
      return true;
   };

   // Filter Transactions
   const filteredTransactions = useMemo(() => {
      return transactions.filter(t =>
         !t.description.startsWith('Fatura ') && // Exclude CC holds
         !t.ignoreInBudget &&
         isDateInRange(t.date)
      );
   }, [transactions, startDate, endDate]);

   // --- 1. Expenses by Category (Pie/Donut) ---
   const expensesByCategory = useMemo(() => {
      return filteredTransactions
         .filter(t => t.type === TransactionType.EXPENSE)
         .reduce((acc, t) => {
            if (t.split && t.split.length > 0) {
               t.split.forEach(s => {
                  let catName = s.categoryName;
                  if (catName.includes(':')) catName = catName.split(':')[0].trim();
                  acc[catName] = (acc[catName] || 0) + s.amount;
               });
            } else {
               let catName = t.category;
               if (catName.includes(':')) catName = catName.split(':')[0].trim();
               acc[catName] = (acc[catName] || 0) + t.amount;
            }
            return acc;
         }, {} as Record<string, number>);
   }, [filteredTransactions]);

   const totalExpenses = Object.values(expensesByCategory).reduce((a, b) => a + b, 0);

   const categoryData = useMemo(() => {
      return Object.entries(expensesByCategory)
         .sort(([, a], [, b]) => b - a)
         .map(([name, value], index) => ({
            name,
            value,
            percentage: totalExpenses > 0 ? (value / totalExpenses) * 100 : 0,
            color: `hsl(${index * 40 + 200}, 70%, 50%)`
         }));
   }, [expensesByCategory, totalExpenses]);

   // --- 2. Income vs Expense (Line Chart) ---
   const lineChartData = useMemo(() => {
      // Group by Month (YYYY-MM)
      const grouped: Record<string, { income: number; expense: number; transactions: Transaction[] }> = {};

      // If range is small (e.g. < 2 months), maybe group by Day?
      // For now, let's stick to Monthly for robustness, or Daily if range is short.
      // Let's implement Monthly for now as it's standard.

      // Initialize with range if possible, or just from data
      // To ensure continuity, we should find min/max date

      filteredTransactions.forEach(t => {
         const key = t.date.substring(0, 7); // YYYY-MM
         if (!grouped[key]) grouped[key] = { income: 0, expense: 0, transactions: [] };

         if (t.type === TransactionType.INCOME) grouped[key].income += t.amount;
         else grouped[key].expense += t.amount;

         grouped[key].transactions.push(t);
      });

      return Object.entries(grouped)
         .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
         .map(([key, data]) => {
            const [y, m] = key.split('-');
            const dateObj = new Date(parseInt(y), parseInt(m) - 1, 1);
            return {
               name: dateObj.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
               fullDate: key,
               ...data
            };
         });
   }, [filteredTransactions]);

   // --- 3. Planned vs Executed (Bar Chart) ---
   const plannedVsExecutedData = useMemo(() => {
      // 1. Get all expense categories that impact budget
      const expenseCats = categories.filter(c => c.type === TransactionType.EXPENSE && c.impactsBudget);

      // 2. Calculate Planned (Budget) for filtered period
      // 3. Calculate Executed (Realized) for filtered period

      return expenseCats.map(cat => {
         // Planned
         const catBudgets = budgets.filter(b =>
            b.categoryId === cat.id && isBudgetInRange(b.month, b.year)
         );
         const planned = catBudgets.reduce((acc, b) => acc + b.amount, 0);

         // Executed
         // We already have expensesByCategory which is filtered by date
         // But we need to make sure we match the category ID/Name correctly
         // expensesByCategory uses Name.
         const executed = expensesByCategory[cat.name] || 0;

         return {
            name: cat.name,
            planned,
            executed,
            amt: Math.max(planned, executed) // for domain calc if needed
         };
      })
         .filter(d => d.planned > 0 || d.executed > 0) // Hide empty
         .sort((a, b) => b.executed - a.executed); // Sort by highest spend

   }, [categories, budgets, expensesByCategory, startDate, endDate]); // expensesByCategory depends on filteredTransactions

   const formatCurrency = (val: number) => {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
   };

   const formatCurrencyNoDecimals = (val: number) => {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
   };

   const handleLineClick = (data: any) => {
      if (data && data.activePayload && data.activePayload.length > 0) {
         const payload = data.activePayload[0].payload;
         setSelectedPointData({
            label: payload.name,
            income: payload.income,
            expense: payload.expense,
            transactions: payload.transactions
         });
         setDetailsModalOpen(true);
      }
   };

   return (
      <div className="space-y-8">

         {/* Filters */}
         <div className="bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-3 mr-2">
               <Filter size={20} />
               <span className="font-bold">Filtros</span>
            </div>
            <div>
               <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">De</label>
               <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 dark:text-white"
               />
            </div>
            <div>
               <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Até</label>
               <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-700 dark:text-white"
               />
            </div>
            {(startDate || endDate) && (
               <button
                  onClick={() => { setStartDate(''); setEndDate(''); }}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium hover:underline mb-3"
               >
                  Limpar
               </button>
            )}
         </div>

         {/* 1. Income vs Expense (Dynamic Line Chart) */}
         <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
               <TrendingUp className="text-emerald-600" size={20} />
               Evolução: Receitas x Despesas
            </h3>
            <div className="h-80 w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                     data={lineChartData}
                     margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                     onClick={handleLineClick}
                  >
                     <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                     <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        dy={10}
                     />
                     <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#64748b', fontSize: 12 }}
                        tickFormatter={(value) => `R$ ${value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}`}
                     />
                     <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => formatCurrency(value)}
                        cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                     />
                     <Legend wrapperStyle={{ paddingTop: '20px' }} />
                     <Line
                        type="monotone"
                        dataKey="income"
                        name="Receitas"
                        stroke="#10b981"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                        activeDot={{ r: 8, strokeWidth: 0 }}
                     />
                     <Line
                        type="monotone"
                        dataKey="expense"
                        name="Despesas"
                        stroke="#f43f5e"
                        strokeWidth={3}
                        dot={{ r: 4, fill: '#f43f5e', strokeWidth: 0 }}
                        activeDot={{ r: 8, strokeWidth: 0 }}
                     />
                  </LineChart>
               </ResponsiveContainer>
            </div>
            <p className="text-xs text-slate-400 text-center mt-2">
               Clique em um ponto do gráfico para ver os detalhes.
            </p>
         </div>

         {/* 2. Planned vs Executed (Bar Chart) */}
         <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
               <BarChartIcon className="text-blue-600" size={20} />
               Planejado x Executado (Por Categoria)
            </h3>
            <div className="h-[500px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                     layout="vertical"
                     data={plannedVsExecutedData}
                     margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                     <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e2e8f0" />
                     <XAxis type="number" hide />
                     <YAxis
                        dataKey="name"
                        type="category"
                        width={120}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: '#475569', fontSize: 12, fontWeight: 500 }}
                     />
                     <Tooltip
                        cursor={{ fill: '#f1f5f9' }}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        formatter={(value: number) => formatCurrency(value)}
                     />
                     <Legend wrapperStyle={{ paddingTop: '20px' }} />
                     <Bar dataKey="planned" name="Planejado" fill="#94a3b8" radius={[0, 4, 4, 0]} barSize={12} />
                     <Bar dataKey="executed" name="Executado" fill="#f43f5e" radius={[0, 4, 4, 0]} barSize={12} />
                  </BarChart>
               </ResponsiveContainer>
            </div>
         </div>

         {/* 3. Expenses by Category (Pie) */}
         <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
               <PieChart className="text-purple-600" size={20} />
               Distribuição de Despesas
            </h3>

            <div className="flex flex-col md:flex-row items-center gap-8">
               <div
                  className="w-48 h-48 rounded-full shadow-inner relative flex items-center justify-center shrink-0"
                  style={{
                     background: categoryData.length > 0 ? `conic-gradient(${categoryData.map((d, i, arr) => {
                        const start = arr.slice(0, i).reduce((sum, item) => sum + item.percentage, 0);
                        const end = start + d.percentage;
                        return `${d.color} ${start}% ${end}%`;
                     }).join(', ')})` : '#f1f5f9'
                  }}
               >
                  <div className="w-32 h-32 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center flex-col shadow-sm">
                     <span className="text-xs text-slate-400">Total</span>
                     <span className="font-bold text-slate-800 dark:text-slate-100">{formatCurrencyNoDecimals(totalExpenses)}</span>
                  </div>
               </div>

               <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categoryData.map(d => (
                     <div key={d.name} className="flex items-center justify-between p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors shadow-sm">
                        <div className="flex items-center gap-2">
                           <span className="w-3 h-3 rounded-full shrink-0 border border-slate-300 dark:border-slate-600" style={{ backgroundColor: d.color }}></span>
                           <span className="text-sm text-slate-600 dark:text-slate-300 font-medium truncate max-w-[120px]" title={d.name}>{d.name}</span>
                        </div>
                        <div className="text-right">
                           <span className="text-sm font-bold text-slate-800 dark:text-slate-100 block">
                              {formatCurrency(d.value)}
                           </span>
                           <span className="text-[10px] text-slate-400">
                              {d.percentage.toFixed(1)}%
                           </span>
                        </div>
                     </div>
                  ))}
                  {categoryData.length === 0 && (
                     <p className="text-slate-400 text-sm">Nenhuma despesa no período.</p>
                  )}
               </div>
            </div>
         </div>

         {/* Details Modal */}
         {detailsModalOpen && selectedPointData && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
               <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
                  <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                     <div>
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Detalhes: {selectedPointData.label}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                           Receitas: <span className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(selectedPointData.income)}</span> •
                           Despesas: <span className="text-rose-600 dark:text-rose-400 font-bold ml-1">{formatCurrency(selectedPointData.expense)}</span>
                        </p>
                     </div>
                     <button onClick={() => setDetailsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={24} />
                     </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-0">
                     <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 font-medium sticky top-0 shadow-sm">
                           <tr>
                              <th className="px-6 py-3">Data</th>
                              <th className="px-6 py-3">Descrição</th>
                              <th className="px-6 py-3">Categoria</th>
                              <th className="px-6 py-3 text-right">Valor</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                           {selectedPointData.transactions.length > 0 ? (
                              selectedPointData.transactions
                                 .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                 .map(t => (
                                    <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                       <td className="px-6 py-3 text-slate-600 dark:text-slate-300">{new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td>
                                       <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-100">{t.description}</td>
                                       <td className="px-6 py-3 text-slate-500 dark:text-slate-400">
                                          {t.category}
                                          {t.split && t.split.length > 0 && <span className="text-xs text-blue-500 dark:text-blue-400 ml-1">(Split)</span>}
                                       </td>
                                       <td className={`px-6 py-3 text-right font-bold ${t.type === TransactionType.INCOME ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                                          {t.type === TransactionType.EXPENSE ? '-' : '+'}{formatCurrency(t.amount)}
                                       </td>
                                    </tr>
                                 ))
                           ) : (
                              <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 dark:text-slate-500">Nenhum movimento neste período.</td></tr>
                           )}
                        </tbody>
                     </table>
                  </div>
               </div>
            </div>
         )}

      </div>
   );
};

export default ReportsView;
