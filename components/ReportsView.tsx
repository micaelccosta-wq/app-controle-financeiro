
import React from 'react';
import { Transaction, TransactionType, Category } from '../types';
import { PieChart, BarChart } from 'lucide-react';

interface ReportsViewProps {
   transactions: Transaction[];
   categories: Category[];
}

const ReportsView: React.FC<ReportsViewProps> = ({ transactions, categories }) => {

   // Filter out credit card holds (keep only actual payments or non-cc transactions)
   const validTransactions = transactions.filter(t => !t.description.startsWith('Fatura '));

   // --- Expenses by Category ---
   const expensesByCategory: Record<string, number> = validTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc, t) => {
         if (t.split && t.split.length > 0) {
            // Handle Split
            t.split.forEach(s => {
               // Clean category name just in case (though split.categoryName should be clean)
               let catName = s.categoryName;
               if (catName.includes(':')) {
                  catName = catName.split(':')[0].trim();
               }
               acc[catName] = (acc[catName] || 0) + s.amount;
            });
         } else {
            // Regular
            let catName = t.category;
            // Clean category name to avoid "Category: 100" duplicates
            if (catName.includes(':')) {
               catName = catName.split(':')[0].trim();
            }
            acc[catName] = (acc[catName] || 0) + t.amount;
         }
         return acc;
      }, {} as Record<string, number>);

   const totalExpenses = Object.values(expensesByCategory).reduce((a: number, b: number) => a + b, 0);

   const categoryData = Object.entries(expensesByCategory)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value], index) => ({
         name,
         value,
         percentage: totalExpenses > 0 ? (value / totalExpenses) * 100 : 0,
         color: `hsl(${index * 40 + 200}, 70%, 50%)` // Generate colors
      }));

   const formatCurrency = (val: number) => {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
   };

   const formatCurrencyNoDecimals = (val: number) => {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(val);
   };

   // --- Income vs Expense (Last 6 Months) ---
   const last6Months: { key: string; label: string; income: number; expense: number }[] = [];
   const today = new Date();
   for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short' });
      last6Months.push({ key: monthKey, label, income: 0, expense: 0 });
   }

   validTransactions.forEach(t => {
      // Use ISO date prefix YYYY-MM
      const tKey = t.date.substring(0, 7);
      const period = last6Months.find(p => p.key === tKey);
      if (period) {
         if (t.type === TransactionType.INCOME) period.income += t.amount;
         else period.expense += t.amount;
      }
   });

   const maxVal = Math.max(
      ...last6Months.map(m => Math.max(m.income, m.expense)),
      100 // min scale
   );

   return (
      <div className="space-y-6">

         {/* 1. Category Breakdown */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
               <PieChart className="text-blue-600" size={20} />
               Despesas por Categoria
            </h3>

            <div className="flex flex-col md:flex-row items-center gap-8">
               {/* Simple CSS Conic Gradient Pie Chart */}
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
                  <div className="w-32 h-32 bg-white rounded-full flex items-center justify-center flex-col shadow-sm">
                     <span className="text-xs text-slate-400">Total</span>
                     <span className="font-bold text-slate-800">{formatCurrencyNoDecimals(totalExpenses)}</span>
                  </div>
               </div>

               {/* Legend */}
               <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {categoryData.map(d => (
                     <div key={d.name} className="flex items-center justify-between p-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                        <div className="flex items-center gap-2">
                           <span className="w-3 h-3 rounded-full shrink-0 border border-slate-300" style={{ backgroundColor: d.color }}></span>
                           <span className="text-sm text-slate-600 font-medium truncate max-w-[120px]" title={d.name}>{d.name}</span>
                        </div>
                        <div className="text-right">
                           <span className="text-sm font-bold text-slate-800 block">
                              {formatCurrency(d.value)}
                           </span>
                           <span className="text-[10px] text-slate-400">
                              {d.percentage.toFixed(1)}%
                           </span>
                        </div>
                     </div>
                  ))}
                  {categoryData.length === 0 && (
                     <p className="text-slate-400 text-sm">Nenhuma despesa registrada.</p>
                  )}
               </div>
            </div>
         </div>

         {/* 2. Monthly Evolution */}
         <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
               <BarChart className="text-purple-600" size={20} />
               Evolução Mensal (Receita x Despesa)
            </h3>

            <div className="h-64 flex items-end justify-between gap-2 sm:gap-6 mt-4 pb-2 border-b border-slate-100">
               {last6Months.map(m => (
                  <div key={m.key} className="flex-1 flex flex-col justify-end items-center gap-2 h-full group">
                     <div className="w-full flex justify-center items-end gap-1 h-full relative">
                        {/* Income Bar */}
                        <div
                           className="w-3 sm:w-6 bg-emerald-400 rounded-t-sm hover:bg-emerald-500 transition-all relative"
                           style={{ height: `${(m.income / maxVal) * 100}%` }}
                           title={`Receita: ${m.income}`}
                        ></div>
                        {/* Expense Bar */}
                        <div
                           className="w-3 sm:w-6 bg-rose-400 rounded-t-sm hover:bg-rose-500 transition-all relative"
                           style={{ height: `${(m.expense / maxVal) * 100}%` }}
                           title={`Despesa: ${m.expense}`}
                        ></div>
                     </div>
                     <span className="text-xs font-medium text-slate-500 uppercase">{m.label}</span>
                  </div>
               ))}
            </div>
         </div>

      </div>
   );
};

export default ReportsView;
