package com.financaspro.service;

import com.financaspro.model.Category;
import com.financaspro.repository.CategoryRepository;
import com.financaspro.util.UserContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class CategoryService {

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private UserContext userContext;

    public List<Category> findAll() {
        return categoryRepository.findAllByUserId(userContext.getCurrentUserId());
    }

    public Optional<Category> findById(String id) {
        Optional<Category> category = categoryRepository.findById(id);
        if (category.isPresent() && !category.get().getUserId().equals(userContext.getCurrentUserId())) {
            return Optional.empty();
        }
        return category;
    }

    public Category save(Category category) {
        category.setUserId(userContext.getCurrentUserId());
        return categoryRepository.save(category);
    }

    public List<Category> saveAll(List<Category> categories) {
        String userId = userContext.getCurrentUserId();
        categories.forEach(c -> c.setUserId(userId));
        return categoryRepository.saveAll(categories);
    }

    @Autowired
    private com.financaspro.repository.TransactionRepository transactionRepository;

    @Autowired
    private com.financaspro.repository.BudgetRepository budgetRepository;

    public void deleteById(String id) {
        Optional<Category> category = findById(id);
        if (category.isPresent()) {
            String userId = userContext.getCurrentUserId();
            String categoryName = category.get().getName();

            if (transactionRepository.existsByCategoryAndUserId(categoryName, userId)) {
                throw new RuntimeException("Cannot delete category used in transactions");
            }
            if (budgetRepository.existsByCategoryIdAndUserId(id, userId)) {
                throw new RuntimeException("Cannot delete category used in budgets");
            }

            categoryRepository.deleteById(id);
        }
    }
}
