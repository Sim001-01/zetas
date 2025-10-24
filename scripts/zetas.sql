-- Zetas DB schema
-- SQL compatible with PostgreSQL. Adjust types for MySQL if needed.
-- Zetas DB schema
-- MySQL / MariaDB compatible DDL. If you still want Postgres, tell me and I'll provide the Postgres version.

-- Clients table: stores customer contact info
CREATE TABLE IF NOT EXISTS clients (
	id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
	name TEXT NOT NULL,
	phone VARCHAR(32),
	email VARCHAR(255),
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Services offered by the barber
CREATE TABLE IF NOT EXISTS services (
	id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
	name VARCHAR(255) NOT NULL,
	duration_minutes INT NOT NULL DEFAULT 30,
	description TEXT,
	price DECIMAL(8,2),
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	UNIQUE KEY uniq_service_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Appointments table
CREATE TABLE IF NOT EXISTS appointments (
	id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
	client_id BIGINT NULL,
	service_id BIGINT NULL,
	date DATE NOT NULL,
	start_time TIME NOT NULL,
	end_time TIME NOT NULL,
	status VARCHAR(20) NOT NULL DEFAULT 'pending',
	notes TEXT,
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT fk_appointments_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
	CONSTRAINT fk_appointments_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE INDEX idx_appointments_date ON appointments (date);
CREATE INDEX idx_appointments_client ON appointments (client_id);

-- Admins table for administrator accounts (store hashed passwords)
CREATE TABLE IF NOT EXISTS admins (
	id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
	username VARCHAR(255) NOT NULL UNIQUE,
	password_hash TEXT NOT NULL,
	email VARCHAR(255),
	created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Optional: seed the services table with common services (INSERT IGNORE avoids duplicates)
INSERT IGNORE INTO services (name, duration_minutes, description, price)
VALUES
	('Taglio Capelli', 30, 'Taglio tradizionale', 25.00),
	('Barba', 20, 'Rifinitura barba', 15.00),
	('Taglio + Barba', 50, 'Pacchetto completo', 35.00);

-- Short usage notes:
-- Run this file against your MySQL/MariaDB instance to create the tables, e.g. (PowerShell):
-- mysql -u USER -p -h HOST DBNAME < .\scripts\zetas.sql
-- or paste the contents into phpMyAdmin -> SQL and run.
