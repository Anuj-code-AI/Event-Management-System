package org.anuj.EvenTAura.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;

import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Configuration
@EnableCaching
// @ConditionalOnProperty(name = "redis.enabled", havingValue = "true")
public class CacheConfig {
/*
//  Caffeine CacheManager inMemory
    @Bean
    @Primary
    public CacheManager cacheManager() {
        return new CaffeineCacheManager(
                "approvedEvents",
                "userBasic",
                "userRole"
        );
    }
 */

    // Redis Cache manager
    @Bean
    @Primary
    public CacheManager cacheManager(RedisConnectionFactory factory) {
        ObjectMapper objectMapper = JsonMapper.builder()
                .addModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
                .build();

        GenericJackson2JsonRedisSerializer serializer =
                new GenericJackson2JsonRedisSerializer(objectMapper);

        RedisCacheConfiguration defaultConfig =
                RedisCacheConfiguration.defaultCacheConfig()
                        .entryTtl(Duration.ofMinutes(5))
                        .disableCachingNullValues()
                        .serializeValuesWith(
                                RedisSerializationContext.SerializationPair.fromSerializer(serializer)
                        );

        return RedisCacheManager.builder(factory)
                .cacheDefaults(defaultConfig)
                .withCacheConfiguration("approvedEvents",
                        defaultConfig.entryTtl(Duration.ofMinutes(2)))
                .withCacheConfiguration("userBasic",
                        defaultConfig.entryTtl(Duration.ofMinutes(10)))
                .withCacheConfiguration("userRole",
                        defaultConfig.entryTtl(Duration.ofMinutes(5)))
                .build();
    }
/*
    @Bean
    public CacheManager  approvedEventsCacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager("approvedEvents");

        cacheManager.setCaffeine(
                Caffeine.newBuilder()
                        .expireAfterWrite(2, TimeUnit.MINUTES) // TTL
                        .maximumSize(100) // prevent memory stupidity
        );

        return cacheManager;
    }

    @Bean
    public CacheManager  userBasicCacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager("userBasic");

        cacheManager.setCaffeine(
                Caffeine.newBuilder()
                        .expireAfterWrite(2, TimeUnit.MINUTES) // TTL
                        .maximumSize(100) // prevent memory stupidity
        );

        return cacheManager;
    }

    @Bean
    public CacheManager  userRoleCacheManager() {
        CaffeineCacheManager cacheManager = new CaffeineCacheManager("userRole");

        cacheManager.setCaffeine(
                Caffeine.newBuilder()
                        .expireAfterWrite(2, TimeUnit.MINUTES) // TTL
                        .maximumSize(100) // prevent memory stupidity
        );

        return cacheManager;
    }

    @Override
    public CacheErrorHandler errorHandler() {
        return new CacheErrorHandler() {

            @Override
            public void handleCacheGetError(RuntimeException e, Cache cache, Object key) {
                System.out.println("Redis GET failed → fallback to DB");
            }

            @Override
            public void handleCachePutError(RuntimeException e, Cache cache, Object key, Object value) {
                System.out.println("Redis PUT failed → skipping cache");
            }

            @Override
            public void handleCacheEvictError(RuntimeException e, Cache cache, Object key) {}

            @Override
            public void handleCacheClearError(RuntimeException e, Cache cache) {}
        };
    }

 */
}
