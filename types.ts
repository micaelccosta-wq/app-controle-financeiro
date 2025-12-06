
export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
  TRANSFER_OUT = 'TRANSFER_OUT',
  TRANSFER_IN = 'TRANSFER_IN'
}

export enum CategorySubtype {
  FIXED = 'FIXA',
  VARIABLE = 'VARIAVEL'
}

export enum AccountType {
  BANK = 'BANK',
  CREDIT_CARD = 'CREDIT_CARD',
  INVESTMENT = 'INVESTMENT'
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  subtype: CategorySubtype;
  impactsBudget: boolean;
  icon?: string;
}

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  initialBalance: number; // Only for BANK and INVESTMENT
  closingDay?: number; // Only for CREDIT_CARD
  dueDay?: number; // Only for CREDIT_CARD
  isDefault?: boolean;
}

export interface TransactionSplit {
  categoryName: string;
  amount: number;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  date: string; // ISO Date string YYYY-MM-DD. For CC, this is the purchase date internally, but UI shows Invoice Month.
  category: string;
  type: TransactionType;
  isApplied: boolean;
  ignoreInBudget?: boolean;
  observations?: string;
  accountId?: string;

  // OFX Import ID (Financial Institution Transaction ID)
  fitid?: string;

  // Split Categories
  split?: TransactionSplit[];

  // Credit Card Specifics
  invoiceMonth?: string; // Format "MM/YYYY" - The invoice this transaction belongs to

  // Installments
  batchId?: string;
  installmentNumber?: number;
  totalInstallments?: number;

  // Transfer Linking
  relatedTransactionId?: string;
}

export interface Budget {
  id: string;
  categoryId: string;
  month: number; // 0-11
  year: number;
  amount: number;
}

export interface AIAnalysisResult {
  category: string;
  type: TransactionType;
}

export interface FinancialGoal {
  id: string;
  accountId: string;
  targetAmount: number;
  targetDate: string; // YYYY-MM-DD
}

export interface WealthConfig {
  passiveIncomeGoal: number;
}

export interface GoogleDriveConfig {
  enabled: boolean;
  clientId: string;
  folderId: string;
}

export interface BackupData {
  version: number;
  timestamp: string;
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  budgets: Budget[];
  goals?: FinancialGoal[];
  wealthConfig?: WealthConfig;
  googleDriveConfig?: GoogleDriveConfig;
}