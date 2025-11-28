package com.financaspro.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FinancialGoal {

    @Id
    private String id;

    private String accountId;

    private Double targetAmount;

    private String targetDate; // YYYY-MM-DD
}
