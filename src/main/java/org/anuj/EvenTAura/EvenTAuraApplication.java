package org.anuj.EvenTAura;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.data.web.config.EnableSpringDataWebSupport;

import org.springframework.scheduling.annotation.EnableScheduling;

@EnableSpringDataWebSupport(pageSerializationMode = EnableSpringDataWebSupport.PageSerializationMode.VIA_DTO)
@SpringBootApplication
@EnableCaching
@EnableScheduling
public class EvenTAuraApplication {

	public static void main(String[] args) {

		SpringApplication.run(EvenTAuraApplication.class, args);
	}

}
