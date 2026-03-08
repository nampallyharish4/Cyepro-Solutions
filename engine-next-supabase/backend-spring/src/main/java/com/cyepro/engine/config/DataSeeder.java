package com.cyepro.engine.config;

import com.cyepro.engine.entity.Rule;
import com.cyepro.engine.entity.User;
import com.cyepro.engine.repository.RuleRepository;
import com.cyepro.engine.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository userRepository;
    private final RuleRepository ruleRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository, RuleRepository ruleRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.ruleRepository = ruleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        seedAdminUser();
        seedOperatorUser();
        seedFatigueRule();
    }

    private void seedAdminUser() {
        Optional<User> existing = userRepository.findByEmail("admin@cyepro.com");
        if (existing.isPresent()) {
            User user = existing.get();
            user.setPasswordHash(passwordEncoder.encode("password123"));
            user.setRole("admin");
            userRepository.save(user);
            log.info("Admin user updated! email: admin@cyepro.com");
        } else {
            User user = new User();
            user.setEmail("admin@cyepro.com");
            user.setPasswordHash(passwordEncoder.encode("password123"));
            user.setRole("admin");
            userRepository.save(user);
            log.info("Admin user created! email: admin@cyepro.com");
        }
    }

    private void seedOperatorUser() {
        Optional<User> existing = userRepository.findByEmail("operator@cyepro.com");
        if (existing.isEmpty()) {
            User user = new User();
            user.setEmail("operator@cyepro.com");
            user.setPasswordHash(passwordEncoder.encode("operator123"));
            user.setRole("operator");
            userRepository.save(user);
            log.info("Operator user created! email: operator@cyepro.com");
        }
    }

    private void seedFatigueRule() {
        Optional<Rule> existing = ruleRepository.findFirstByNameAndIsActiveTrueOrderByCreatedAtDesc("FATIGUE_LIMIT");
        if (existing.isPresent()) {
            Rule rule = existing.get();
            rule.setConditionValue("5");
            ruleRepository.save(rule);
            log.info("Fatigue limit rule updated!");
        } else {
            Rule rule = new Rule();
            rule.setName("FATIGUE_LIMIT");
            rule.setConditionType("system_setting");
            rule.setConditionValue("5");
            rule.setTargetPriority("SYSTEM");
            rule.setPriorityOrder(-1);
            ruleRepository.save(rule);
            log.info("Fatigue limit rule created!");
        }
    }
}
