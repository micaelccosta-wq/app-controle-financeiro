package com.financaspro.controller;

import com.financaspro.model.WealthConfig;
import com.financaspro.service.WealthConfigService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/wealth-config")
public class WealthConfigController {

    @Autowired
    private WealthConfigService wealthConfigService;

    @GetMapping
    public WealthConfig getWealthConfig() {
        return wealthConfigService.get();
    }

    @PostMapping
    public WealthConfig updateWealthConfig(@RequestBody WealthConfig config) {
        return wealthConfigService.save(config);
    }
}
