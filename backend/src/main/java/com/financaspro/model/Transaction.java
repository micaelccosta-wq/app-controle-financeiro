package com.financaspro.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.List;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Transaction {

    @Id
    private String id;

    private String userId;

    private String description;
    private Double amount;
    private String date; // ISO Date string YYYY-MM-DD

    private String category;

    @Enumerated(EnumType.STRING)
    private TransactionType type;

    private boolean isApplied;

    @Column(length = 1000)
    private String observations;

    private String accountId;

    // OFX Import ID
    private String fitid;

    // Split Categories
    @ElementCollection
    private List<TransactionSplit> split;

    // Credit Card Specifics
    private String invoiceMonth;

    // Installments
    private String batchId;
    private Integer installmentNumber;
    private Integer totalInstallments;
}
