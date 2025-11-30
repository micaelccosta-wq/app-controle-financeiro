/// <reference types="vite/client" />
import axios from 'axios';
import { Transaction, Category, Account, Budget, FinancialGoal, WealthConfig } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(config => {
    const token = localStorage.getItem('auth_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const transactionService = {
    getAll: async () => {
        const response = await api.get<any[]>('/transactions');
        return response.data.map(t => ({
            ...t,
            isApplied: t.isApplied ?? t.applied
        })) as Transaction[];
    },
    create: async (transaction: Transaction) => {
        const response = await api.post<Transaction>('/transactions', transaction);
        return response.data;
    },
    createBatch: async (transactions: Transaction[]) => {
        const response = await api.post<Transaction[]>('/transactions/batch', transactions);
        return response.data;
    },
    update: async (transaction: Transaction) => {
        const response = await api.put<Transaction>(`/transactions/${transaction.id}`, transaction);
        return response.data;
    },
    updateBatch: async (transactions: Transaction[]) => {
        const response = await api.put<Transaction[]>('/transactions/batch', transactions);
        return response.data;
    },
    delete: async (id: string) => {
        await api.delete(`/transactions/${id}`);
    }
};

export const categoryService = {
    getAll: async () => {
        const response = await api.get<Category[]>('/categories');
        return response.data;
    },
    create: async (category: Category) => {
        const response = await api.post<Category>('/categories', category);
        return response.data;
    },
    createBatch: async (categories: Category[]) => {
        const response = await api.post<Category[]>('/categories/batch', categories);
        return response.data;
    },
    update: async (category: Category) => {
        const response = await api.put<Category>(`/categories/${category.id}`, category);
        return response.data;
    },
    delete: async (id: string) => {
        await api.delete(`/categories/${id}`);
    }
};

export const accountService = {
    getAll: async () => {
        const response = await api.get<Account[]>('/accounts');
        return response.data;
    },
    create: async (account: Account) => {
        const response = await api.post<Account>('/accounts', account);
        return response.data;
    },
    createBatch: async (accounts: Account[]) => {
        const response = await api.post<Account[]>('/accounts/batch', accounts);
        return response.data;
    },
    update: async (account: Account) => {
        const response = await api.put<Account>(`/accounts/${account.id}`, account);
        return response.data;
    },
    delete: async (id: string) => {
        await api.delete(`/accounts/${id}`);
    }
};

export const budgetService = {
    getAll: async () => {
        const response = await api.get<Budget[]>('/budgets');
        return response.data;
    },
    create: async (budget: Budget) => {
        const response = await api.post<Budget>('/budgets', budget);
        return response.data;
    },
    createBatch: async (budgets: Budget[]) => {
        const response = await api.post<Budget[]>('/budgets/batch', budgets);
        return response.data;
    },
    update: async (budget: Budget) => {
        const response = await api.put<Budget>(`/budgets/${budget.id}`, budget);
        return response.data;
    },
    delete: async (id: string) => {
        await api.delete(`/budgets/${id}`);
    }
};

export const goalService = {
    getAll: async () => {
        const response = await api.get<FinancialGoal[]>('/goals');
        return response.data;
    },
    create: async (goal: FinancialGoal) => {
        const response = await api.post<FinancialGoal>('/goals', goal);
        return response.data;
    },
    update: async (goal: FinancialGoal) => {
        const response = await api.put<FinancialGoal>(`/goals/${goal.id}`, goal);
        return response.data;
    },
    delete: async (id: string) => {
        await api.delete(`/goals/${id}`);
    }
};

export const wealthConfigService = {
    get: async () => {
        const response = await api.get<WealthConfig>('/wealth-config');
        return response.data;
    },
    update: async (config: WealthConfig) => {
        const response = await api.post<WealthConfig>('/wealth-config', config);
        return response.data;
    }
};

export const dataService = {
    reset: async () => {
        await api.delete('/data/reset');
    }
};
