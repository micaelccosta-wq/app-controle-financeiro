package com.financaspro.controller;

import com.financaspro.model.Category;
import com.financaspro.service.CategoryService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    @Autowired
    private CategoryService categoryService;

    @GetMapping
    public List<Category> getAllCategories() {
        return categoryService.findAll();
    }

    @PostMapping
    public Category createCategory(@RequestBody Category category) {
        return categoryService.save(category);
    }

    @PostMapping("/batch")
    public List<Category> createCategories(@RequestBody List<Category> categories) {
        return categoryService.saveAll(categories);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Category> updateCategory(@PathVariable String id, @RequestBody Category category) {
        return categoryService.findById(id)
                .map(existing -> {
                    category.setId(id);
                    return ResponseEntity.ok(categoryService.save(category));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCategory(@PathVariable String id) {
        categoryService.deleteById(id);
        return ResponseEntity.ok().build();
    }
}
