package com.financaspro.repository;

import com.financaspro.model.Account;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AccountRepository extends JpaRepository<Account, String> {
    java.util.List<Account> findAllByUserId(String userId);

    java.util.Optional<Account> findByUserIdAndTypeAndIsDefaultTrue(String userId,
            com.financaspro.model.AccountType type);
}
