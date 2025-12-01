
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Account, Transaction, AccountType, TransactionType } from '../types';
import { CreditCard, Lock, Check, AlertCircle, Edit2, Trash2, Layers, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface CreditCardInvoiceViewProps {
   accounts: Account[];
   transactions: Transaction[];
   onCloseInvoice: (total: number, date: string, accountId: string, invoiceName: string) => void;
   onDeleteTransaction: (id: string) => void;
   onEditTransaction: (transaction: Transaction) => void;
   onReopenInvoice: (invoiceName: string) => void;
   onBulkDelete?: (ids: string[]) => void;
}

const CreditCardInvoiceView: React.FC<CreditCardInvoiceViewProps> = ({
   accounts,
   transactions,
   onCloseInvoice,
   onDeleteTransaction,
   onEditTransaction,
   onReopenInvoice,
   onBulkDelete
}) => {
   const creditCards = accounts.filter(a => a.type === AccountType.CREDIT_CARD);
   const [selectedCardId, setSelectedCardId] = useState<string>(creditCards[0]?.id || '');
   const [selectedMonth, setSelectedMonth] = useState<string>('');

   const scrollContainerRef = useRef<HTMLDivElement>(null);

   const selectedCard = accounts.find(a => a.id === selectedCardId);

   // Helper to generate invoice options with totals and status
   const invoiceOptionsData = useMemo(() => {
      if (!selectedCardId || !selectedCard) return [];

      const today = new Date();
      const options = [];
      const currentY = today.getFullYear();
      const currentM = today.getMonth() + 1;

      // Generate last 12 months and next 12 months
      // Determine range based on transactions
      let minDate = new Date(currentY, currentM - 1 - 12, 1); // Default start: 12 months ago
      let maxDate = new Date(currentY, currentM - 1 + 12, 1); // Default end: 12 months ahead

      // Check all transactions for this card to find the true range
      transactions.filter(t => t.accountId === selectedCardId && t.invoiceMonth).forEach(t => {
         const [mStr, yStr] = t.invoiceMonth!.split('/');
         const tDate = new Date(parseInt(yStr), parseInt(mStr) - 1, 1);
         if (tDate < minDate) minDate = tDate;
         if (tDate > maxDate) maxDate = tDate;
      });

      // Iterate from minDate to maxDate
      const startY = minDate.getFullYear();
      const startM = minDate.getMonth() + 1;
      const endY = maxDate.getFullYear();
      const endM = maxDate.getMonth() + 1;

      // Calculate total months to iterate
      const totalMonths = (endY - startY) * 12 + (endM - startM);

      for (let i = 0; i <= totalMonths; i++) {
         let m = startM + i;
         let y = startY;
         while (m > 12) { m -= 12; y++; }

         const monthStr = `${String(m).padStart(2, '0')}/${y}`;

         // Calculate Total
         const invoiceTransactions = transactions.filter(t =>
            t.accountId === selectedCardId && t.invoiceMonth === monthStr
         );
         const total = invoiceTransactions.reduce((acc, t) => {
            return t.type === TransactionType.EXPENSE ? acc + t.amount : acc - t.amount;
         }, 0);

         const invoiceName = `Fatura ${selectedCard?.name} - ${monthStr}`;
         const isClosed = transactions.some(t => t.description === invoiceName);

         const dateObj = new Date(y, m - 1, 1);
         const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '');

         options.push({
            value: monthStr,
            label: `${monthName} ${y}`,
            monthName,
            year: y,
            total,
            isClosed,
            sortValue: y * 100 + m
         });
      }
      return options;
   }, [selectedCardId, selectedCard, transactions]);

   // Logic to auto-select the "Next Open Invoice"
   useEffect(() => {
      if (invoiceOptionsData.length > 0) {
         const today = new Date();
         const currentSort = today.getFullYear() * 100 + (today.getMonth() + 1);

         // Find first open invoice starting from current month
         const defaultOpen = invoiceOptionsData.find(opt => opt.sortValue >= currentSort && !opt.isClosed);

         if (defaultOpen) {
            setSelectedMonth(defaultOpen.value);
         } else {
            // Fallback to current month if all closed (unlikely) or none found
            const mStr = `${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
            setSelectedMonth(mStr);
         }
      }
   }, [selectedCardId]); // Only reset when card changes, not on every render

   // Auto-scroll to selected month
   useEffect(() => {
      if (scrollContainerRef.current && selectedMonth) {
         const selectedIndex = invoiceOptionsData.findIndex(opt => opt.value === selectedMonth);
         if (selectedIndex >= 0) {
            const cardWidth = 160;
            const scrollPos = (selectedIndex * cardWidth) - (scrollContainerRef.current.clientWidth / 2) + (cardWidth / 2);
            scrollContainerRef.current.scrollTo({ left: scrollPos, behavior: 'smooth' });
         }
      }
   }, [selectedMonth, selectedCardId]);

   const scrollInvoices = (direction: 'left' | 'right') => {
      if (scrollContainerRef.current) {
         const scrollAmount = 300;
         scrollContainerRef.current.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
         });
      }
   };

   if (creditCards.length === 0) {
      return (
         <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-slate-200">
            <CreditCard size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">Nenhum cartão de crédito cadastrado.</p>
            <p className="text-sm text-slate-400 mt-1">Vá em "Contas" e adicione uma conta do tipo Cartão.</p>
         </div>
      );
   }

   // Filter transactions for currently selected invoice
   const invoiceTransactions = transactions.filter(t =>
      t.accountId === selectedCardId && t.invoiceMonth === selectedMonth
   );

   const totalInvoice = invoiceTransactions.reduce((acc, t) => {
      return t.type === TransactionType.EXPENSE ? acc + t.amount : acc - t.amount;
   }, 0);

   const invoiceName = `Fatura ${selectedCard?.name} - ${selectedMonth}`;
   const isClosed = transactions.some(t => t.description === invoiceName);

   const handleCloseInvoice = () => {
      if (!selectedCard?.dueDay) return;
      const [mStr, yStr] = selectedMonth.split('/');
      const dueDate = `${yStr}-${mStr}-${String(selectedCard.dueDay).padStart(2, '0')}`;
      onCloseInvoice(totalInvoice, dueDate, selectedCardId, invoiceName);
   };

   return (
      <div className="space-y-6">
         {/* Top Controls: Card Selector & Invoice Carousel */}
         <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-4">

            {/* 1. Card Selector */}
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
               <div className="bg-purple-100 p-2 rounded-lg text-purple-700">
                  <CreditCard size={20} />
               </div>
               <div className="flex-1">
                  <label className="block text-xs text-slate-500 mb-0.5">Cartão Selecionado</label>
                  <select
                     value={selectedCardId}
                     onChange={e => setSelectedCardId(e.target.value)}
                     className="bg-transparent text-lg font-bold text-slate-800 outline-none cursor-pointer hover:text-blue-600 transition-colors"
                  >
                     {creditCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
               </div>
               <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase tracking-wider">Total da Fatura</p>
                  <p className="text-2xl font-bold text-slate-800">{totalInvoice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
               </div>
            </div>

            {/* 2. Invoice Carousel */}
            <div className="relative group/carousel">
               <button
                  onClick={() => scrollInvoices('left')}
                  className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 shadow-md border border-slate-200 p-2 rounded-full text-slate-600 hover:text-blue-600 hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100"
               >
                  <ChevronLeft size={20} />
               </button>

               <div
                  ref={scrollContainerRef}
                  className="flex overflow-x-auto gap-3 pb-2 pt-1 px-1 scroll-smooth no-scrollbar"
               >
                  {invoiceOptionsData.map((opt) => {
                     const isSelected = selectedMonth === opt.value;
                     return (
                        <div
                           key={opt.value}
                           onClick={() => setSelectedMonth(opt.value)}
                           className={`
                            min-w-[150px] p-3 rounded-xl border cursor-pointer transition-all flex flex-col justify-between h-[100px] shrink-0
                            ${isSelected
                                 ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 shadow-sm transform scale-[1.02]'
                                 : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
                              }
                         `}
                        >
                           <div className="flex justify-between items-start">
                              <span className={`text-xs font-bold uppercase ${isSelected ? 'text-blue-700' : 'text-slate-500'}`}>
                                 {opt.monthName} <span className="font-normal">{opt.year}</span>
                              </span>
                              {opt.isClosed ? (
                                 <Lock size={12} className="text-slate-400" />
                              ) : (
                                 <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                              )}
                           </div>

                           <div>
                              <p className={`text-lg font-bold ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                                 {opt.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </p>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                 {opt.isClosed ? 'Fechada' : 'Aberta'}
                              </p>
                           </div>
                        </div>
                     );
                  })}
               </div>

               <button
                  onClick={() => scrollInvoices('right')}
                  className="absolute right-0 top-1/2 -translate-y-1/2 z-10 bg-white/90 shadow-md border border-slate-200 p-2 rounded-full text-slate-600 hover:text-blue-600 hover:scale-110 transition-all opacity-0 group-hover/carousel:opacity-100"
               >
                  <ChevronRight size={20} />
               </button>
            </div>
         </div>

         {/* Transaction List */}
         <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4">
               <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                     <Calendar size={18} className="text-slate-400" />
                     Lançamentos ({selectedMonth})
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded-full border ${isClosed ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                     {isClosed ? 'Fechada' : 'Aberta'}
                  </span>
               </div>
            </div>

            <div className="divide-y divide-slate-100">
               {invoiceTransactions.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 border-dashed">
                     <p className="mb-2">Nenhum lançamento nesta fatura.</p>
                     {!isClosed && (
                        <p className="text-xs">Use a tela de "Movimentações" para adicionar gastos.</p>
                     )}
                  </div>
               ) : (
                  invoiceTransactions.map(t => {
                     return (
                        <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-50 group transition-colors">
                           <div className="flex items-center gap-3">
                              <div className="flex flex-col">
                                 <span className="font-medium text-slate-700">{t.description}</span>
                                 <div className="flex gap-2 text-xs text-slate-500 mt-1">
                                    <span className="bg-slate-100 px-1.5 py-0.5 rounded">{t.category}</span>
                                    <span>{new Date(t.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>
                                    {t.totalInstallments && t.totalInstallments > 1 && (
                                       <span className="flex items-center gap-1">
                                          <Layers size={10} />
                                          Parc. {t.installmentNumber}/{t.totalInstallments}
                                       </span>
                                    )}
                                 </div>
                              </div>
                           </div>

                           <div className="flex items-center gap-6">
                              <span className="font-bold text-slate-800">
                                 {t.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>

                              {!isClosed && (
                                 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                       onClick={() => onEditTransaction(t)}
                                       className="text-slate-400 hover:text-blue-600 p-1.5 rounded-md hover:bg-blue-50 transition-all"
                                       title="Editar"
                                    >
                                       <Edit2 size={16} />
                                    </button>
                                    <button
                                       onClick={() => onDeleteTransaction(t.id)}
                                       className="text-slate-400 hover:text-rose-600 p-1.5 rounded-md hover:bg-rose-50 transition-all"
                                       title="Excluir"
                                    >
                                       <Trash2 size={16} />
                                    </button>
                                 </div>
                              )}
                           </div>
                        </div>
                     );
                  })
               )}
            </div>
         </div>

         {/* Actions */}
         <div className="flex justify-end">
            {isClosed ? (
               <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100">
                     <Check size={20} />
                     <span className="font-medium">Fatura Fechada</span>
                  </div>
                  {/* Reopen button hidden as requested */}
               </div>
            ) : (
               <button
                  onClick={handleCloseInvoice}
                  disabled={invoiceTransactions.length === 0}
                  className="bg-slate-800 hover:bg-slate-900 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium shadow-md transition-all flex items-center gap-2"
               >
                  <Lock size={18} />
                  Fechar Fatura e Gerar Pagamento
               </button>
            )}
         </div>

         {!isClosed && invoiceTransactions.length > 0 && (
            <p className="text-xs text-slate-500 text-right mt-2 flex items-center justify-end gap-1">
               <AlertCircle size={12} />
               Isso criará uma despesa pendente no vencimento ({selectedCard?.dueDay})
            </p>
         )}
      </div>
   );
};

export default CreditCardInvoiceView;
