
import React, { useState, useRef, useMemo } from 'react';
import { X, Upload, FileText, Check, AlertTriangle, Download, CreditCard, HelpCircle, List, Wallet } from 'lucide-react';
import { Transaction, TransactionType, Category, Account, AccountType, CategorySubtype } from '../types';
import { ICON_MAP } from './CategoryForm';

interface CSVImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (transactions: Transaction[]) => void;
  onImportCategories?: (categories: Category[]) => void;
  onImportAccounts?: (accounts: Account[]) => void;
  availableCategories: Category[];
  availableAccounts: Account[];
}

type ImportType = 'transactions' | 'categories' | 'accounts';

interface ParsedItemBase {
  id: string;
  isValid: boolean;
  error?: string;
  selected: boolean;
}

interface ParsedTransaction extends ParsedItemBase {
  kind: 'transaction';
  date: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  split?: { categoryName: string; amount: number }[];
}

interface ParsedCategory extends ParsedItemBase {
  kind: 'category';
  name: string;
  type: TransactionType;
  subtype: CategorySubtype;
  impactsBudget: boolean;
  icon?: string;
}

interface ParsedAccount extends ParsedItemBase {
  kind: 'account';
  name: string;
  type: AccountType;
  initialBalance: number;
  closingDay?: number;
  dueDay?: number;
}

type ParsedItem = ParsedTransaction | ParsedCategory | ParsedAccount;

