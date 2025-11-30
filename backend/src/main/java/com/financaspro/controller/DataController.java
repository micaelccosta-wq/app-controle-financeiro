package com.financaspro.controller;

import com.financaspro.service.DataService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/data")
public class DataController {

    @Autowired
    private DataService dataService;

    @DeleteMapping("/reset")
    public ResponseEntity<Void> resetData() {
        dataService.resetUserData();
        return ResponseEntity.ok().build();
    }
}
