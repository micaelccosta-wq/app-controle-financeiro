package com.financaspro.service;

import com.financaspro.repository.*;
import com.financaspro.util.UserContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class DataService {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private BudgetRepository budgetRepository;

    @Autowired
    private FinancialGoalRepository financialGoalRepository;

    @Autowired
    private WealthConfigRepository wealthConfigRepository;

    @Autowired
    private UserContext userContext;

    @Transactional
    @SuppressWarnings("null")
    public void resetUserData() {
        String userId = userContext.getCurrentUserId();

        // Delete in order to respect constraints (though we are deleting everything for
        // the user)
        // Ideally: Transactions -> Budgets -> Goals -> Categories -> Accounts ->
        // WealthConfig
        // But since we have loose coupling with Strings, order might not matter as
        // much,
        // EXCEPT for the constraints we just added in CategoryService!
        // So we MUST delete Transactions and Budgets BEFORE Categories.

        List<com.financaspro.model.Transaction> transactions = transactionRepository.findAllByUserId(userId);
        transactionRepository.deleteAll(transactions);

        List<com.financaspro.model.Budget> budgets = budgetRepository.findAllByUserId(userId);
        budgetRepository.deleteAll(budgets);

        List<com.financaspro.model.FinancialGoal> goals = financialGoalRepository.findAllByUserId(userId);
        financialGoalRepository.deleteAll(goals);

        List<com.financaspro.model.Category> categories = categoryRepository.findAllByUserId(userId);
        categoryRepository.deleteAll(categories);

        List<com.financaspro.model.Account> accounts = accountRepository.findAllByUserId(userId);
        accountRepository.deleteAll(accounts);

        wealthConfigRepository.findByUserId(userId).ifPresent(wealthConfigRepository::delete);
    }
}
