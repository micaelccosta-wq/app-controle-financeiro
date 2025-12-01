import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { Category, Budget, TransactionType } from '../types';

interface BudgetYearlyEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    categories: Category[];
    budgets: Budget[];
    selectedYear: number;
    onSave: (newBudgets: Budget[]) => Promise<void>;
}

const BudgetYearlyEditModal: React.FC<BudgetYearlyEditModalProps> = ({
    isOpen,
    onClose,
    categories,
    budgets,
    selectedYear,
    onSave
}) => {
    const [grid, setGrid] = useState<Record<string, number>>({}); // Key: "categoryId-month" -> value
    const [isSaving, setIsSaving] = useState(false);

    const months = [
        'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
        'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];

    // Filter only expense categories that impact budget
    const expenseCategories = categories.filter(c => c.type === TransactionType.EXPENSE && c.impactsBudget);

    useEffect(() => {
        if (isOpen) {
            // Initialize grid with existing budget values
            const newGrid: Record<string, number> = {};
            expenseCategories.forEach(cat => {
                months.forEach((_, monthIndex) => {
                    const budget = budgets.find(b =>
                        b.categoryId === cat.id &&
                        b.month === monthIndex &&
                        b.year === selectedYear
                    );
                    if (budget) {
                        newGrid[`${cat.id}-${monthIndex}`] = budget.amount;
                    }
                });
            });
            setGrid(newGrid);
        }
    }, [isOpen, budgets, selectedYear, categories]);

    const handleInputChange = (categoryId: string, monthIndex: number, value: string) => {
        const numValue = parseFloat(value);
        setGrid(prev => ({
            ...prev,
            [`${categoryId}-${monthIndex}`]: isNaN(numValue) ? 0 : numValue
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const newBudgets: Budget[] = [];
            expenseCategories.forEach(cat => {
                months.forEach((_, monthIndex) => {
                    const amount = grid[`${cat.id}-${monthIndex}`];
                    // Only create budget entry if amount > 0 or if it existed before (to update to 0)
                    // Actually, we should probably upsert everything that is defined in the grid to ensure consistency.
                    // Or at least upsert if amount is defined.
                    if (amount !== undefined) {
                        newBudgets.push({
                            id: `${cat.id}-${monthIndex}-${selectedYear}`,
                            categoryId: cat.id,
                            month: monthIndex,
                            year: selectedYear,
                            amount: amount
                        });
                    }
                });
            });

            await onSave(newBudgets);
            onClose();
        } catch (error) {
            console.error("Failed to save batch budgets", error);
            alert("Erro ao salvar orçamentos.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 text-lg">Editar Orçamento Anual - {selectedYear}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X size={24} />
                    </button>
                </div>

                {/* Content (Scrollable Table) */}
                <div className="flex-1 overflow-auto p-6">
                    <table className="w-full text-sm border-collapse">
                        <thead>
                            <tr>
                                <th className="text-left p-2 border-b border-slate-200 bg-slate-50 sticky top-0 left-0 z-20 min-w-[200px]">Categoria</th>
                                {months.map((m, i) => (
                                    <th key={i} className="text-center p-2 border-b border-slate-200 bg-slate-50 sticky top-0 min-w-[100px]">{m}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {expenseCategories.map(cat => (
                                <tr key={cat.id} className="hover:bg-slate-50 border-b border-slate-100">
                                    <td className="p-2 font-medium text-slate-700 sticky left-0 bg-white border-r border-slate-100 z-10">
                                        <div className="flex flex-col">
                                            <span>{cat.name}</span>
                                            <span className="text-[10px] text-slate-400 font-normal">{cat.subtype}</span>
                                        </div>
                                    </td>
                                    {months.map((_, monthIndex) => (
                                        <td key={monthIndex} className="p-2 text-center border-r border-slate-50 last:border-0">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={grid[`${cat.id}-${monthIndex}`] || ''}
                                                onChange={(e) => handleInputChange(cat.id, monthIndex, e.target.value)}
                                                className="w-full text-right p-1 border border-slate-200 rounded focus:ring-1 focus:ring-blue-500 outline-none text-xs"
                                                placeholder="0.00"
                                            />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                        Salvar Alterações
                    </button>
                </div>

            </div>
        </div>
    );
};

export default BudgetYearlyEditModal;