const CSVImportModal: React.FC<CSVImportModalProps> = ({
  isOpen, onClose, onImport, onImportCategories, onImportAccounts, availableCategories, availableAccounts
}) => {
  const [step, setStep] = useState<'upload' | 'preview'>('upload');
  const [importType, setImportType] = useState<ImportType>('transactions');
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);

  // Transaction specific state
  const [targetAccountId, setTargetAccountId] = useState<string>('');
  const [targetInvoice, setTargetInvoice] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const targetAccount = availableAccounts.find(a => a.id === targetAccountId);
  const isTargetCreditCard = targetAccount?.type === AccountType.CREDIT_CARD;

  // Invoice Options for Credit Card (Only for Transactions)
  const invoiceOptions = useMemo(() => {
    if (importType !== 'transactions' || !isTargetCreditCard) return [];

    const options = [];
    const today = new Date();
    const currentM = today.getMonth() + 1;
    const currentY = today.getFullYear();

    for (let i = -6; i <= 6; i++) {
      let m = currentM + i;
      let y = currentY;
      while (m > 12) { m -= 12; y++; }
      while (m < 1) { m += 12; y--; }

      const mStr = `${String(m).padStart(2, '0')}/${y}`;
      const dateObj = new Date(y, m - 1, 1);
      const label = dateObj.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).toUpperCase().replace('.', '');

      options.push({ value: mStr, label });
    }
    return options;
  }, [isTargetCreditCard, importType]);

  if (!isOpen) return null;

  const downloadTemplate = () => {
    let headers: string[] = [];
    let rows: string[][] = [];
    let fileName = '';

    if (importType === 'transactions') {
      headers = ['Data (AAAA-MM-DD)', 'Descricao', 'Valor', 'Tipo (RECEITA/DESPESA)', 'Categoria (Opcional ou "Cat1:Val1;Cat2:Val2")'];
      rows = [
        ['2025-10-01', 'Supermercado Compra', '150.50', 'DESPESA', 'Alimentação'],
        ['2025-10-05', 'Salário Mensal', '5000.00', 'RECEITA', 'Salário'],
        ['2025-10-10', 'Uber Viagem', '25.90', 'DESPESA', 'Transporte'],
        ['2025-10-15', 'Compra Mista', '200.00', 'DESPESA', 'Alimentação: 100; Lazer: 100']
      ];
      fileName = 'modelo_importacao_transacoes.csv';
    } else if (importType === 'categories') {
      headers = ['Nome', 'Tipo (RECEITA/DESPESA)', 'Subtipo (FIXA/VARIAVEL)', 'Impacta Orcamento (SIM/NAO)', 'Icone (Opcional)'];
      rows = [
        ['Academia', 'DESPESA', 'FIXA', 'SIM', 'heart'],
        ['Dividendos', 'RECEITA', 'VARIAVEL', 'NAO', 'zap'],
        ['Manutenção Casa', 'DESPESA', 'VARIAVEL', 'SIM', 'home']
      ];
      fileName = 'modelo_importacao_categorias.csv';
    } else if (importType === 'accounts') {
      headers = ['Nome da Conta', 'Tipo (BANCO/CARTAO)', 'Saldo Inicial (Bancos)', 'Dia Fechamento (Cartao)', 'Dia Vencimento (Cartao)'];
      rows = [
        ['Nubank', 'BANCO', '1250.00', '', ''],
        ['Visa Platinum', 'CARTAO', '', '5', '12'],
        ['Dinheiro', 'BANCO', '150.00', '', '']
      ];
      fileName = 'modelo_importacao_contas.csv';
    }

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const parseNumber = (val: string) => {
    if (!val) return 0;
    if (val.includes(',') && val.includes('.')) {
      return parseFloat(val.replace(/\./g, '').replace(',', '.'));
    } else if (val.includes(',')) {
      return parseFloat(val.replace(',', '.'));
    }
    return parseFloat(val);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r\n|\n/);
      const items: ParsedItem[] = [];

      const firstLine = lines[0] || '';
      const separator = firstLine.includes(';') ? ';' : ',';

      // Skip header
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(separator);
        const id = crypto.randomUUID();

        if (importType === 'transactions') {
          if (cols.length < 3) continue;
          const rawDate = cols[0]?.trim();
          const description = cols[1]?.trim().replace(/"/g, '') || 'Sem descrição';
          const amount = parseNumber(cols[2]?.trim());
          const rawType = cols[3]?.trim().toUpperCase();

          // Reconstruct category from all remaining columns (in case it contains the delimiter)
          // Example: "Moradia: 130,72; Reembolsos: 2000" might be split into ["Moradia: 130,72", " Reembolsos: 2000"]
          const rawCategory = cols.slice(4).join(separator).trim().replace(/"/g, '') || '';

          let isValid = true;
          let error = '';
          if (isNaN(amount)) { isValid = false; error = 'Valor inválido'; }
          if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) { isValid = false; error = 'Data inválida (AAAA-MM-DD)'; }

          // Match Category or Splits
          let finalCategory = '';
          let splits: { categoryName: string; amount: number }[] = [];

          if (rawCategory.includes(';') && rawCategory.includes(':')) {
            // Attempt to parse splits: "Cat1: 100; Cat2: 50"
            const parts = rawCategory.split(';');
            let totalSplit = 0;

            for (const part of parts) {
              const [catName, catVal] = part.split(':');
              if (catName && catVal) {
                const val = parseNumber(catVal.trim());
                if (!isNaN(val)) {
                  // Match category name if possible
                  const match = availableCategories.find(c => c.name.toLowerCase() === catName.trim().toLowerCase());
                  const finalCatName = match ? match.name : catName.trim();

                  splits.push({
                    categoryName: finalCatName,
                    amount: val
                  });
                  totalSplit += val;
                }
              }
            }
          }

          if (splits.length === 1) {
            // If only one "split" was found (e.g. "Category: Value"), treat it as a normal category
            finalCategory = splits[0].categoryName;
            splits = [];
          } else if (splits.length > 0) {
            finalCategory = 'Múltiplas Categorias';
          }

          if (splits.length === 0 && !finalCategory) {
            // Single Category Logic (Plain text)
            if (rawCategory) {
              const cleanRaw = rawCategory.trim();
              const match = availableCategories.find(c => c.name.toLowerCase() === cleanRaw.toLowerCase());
              // If match found, use it (preserves correct casing). If not, use the raw text (allows new categories).
              finalCategory = match ? match.name : cleanRaw;
            }
          }

          items.push({
            kind: 'transaction',
            id, isValid, error, selected: isValid,
            date: rawDate,
            description,
            amount: Math.abs(amount),
            type: (rawType === 'RECEITA' || rawType === 'INCOME') ? TransactionType.INCOME : TransactionType.EXPENSE,
            category: finalCategory || 'Outros',
            split: splits.length > 0 ? splits : undefined
          } as ParsedTransaction);

        } else if (importType === 'categories') {
          if (cols.length < 2) continue;
          const name = cols[0]?.trim().replace(/"/g, '');
          const rawType = cols[1]?.trim().toUpperCase();
          const rawSubtype = cols[2]?.trim().toUpperCase();
          const rawImpact = cols[3]?.trim().toUpperCase();
          const icon = cols[4]?.trim().toLowerCase();

          let isValid = true;
          let error = '';
          if (!name) { isValid = false; error = 'Nome obrigatório'; }

          const type = (rawType === 'RECEITA' || rawType === 'INCOME') ? TransactionType.INCOME : TransactionType.EXPENSE;
          const subtype = (rawSubtype === 'FIXA' || rawSubtype === 'FIXED') ? CategorySubtype.FIXED : CategorySubtype.VARIABLE;
          const impactsBudget = (rawImpact === 'SIM' || rawImpact === 'YES' || rawImpact === 'TRUE');

          // Check icon validity
          const validIcon = (icon && ICON_MAP[icon]) ? icon : 'tag';

          items.push({
            kind: 'category',
            id, isValid, error, selected: isValid,
            name, type, subtype, impactsBudget, icon: validIcon
          } as ParsedCategory);

        } else if (importType === 'accounts') {
          if (cols.length < 2) continue;
          const name = cols[0]?.trim().replace(/"/g, '');
          const rawType = cols[1]?.trim().toUpperCase();
          const initBal = parseNumber(cols[2]?.trim());
          const closeDay = parseInt(cols[3]?.trim());
          const dueDay = parseInt(cols[4]?.trim());

          let isValid = true;
          let error = '';
          if (!name) { isValid = false; error = 'Nome obrigatório'; }

          const type = (rawType === 'CARTAO' || rawType === 'CREDIT_CARD') ? AccountType.CREDIT_CARD : AccountType.BANK;

          if (type === AccountType.CREDIT_CARD && (isNaN(closeDay) || isNaN(dueDay))) {
            isValid = false; error = 'Dias de fechamento/vencimento inválidos';
          }

          items.push({
            kind: 'account',
            id, isValid, error, selected: isValid,
            name, type,
            initialBalance: isNaN(initBal) ? 0 : initBal,
            closingDay: isNaN(closeDay) ? undefined : closeDay,
            dueDay: isNaN(dueDay) ? undefined : dueDay
          } as ParsedAccount);
        }
      }

      setParsedItems(items);
      setStep('preview');
      if (fileInputRef.current) fileInputRef.current.value = '';
    };

    reader.readAsText(file);
  };

  const handleImport = () => {
    const selectedItems = parsedItems.filter(i => i.selected && i.isValid);
    if (selectedItems.length === 0) {
      alert("Nenhum item válido selecionado.");
      return;
    }

    if (importType === 'transactions') {
      if (!targetAccountId) { alert("Selecione uma conta de destino."); return; }
      if (isTargetCreditCard && !targetInvoice) { alert("Selecione a fatura de destino."); return; }

      const transactions: Transaction[] = (selectedItems as ParsedTransaction[]).map(item => {
        let finalType = item.type;
        let finalAmount = item.amount;
        if (isTargetCreditCard && finalType === TransactionType.INCOME) {
          finalType = TransactionType.EXPENSE;
          finalAmount = -finalAmount;
        }
        return {
          id: crypto.randomUUID(),
          description: item.description,
          amount: finalAmount,
          date: item.date,
          type: finalType,
          category: item.category,
          isApplied: true,
          accountId: targetAccountId,
          invoiceMonth: isTargetCreditCard ? targetInvoice : undefined,
          observations: 'Importado via CSV',
          split: item.split
        };
      });
      onImport(transactions);

    } else if (importType === 'categories' && onImportCategories) {
      const categories: Category[] = (selectedItems as ParsedCategory[]).map(item => ({
        id: crypto.randomUUID(),
        name: item.name,
        type: item.type,
        subtype: item.subtype,
        impactsBudget: item.impactsBudget,
        icon: item.icon
      }));
      onImportCategories(categories);

    } else if (importType === 'accounts' && onImportAccounts) {
      const accounts: Account[] = (selectedItems as ParsedAccount[]).map(item => ({
        id: crypto.randomUUID(),
        name: item.name,
        type: item.type,
        initialBalance: item.type === AccountType.BANK ? item.initialBalance : 0,
        closingDay: item.type === AccountType.CREDIT_CARD ? item.closingDay : undefined,
        dueDay: item.type === AccountType.CREDIT_CARD ? item.dueDay : undefined
      }));
      onImportAccounts(accounts);
    }

    handleClose();
  };

  const handleClose = () => {
    setStep('upload');
    setParsedItems([]);
    setTargetAccountId('');
    setTargetInvoice('');
    onClose();
  };

  const getHelpText = () => {
    if (importType === 'transactions') return 'Data, Descrição, Valor, Tipo, Categoria (ou "Cat1:Val1;Cat2:Val2")';
    if (importType === 'categories') return 'Nome, Tipo (Rec/Desp), Subtipo (Fix/Var), Impacta Orçamento, Ícone';
    if (importType === 'accounts') return 'Nome, Tipo (Banco/Cartão), Saldo Inicial, Fechamento, Vencimento';
    return '';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-100 p-1.5 rounded text-emerald-600">
              <FileText size={20} />
            </div>
            <h3 className="font-bold text-slate-800 text-lg">Importar CSV</h3>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' ? (
            <div className="h-full flex flex-col items-center justify-center space-y-8">

              {/* Type Selector */}
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setImportType('transactions')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${importType === 'transactions' ? 'bg-white shadow text-emerald-700' : 'text-slate-500'}`}
                >
                  <FileText size={16} /> Movimentações
                </button>
                <button
                  onClick={() => setImportType('categories')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${importType === 'categories' ? 'bg-white shadow text-purple-700' : 'text-slate-500'}`}
                >
                  <List size={16} /> Categorias
                </button>
                <button
                  onClick={() => setImportType('accounts')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${importType === 'accounts' ? 'bg-white shadow text-blue-700' : 'text-slate-500'}`}
                >
                  <Wallet size={16} /> Contas
                </button>
              </div>

              <div className="w-full max-w-lg border-2 border-dashed border-slate-300 rounded-xl p-10 flex flex-col items-center justify-center bg-slate-50 text-center">
                <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center text-emerald-600 mb-4">
                  <Upload size={32} />
                </div>
                <h4 className="text-xl font-bold text-slate-800 mb-2">Carregar arquivo CSV</h4>
                <p className="text-slate-500 mb-6">Selecione um arquivo .csv contendo seus dados de <b>{importType === 'transactions' ? 'movimentações' : importType === 'categories' ? 'categorias' : 'contas'}</b>.</p>

                <input
                  type="file"
                  accept=".csv"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-lg font-medium cursor-pointer transition-colors shadow-sm"
                >
                  Selecionar do Computador
                </label>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-6 max-w-lg w-full">
                <h5 className="font-bold text-blue-800 flex items-center gap-2 mb-2">
                  <HelpCircle size={18} />
                  Modelo de Importação
                </h5>
                <p className="text-sm text-blue-600 mb-4">
                  Para garantir que seus dados sejam importados corretamente, utilize nosso modelo padrão.
                  <br />Colunas esperadas: <b>{getHelpText()}</b>.
                </p>
                <button
                  onClick={downloadTemplate}
                  className="text-sm bg-white border border-blue-200 text-blue-700 px-4 py-2 rounded-lg font-medium hover:bg-blue-50 flex items-center gap-2 w-fit"
                >
                  <Download size={16} />
                  Baixar Modelo CSV
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">

              {importType === 'transactions' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Conta de Destino</label>
                    <select
                      value={targetAccountId}
                      onChange={(e) => setTargetAccountId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="">Selecione...</option>
                      {availableAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.type === AccountType.CREDIT_CARD ? `💳 ${acc.name}` : acc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {isTargetCreditCard && (
                    <div className="animate-in fade-in">
                      <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                        <CreditCard size={14} /> Fatura de Destino
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
                  <div className="md:col-span-2 pt-2 flex gap-4 text-sm text-slate-600">
                    <span>Total lido: <b>{parsedItems.length}</b></span>
                    <span>Válidos: <b>{parsedItems.filter(i => i.isValid).length}</b></span>
                  </div>
                </div>
              )}

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                    <tr>
                      <th className="px-4 py-3 w-10">
                        <input
                          type="checkbox"
                          checked={parsedItems.length > 0 && parsedItems.every(i => i.selected)}
                          onChange={(e) => {
                            const val = e.target.checked;
                            setParsedItems(prev => prev.map(i => i.isValid ? { ...i, selected: val } : i));
                          }}
                          className="rounded border-slate-300"
                        />
                      </th>

                      {importType === 'transactions' && (
                        <>
                          <th className="px-4 py-3">Data</th>
                          <th className="px-4 py-3">Descrição</th>
                          <th className="px-4 py-3">Valor</th>
                          <th className="px-4 py-3">Tipo</th>
                          <th className="px-4 py-3">Categoria</th>
                        </>
                      )}

                      {importType === 'categories' && (
                        <>
                          <th className="px-4 py-3">Nome</th>
                          <th className="px-4 py-3">Tipo</th>
                          <th className="px-4 py-3">Subtipo</th>
                          <th className="px-4 py-3">Orçamento</th>
                          <th className="px-4 py-3">Ícone</th>
                        </>
                      )}

                      {importType === 'accounts' && (
                        <>
                          <th className="px-4 py-3">Nome</th>
                          <th className="px-4 py-3">Tipo</th>
                          <th className="px-4 py-3">Saldo Inicial</th>
                          <th className="px-4 py-3">Fechamento</th>
                          <th className="px-4 py-3">Vencimento</th>
                        </>
                      )}

                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedItems.map(item => (
                      <tr key={item.id} className={`hover:bg-slate-50 ${!item.isValid ? 'bg-rose-50' : ''}`}>
                        <td className="px-4 py-2">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            disabled={!item.isValid}
                            onChange={() => setParsedItems(prev => prev.map(i => i.id === item.id ? { ...i, selected: !i.selected } : i))}
                            className="rounded border-slate-300 disabled:opacity-50"
                          />
                        </td>

                        {item.kind === 'transaction' && (
                          <>
                            <td className="px-4 py-2">{item.date}</td>
                            <td className="px-4 py-2">{item.description}</td>
                            <td className="px-4 py-2 font-medium">
                              {item.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                            <td className="px-4 py-2">
                              <span className={`text-xs px-2 py-0.5 rounded ${item.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {item.type === TransactionType.INCOME ? 'Receita' : 'Despesa'}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <div>{item.category}</div>
                              {item.split && item.split.length > 0 && (
                                <div className="text-xs text-slate-500 mt-1 space-y-0.5">
                                  {item.split.map((s, idx) => (
                                    <div key={idx} className="flex justify-between gap-2">
                                      <span>{s.categoryName}</span>
                                      <span>{s.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>
                          </>
                        )}

                        {item.kind === 'category' && (
                          <>
                            <td className="px-4 py-2 font-medium">{item.name}</td>
                            <td className="px-4 py-2">
                              <span className={`text-xs px-2 py-0.5 rounded ${item.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {item.type === TransactionType.INCOME ? 'Receita' : 'Despesa'}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-xs text-slate-500">{item.subtype}</td>
                            <td className="px-4 py-2 text-xs">{item.impactsBudget ? 'Sim' : 'Não'}</td>
                            <td className="px-4 py-2 text-xs text-slate-400">{item.icon}</td>
                          </>
                        )}

                        {item.kind === 'account' && (
                          <>
                            <td className="px-4 py-2 font-medium">{item.name}</td>
                            <td className="px-4 py-2 text-xs">{item.type === AccountType.BANK ? 'Banco' : 'Cartão'}</td>
                            <td className="px-4 py-2">
                              {item.type === AccountType.BANK ? item.initialBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                            </td>
                            <td className="px-4 py-2 text-xs">{item.closingDay || '-'}</td>
                            <td className="px-4 py-2 text-xs">{item.dueDay || '-'}</td>
                          </>
                        )}

                        <td className="px-4 py-2">
                          {item.isValid ? (
                            <span className="text-emerald-600 flex items-center gap-1 text-xs font-medium"><Check size={14} /> OK</span>
                          ) : (
                            <span className="text-rose-600 flex items-center gap-1 text-xs font-medium"><AlertTriangle size={14} /> {item.error}</span>
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

        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
          {step === 'upload' ? (
            <button onClick={handleClose} className="px-4 py-2 text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all">
              Cancelar
            </button>
          ) : (
            <>
              <button onClick={() => setStep('upload')} className="px-4 py-2 text-slate-600 hover:bg-white border border-transparent hover:border-slate-200 rounded-lg transition-all">
                Voltar
              </button>
              <button
                onClick={handleImport}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium shadow-sm flex items-center gap-2"
              >
                <Check size={18} />
                Confirmar Importação
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CSVImportModal;
