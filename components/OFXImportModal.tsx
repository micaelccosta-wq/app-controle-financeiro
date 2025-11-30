
import React, { useState, useRef, useMemo } from 'react';
import { X, Upload, FileText, Check, AlertTriangle, ArrowRight, Loader2, CreditCard, Layers, RefreshCw } from 'lucide-react';
import { Transaction, TransactionType, Category, Account, AccountType } from '../types';

interface OFXImportModalProps {
   isOpen: boolean;
   onClose: () => void;
   onImport: (transactions: Transaction[]) => void;
   availableCategories: Category[];
   availableAccounts: Account[];
   existingTransactions: Transaction[];
}

interface ParsedOFXItem {
   id: string; // Temporary ID for list rendering (or existing ID if update)
   fitid: string;
   date: string;
   amount: number;
   description: string;
   friendlyDescription: string;
   type: TransactionType;
   category: string;
   status: 'new' | 'duplicate' | 'update_value';
   selected: boolean;

   // Installment Info
   installmentInfo?: {
      current: number;
      total: number;
      remainingToGenerate: number; // e.g. if 2/4, generate 2, 3, 4 (3 items)
   };
}

const OFXImportModal: React.FC<OFXImportModalProps> = ({
   isOpen, onClose, onImport, availableCategories, availableAccounts, existingTransactions
}) => {
   const [step, setStep] = useState<'upload' | 'preview'>('upload');
   const [parsedItems, setParsedItems] = useState<ParsedOFXItem[]>([]);
   const [targetAccountId, setTargetAccountId] = useState<string>('');
   const [targetInvoice, setTargetInvoice] = useState<string>(''); // For Credit Cards: "MM/YYYY"
   const [isLoading, setIsLoading] = useState(false);
   const fileInputRef = useRef<HTMLInputElement>(null);

   const targetAccount = availableAccounts.find(a => a.id === targetAccountId);
   const isTargetCreditCard = targetAccount?.type === AccountType.CREDIT_CARD;

   // Generate Invoice Options if Credit Card is selected
   const invoiceOptions = useMemo(() => {
      if (!isTargetCreditCard || !targetAccount) return [];

      const options = [];
      const today = new Date();
      const currentM = today.getMonth() + 1;
      const currentY = today.getFullYear();

      // Generate range: 6 months back to 18 months forward
      for (let i = -6; i <= 18; i++) {
         let m = currentM + i;
         let y = currentY;
         while (m > 12) { m -= 12; y++; }
         while (m < 1) { m += 12; y--; }

         const mStr = `${String(m).padStart(2, '0')}/${y}`;

         // Check if invoice is closed
         const invoiceName = `Fatura ${targetAccount.name} - ${mStr}`;
         const isClosed = existingTransactions.some(t => t.description === invoiceName);

         if (!isClosed) {
            const dateObj = new Date(y, m - 1, 1);
            const label = dateObj.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).toUpperCase().replace('.', '');
            options.push({ value: mStr, label });
         }
      }
      return options;
   }, [isTargetCreditCard, targetAccount, existingTransactions]);

   // Validation State
   const isImportEnabled = useMemo(() => {
      if (!targetAccountId) return false;
      if (isTargetCreditCard && !targetInvoice) return false;
      const hasSelection = parsedItems.some(i => i.selected);
      return hasSelection;
   }, [targetAccountId, isTargetCreditCard, targetInvoice, parsedItems]);


   if (!isOpen) return null;

   // --- Parser Logic ---
   const parseOFXDate = (dateString: string): string => {
      if (!dateString || dateString.length < 8) return new Date().toISOString().split('T')[0];
      const y = dateString.substring(0, 4);
      const m = dateString.substring(4, 6);
      const d = dateString.substring(6, 8);
      return `${y}-${m}-${d}`;
   };

   const detectInstallments = (desc: string) => {
      const patterns = [
         /(?:Parc(?:ela)?\.?|x)\s*(\d{1,2})\s*[\/-]\s*(\d{1,2})/i, // Parc 01/10, x 01/10
         /(\d{1,2})\s+de\s+(\d{1,2})/i, // 01 de 10
         /\b(\d{1,2})\/(\d{1,2})\b/ // 01/10 (Generic)
      ];

      for (const regex of patterns) {
         const match = desc.match(regex);
         if (match) {
            const current = parseInt(match[1]);
            const total = parseInt(match[2]);

            if (current > 0 && total > 0 && current <= total && total <= 99) {
               return {
                  current,
                  total,
                  remainingToGenerate: total - current + 1
               };
            }
         }
      }
      return undefined;
   };

   const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setIsLoading(true);
      const reader = new FileReader();

      reader.onload = (event) => {
         try {
            const text = event.target?.result as string;

            const transactions: ParsedOFXItem[] = [];
            const transactionBlocks: string[] = text.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/g) || [];

            transactionBlocks.forEach((block: string) => {
               const typeMatch = block.match(/<TRNTYPE>(.*?)(\r|\n|<)/);
               const dateMatch = block.match(/<DTPOSTED>(.*?)(\r|\n|<)/);
               const amtMatch = block.match(/<TRNAMT>(.*?)(\r|\n|<)/);
               const fitidMatch = block.match(/<FITID>(.*?)(\r|\n|<)/);
               const memoMatch = block.match(/<MEMO>(.*?)(\r|\n|<)/);
               const nameMatch = block.match(/<NAME>(.*?)(\r|\n|<)/);

               const rawType = typeMatch ? typeMatch[1].trim() : '';
               const rawDate = dateMatch ? dateMatch[1].trim() : '';
               const rawAmt = amtMatch ? amtMatch[1].trim() : '0';
               const fitid = fitidMatch ? fitidMatch[1].trim() : '';
               const description = (memoMatch ? memoMatch[1].trim() : '') || (nameMatch ? nameMatch[1].trim() : 'Movimentação OFX');

               const amount = parseFloat(rawAmt.replace(',', '.'));

               let type = TransactionType.EXPENSE;
               if (rawType.toUpperCase() === 'CREDIT' || rawType.toUpperCase() === 'DEP' || amount > 0) {
                  type = TransactionType.INCOME;
               }

               if (type === TransactionType.INCOME && description.toLowerCase().includes('pagamento recebido')) {
                  return;
               }

               // Check Status (New vs Duplicate vs Update)
               const absAmount = Math.abs(amount);
               const existingByFitid = existingTransactions.find(t => t.fitid === fitid && fitid !== '');

               let status: 'new' | 'duplicate' | 'update_value' = 'new';
               let itemId: string = crypto.randomUUID();

               if (existingByFitid) {
                  if (Math.abs(existingByFitid.amount - absAmount) > 0.009) {
                     status = 'update_value';
                     itemId = existingByFitid.id;
                  } else {
                     status = 'duplicate';
                  }
               } else {
                  const potentialDupe = existingTransactions.some(t =>
                     t.date === parseOFXDate(rawDate) &&
                     Math.abs(t.amount - absAmount) < 0.009 &&
                     t.description === description
                  );
                  if (potentialDupe) status = 'duplicate';
               }

               const installmentInfo = detectInstallments(description);

               let autoCategory = '';


               // 1. Exact Match (Best)
               const exactMatch = existingTransactions.find(t => t.description.toLowerCase() === description.toLowerCase());
               if (exactMatch) {
                  autoCategory = exactMatch.category;
               } else {
                  // 2. Fuzzy Match (Contains)
                  // Sort by length desc to match "Uber Trip" before "Uber" to be more specific
                  const sortedHistory = [...existingTransactions].sort((a, b) => b.description.length - a.description.length);

                  const fuzzyMatch = sortedHistory.find(t => {
                     const tDesc = t.description.toLowerCase();
                     const newDesc = description.toLowerCase();
                     // Check if one contains the other, but ensure meaningful length (e.g. > 3 chars)
                     return (tDesc.length > 3 && newDesc.includes(tDesc)) || (newDesc.length > 3 && tDesc.includes(newDesc));
                  });

                  if (fuzzyMatch) {
                     autoCategory = fuzzyMatch.category;
                  } else {
                     // 3. Keyword Fallback (Common Merchants)
                     const keywords: Record<string, string> = {
                        'uber': 'Transporte',
                        '99app': 'Transporte',
                        'ifood': 'Alimentação',
                        'netflix': 'Assinaturas',
                        'spotify': 'Assinaturas',
                        'amazon': 'Compras',
                        'mercado livre': 'Compras',
                        'supermercado': 'Alimentação',
                        'posto': 'Transporte',
                        'farmacia': 'Saúde',
                        'drogaria': 'Saúde'
                     };

                     for (const [key, cat] of Object.entries(keywords)) {
                        if (description.toLowerCase().includes(key)) {
                           autoCategory = cat;
                           break;
                        }
                     }
                  }
               }

               transactions.push({
                  id: itemId,
                  fitid,
                  date: parseOFXDate(rawDate),
                  amount: absAmount,
                  description,
                  friendlyDescription: '',
                  type,
                  category: autoCategory,
                  status,
                  selected: status !== 'duplicate',
                  installmentInfo
               });
            });

            setParsedItems(transactions);
            setStep('preview');
         } catch (error) {
            console.error(error);
            alert("Erro ao ler o arquivo. Verifique o formato.");
         } finally {
            setIsLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
         }
      };

      reader.readAsText(file);
   };

   const handleImport = () => {
      if (!isImportEnabled) return;

      const selectedItems = parsedItems.filter(i => i.selected);

      const finalTransactions: Transaction[] = [];

      // Parse base invoice for installments
      let baseMonthPart = 0;
      let baseYearPart = 0;
      if (isTargetCreditCard && targetInvoice) {
         const parts = targetInvoice.split('/');
         baseMonthPart = parseInt(parts[0]);
         baseYearPart = parseInt(parts[1]);
      }

      selectedItems.forEach(item => {
         let finalDesc = item.friendlyDescription || item.description;
         let finalObs = item.friendlyDescription ? `OFX: ${item.description}` : 'Importado via OFX';

         let finalType = item.type;
         let finalAmount = item.amount;
         if (isTargetCreditCard && finalType === TransactionType.INCOME) {
            finalType = TransactionType.EXPENSE;
            finalAmount = -finalAmount;
         }

         const countToGenerate = (item.installmentInfo && isTargetCreditCard) ? item.installmentInfo.remainingToGenerate : 1;
         const batchId = countToGenerate > 1 ? crypto.randomUUID() : undefined;

         for (let i = 0; i < countToGenerate; i++) {
            const currentInstallmentNum = (item.installmentInfo?.current || 1) + i;
            const totalInstallments = item.installmentInfo?.total || 1;

            let invoiceForThis = undefined;
            let dateForThis = item.date;

            if (isTargetCreditCard) {
               let m = baseMonthPart + i;
               let y = baseYearPart;
               while (m > 12) { m -= 12; y++; }
               invoiceForThis = `${String(m).padStart(2, '0')}/${y}`;
            } else {
               const d = new Date(item.date);
               d.setMonth(d.getMonth() + i);
               dateForThis = d.toISOString().split('T')[0];
            }

            const isUpdate = (item.status === 'update_value' && i === 0);

            let descWithInstallment = finalDesc;

            finalTransactions.push({
               id: isUpdate ? item.id : crypto.randomUUID(),
               description: descWithInstallment,
               amount: finalAmount,
               date: dateForThis,
               category: item.category || 'Outros',
               type: finalType,
               isApplied: true,
               accountId: targetAccountId,
               fitid: isUpdate ? item.fitid : (i === 0 ? item.fitid : undefined),
               observations: finalObs,
               invoiceMonth: invoiceForThis,
               batchId,
               installmentNumber: totalInstallments > 1 ? currentInstallmentNum : undefined,
               totalInstallments: totalInstallments > 1 ? totalInstallments : undefined
            });
         }
      });

      onImport(finalTransactions);
      handleClose();
   };

   const handleClose = () => {
      setParsedItems([]);
      setStep('upload');
      setTargetAccountId('');
      setTargetInvoice('');
      onClose();
   };

   const toggleItemSelection = (id: string) => {
      setParsedItems(prev => prev.map(i => i.id === id ? { ...i, selected: !i.selected } : i));
   };

   return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
         <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh]">

            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
               <div className="flex items-center gap-2">
                  <div className="bg-emerald-100 p-1.5 rounded text-emerald-600">
                     <Upload size={20} />
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg">Importar OFX</h3>
               </div>
               <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
                  <X size={24} />
               </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">

               {step === 'upload' && (
                  <div className="h-full flex flex-col items-center justify-center py-12 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                     {isLoading ? (
                        <div className="text-center">
                           <Loader2 size={48} className="animate-spin text-blue-500 mx-auto mb-4" />
                           <p className="text-slate-600 font-medium">Lendo arquivo...</p>
                        </div>
                     ) : (
                        <div className="text-center space-y-4">
                           <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-blue-600">
                              <FileText size={32} />
                           </div>
                           <div>
                              <h4 className="text-lg font-bold text-slate-800">Selecione o arquivo OFX</h4>
                           </div>
                           <div className="pt-2">
                              <input
                                 type="file"
                                 accept=".ofx,.qfx"
                                 ref={fileInputRef}
                                 onChange={handleFileUpload}
                                 className="hidden"
                                 id="ofx-upload"
                              />
                              <label
                                 htmlFor="ofx-upload"
                                 className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium cursor-pointer transition-colors inline-flex items-center gap-2"
                              >
                                 <Upload size={18} />
                                 Escolher Arquivo
                              </label>
                           </div>
                        </div>
                     )}
                  </div>
               )}

               {step === 'preview' && (
                  <div className="space-y-6">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Conta de Destino (Cartão)</label>
                           <select
                              value={targetAccountId}
                              onChange={(e) => setTargetAccountId(e.target.value)}
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                           >
                              <option value="">Selecione um cartão...</option>
                              {availableAccounts
                                 .filter(acc => acc.type === AccountType.CREDIT_CARD)
                                 .map(acc => (
                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                 ))}
                           </select>
                        </div>

                        {targetAccountId && (
                           <div className="animate-in fade-in slide-in-from-top-2">
                              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                                 <CreditCard size={14} /> Fatura de Destino (Inicial)
                              </label>
                              <select
                                 value={targetInvoice}
                                 onChange={(e) => setTargetInvoice(e.target.value)}
                                 className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                              >
                                 <option value="">Selecione a fatura...</option>
                                 {invoiceOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                 ))}
                              </select>
                           </div>
                        )}

                        <div className="flex items-center gap-4 text-sm text-slate-600 md:col-span-2 mt-2 pt-2 border-t border-blue-200">
                           <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                              <span>{parsedItems.filter(i => i.selected && i.status === 'new').length} novos</span>
                           </div>
                           <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                              <span>{parsedItems.filter(i => i.selected && i.status === 'update_value').length} a atualizar</span>
                           </div>
                           <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                              <span>{parsedItems.filter(i => i.status === 'duplicate').length} duplicados (ignorados)</span>
                           </div>
                        </div>
                     </div>

                     <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-sm text-left">
                           <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                              <tr>
                                 <th className="px-4 py-3 w-10">
                                    <input
                                       type="checkbox"
                                       checked={parsedItems.length > 0 && parsedItems.filter(i => i.status !== 'duplicate').every(i => i.selected)}
                                       onChange={(e) => {
                                          const checked = e.target.checked;
                                          setParsedItems(prev => prev.map(i => i.status !== 'duplicate' ? { ...i, selected: checked } : i));
                                       }}
                                       className="rounded border-slate-300"
                                    />
                                 </th>
                                 <th className="px-4 py-3">Data</th>
                                 <th className="px-4 py-3 w-1/4">Descrição</th>
                                 <th className="px-4 py-3">Valor</th>
                                 <th className="px-4 py-3 w-48">Categoria</th>
                                 <th className="px-4 py-3">Status</th>
                              </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-100">
                              {parsedItems.map(item => (
                                 <tr key={item.id} className={`hover:bg-slate-50 ${item.status === 'duplicate' ? 'bg-amber-50/40 opacity-70' : ''} ${item.status === 'update_value' ? 'bg-blue-50/50' : ''}`}>
                                    <td className="px-4 py-2">
                                       <input
                                          type="checkbox"
                                          checked={item.selected}
                                          disabled={item.status === 'duplicate'}
                                          onChange={() => toggleItemSelection(item.id)}
                                          className="rounded border-slate-300 disabled:opacity-50"
                                       />
                                    </td>
                                    <td className="px-4 py-2 whitespace-nowrap">
                                       {new Date(item.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                                    </td>
                                    <td className="px-4 py-2">
                                       <div className="flex flex-col">
                                          <span className="truncate max-w-[200px]" title={item.description}>{item.description}</span>
                                          {item.installmentInfo && (
                                             <span className="text-[10px] text-purple-600 font-bold bg-purple-50 px-1.5 py-0.5 rounded w-fit flex items-center gap-1 mt-1">
                                                <Layers size={10} />
                                                Parcela {item.installmentInfo.current}/{item.installmentInfo.total}
                                                {item.installmentInfo.remainingToGenerate > 1 && ` (+${item.installmentInfo.remainingToGenerate - 1} fut.)`}
                                             </span>
                                          )}
                                       </div>
                                    </td>
                                    <td className={`px-4 py-2 font-medium ${item.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                                       {item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </td>
                                    <td className="px-4 py-2">
                                       <select
                                          value={item.category}
                                          onChange={(e) => {
                                             const newVal = e.target.value;
                                             setParsedItems(prev => prev.map(i => i.id === item.id ? { ...i, category: newVal } : i));
                                          }}
                                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs outline-none focus:border-blue-500 bg-white"
                                       >
                                          <option value="">Sem Categoria</option>
                                          {availableCategories
                                             .filter(c => c.type === item.type)
                                             .map(c => (
                                                <option key={c.id} value={c.name}>{c.name}</option>
                                             ))}
                                       </select>
                                    </td>
                                    <td className="px-4 py-2">
                                       {item.status === 'new' && (
                                          <span className="text-emerald-600 flex items-center gap-1 text-xs font-medium"><Check size={14} /> Novo</span>
                                       )}
                                       {item.status === 'duplicate' && (
                                          <span className="text-amber-500 flex items-center gap-1 text-xs font-medium"><AlertTriangle size={14} /> Duplicado</span>
                                       )}
                                       {item.status === 'update_value' && (
                                          <span className="text-blue-600 flex items-center gap-1 text-xs font-bold" title="FITID encontrado mas valor é diferente"><RefreshCw size={14} /> Atualizar</span>
                                       )}
                                    </td>
                                 </tr>
                              ))}
                           </tbody>
                        </table>
                     </div>
                  </div>
               )}

            </div>

            <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50">
               {!isImportEnabled && step === 'preview' && (
                  <div className="text-xs text-rose-600 font-medium flex items-center gap-2">
                     <AlertTriangle size={14} />
                     Preencha o Cartão e Fatura de Destino e selecione ao menos um item.
                  </div>
               )}
               <div className="flex gap-3 ml-auto">
                  {step === 'upload' ? (
                     <button onClick={handleClose} className="px-4 py-2 text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all">
                        Cancelar
                     </button>
                  ) : (
                     <>
                        <button
                           onClick={() => setStep('upload')}
                           className="px-4 py-2 text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all"
                        >
                           Voltar
                        </button>
                        <button
                           onClick={handleImport}
                           disabled={!isImportEnabled}
                           className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2"
                        >
                           <Check size={18} />
                           Confirmar Importação
                        </button>
                     </>
                  )}
               </div>
            </div>
         </div>
      </div>
   );
};

export default OFXImportModal;
