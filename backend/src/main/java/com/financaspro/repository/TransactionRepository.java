package com.financaspro.repository;

import com.financaspro.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, String> {
    java.util.List<Transaction> findAllByUserId(String userId);

    java.util.List<Transaction> findAllByUserIdAndDateBetween(String userId, String startDate, String endDate);

    boolean existsByCategoryAndUserId(String category, String userId);
}
