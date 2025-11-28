
import React, { useState, useEffect } from 'react';
import { X, Save, Calculator, CheckSquare, Square } from 'lucide-react';
import { Category, Transaction, TransactionType, Budget } from '../types';

interface BudgetGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  transactions: Transaction[]; // Used for history
  initialSelectedCategoryIds?: string[];
  onSaveBudgets: (newBudgets: Budget[]) => void;
}

const BudgetGeneratorModal: React.FC<BudgetGeneratorModalProps> = ({
  isOpen, onClose, categories, transactions, initialSelectedCategoryIds, onSaveBudgets
}) => {
  const [year, setYear] = useState(new Date().getFullYear() + 1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [budgetValues, setBudgetValues] = useState<Record<string, string>>({}); // categoryId -> amount string

  // Filter only expense categories that impact budget
  const expenseCategories = categories.filter(c => c.type === TransactionType.EXPENSE && c.impactsBudget);

  useEffect(() => {
    if (isOpen) {
      // Default selection
      if (initialSelectedCategoryIds) {
        setSelectedIds(initialSelectedCategoryIds);
      } else {
        setSelectedIds(expenseCategories.map(c => c.id));
      }

      // Calculate Averages based on Current Year (YTD)
      const currentYear = new Date().getFullYear();
      const currentMonthIndex = new Date().getMonth(); // 0-11
      // Avoid division by zero if it's January 1st, count as 1 month active
      const monthsActive = currentMonthIndex + 1;

      const averages: Record<string, string> = {};

      expenseCategories.forEach(cat => {
        const totalSpentYTD = transactions
          .filter(t => {
            const tDate = new Date(t.date);
            return t.category === cat.name && t.type === TransactionType.EXPENSE && tDate.getFullYear() === currentYear;
          })
          .reduce((sum, t) => sum + t.amount, 0);

        const avg = totalSpentYTD / monthsActive;
        // Round to 2 decimals
        if (avg > 0) {
            averages[cat.id] = avg.toFixed(2);
        } else {
            averages[cat.id] = '0';
        }
      });
      setBudgetValues(averages);
    }
  }, [isOpen, initialSelectedCategoryIds, transactions, categories]);

  if (!isOpen) return null;

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleValueChange = (id: string, val: string) => {
    setBudgetValues(prev => ({ ...prev, [id]: val }));
  };

  const handleGenerate = () => {
    const newBudgets: Budget[] = [];
    
    selectedIds.forEach(catId => {
      const amount = parseFloat(budgetValues[catId] || '0');
      if (amount > 0) {
        // Generate for all 12 months
        for (let m = 0; m < 12; m++) {
          newBudgets.push({
            id: `${catId}-${m}-${year}`,
            categoryId: catId,
            month: m,
            year: year,
            amount: amount
          });
        }
      }
    });

    onSaveBudgets(newBudgets);
    onClose();
    alert(`${newBudgets.length} registros de orçamento criados para ${year}!`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
             <div className="bg-purple-100 p-1.5 rounded text-purple-600">
               <Calculator size={20} />
             </div>
             <h3 className="font-bold text-slate-800 text-lg">Gerador de Orçamento</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div className="mb-6 flex items-center gap-4">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Ano de Referência</label>
               <input 
                 type="number" 
                 value={year} 
                 onChange={e => setYear(parseInt(e.target.value))}
                 className="px-4 py-2 border border-slate-300 rounded-lg w-32 font-bold text-center text-slate-800 focus:ring-2 focus:ring-purple-500 outline-none"
               />
             </div>
             <div className="text-sm text-slate-500 bg-blue-50 p-3 rounded-lg border border-blue-100 flex-1">
                O sistema calculou uma média mensal baseada nos gastos de <strong>{new Date().getFullYear()}</strong>. 
                Ajuste os valores abaixo e clique em gerar para criar o orçamento de Jan a Dez de <strong>{year}</strong>.
             </div>
          </div>

          <table className="w-full text-sm">
             <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                   <th className="px-4 py-2 text-left w-10">
                      {/* Check All logic omitted for brevity, user can click rows */}
                   </th>
                   <th className="px-4 py-2 text-left text-slate-600">Categoria</th>
                   <th className="px-4 py-2 text-right text-slate-600">Média Mensal (Sugestão)</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-slate-100">
                {expenseCategories.map(cat => {
                   const isSelected = selectedIds.includes(cat.id);
                   return (
                      <tr key={cat.id} className={`hover:bg-slate-50 ${isSelected ? 'bg-purple-50/30' : ''}`}>
                         <td className="px-4 py-3">
                            <button onClick={() => toggleSelection(cat.id)} className={`text-slate-400 ${isSelected ? 'text-purple-600' : ''}`}>
                               {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                            </button>
                         </td>
                         <td className="px-4 py-3 font-medium text-slate-700">
                            {cat.name}
                         </td>
                         <td className="px-4 py-3 text-right">
                            <div className="relative inline-block w-32">
                               <span className="absolute left-3 top-2 text-slate-400 text-xs">R$</span>
                               <input 
                                 type="number" 
                                 disabled={!isSelected}
                                 value={budgetValues[cat.id] || ''}
                                 onChange={e => handleValueChange(cat.id, e.target.value)}
                                 className="w-full pl-8 pr-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-purple-500 outline-none text-right disabled:opacity-50 disabled:bg-slate-100"
                               />
                            </div>
                         </td>
                      </tr>
                   )
                })}
             </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
           <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all">
              Cancelar
           </button>
           <button 
             onClick={handleGenerate}
             disabled={selectedIds.length === 0}
             className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2"
           >
              <Save size={18} />
              Gerar Orçamento
           </button>
        </div>
      </div>
    </div>
  );
};

export default BudgetGeneratorModal;
