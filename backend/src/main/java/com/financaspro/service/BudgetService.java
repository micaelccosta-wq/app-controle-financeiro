package com.financaspro.service;

import com.financaspro.model.Budget;
import com.financaspro.repository.BudgetRepository;
import com.financaspro.util.UserContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class BudgetService {

    @Autowired
    private BudgetRepository budgetRepository;

    @Autowired
    private UserContext userContext;

    public List<Budget> findAll() {
        return budgetRepository.findAllByUserId(userContext.getCurrentUserId());
    }

    public Optional<Budget> findById(String id) {
        Optional<Budget> budget = budgetRepository.findById(id);
        if (budget.isPresent() && !budget.get().getUserId().equals(userContext.getCurrentUserId())) {
            return Optional.empty();
        }
        return budget;
    }

    public Budget save(Budget budget) {
        budget.setUserId(userContext.getCurrentUserId());
        return budgetRepository.save(budget);
    }

    public List<Budget> saveAll(List<Budget> budgets) {
        String userId = userContext.getCurrentUserId();
        budgets.forEach(b -> b.setUserId(userId));
        return budgetRepository.saveAll(budgets);
    }

    public void deleteById(String id) {
        Optional<Budget> budget = findById(id);
        if (budget.isPresent()) {
            budgetRepository.deleteById(id);
        }
    }
}
