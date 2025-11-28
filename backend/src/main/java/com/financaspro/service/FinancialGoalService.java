package com.financaspro.service;

import com.financaspro.model.FinancialGoal;
import com.financaspro.repository.FinancialGoalRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class FinancialGoalService {

    @Autowired
    private FinancialGoalRepository financialGoalRepository;

    public List<FinancialGoal> findAll() {
        return financialGoalRepository.findAll();
    }

    public Optional<FinancialGoal> findById(String id) {
        return financialGoalRepository.findById(id);
    }

    public FinancialGoal save(FinancialGoal goal) {
        return financialGoalRepository.save(goal);
    }

    public void deleteById(String id) {
        financialGoalRepository.deleteById(id);
    }
}
