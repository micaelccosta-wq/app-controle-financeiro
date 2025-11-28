
import React, { useState, useEffect } from 'react';
import { X, ArrowRightLeft, CheckCircle2, AlertCircle, Calculator, Plus, Trash2 } from 'lucide-react';
import { Category, Budget } from '../types';

interface BudgetReallocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  sourceCategory: { id: string; name: string; remaining: number; currentBudget: number } | null;
  targetCategories: Category[]; // Excludes source
  onConfirm: (adjustments: { categoryId: string; delta: number }[]) => void;
}

const BudgetReallocationModal: React.FC<BudgetReallocationModalProps> = ({
  isOpen,
  onClose,
  sourceCategory,
  targetCategories,
  onConfirm
}) => {
  const [rows, setRows] = useState<{ categoryId: string; amount: string; percent: string }[]>([]);

  useEffect(() => {
    if (isOpen && sourceCategory) {
      // Start empty
      setRows([]);
    }
  }, [isOpen, sourceCategory]);

  if (!isOpen || !sourceCategory) return null;

  const totalAvailable = sourceCategory.remaining;

  const updateRow = (index: number, field: 'categoryId' | 'amount' | 'percent', value: string) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [field]: value };

    if (field === 'amount') {
      const val = parseFloat(value) || 0;
      const newPercent = totalAvailable > 0 ? (val / totalAvailable) * 100 : 0;
      newRows[index].percent = newPercent.toFixed(2);
    } else if (field === 'percent') {
      const pct = parseFloat(value) || 0;
      const newAmount = (pct / 100) * totalAvailable;
      newRows[index].amount = newAmount.toFixed(2);
    }

    setRows(newRows);
  };

  const addRow = () => {
    const currentSum = rows.reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0);
    const remainingToDistribute = Math.max(0, totalAvailable - currentSum);
    const percent = totalAvailable > 0 ? (remainingToDistribute / totalAvailable) * 100 : 0;
    
    // Pick a category not already used
    const usedIds = new Set(rows.map(r => r.categoryId));
    const nextCat = targetCategories.find(c => !usedIds.has(c.id))?.id || targetCategories[0]?.id || '';

    setRows([...rows, {
      categoryId: nextCat,
      amount: remainingToDistribute.toFixed(2),
      percent: percent.toFixed(2)
    }]);
  };

  const removeRow = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
  };

  const distributedTotal = rows.reduce((acc, r) => acc + (parseFloat(r.amount) || 0), 0);
  const remainingBuffer = totalAvailable - distributedTotal;
  
  // Valid if distributed > 0 and <= available (allowing small float error)
  const isValid = distributedTotal > 0 && remainingBuffer >= -0.05;

  const handleConfirm = () => {
    if (!isValid) return;
    
    const adjustments: { categoryId: string; delta: number }[] = [];
    
    // 1. Reduce Source
    adjustments.push({
      categoryId: sourceCategory.id,
      delta: -distributedTotal
    });

    // 2. Increase Targets
    rows.forEach(r => {
      const val = parseFloat(r.amount) || 0;
      if (val > 0) {
        adjustments.push({
          categoryId: r.categoryId,
          delta: val
        });
      }
    });

    onConfirm(adjustments);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="bg-amber-100 p-1.5 rounded text-amber-600">
              <ArrowRightLeft size={20} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Remanejar Orçamento</h3>
              <p className="text-xs text-slate-500">Origem: <span className="font-semibold">{sourceCategory.name}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
           <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-6 text-center">
              <p className="text-xs text-slate-500 uppercase font-bold mb-1">Saldo Disponível para Remanejar</p>
              <p className="text-2xl font-bold text-emerald-600">
                {totalAvailable.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">
                (Orçado: {sourceCategory.currentBudget.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} - Realizado)
              </p>
           </div>

           <div className="space-y-3">
             {rows.length === 0 && (
                <div className="text-center py-6 text-slate-400 border border-dashed rounded-lg">
                   Adicione categorias para receber o valor.
                </div>
             )}
             {rows.map((row, index) => (
               <div key={index} className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                 <div className="flex-1">
                   <select
                     value={row.categoryId}
                     onChange={(e) => updateRow(index, 'categoryId', e.target.value)}
                     className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                   >
                     {targetCategories.map(c => (
                       <option key={c.id} value={c.id}>{c.name}</option>
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
                 >
                   <Trash2 size={16} />
                 </button>
               </div>
             ))}
           </div>

           <button 
             onClick={addRow}
             className="mt-4 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 font-medium"
             disabled={remainingBuffer <= 0}
           >
             <Plus size={16} />
             Adicionar Destino
           </button>

           <div className="mt-4 flex justify-between text-xs font-medium text-slate-600 border-t pt-2">
               <span>Distribuído: {distributedTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
               <span className={remainingBuffer < 0 ? 'text-rose-600' : 'text-slate-400'}>
                 Restante: {Math.max(0, remainingBuffer).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
               </span>
           </div>
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
              Confirmar Remanejo
           </button>
        </div>
      </div>
    </div>
  );
};

export default BudgetReallocationModal;
