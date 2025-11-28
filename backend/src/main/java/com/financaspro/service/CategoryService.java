package com.financaspro.service;

import com.financaspro.model.Category;
import com.financaspro.repository.CategoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class CategoryService {

    @Autowired
    private CategoryRepository categoryRepository;

    public List<Category> findAll() {
        return categoryRepository.findAll();
    }

    public Optional<Category> findById(String id) {
        return categoryRepository.findById(id);
    }

    public Category save(Category category) {
        return categoryRepository.save(category);
    }

    public List<Category> saveAll(List<Category> categories) {
        return categoryRepository.saveAll(categories);
    }

    public void deleteById(String id) {
        categoryRepository.deleteById(id);
    }
}
