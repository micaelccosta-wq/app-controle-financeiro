package com.financaspro.repository;

import com.financaspro.model.WealthConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface WealthConfigRepository extends JpaRepository<WealthConfig, Long> {
}
