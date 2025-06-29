-- MySQL Seed Data for OpenTable Clone
USE bookdb;

-- Disable foreign key checks temporarily for easier insertion
SET FOREIGN_KEY_CHECKS = 0;

-- Clear existing data (optional - remove if you want to keep existing data)
DELETE FROM notifications;
DELETE FROM bookings;
DELETE FROM special_availability;
DELETE FROM availability_rules;
DELETE FROM staff_services;
DELETE FROM services;
DELETE FROM staff_members;
DELETE FROM user_business;
DELETE FROM business;
DELETE FROM users;

-- Reset auto increment counters
ALTER TABLE users AUTO_INCREMENT = 1;
ALTER TABLE business AUTO_INCREMENT = 1;
ALTER TABLE user_business AUTO_INCREMENT = 1;
ALTER TABLE staff_members AUTO_INCREMENT = 1;
ALTER TABLE services AUTO_INCREMENT = 1;
ALTER TABLE staff_services AUTO_INCREMENT = 1;
ALTER TABLE availability_rules AUTO_INCREMENT = 1;
ALTER TABLE special_availability AUTO_INCREMENT = 1;
ALTER TABLE bookings AUTO_INCREMENT = 1;
ALTER TABLE notifications AUTO_INCREMENT = 1;

-- Insert test user
-- Password hash for 'password123' with bcrypt salt rounds 10
INSERT INTO users (email, password_hash, first_name, last_name, email_verified, created_at, updated_at) VALUES
('test@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Max', 'Mustermann', TRUE, NOW(), NOW());

-- Insert business
INSERT INTO business (name, type, email, phone, address, city, postal_code, description, booking_link_slug, created_at, updated_at) VALUES
('Bella Vista Restaurant', 'restaurant', 'bella@vista.com', '+49 30 12345678', 'Hauptstraße 123', 'Berlin', '10115', 'Authentische italienische Küche im Herzen Berlins', 'bella-vista', NOW(), NOW()),
('Salon Schmidt', 'hair_salon', 'info@salon-schmidt.com', '+49 30 87654321', 'Friedrichstraße 456', 'Berlin', '10117', 'Moderner Friseursalon mit erfahrenen Stylisten', 'salon-schmidt', NOW(), NOW());

-- Insert user-business relationships
INSERT INTO user_business (user_id, business_id, role, created_at) VALUES
(1, 1, 'owner', NOW()),
(1, 2, 'owner', NOW());

-- Insert restaurant services (tables)
INSERT INTO services (business_id, name, description, duration_minutes, price, capacity, requires_staff, created_at, updated_at) VALUES
(1, 'Tisch für 2 Personen', 'Gemütlicher Tisch für zwei Personen', 120, 0.00, 2, FALSE, NOW(), NOW()),
(1, 'Tisch für 4 Personen', 'Perfekt für kleine Gruppen', 120, 0.00, 4, FALSE, NOW(), NOW()),
(1, 'Großer Tisch (6-8 Personen)', 'Ideal für Familienfeiern', 150, 0.00, 8, FALSE, NOW(), NOW());

-- Insert staff members for hair salon
INSERT INTO staff_members (business_id, name, email, description, created_at, updated_at) VALUES
(2, 'Anna Schmidt', 'anna@salon-schmidt.com', 'Spezialistin für Damenhaarschnitte und Colorationen', NOW(), NOW()),
(2, 'Klaus Meyer', 'klaus@salon-schmidt.com', 'Experte für Herrenschnitte und Bärte', NOW(), NOW());

-- Insert hair salon services
INSERT INTO services (business_id, name, description, duration_minutes, price, capacity, requires_staff, buffer_after_minutes, created_at, updated_at) VALUES
(2, 'Herrenhaarschnitt', 'Klassischer Herrenhaarschnitt mit Styling', 45, 35.00, 1, TRUE, 15, NOW(), NOW()),
(2, 'Damenhaarschnitt', 'Schnitt und Styling für Damen', 90, 55.00, 1, TRUE, 15, NOW(), NOW()),
(2, 'Coloration', 'Professionelle Haarfärbung', 180, 95.00, 1, TRUE, 30, NOW(), NOW());

-- Insert staff-service relationships
INSERT INTO staff_services (staff_member_id, service_id, created_at) VALUES
-- Anna kann alle Services (Service IDs 4, 5, 6)
(1, 4, NOW()),
(1, 5, NOW()),
(1, 6, NOW()),
-- Klaus nur Herrenhaarschnitt (Service ID 4)
(2, 4, NOW());

-- Insert availability rules for restaurant (Mo-So)
INSERT INTO availability_rules (business_id, day_of_week, start_time, end_time, created_at) VALUES
-- Montag nur Abend
(1, 1, '17:00', '22:00', NOW()),
-- Dienstag bis Sonntag ganztags
(1, 2, '11:30', '22:00', NOW()),
(1, 3, '11:30', '22:00', NOW()),
(1, 4, '11:30', '22:00', NOW()),
(1, 5, '11:30', '22:00', NOW()),
(1, 6, '11:30', '22:00', NOW()),
(1, 0, '11:30', '22:00', NOW());

-- Insert availability rules for hair salon staff (Di-Sa)
INSERT INTO availability_rules (staff_member_id, day_of_week, start_time, end_time, created_at) VALUES
-- Anna Schmidt (Di-Sa)
(1, 2, '09:00', '18:00', NOW()),
(1, 3, '09:00', '18:00', NOW()),
(1, 4, '09:00', '18:00', NOW()),
(1, 5, '09:00', '18:00', NOW()),
(1, 6, '09:00', '18:00', NOW()),
-- Klaus Meyer (Di-Sa)
(2, 2, '09:00', '18:00', NOW()),
(2, 3, '09:00', '18:00', NOW()),
(2, 4, '09:00', '18:00', NOW()),
(2, 5, '09:00', '18:00', NOW()),
(2, 6, '09:00', '18:00', NOW());

-- Insert test bookings for tomorrow
-- Note: In a real application, you would calculate tomorrow's date dynamically
-- For this seed, we'll use a specific future date
INSERT INTO bookings (business_id, service_id, staff_member_id, customer_name, customer_email, customer_phone, booking_date, start_time, end_time, party_size, status, special_requests, total_amount, created_at, updated_at) VALUES
-- Restaurant booking
(1, 2, NULL, 'Familie Müller', 'mueller@example.com', '+49 170 1234567', DATE_ADD(CURDATE(), INTERVAL 1 DAY), '19:00', '21:00', 4, 'confirmed', 'Vegetarische Optionen gewünscht', NULL, NOW(), NOW()),
-- Hair salon booking
(2, 4, 2, 'Peter Schmidt', 'peter@example.com', NULL, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '10:00', '10:45', 1, 'pending', NULL, 35.00, NOW(), NOW());

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- Display success message and useful information
SELECT 'Seed data created successfully!' as message;
SELECT 'Test User: test@example.com / password123' as login_info;
SELECT 'Restaurant booking link: /book/bella-vista' as restaurant_link;
SELECT 'Salon booking link: /book/salon-schmidt' as salon_link;