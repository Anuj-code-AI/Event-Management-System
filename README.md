# 🐝 CampusHive (EvenTAura)

> An immersive, feature-rich Event Management and Live Attendance Ticketing Platform designed for university campuses. Moderate requests, manage events, track attendance manually, or check-in guests automatically using a live QR code scanner.

---

## 📸 Website Gallery

Showcase of CampusHive's premium design elements and modern layouts. Place your application screenshots in `/docs/images/` and link them below!

| **Landing & Event Discovery** | **Host & Event Creation** |
|:---:|:---:|
| ![Landing Page Placeholder](https://placehold.co/600x400/171f1c/4edea3?text=Landing+Page) | ![Event Request Placeholder](https://placehold.co/600x400/171f1c/4edea3?text=Host+Dashboard) |
| Discover global and university-exclusive events with high-contrast cards and smooth categories. | Build rich event banners, pricing configurations, and registration deadlines. |

| **Attendee Management** | **Live QR Code Scanner** |
|:---:|:---:|
| ![Attendee List Placeholder](https://placehold.co/600x400/171f1c/4edea3?text=Attendee+Manager) | ![Scanner Modal Placeholder](https://placehold.co/600x400/171f1c/4edea3?text=QR+Code+Scanner) |
| Manage attendees in real-time. Manually toggle status between `PRESENT` or `ABSENT`. | Auto check-in guests at the venue using a camera-based ticket scanning overlay. |

| **HOD Moderation Dashboard** | **Profile & Multi-Email Integration** |
|:---:|:---:|
| ![HOD Dashboard Placeholder](https://placehold.co/600x400/171f1c/4edea3?text=HOD+Dashboard) | ![Profile Details Placeholder](https://placehold.co/600x400/171f1c/4edea3?text=Profile+Settings) |
| Accept or reject host privileges and approve, cancel, or reactivate university events. | Connect a primary email and verify your college email domain to unlock campus-exclusive portals. |

---

## ✨ Features

- **🛡️ Multi-Role Security & Locking**: Complete isolation for **Audience**, **Host**, and **HOD** roles. Security bounds block HOD actions (cancellation, moderation, check-in) strictly to their own campus.
- **📧 Multi-Email System**: Attach a secondary university email to your personal account so you don't lose past registration histories when linking to a campus profile.
- **🎟️ Smart Ticket Generation**: Unique check-in QR passes rendered on the fly for secure ticket checking.
- **⚡ Real-time Attendance Suite**: Single-click manual check-ins/check-outs or real-time camera-based QR checking.
- **🎨 Glassmorphic Interface**: Premium dark-mode UI styled with custom-tailored Tailwind components, micro-animations, and fluid transitions.

---

## 🛠️ Tech Stack

- **Backend**: Spring Boot 3.5.x, Java 21, Spring Security (JWT-based session authentication), Spring Data JPA.
- **Frontend**: HTML5, Vanilla JavaScript, TailwindCSS, Material Symbols, HTML5-QRCode.
- **Database**: MySQL 8.x / PostgreSQL compatible.
- **Services**: Cloudinary Image Storage integration.

---

## 🚀 Quick Start Setup Guide

Follow these steps to run CampusHive locally on your machine.

### 1. Prerequisites
Before beginning, ensure you have the following installed:
- [Git](https://git-scm.com/)
- [Java Development Kit (JDK) 21+](https://adoptium.net/temurin/releases/?version=21)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Required if running with Docker)
- [Maven 3.9+](https://maven.apache.org/) (Optional, a wrapper is included in the project)

---

### 🐳 Option A: Setup using Docker (Recommended)

Docker sets up both the database and the backend application automatically with a single command!

1. **Clone the Repository**:
   ```bash
   git clone https://github.com/your-username/Event-Management-System.git
   cd Event-Management-System
   ```

2. **Configure Environment Variables**:
   Open the `.env` file in the root directory and ensure the database URL points to the database container:
   ```env
   SPRING_PROFILES_ACTIVE=prod
   DB_URL=jdbc:mysql://mysql:3306/event_db
   DB_USERNAME=root
   DB_PASSWORD=password
   ...
   ```

3. **Start the Multi-Container Environment**:
   ```bash
   docker compose up --build
   ```
   *This command compiles the source code, builds the container image, pulls MySQL 8.4, sets up database health checks, maps ports, and launches the application.*

4. **Verify Application Launch**:
   Access the homepage in your browser:
   👉 **[http://localhost:8080](http://localhost:8080)**

---

### ☕ Option B: Traditional Setup (Without Docker)

Use this method if you want to run the project using your local JDK and a standalone MySQL server.

1. **Set Up a Local Database**:
   - Install MySQL Server on your machine.
   - Create a database called `event_db`:
     ```sql
     CREATE DATABASE event_db;
     ```

2. **Configure Environment Variables**:
   Open the `.env` file in the root directory and adjust the Database credentials to point to your local database host (typically port `3306`):
   ```env
   SPRING_PROFILES_ACTIVE=prod
   DB_URL=jdbc:mysql://localhost:3306/event_db
   DB_USERNAME=your_mysql_username
   DB_PASSWORD=your_mysql_password
   ```

3. **Build the Application**:
   Compile and package the application jar using the Maven wrapper:
   - **Windows**:
     ```powershell
     .\mvnw.cmd clean package -DskipTests
     ```
   - **macOS / Linux**:
     ```bash
     chmod +x mvnw
     ./mvnw clean package -DskipTests
     ```

4. **Run the Application**:
   - **Via Maven command**:
     ```bash
     # Windows
     .\mvnw.cmd spring-boot:run
     
     # macOS/Linux
     ./mvnw spring-boot:run
     ```
   - **Via Executable Jar**:
     ```bash
     java -jar target/EvenTAura-0.0.1-SNAPSHOT.jar
     ```

5. **Visit the Website**:
   👉 **[http://localhost:8080](http://localhost:8080)**

---

## ⚙️ Configuration Properties (.env)

The application pulls configuration fields dynamically from the `.env` file located in the project root:

| Environment Variable | Description | Default Value |
| :--- | :--- | :--- |
| `SPRING_PROFILES_ACTIVE` | Configures Spring Boot profile setup. Use `prod` to fetch env keys. | `prod` |
| `DB_URL` | Connection URL for MySQL Database. | `jdbc:mysql://mysql:3306/event_db` |
| `DB_USERNAME` | Username for database administrator access. | `root` |
| `DB_PASSWORD` | Password for database administrator access. | `password` |
| `PORT` | Local web server bind port. | `8080` |
| `APP_SECRET_KEY` | Hexadecimal secret string used to sign JWT Session tokens. | `supersecretkey...` |
| `IMAGE_CLOUD_NAME` | Cloudinary container name for storing banners. | *(Provide Cloud Name)* |
| `IMAGE_CLOUD_API_KEY` | Cloudinary REST API Access Key. | *(Provide API Key)* |
| `IMAGE_CLOUD_SECRET` | Cloudinary REST API Secret Token. | *(Provide API Secret)* |

---

## 🐝 API Documentation

Interactive API documents are generated automatically using OpenAPI Swagger-UI.
- **Swagger Documentation**: [http://localhost:8080/swagger-ui/index.html](http://localhost:8080/swagger-ui/index.html)
- **Raw API JSON Specs**: [http://localhost:8080/v3/api-docs](http://localhost:8080/v3/api-docs)

---

## 🤝 Contributing & Support

If you run into issues launching the application or configuring the database, ensure:
1. Docker Desktop is running before launching `docker compose`.
2. Port `8080` and `3306` (or `3307`) are not being occupied by other background processes.
3. Your Cloudinary keys are fully filled in `.env` to enable banner uploads.
