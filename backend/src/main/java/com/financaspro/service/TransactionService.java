package com.financaspro.service;

import com.financaspro.model.Transaction;
import com.financaspro.repository.TransactionRepository;
import com.financaspro.util.UserContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class TransactionService {

    @Autowired
    private TransactionRepository transactionRepository;

    @Autowired
    private UserContext userContext;

    @SuppressWarnings("null")
    public List<Transaction> findAll() {
        return transactionRepository.findAllByUserId(userContext.getCurrentUserId());
    }

    public List<Transaction> findByDateRange(String startDate, String endDate) {
        return transactionRepository.findAllByUserIdAndDateBetween(userContext.getCurrentUserId(), startDate, endDate);
    }

    public Optional<Transaction> findById(String id) {
        Optional<Transaction> transaction = transactionRepository.findById(id);
        if (transaction.isPresent() && !transaction.get().getUserId().equals(userContext.getCurrentUserId())) {
            return Optional.empty();
        }
        return transaction;
    }

    public Transaction save(Transaction transaction) {
        transaction.setUserId(userContext.getCurrentUserId());
        return transactionRepository.save(transaction);
    }

    public List<Transaction> saveAll(List<Transaction> transactions) {
        String userId = userContext.getCurrentUserId();
        transactions.forEach(t -> t.setUserId(userId));
        return transactionRepository.saveAll(transactions);
    }

    public void deleteById(String id) {
        Optional<Transaction> transaction = findById(id);
        if (transaction.isPresent()) {
            transactionRepository.deleteById(id);
        }
    }

    public void deleteBatch(List<String> ids) {
        String userId = userContext.getCurrentUserId();
        List<Transaction> transactions = transactionRepository.findAllById(ids);
        // Filter to ensure user owns these transactions
        List<Transaction> userTransactions = transactions.stream()
                .filter(t -> t.getUserId().equals(userId))
                .toList();
        transactionRepository.deleteAll(userTransactions);
    }
}
