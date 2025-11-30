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

    public void deleteById(String id) {
        Optional<Category> category = findById(id);
        if (category.isPresent()) {
            categoryRepository.deleteById(id);
        }
    }
}
