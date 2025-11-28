package com.financaspro.controller;

import com.financaspro.model.Account;
import com.financaspro.service.AccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    @Autowired
    private AccountService accountService;

    @GetMapping
    public List<Account> getAllAccounts() {
        return accountService.findAll();
    }

    @PostMapping
    public Account createAccount(@RequestBody Account account) {
        return accountService.save(account);
    }

    @PostMapping("/batch")
    public List<Account> createAccounts(@RequestBody List<Account> accounts) {
        return accountService.saveAll(accounts);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Account> updateAccount(@PathVariable String id, @RequestBody Account account) {
        return accountService.findById(id)
                .map(existing -> {
                    account.setId(id);
                    return ResponseEntity.ok(accountService.save(account));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAccount(@PathVariable String id) {
        accountService.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
