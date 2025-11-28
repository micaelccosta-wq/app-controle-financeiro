
import React, { useState } from 'react';
import { PlusCircle, Wallet, Edit2, Trash2, ArrowRightLeft, CheckCircle2, AlertTriangle, Save, CreditCard } from 'lucide-react';
import { Account, Transaction, TransactionType, AccountType } from '../types';

interface AccountViewProps {
  accounts: Account[];
  transactions: Transaction[];
  onAddAccount: (account: Account) => void;
  onUpdateAccount: (account: Account) => void;
  onDeleteAccount: (id: string) => void;
  onAddAdjustmentTransaction: (transaction: Transaction) => void;
}

const AccountView: React.FC<AccountViewProps> = ({ 
  accounts, 
  transactions, 
  onAddAccount, 
  onUpdateAccount, 
  onDeleteAccount,
  onAddAdjustmentTransaction
}) => {
  // State for Account CRUD
  const [name, setName] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [type, setType] = useState<AccountType>(AccountType.BANK);
  const [closingDay, setClosingDay] = useState('');
  const [dueDay, setDueDay] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  // State for Reconciliation (Bank Only)
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [actualBalanceInput, setActualBalanceInput] = useState<string>('');

  // --- CRUD Logic ---
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const accountData: Account = {
      id: editingId || crypto.randomUUID(),
      name,
      type,
      initialBalance: type === AccountType.BANK ? (parseFloat(initialBalance) || 0) : 0,
      closingDay: type === AccountType.CREDIT_CARD ? (parseInt(closingDay) || 1) : undefined,
      dueDay: type === AccountType.CREDIT_CARD ? (parseInt(dueDay) || 10) : undefined,
    };

    if (editingId) {
      onUpdateAccount(accountData);
      setEditingId(null);
    } else {
      onAddAccount(accountData);
    }
    
    // Reset
    setName('');
    setInitialBalance('');
    setType(AccountType.BANK);
    setClosingDay('');
    setDueDay('');
  };

  const handleEdit = (account: Account) => {
    setName(account.name);
    setType(account.type);
    setInitialBalance(account.initialBalance.toString());
    setClosingDay(account.closingDay?.toString() || '');
    setDueDay(account.dueDay?.toString() || '');
    setEditingId(account.id);
  };

  const handleCancelEdit = () => {
    setName('');
    setInitialBalance('');
    setType(AccountType.BANK);
    setClosingDay('');
    setDueDay('');
    setEditingId(null);
  };

  // --- Calc Logic ---
  const calculateCurrentBalance = (account: Account) => {
    // Only applies for BANK accounts for reconciliation logic
    if (account.type !== AccountType.BANK) return 0;

    const accountTransactions = transactions.filter(t => t.accountId === account.id && t.isApplied);
    const totalIncome = accountTransactions
      .filter(t => t.type === TransactionType.INCOME)
      .reduce((acc, t) => acc + t.amount, 0);
    const totalExpense = accountTransactions
      .filter(t => t.type === TransactionType.EXPENSE)
      .reduce((acc, t) => acc + t.amount, 0);
    
    return account.initialBalance + totalIncome - totalExpense;
  };

  const totalAllAccounts = accounts
    .filter(a => a.type === AccountType.BANK)
    .reduce((acc, account) => acc + calculateCurrentBalance(account), 0);

  // --- Reconciliation Logic ---
  const selectedAccount = accounts.find(a => a.id === selectedAccountId);
  const calculatedSystemBalance = selectedAccount ? calculateCurrentBalance(selectedAccount) : 0;
  
  const handleAdjustment = () => {
    if (!selectedAccount || !actualBalanceInput) return;
    
    const actualBalance = parseFloat(actualBalanceInput);
    const difference = actualBalance - calculatedSystemBalance;
    
    if (difference === 0) return;

    const isPositive = difference > 0;
    
    // Fix rounding to 2 decimal places
    const amount = parseFloat(Math.abs(difference).toFixed(2));
    
    const adjustmentTransaction: Transaction = {
      id: crypto.randomUUID(),
      description: 'Ajuste de Saldo (Conciliação)',
      amount: amount,
      date: new Date().toISOString().split('T')[0],
      category: 'Rendimentos',
      type: isPositive ? TransactionType.INCOME : TransactionType.EXPENSE,
      isApplied: true,
      accountId: selectedAccount.id,
      observations: `Ajuste manual para igualar saldo físico de ${actualBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`
    };

    onAddAdjustmentTransaction(adjustmentTransaction);
    setActualBalanceInput('');
    alert('Movimento de ajuste lançado com sucesso!');
  };

  return (
    <div className="space-y-8">
      
      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-600 text-white rounded-xl p-6 shadow-md relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-blue-100 text-sm font-medium mb-1">Saldo Geral Acumulado (Bancos)</p>
            <p className="text-3xl font-bold">
              {totalAllAccounts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <Wallet className="absolute right-4 bottom-4 text-blue-500 opacity-30" size={64} />
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
           <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
             {editingId ? <Edit2 size={18} className="text-amber-500"/> : <PlusCircle size={18} className="text-emerald-500"/>}
             {editingId ? 'Editar Conta' : 'Nova Conta'}
           </h3>
           <form onSubmit={handleSubmit} className="flex flex-col gap-5">
             {/* Row 1: Name and Type */}
             <div className="flex flex-col sm:flex-row gap-4 w-full">
               <div className="flex-1">
                 <label className="block text-xs text-slate-500 mb-1">Nome da Conta</label>
                 <input 
                    type="text" 
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Ex: Nubank, Itaú..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                 />
               </div>
               <div className="w-full sm:w-40">
                 <label className="block text-xs text-slate-500 mb-1">Tipo de Conta</label>
                 <select 
                   value={type}
                   onChange={e => setType(e.target.value as AccountType)}
                   className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                 >
                    <option value={AccountType.BANK}>Conta Corrente / Carteira</option>
                    <option value={AccountType.CREDIT_CARD}>Cartão de Crédito</option>
                 </select>
               </div>
             </div>

             {/* Row 2: Specific Fields */}
             {type === AccountType.BANK ? (
               <div>
                  <label className="block text-xs text-slate-500 mb-1">Saldo Inicial</label>
                  <input 
                      type="number" 
                      step="0.01"
                      required
                      value={initialBalance}
                      onChange={e => setInitialBalance(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
               </div>
             ) : (
               <div className="flex gap-4">
                  <div className="flex-1">
                     <label className="block text-xs text-slate-500 mb-1">Dia Fechamento</label>
                     <input 
                        type="number" min="1" max="31"
                        required
                        value={closingDay}
                        onChange={e => setClosingDay(e.target.value)}
                        placeholder="Ex: 5"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                     />
                  </div>
                  <div className="flex-1">
                     <label className="block text-xs text-slate-500 mb-1">Dia Vencimento</label>
                     <input 
                        type="number" min="1" max="31"
                        required
                        value={dueDay}
                        onChange={e => setDueDay(e.target.value)}
                        placeholder="Ex: 12"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                     />
                  </div>
               </div>
             )}
             
             <div className="flex gap-2 justify-end pt-2 border-t border-slate-100 mt-1">
                {editingId && (
                  <button type="button" onClick={handleCancelEdit} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium">
                    Cancelar
                  </button>
                )}
                <button type="submit" className="bg-slate-800 text-white px-6 py-2 rounded-lg hover:bg-slate-900 transition-colors text-sm font-medium shadow-sm">
                  {editingId ? 'Atualizar Conta' : 'Cadastrar Conta'}
                </button>
             </div>
           </form>
        </div>
      </div>

      {/* Account List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
          <h3 className="font-semibold text-slate-700">Minhas Contas</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {accounts.length === 0 ? (
            <div className="p-8 text-center text-slate-400">Nenhuma conta cadastrada.</div>
          ) : (
            accounts.map(acc => {
              const current = calculateCurrentBalance(acc);
              const isCredit = acc.type === AccountType.CREDIT_CARD;
              
              return (
                <div key={acc.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isCredit ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
                      {isCredit ? <CreditCard size={20} /> : <Wallet size={20} />}
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{acc.name}</p>
                      {isCredit ? (
                         <p className="text-xs text-slate-500">Fecha dia {acc.closingDay} • Vence dia {acc.dueDay}</p>
                      ) : (
                         <p className="text-xs text-slate-500">Inicial: {acc.initialBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    {!isCredit && (
                      <div className="text-right">
                        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">Saldo Atual</p>
                        <p className={`font-bold ${current >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {current.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                      </div>
                    )}
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(acc)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={() => onDeleteAccount(acc.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Reconciliation Section (Only for Banks) */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-purple-100 p-2 rounded-lg text-purple-700">
             <ArrowRightLeft size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Conferência e Conciliação</h3>
            <p className="text-sm text-slate-500">Ajuste o saldo do sistema com o extrato bancário real.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Select Account */}
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-slate-700 mb-2">Selecione a Conta</label>
            <select 
              value={selectedAccountId} 
              onChange={e => {
                setSelectedAccountId(e.target.value);
                setActualBalanceInput('');
              }}
              className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            >
              <option value="">Selecione...</option>
              {accounts.filter(a => a.type === AccountType.BANK).map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
            {selectedAccount && (
               <div className="mt-4 bg-white p-4 rounded-lg border border-slate-200">
                 <p className="text-xs text-slate-500 mb-1">Saldo Calculado (Sistema)</p>
                 <p className={`text-xl font-bold ${calculatedSystemBalance >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                   {calculatedSystemBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                 </p>
                 <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                   Baseado no saldo inicial + transações aplicadas no sistema.
                 </p>
               </div>
            )}
          </div>

          {/* 2. Compare & Action */}
          <div className="md:col-span-2 relative">
             {!selectedAccount ? (
               <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 backdrop-blur-[1px] rounded-lg z-10">
                 <p className="text-slate-400 text-sm">Selecione uma conta bancária para iniciar.</p>
               </div>
             ) : null}

             <div className="bg-white p-6 rounded-xl border border-slate-200 h-full flex flex-col justify-center">
                <div className="flex flex-col sm:flex-row gap-6 items-end">
                   <div className="flex-1 w-full">
                      <label className="block text-sm font-medium text-slate-700 mb-2">Saldo Real (Banco)</label>
                      <input 
                        type="number"
                        step="0.01" 
                        value={actualBalanceInput}
                        onChange={e => setActualBalanceInput(e.target.value)}
                        placeholder="Informe o valor que está no banco..."
                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                   </div>
                   
                   {actualBalanceInput && (
                     <div className="w-full sm:w-auto">
                        <div className="bg-slate-100 rounded-lg px-4 py-2 text-right min-w-[140px]">
                           <p className="text-xs text-slate-500 mb-0.5">Diferença</p>
                           <p className={`font-bold ${
                             (parseFloat(actualBalanceInput) - calculatedSystemBalance) === 0 ? 'text-emerald-500' : 'text-amber-500'
                           }`}>
                             {(parseFloat(actualBalanceInput) - calculatedSystemBalance).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                           </p>
                        </div>
                     </div>
                   )}
                </div>

                {actualBalanceInput && Math.abs(parseFloat(actualBalanceInput) - calculatedSystemBalance) > 0.009 && (
                   <div className="mt-6 pt-6 border-t border-slate-100 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                        <div>
                          <p className="text-sm text-slate-700 font-medium">O saldo não bate!</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Existe uma diferença de <b>{(parseFloat(actualBalanceInput) - calculatedSystemBalance).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</b>. 
                            Deseja criar um lançamento de correção?
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={handleAdjustment}
                        className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white py-2.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <Save size={18} />
                        Lançar Ajuste na Categoria "Rendimentos"
                      </button>
                   </div>
                )}

                {actualBalanceInput && Math.abs(parseFloat(actualBalanceInput) - calculatedSystemBalance) <= 0.009 && (
                   <div className="mt-6 pt-6 border-t border-slate-100 flex items-center gap-2 text-emerald-600 animate-in fade-in">
                      <CheckCircle2 size={20} />
                      <span className="font-medium">Tudo certo! Os saldos estão conciliados.</span>
                   </div>
                )}
             </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default AccountView;
