package com.financaspro.service;

import com.financaspro.model.WealthConfig;
import com.financaspro.repository.WealthConfigRepository;
import com.financaspro.util.UserContext;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class WealthConfigService {

    @Autowired
    private WealthConfigRepository wealthConfigRepository;

    @Autowired
    private UserContext userContext;

    public WealthConfig get() {
        return wealthConfigRepository.findByUserId(userContext.getCurrentUserId())
                .orElse(new WealthConfig(null, userContext.getCurrentUserId(), 0.0));
    }

    public WealthConfig save(WealthConfig config) {
        String userId = userContext.getCurrentUserId();
        Optional<WealthConfig> existing = wealthConfigRepository.findByUserId(userId);

        if (existing.isPresent()) {
            config.setId(existing.get().getId());
        }
        config.setUserId(userId);
        return wealthConfigRepository.save(config);
    }
}
