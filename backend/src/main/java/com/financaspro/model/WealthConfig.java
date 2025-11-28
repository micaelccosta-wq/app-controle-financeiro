package com.financaspro.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class WealthConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id; // Singleton config, but needs ID for JPA

    private Double passiveIncomeGoal;
}
