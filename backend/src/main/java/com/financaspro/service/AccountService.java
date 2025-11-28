package com.financaspro.service;

import com.financaspro.model.Account;
import com.financaspro.repository.AccountRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class AccountService {

    @Autowired
    private AccountRepository accountRepository;

    public List<Account> findAll() {
        return accountRepository.findAll();
    }

    public Optional<Account> findById(String id) {
        return accountRepository.findById(id);
    }

    public Account save(Account account) {
        return accountRepository.save(account);
    }

    public List<Account> saveAll(List<Account> accounts) {
        return accountRepository.saveAll(accounts);
    }

    public void deleteById(String id) {
        accountRepository.deleteById(id);
    }
}
