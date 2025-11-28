package com.financaspro.controller;

import com.financaspro.model.Budget;
import com.financaspro.service.BudgetService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/budgets")
public class BudgetController {

    @Autowired
    private BudgetService budgetService;

    @GetMapping
    public List<Budget> getAllBudgets() {
        return budgetService.findAll();
    }

    @PostMapping
    public Budget createBudget(@RequestBody Budget budget) {
        return budgetService.save(budget);
    }

    @PostMapping("/batch")
    public List<Budget> createBudgets(@RequestBody List<Budget> budgets) {
        return budgetService.saveAll(budgets);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Budget> updateBudget(@PathVariable String id, @RequestBody Budget budget) {
        return budgetService.findById(id)
                .map(existing -> {
                    budget.setId(id);
                    return ResponseEntity.ok(budgetService.save(budget));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBudget(@PathVariable String id) {
        budgetService.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
