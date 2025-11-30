package com.financaspro.repository;

import com.financaspro.model.FinancialGoal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FinancialGoalRepository extends JpaRepository<FinancialGoal, String> {
    java.util.List<FinancialGoal> findAllByUserId(String userId);
}
