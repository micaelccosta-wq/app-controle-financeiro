package com.financaspro.service;

import com.financaspro.model.WealthConfig;
import com.financaspro.repository.WealthConfigRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class WealthConfigService {

    @Autowired
    private WealthConfigRepository wealthConfigRepository;

    public WealthConfig get() {
        return wealthConfigRepository.findAll().stream().findFirst().orElse(new WealthConfig(null, 0.0));
    }

    public WealthConfig save(WealthConfig config) {
        // Ensure singleton
        WealthConfig existing = get();
        if (existing.getId() != null) {
            config.setId(existing.getId());
        }
        return wealthConfigRepository.save(config);
    }
}
