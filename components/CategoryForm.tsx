
import React, { useState, useEffect } from 'react';
import { PlusCircle, Check, Save, X, ShoppingCart, Home, Car, Heart, Coffee, Smartphone, Briefcase, Plane, Gift, GraduationCap, Zap, Music, Anchor, Hammer, Umbrella, DollarSign } from 'lucide-react';
import { Category, TransactionType, CategorySubtype } from '../types';

interface CategoryFormProps {
  onSaveCategory: (category: Category) => void;
  editingCategory: Category | null;
  onCancelEdit: () => void;
}

// Map of available icons for selection
export const ICON_MAP: Record<string, React.ElementType> = {
  'shopping-cart': ShoppingCart,
  'home': Home,
  'car': Car,
  'heart': Heart,
  'coffee': Coffee,
  'smartphone': Smartphone,
  'briefcase': Briefcase,
  'plane': Plane,
  'gift': Gift,
  'graduation-cap': GraduationCap,
  'zap': Zap,
  'music': Music,
  'anchor': Anchor,
  'hammer': Hammer,
  'umbrella': Umbrella,
  'dollar-sign': DollarSign
};

const CategoryForm: React.FC<CategoryFormProps> = ({ onSaveCategory, editingCategory, onCancelEdit }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [subtype, setSubtype] = useState<CategorySubtype>(CategorySubtype.VARIABLE);
  const [impactsBudget, setImpactsBudget] = useState(true);
  const [selectedIcon, setSelectedIcon] = useState('shopping-cart');

  useEffect(() => {
    if (editingCategory) {
      setName(editingCategory.name);
      setType(editingCategory.type);
      setSubtype(editingCategory.subtype);
      setImpactsBudget(editingCategory.impactsBudget);
      setSelectedIcon(editingCategory.icon || 'shopping-cart');
    } else {
      setName('');
      // Keep previous type/subtype settings for faster entry
    }
  }, [editingCategory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name) return;

    const categoryToSave: Category = {
      id: editingCategory ? editingCategory.id : crypto.randomUUID(),
      name,
      type,
      subtype,
      impactsBudget,
      icon: selectedIcon
    };

    onSaveCategory(categoryToSave);
    
    // Reset if adding new
    if (!editingCategory) {
      setName('');
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          {editingCategory ? <Save className="w-5 h-5 text-amber-600" /> : <PlusCircle className="w-5 h-5 text-purple-600" />}
          {editingCategory ? 'Editar Categoria' : 'Nova Categoria'}
        </h2>
        {editingCategory && (
          <button onClick={onCancelEdit} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Name Input */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Categoria</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Supermercado..."
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          {/* Type */}
          <div className="w-full md:w-48">
            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TransactionType)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white"
            >
              <option value={TransactionType.EXPENSE}>Despesa</option>
              <option value={TransactionType.INCOME}>Receita</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Subtype */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Subtipo</label>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setSubtype(CategorySubtype.FIXED)}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${
                  subtype === CategorySubtype.FIXED
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Fixa
              </button>
              <button
                type="button"
                onClick={() => setSubtype(CategorySubtype.VARIABLE)}
                className={`flex-1 py-1.5 rounded-md text-sm font-medium transition-all ${
                  subtype === CategorySubtype.VARIABLE
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Variável
              </button>
            </div>
          </div>

          {/* Budget Impact */}
          <div>
             <label className="block text-sm font-medium text-slate-700 mb-1">Orçamento</label>
             <label className="flex items-center p-2 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors bg-white h-[42px]">
              <input
                type="checkbox"
                checked={impactsBudget}
                onChange={(e) => setImpactsBudget(e.target.checked)}
                className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
              />
              <span className="ml-2 text-sm text-slate-700">Impacta Orçamento</span>
            </label>
          </div>
        </div>

        {/* Icon Picker */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Ícone</label>
          <div className="flex flex-wrap gap-2">
            {Object.entries(ICON_MAP).map(([key, IconComponent]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedIcon(key)}
                className={`p-2 rounded-lg border transition-all ${
                  selectedIcon === key
                    ? 'bg-purple-100 border-purple-300 text-purple-700'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                }`}
              >
                <IconComponent size={20} />
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-2 gap-3">
           {editingCategory && (
             <button
                type="button"
                onClick={onCancelEdit}
                className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
             >
               Cancelar
             </button>
           )}
          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2.5 px-6 rounded-lg shadow-sm transition-all flex items-center gap-2 active:scale-95"
          >
            {editingCategory ? <Save size={20} /> : <Check size={20} />}
            {editingCategory ? 'Atualizar' : 'Salvar Categoria'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CategoryForm;
