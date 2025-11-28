
import React from 'react';
import { Category, TransactionType, CategorySubtype } from '../types';
import { Tag, Trash2, Edit2, Target, CheckSquare, Square } from 'lucide-react';
import { ICON_MAP } from './CategoryForm'; // Helper to render icons

interface CategoryListProps {
  categories: Category[];
  onDelete: (id: string) => void;
  onEdit: (category: Category) => void;
  onOpenBudgetGenerator: (categoryIds?: string[]) => void;
}

const CategoryList: React.FC<CategoryListProps> = ({ categories, onDelete, onEdit, onOpenBudgetGenerator }) => {
  if (categories.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200 border-dashed">
        <p className="text-slate-400 mb-2">Nenhuma categoria cadastrada.</p>
      </div>
    );
  }

  // Group by Type
  const incomeCategories = categories.filter(c => c.type === TransactionType.INCOME);
  const expenseCategories = categories.filter(c => c.type === TransactionType.EXPENSE);

  const renderCategoryTable = (list: Category[], title: string, colorClass: string) => (
    <div className="mb-8 last:mb-0">
      <div className="flex items-center justify-between mb-3">
         <h3 className={`text-sm font-bold uppercase tracking-wider ${colorClass}`}>{title}</h3>
         {list.length > 0 && list[0].type === TransactionType.EXPENSE && (
           <button 
             onClick={() => onOpenBudgetGenerator(list.map(c => c.id))}
             className="text-xs flex items-center gap-1 text-slate-500 hover:text-purple-600 transition-colors"
           >
             <Target size={14} />
             Criar Orçamento em Massa
           </button>
         )}
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 font-medium text-slate-500">Nome</th>
              <th className="px-6 py-3 font-medium text-slate-500">Subtipo</th>
              <th className="px-6 py-3 font-medium text-slate-500 text-center">Orçamento</th>
              <th className="px-6 py-3 font-medium text-slate-500 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((cat) => {
              const IconComp = cat.icon && ICON_MAP[cat.icon] ? ICON_MAP[cat.icon] : Tag;
              
              return (
                <tr key={cat.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-3 text-slate-800 font-medium">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${cat.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-600' : 'bg-purple-50 text-purple-600'}`}>
                         <IconComp size={16} />
                      </div>
                      {cat.name}
                    </div>
                  </td>
                  <td className="px-6 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      cat.subtype === CategorySubtype.FIXED 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'bg-amber-50 text-amber-700'
                    }`}>
                      {cat.subtype}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center">
                    {cat.impactsBudget ? (
                      <span className="text-emerald-500" title="Impacta Orçamento">
                        <CheckSquare size={20} className="mx-auto" />
                      </span>
                    ) : (
                      <span className="text-slate-300" title="Não Impacta Orçamento">
                        <Square size={20} className="mx-auto" />
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {cat.type === TransactionType.EXPENSE && (
                        <button
                          onClick={() => onOpenBudgetGenerator([cat.id])}
                          className="text-slate-400 hover:text-purple-600 transition-colors p-1.5 hover:bg-purple-50 rounded"
                          title="Gerar Orçamento"
                        >
                          <Target size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => onEdit(cat)}
                        className="text-slate-400 hover:text-blue-600 transition-colors p-1.5 hover:bg-blue-50 rounded"
                        title="Editar Categoria"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => onDelete(cat.id)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 hover:bg-rose-50 rounded"
                        title="Excluir Categoria"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
                <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-slate-400 italic">Nenhuma categoria deste tipo.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button 
          onClick={() => onOpenBudgetGenerator(undefined)}
          className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 hover:text-purple-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all shadow-sm"
        >
          <Target size={16} />
          Gerar Orçamento Anual
        </button>
      </div>
      {renderCategoryTable(incomeCategories, 'Categorias de Receita', 'text-emerald-600')}
      {renderCategoryTable(expenseCategories, 'Categorias de Despesa', 'text-rose-600')}
    </div>
  );
};

export default CategoryList;
