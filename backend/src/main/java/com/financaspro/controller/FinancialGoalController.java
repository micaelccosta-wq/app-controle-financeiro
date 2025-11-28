package com.financaspro.controller;

import com.financaspro.model.FinancialGoal;
import com.financaspro.service.FinancialGoalService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/goals")
public class FinancialGoalController {

    @Autowired
    private FinancialGoalService financialGoalService;

    @GetMapping
    public List<FinancialGoal> getAllGoals() {
        return financialGoalService.findAll();
    }

    @PostMapping
    public FinancialGoal createGoal(@RequestBody FinancialGoal goal) {
        return financialGoalService.save(goal);
    }

    @PutMapping("/{id}")
    public ResponseEntity<FinancialGoal> updateGoal(@PathVariable String id, @RequestBody FinancialGoal goal) {
        return financialGoalService.findById(id)
                .map(existing -> {
                    goal.setId(id);
                    return ResponseEntity.ok(financialGoalService.save(goal));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGoal(@PathVariable String id) {
        financialGoalService.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
