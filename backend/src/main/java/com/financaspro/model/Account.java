package com.financaspro.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Account {

    @Id
    private String id;

    private String userId;

    private String name;

    @Enumerated(EnumType.STRING)
    private AccountType type;

    private Double initialBalance; // Only for BANK

    private Integer closingDay; // Only for CREDIT_CARD
    private Integer dueDay; // Only for CREDIT_CARD
}
