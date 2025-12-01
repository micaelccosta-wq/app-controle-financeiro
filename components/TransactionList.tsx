
import React, { useState } from 'react';
import { Transaction, TransactionType, Account, AccountType } from '../types';
import { ArrowDownCircle, ArrowUpCircle, Calendar, Tag, CheckCircle2, Edit2, Layers, CheckSquare, Square, Wallet, Trash2, GitFork, Upload, FileText, Filter, Search, Clock } from 'lucide-react';

interface TransactionListProps {
  transactions: Transaction[];
  accounts: Account[];
  selectedIds: string[];
  onToggleSelection: (id: string) => void;
  onSelectAll: (filteredIds?: string[]) => void;
  onDelete: (id: string) => void;
  onBulkDelete?: (ids: string[]) => void;
  onEdit: (transaction: Transaction) => void;
  onBulkStatusChange: () => void;
  onOpenImportOFX?: () => void;
  onOpenImportCSV?: () => void;
}

const TransactionList: React.FC<TransactionListProps> = ({
  transactions,
  accounts,
  selectedIds,
  onToggleSelection,
  onSelectAll,
  onDelete,
  onBulkDelete,
  onEdit,
  onBulkStatusChange,
  onOpenImportOFX,
  onOpenImportCSV
}) => {
  // --- Filter States ---
  const [filterDesc, setFilterDesc] = useState('');

  // Default Date Range: Today - 30 days to Today + 30 days
  const today = new Date();
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(today.getDate() - 30);
  const thirtyDaysFuture = new Date(today);
  thirtyDaysFuture.setDate(today.getDate() + 30);

  const [filterDateStart, setFilterDateStart] = useState(thirtyDaysAgo.toISOString().split('T')[0]);
  const [filterDateEnd, setFilterDateEnd] = useState(thirtyDaysFuture.toISOString().split('T')[0]);
  const [filterCategory, setFilterCategory] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>(''); // 'APPLIED' | 'PENDING' | ''
  const [filterIgnoreInBudget, setFilterIgnoreInBudget] = useState<string>(''); // 'YES' | 'NO' | ''
  const [showFilters, setShowFilters] = useState(false);

  // --- Filtering Logic ---
  const filteredTransactions = transactions.filter(t => {
    // Desc
    if (filterDesc && !t.description.toLowerCase().includes(filterDesc.toLowerCase())) return false;
    // Date
    if (filterDateStart && t.date < filterDateStart) return false;
    if (filterDateEnd && t.date > filterDateEnd) return false;
    // Category
    if (filterCategory && !t.category.toLowerCase().includes(filterCategory.toLowerCase())) return false;
    // Account
    if (filterAccount && t.accountId !== filterAccount) return false;
    // Type
    if (filterType && t.type !== filterType) return false;
    // Status
    if (filterStatus) {
      if (filterStatus === 'APPLIED' && !t.isApplied) return false;
      if (filterStatus === 'PENDING' && t.isApplied) return false;
    }
    // Ignore In Budget
    if (filterIgnoreInBudget) {
      if (filterIgnoreInBudget === 'YES' && !t.ignoreInBudget) return false;
      if (filterIgnoreInBudget === 'NO' && t.ignoreInBudget) return false;
    }

    return true;
  });

  const sortedTransactions = [...filteredTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const allFilteredSelected = sortedTransactions.length > 0 && sortedTransactions.every(t => selectedIds.includes(t.id));

  const getAccountName = (accId?: string) => {
    if (!accId) return null;
    return accounts.find(a => a.id === accId)?.name;
  };

  const handleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      // Deselect current visible items
      const idsToUnselect = new Set(sortedTransactions.map(t => t.id));
      const newSelection = selectedIds.filter(id => !idsToUnselect.has(id));
      onSelectAll(newSelection);
    } else {
      // Select all visible
      const idsToSelect = sortedTransactions.map(t => t.id);
      const combined = Array.from(new Set([...selectedIds, ...idsToSelect]));
      onSelectAll(combined);
    }
  };

  const clearFilters = () => {
    setFilterDesc('');
    setFilterDateStart('');
    setFilterDateEnd('');
    setFilterCategory('');
    setFilterAccount('');
    setFilterType('');
    setFilterStatus('');
    setFilterIgnoreInBudget('');
  };

  // Get unique categories for filter dropdown
  const uniqueCategories = Array.from(new Set(transactions.map(t => {
    // Handle potential split category strings like "Category: 100"
    if (t.category.includes(':')) {
      return t.category.split(':')[0].trim();
    }
    return t.category;
  }))).sort();

  // Filter accounts for dropdown (ONLY BANKS)
  const bankAccounts = accounts.filter(a => a.type === AccountType.BANK);

  const handleBulkDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onBulkDelete && selectedIds.length > 0) {
      onBulkDelete(selectedIds);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 px-1 gap-4">
        <h3 className="text-lg font-semibold text-slate-800">Últimos Lançamentos</h3>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors shadow-sm ${showFilters ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
          >
            <Filter size={14} />
            {showFilters ? 'Ocultar Filtros' : 'Filtros'}
          </button>

          {onOpenImportCSV && (
            <button
              onClick={onOpenImportCSV}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 hover:text-emerald-600 transition-colors shadow-sm"
            >
              <FileText size={14} />
              CSV
            </button>
          )}

          {onOpenImportOFX && (
            <button
              onClick={onOpenImportOFX}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-sm"
            >
              <Upload size={14} />
              OFX
            </button>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      {showFilters && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <Filter size={16} className="text-blue-500" />
              Filtros Avançados
            </h4>
            <button onClick={clearFilters} className="text-xs text-rose-600 hover:text-rose-700 font-medium hover:underline">
              Limpar Filtros
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar por nome..."
                  value={filterDesc}
                  onChange={e => setFilterDesc(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Date Range */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Período (De)</label>
              <input
                type="date"
                value={filterDateStart}
                onChange={e => setFilterDateStart(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Período (Até)</label>
              <input
                type="date"
                value={filterDateEnd}
                onChange={e => setFilterDateEnd(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoria</label>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Todas</option>
                {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Todos</option>
                <option value={TransactionType.INCOME}>Receitas</option>
                <option value={TransactionType.EXPENSE}>Despesas</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Todos</option>
                <option value="APPLIED">Concretizados (Pagos)</option>
                <option value="PENDING">Pendentes</option>
              </select>
            </div>

            {/* Ignore In Budget Filter */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ignorar no Orçamento</label>
              <select
                value={filterIgnoreInBudget}
                onChange={e => setFilterIgnoreInBudget(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Todos</option>
                <option value="YES">Sim (Ignorados)</option>
                <option value="NO">Não (Considerados)</option>
              </select>
            </div>

            {/* Account (Banks Only) */}
            <div className="md:col-span-2 lg:col-span-1">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Conta Bancária</label>
              <select
                value={filterAccount}
                onChange={e => setFilterAccount(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Todas as Contas</option>
                {bankAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>

          </div>
        </div>
      )}

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 p-3 rounded-lg animate-in fade-in shadow-sm sticky top-[72px] z-10">
          <span className="text-sm text-blue-700 font-bold pl-2">{selectedIds.length} selecionado(s)</span>
          <div className="h-4 w-px bg-blue-200 mx-2"></div>
          <button
            type="button"
            onClick={onBulkStatusChange}
            className="flex items-center gap-1.5 bg-white border border-blue-200 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors"
          >
            <CheckCircle2 size={14} />
            Alternar Status
          </button>
          {onBulkDelete && (
            <button
              type="button"
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 bg-white border border-rose-200 text-rose-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-rose-50 transition-colors"
            >
              <Trash2 size={14} />
              Excluir Selecionados
            </button>
          )}
        </div>
      )}

      {sortedTransactions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200 border-dashed">
          <p className="text-slate-400 mb-2">
            {transactions.length > 0 ? 'Nenhuma movimentação encontrada com os filtros atuais.' : 'Nenhuma movimentação registrada.'}
          </p>
        </div>
      ) : (
        <>
          {/* Select All Bar */}
          <div className="bg-slate-100 rounded-lg px-4 py-2 flex items-center gap-3 border border-slate-200">
            <button onClick={handleSelectAllFiltered} className="text-slate-500 hover:text-slate-800">
              {allFilteredSelected ? <CheckSquare size={20} /> : <Square size={20} />}
            </button>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Selecionar Todos (Visíveis)</span>
          </div>

          <div className="space-y-3">
            {sortedTransactions.map((t) => {
              const isSelected = selectedIds.includes(t.id);
              const accountName = getAccountName(t.accountId);
              const hasSplit = t.split && t.split.length > 0;

              return (
                <div
                  key={t.id}
                  className={`bg-white rounded-lg p-4 shadow-sm border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 group ${isSelected ? 'border-blue-400 bg-blue-50/30' : 'border-slate-200 hover:border-blue-300'
                    }`}
                >
                  {/* Left: Checkbox, Icon & Description */}
                  <div className="flex items-start gap-4">
                    <div className="pt-2">
                      <button onClick={() => onToggleSelection(t.id)} className={`text-slate-400 hover:text-blue-600 ${isSelected ? 'text-blue-600' : ''}`}>
                        {isSelected ? <CheckSquare size={20} /> : <Square size={20} />}
                      </button>
                    </div>

                    <div className={`p-2.5 rounded-full shrink-0 ${t.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}>
                      {t.type === TransactionType.INCOME ? <ArrowUpCircle size={24} /> : <ArrowDownCircle size={24} />}
                    </div>

                    <div>
                      <h4 className="font-semibold text-slate-800 flex items-center gap-2">
                        {t.description}
                        {t.totalInstallments && t.totalInstallments > 1 && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full border border-slate-200 flex items-center gap-1" title="Parcelado">
                            <Layers size={10} /> {t.installmentNumber}/{t.totalInstallments}
                          </span>
                        )}
                      </h4>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                        <span className="flex items-center gap-1" title={hasSplit ? t.split?.map(s => `${s.categoryName}: R$ ${s.amount}`).join('\n') : ''}>
                          <Tag size={14} />
                          {hasSplit ? (
                            <span className="flex items-center gap-1 bg-slate-100 px-1.5 rounded text-xs text-blue-600 border border-slate-200">
                              <GitFork size={10} />
                              Múltiplas
                            </span>
                          ) : t.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar size={14} />
                          {new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </span>
                        {accountName && (
                          <span className="flex items-center gap-1 text-slate-400">
                            <Wallet size={12} />
                            {accountName}
                          </span>
                        )}
                        {t.observations && (
                          <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600 max-w-[150px] truncate" title={t.observations}>
                            {t.observations}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Value & Status & Actions */}
                  <div className="flex items-center justify-between sm:justify-end gap-4 sm:min-w-[200px]">
                    <div className="text-right">
                      <span className={`block font-bold text-lg ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                        {t.type === TransactionType.EXPENSE ? '- ' : '+ '}
                        {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>

                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        {t.isApplied ? (
                          <span className="flex items-center gap-1 text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={12} />
                            Aplicado
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                            <Clock size={12} />
                            Pendente
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => onEdit(t)}
                        className="text-slate-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-all"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(t.id)}
                        className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 transition-all"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default TransactionList;
