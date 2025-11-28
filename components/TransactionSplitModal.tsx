
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, CheckCircle2, AlertCircle, Calculator } from 'lucide-react';
import { Category, TransactionSplit } from '../types';

interface TransactionSplitModalProps {
  isOpen: boolean;
  onClose: () => void;
  totalAmount: number;
  availableCategories: Category[];
  initialSplits?: TransactionSplit[];
  onConfirm: (splits: TransactionSplit[]) => void;
}

const TransactionSplitModal: React.FC<TransactionSplitModalProps> = ({
  isOpen,
  onClose,
  totalAmount,
  availableCategories,
  initialSplits,
  onConfirm
}) => {
  const [rows, setRows] = useState<{ categoryName: string; amount: string; percent: string }[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (initialSplits && initialSplits.length > 0) {
        setRows(initialSplits.map(s => ({
          categoryName: s.categoryName,
          amount: s.amount.toFixed(2),
          percent: totalAmount > 0 ? ((s.amount / totalAmount) * 100).toFixed(2) : '0'
        })));
      } else {
        // Default to one row with full amount if opening fresh
        const initialCategory = availableCategories.length > 0 ? availableCategories[0].name : '';
        setRows([{ 
          categoryName: initialCategory, 
          amount: totalAmount.toFixed(2), 
          percent: '100.00' 
        }]);
      }
    }
  }, [isOpen, totalAmount, initialSplits, availableCategories]);

  const updateRow = (index: number, field: 'categoryName' | 'amount' | 'percent', value: string) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };

    if (field === 'amount') {
      const val = parseFloat(value) || 0;
      const newPercent = totalAmount > 0 ? (val / totalAmount) * 100 : 0;
      newRows[index].percent = newPercent.toFixed(2);
    } else if (field === 'percent') {
      const pct = parseFloat(value) || 0;
      const newAmount = (pct / 100) * totalAmount;
      newRows[index].amount = newAmount.toFixed(2);
    }

    setRows(newRows);
  };

  const addRow = () => {
    const currentSum = rows.reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0);
    const remaining = Math.max(0, totalAmount - currentSum);
    const percent = totalAmount > 0 ? (remaining / totalAmount) * 100 : 0;
    
    // Pick a category not already used if possible
    const usedCats = new Set(rows.map(r => r.categoryName));
    const nextCat = availableCategories.find(c => !usedCats.has(c.name))?.name || availableCategories[0]?.name || '';

    setRows([...rows, {
      categoryName: nextCat,
      amount: remaining.toFixed(2),
      percent: percent.toFixed(2)
    }]);
  };

  const removeRow = (index: number) => {
    if (rows.length <= 1) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  const currentTotal = rows.reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0);
  const diff = totalAmount - currentTotal;
  const isValid = Math.abs(diff) < 0.05; // Tolerance for floating point

  const handleConfirm = () => {
    if (!isValid) return;
    const splits: TransactionSplit[] = rows.map(r => ({
      categoryName: r.categoryName,
      amount: parseFloat(r.amount) || 0
    }));
    onConfirm(splits);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="bg-blue-100 p-1.5 rounded text-blue-600">
              <Calculator size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Dividir Lançamento</h3>
              <p className="text-xs text-slate-500">Valor Total: {totalAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
           {/* Progress Bar */}
           <div className="mb-6">
             <div className="flex justify-between text-xs mb-1 font-medium text-slate-600">
               <span>Distribuído: {currentTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
               <span className={diff === 0 ? 'text-emerald-600' : 'text-rose-600'}>
                 Restante: {diff.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
               </span>
             </div>
             <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
               <div 
                 className={`h-full transition-all duration-300 ${Math.abs(diff) < 0.05 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                 style={{ width: `${Math.min((currentTotal / totalAmount) * 100, 100)}%` }}
               />
             </div>
           </div>

           <div className="space-y-3">
             {rows.map((row, index) => (
               <div key={index} className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                 <div className="flex-1">
                   <select
                     value={row.categoryName}
                     onChange={(e) => updateRow(index, 'categoryName', e.target.value)}
                     className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                   >
                     {availableCategories.map(c => (
                       <option key={c.id} value={c.name}>{c.name}</option>
                     ))}
                   </select>
                 </div>
                 <div className="w-24 relative">
                   <span className="absolute left-2 top-2 text-xs text-slate-400">R$</span>
                   <input
                     type="number"
                     value={row.amount}
                     onChange={(e) => updateRow(index, 'amount', e.target.value)}
                     className="w-full pl-6 pr-2 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                   />
                 </div>
                 <div className="w-20 relative">
                   <span className="absolute right-2 top-2 text-xs text-slate-400">%</span>
                   <input
                     type="number"
                     value={row.percent}
                     onChange={(e) => updateRow(index, 'percent', e.target.value)}
                     className="w-full pl-2 pr-5 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 text-right"
                   />
                 </div>
                 <button 
                   onClick={() => removeRow(index)}
                   className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                   disabled={rows.length === 1}
                 >
                   <Trash2 size={16} />
                 </button>
               </div>
             ))}
           </div>

           <button 
             onClick={addRow}
             className="mt-4 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
           >
             <Plus size={16} />
             Adicionar Categoria
           </button>
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
           <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all text-sm font-medium">
              Cancelar
           </button>
           <button 
             onClick={handleConfirm}
             disabled={!isValid}
             className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2 text-sm"
           >
              {isValid ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              Confirmar Divisão
           </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionSplitModal;
