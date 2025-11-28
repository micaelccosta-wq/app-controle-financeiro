package com.financaspro.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Budget {

    @Id
    private String id;

    private String categoryId;

    private Integer month; // 0-11
    private Integer year;

    private Double amount;
}
