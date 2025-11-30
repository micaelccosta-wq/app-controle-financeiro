package com.financaspro.service;

import com.financaspro.model.FinancialGoal;
import com.financaspro.repository.FinancialGoalRepository;
import com.financaspro.util.UserContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class FinancialGoalService {

    @Autowired
    private FinancialGoalRepository financialGoalRepository;

    @Autowired
    private UserContext userContext;

    public List<FinancialGoal> findAll() {
        return financialGoalRepository.findAllByUserId(userContext.getCurrentUserId());
    }

    public Optional<FinancialGoal> findById(String id) {
        Optional<FinancialGoal> goal = financialGoalRepository.findById(id);
        if (goal.isPresent() && !goal.get().getUserId().equals(userContext.getCurrentUserId())) {
            return Optional.empty();
        }
        return goal;
    }

    public FinancialGoal save(FinancialGoal goal) {
        goal.setUserId(userContext.getCurrentUserId());
        return financialGoalRepository.save(goal);
    }

    public void deleteById(String id) {
        Optional<FinancialGoal> goal = findById(id);
        if (goal.isPresent()) {
            financialGoalRepository.deleteById(id);
        }
    }
}
