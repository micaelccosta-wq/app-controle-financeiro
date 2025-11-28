package com.financaspro.service;

import com.financaspro.model.Budget;
import com.financaspro.repository.BudgetRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class BudgetService {

    @Autowired
    private BudgetRepository budgetRepository;

    public List<Budget> findAll() {
        return budgetRepository.findAll();
    }

    public Optional<Budget> findById(String id) {
        return budgetRepository.findById(id);
    }

    public Budget save(Budget budget) {
        return budgetRepository.save(budget);
    }

    public List<Budget> saveAll(List<Budget> budgets) {
        return budgetRepository.saveAll(budgets);
    }

    public void deleteById(String id) {
        budgetRepository.deleteById(id);
    }
}
