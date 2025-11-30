package com.financaspro.controller;

import com.financaspro.model.Transaction;
import com.financaspro.service.TransactionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {

    @Autowired
    private TransactionService transactionService;

    @GetMapping
    public List<Transaction> getAllTransactions() {
        return transactionService.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Transaction> getTransactionById(@PathVariable String id) {
        return transactionService.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public Transaction createTransaction(@RequestBody Transaction transaction) {
        return transactionService.save(transaction);
    }

    @PostMapping("/batch")
    public List<Transaction> createTransactions(@RequestBody List<Transaction> transactions) {
        return transactionService.saveAll(transactions);
    }

    @PutMapping("/batch")
    public List<Transaction> updateTransactions(@RequestBody List<Transaction> transactions) {
        return transactionService.saveAll(transactions);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Transaction> updateTransaction(@PathVariable String id,
            @RequestBody Transaction transaction) {
        return transactionService.findById(id)
                .map(existing -> {
                    transaction.setId(id);
                    return ResponseEntity.ok(transactionService.save(transaction));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTransaction(@PathVariable String id) {
        transactionService.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
