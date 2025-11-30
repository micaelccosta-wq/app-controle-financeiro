package com.financaspro.service;

import com.financaspro.model.Account;
import com.financaspro.repository.AccountRepository;
import com.financaspro.util.UserContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class AccountService {

    @Autowired
    private AccountRepository accountRepository;

    @Autowired
    private UserContext userContext;

    public List<Account> findAll() {
        return accountRepository.findAllByUserId(userContext.getCurrentUserId());
    }

    public Optional<Account> findById(String id) {
        Optional<Account> account = accountRepository.findById(id);
        if (account.isPresent() && !account.get().getUserId().equals(userContext.getCurrentUserId())) {
            return Optional.empty();
        }
        return account;
    }

    public Account save(Account account) {
        account.setUserId(userContext.getCurrentUserId());
        return accountRepository.save(account);
    }

    public List<Account> saveAll(List<Account> accounts) {
        String userId = userContext.getCurrentUserId();
        accounts.forEach(a -> a.setUserId(userId));
        return accountRepository.saveAll(accounts);
    }

    public void deleteById(String id) {
        Optional<Account> account = findById(id);
        if (account.isPresent()) {
            accountRepository.deleteById(id);
        }
    }
}
