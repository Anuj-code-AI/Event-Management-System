package org.anuj.EvenTAura;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class EvenTAuraApplication {

	public static void main(String[] args) {
		Dotenv dotenv = Dotenv.configure().ignoreIfMissing().load();

		// Inject ALL .env variables into system properties
		// so Spring can resolve ${...} placeholders
		dotenv.entries().forEach(entry ->
				System.setProperty(entry.getKey(), entry.getValue())
		);
		SpringApplication.run(EvenTAuraApplication.class, args);
	}

}
