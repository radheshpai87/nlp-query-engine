-- Healthcare Relational Database Schema (10 interlinked tables)

CREATE TABLE departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    building VARCHAR(50) NOT NULL,
    floor INT NOT NULL,
    budget NUMERIC(12, 2) NOT NULL
);

CREATE TABLE physicians (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    department_id INT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    years_of_experience INT NOT NULL
);

CREATE TABLE patients (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    date_of_birth DATE NOT NULL,
    gender VARCHAR(20) NOT NULL,
    blood_type VARCHAR(10) NOT NULL,
    emergency_contact VARCHAR(50) NOT NULL
);

CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    room_number VARCHAR(20) UNIQUE NOT NULL,
    department_id INT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    room_type VARCHAR(50) NOT NULL,
    daily_rate NUMERIC(8, 2) NOT NULL,
    is_occupied BOOLEAN DEFAULT false
);

CREATE TABLE admissions (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    room_id INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    admission_date TIMESTAMP NOT NULL,
    discharge_date TIMESTAMP,
    status VARCHAR(50) NOT NULL
);

CREATE TABLE appointments (
    id SERIAL PRIMARY KEY,
    patient_id INT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    physician_id INT NOT NULL REFERENCES physicians(id) ON DELETE CASCADE,
    appointment_date TIMESTAMP NOT NULL,
    reason VARCHAR(200) NOT NULL,
    status VARCHAR(50) NOT NULL
);

CREATE TABLE diagnoses (
    id SERIAL PRIMARY KEY,
    admission_id INT NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
    physician_id INT NOT NULL REFERENCES physicians(id) ON DELETE CASCADE,
    icd10_code VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    severity VARCHAR(30) NOT NULL,
    diagnosed_at TIMESTAMP NOT NULL
);

CREATE TABLE prescriptions (
    id SERIAL PRIMARY KEY,
    appointment_id INT NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    medication_name VARCHAR(100) NOT NULL,
    dosage VARCHAR(50) NOT NULL,
    frequency VARCHAR(50) NOT NULL,
    days_supply INT NOT NULL,
    cost NUMERIC(8, 2) NOT NULL
);

CREATE TABLE medical_procedures (
    id SERIAL PRIMARY KEY,
    admission_id INT NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
    physician_id INT NOT NULL REFERENCES physicians(id) ON DELETE CASCADE,
    procedure_name VARCHAR(150) NOT NULL,
    procedure_date TIMESTAMP NOT NULL,
    cost NUMERIC(10, 2) NOT NULL
);

CREATE TABLE billing_invoices (
    id SERIAL PRIMARY KEY,
    admission_id INT NOT NULL REFERENCES admissions(id) ON DELETE CASCADE,
    patient_id INT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    total_amount NUMERIC(10, 2) NOT NULL,
    insurance_covered NUMERIC(10, 2) NOT NULL,
    payment_status VARCHAR(50) NOT NULL,
    due_date DATE NOT NULL
);

-- Seed Data

-- 1. departments
INSERT INTO departments (id, name, building, floor, budget) VALUES
(1, 'Cardiology', 'Tower A', 3, 1250000.00),
(2, 'Neurology', 'Tower B', 4, 980000.00),
(3, 'Orthopedics', 'Tower A', 2, 850000.00),
(4, 'Pediatrics', 'East Wing', 1, 620000.00),
(5, 'Oncology', 'West Pavillion', 5, 2100000.00),
(6, 'Emergency Medicine', 'Main Hall', 1, 3500000.00);

-- 2. physicians
INSERT INTO physicians (id, name, email, specialty, department_id, years_of_experience) VALUES
(1, 'Dr. Sarah Mitchell', 'sarah.mitchell@hospital.org', 'Interventional Cardiology', 1, 14),
(2, 'Dr. Marcus Vance', 'marcus.vance@hospital.org', 'Electrophysiology', 1, 9),
(3, 'Dr. Elena Rostova', 'elena.rostova@hospital.org', 'Neurosurgery', 2, 18),
(4, 'Dr. David Chen', 'david.chen@hospital.org', 'Clinical Neurology', 2, 7),
(5, 'Dr. Julian Sterling', 'julian.sterling@hospital.org', 'Spine & Joint Reconstruction', 3, 12),
(6, 'Dr. Maya Patel', 'maya.patel@hospital.org', 'Sports Medicine Orthopedics', 3, 8),
(7, 'Dr. Emily Watson', 'emily.watson@hospital.org', 'Pediatric Pulmonology', 4, 11),
(8, 'Dr. Robert Torres', 'robert.torres@hospital.org', 'General Pediatrics', 4, 5),
(9, 'Dr. Claire Beauchamp', 'claire.beauchamp@hospital.org', 'Medical Oncology', 5, 20),
(10, 'Dr. Anthony Fauci', 'anthony.fauci@hospital.org', 'Emergency Trauma Care', 6, 25);

-- 3. patients
INSERT INTO patients (id, full_name, email, date_of_birth, gender, blood_type, emergency_contact) VALUES
(1, 'James Wilson', 'jwilson@gmail.com', '1982-04-12', 'Male', 'O+', '+1-555-0101'),
(2, 'Sophia Martinez', 'sophia.m@outlook.com', '1995-08-23', 'Female', 'A+', '+1-555-0102'),
(3, 'Alexander Wright', 'alex.wright@yahoo.com', '1974-11-03', 'Male', 'B-', '+1-555-0103'),
(4, 'Olivia Taylor', 'olivia.t@gmail.com', '1989-02-17', 'Female', 'O-', '+1-555-0104'),
(5, 'Lucas Bennett', 'lucas.b@domain.com', '2001-06-30', 'Male', 'AB+', '+1-555-0105'),
(6, 'Emma Richardson', 'emma.r@gmail.com', '1968-09-14', 'Female', 'A-', '+1-555-0106'),
(7, 'Noah Campbell', 'noah.c@outlook.com', '2015-03-22', 'Male', 'O+', '+1-555-0107'),
(8, 'Ava Robinson', 'ava.robinson@gmail.com', '1990-12-05', 'Female', 'B+', '+1-555-0108'),
(9, 'Liam Murphy', 'liam.m@techcorp.io', '1985-07-19', 'Male', 'A+', '+1-555-0109'),
(10, 'Isabella Clark', 'isabella.c@gmail.com', '1959-10-10', 'Female', 'O+', '+1-555-0110'),
(11, 'Ethan Phillips', 'ethan.p@gmail.com', '1998-01-25', 'Male', 'AB-', '+1-555-0111'),
(12, 'Mia Anderson', 'mia.a@domain.com', '1987-05-18', 'Female', 'B-', '+1-555-0112'),
(13, 'Benjamin Scott', 'bscott@outlook.com', '1970-08-08', 'Male', 'A+', '+1-555-0113'),
(14, 'Charlotte Adams', 'charlotte.a@gmail.com', '2018-11-12', 'Female', 'O-', '+1-555-0114'),
(15, 'Daniel Evans', 'devans@yahoo.com', '1963-04-01', 'Male', 'O+', '+1-555-0115'),
(16, 'Harper Collins', 'harper.c@gmail.com', '1992-09-29', 'Female', 'A-', '+1-555-0116'),
(17, 'Henry Stewart', 'henry.s@outlook.com', '1980-03-15', 'Male', 'B+', '+1-555-0117'),
(18, 'Evelyn Morris', 'evelyn.m@gmail.com', '1977-12-20', 'Female', 'O+', '+1-555-0118'),
(19, 'Sebastian Rogers', 'srogers@domain.com', '2005-07-04', 'Male', 'A+', '+1-555-0119'),
(20, 'Amelia Reed', 'amelia.reed@gmail.com', '1994-06-11', 'Female', 'AB+', '+1-555-0120');

-- 4. rooms
INSERT INTO rooms (id, room_number, department_id, room_type, daily_rate, is_occupied) VALUES
(1, 'ICU-301', 1, 'ICU', 1850.00, true),
(2, 'ICU-302', 1, 'ICU', 1850.00, false),
(3, 'CARD-310', 1, 'Private', 850.00, true),
(4, 'NEURO-401', 2, 'Private', 950.00, true),
(5, 'NEURO-402', 2, 'Semi-Private', 650.00, false),
(6, 'ORTHO-201', 3, 'General', 500.00, true),
(7, 'ORTHO-202', 3, 'Private', 800.00, false),
(8, 'PED-101', 4, 'Pediatric Suite', 700.00, true),
(9, 'PED-102', 4, 'General', 450.00, false),
(10, 'ONC-501', 5, 'Private', 1200.00, true),
(11, 'ONC-502', 5, 'ICU', 2200.00, false),
(12, 'EMERG-101', 6, 'Trauma Bay', 1500.00, true);

-- 5. admissions
INSERT INTO admissions (id, patient_id, room_id, admission_date, discharge_date, status) VALUES
(1, 1, 1, '2026-11-10 08:30:00', '2026-11-14 14:00:00', 'discharged'),
(2, 2, 3, '2026-11-12 11:15:00', NULL, 'admitted'),
(3, 3, 4, '2026-11-05 06:45:00', '2026-11-18 10:00:00', 'discharged'),
(4, 6, 6, '2026-11-15 09:00:00', NULL, 'admitted'),
(5, 7, 8, '2026-11-14 13:20:00', NULL, 'admitted'),
(6, 10, 10, '2026-10-28 15:40:00', '2026-11-08 11:30:00', 'discharged'),
(7, 13, 1, '2026-11-16 02:15:00', NULL, 'admitted'),
(8, 15, 12, '2026-11-17 21:05:00', NULL, 'admitted'),
(9, 4, 3, '2026-10-15 10:00:00', '2026-10-22 16:30:00', 'discharged'),
(10, 9, 6, '2026-10-20 07:30:00', '2026-10-27 12:00:00', 'discharged'),
(11, 12, 4, '2026-11-01 14:10:00', '2026-11-07 09:45:00', 'discharged'),
(12, 17, 10, '2026-11-18 16:00:00', NULL, 'admitted'),
(13, 18, 12, '2026-11-19 04:30:00', NULL, 'admitted'),
(14, 5, 6, '2026-10-10 11:00:00', '2026-10-14 15:00:00', 'discharged'),
(15, 19, 8, '2026-11-19 18:20:00', NULL, 'admitted');

-- 6. appointments
INSERT INTO appointments (id, patient_id, physician_id, appointment_date, reason, status) VALUES
(1, 1, 1, '2026-11-08 09:00:00', 'Chest pain evaluation', 'completed'),
(2, 2, 2, '2026-11-11 10:30:00', 'Palpitations checkup', 'completed'),
(3, 3, 3, '2026-11-04 14:00:00', 'Chronic migraines and dizziness', 'completed'),
(4, 4, 5, '2026-11-12 11:00:00', 'Knee ligament examination', 'completed'),
(5, 5, 6, '2026-11-13 15:30:00', 'Rotator cuff injury follow-up', 'completed'),
(6, 7, 7, '2026-11-14 09:30:00', 'Persistent pediatric wheezing', 'completed'),
(7, 8, 4, '2026-11-15 13:00:00', 'Peripheral neuropathy assessment', 'completed'),
(8, 9, 5, '2026-11-16 16:15:00', 'Pre-operative hip consultation', 'completed'),
(9, 10, 9, '2026-10-25 10:00:00', 'Biopsy result review', 'completed'),
(10, 11, 8, '2026-11-22 11:30:00', 'Annual pediatric physical', 'scheduled'),
(11, 12, 3, '2026-10-30 14:45:00', 'Post-concussion syndrome', 'completed'),
(12, 13, 1, '2026-11-15 18:00:00', 'Severe arrhythmia episode', 'completed'),
(13, 14, 7, '2026-11-23 10:00:00', 'Asthma inhaler re-prescription', 'scheduled'),
(14, 15, 10, '2026-11-17 20:30:00', 'Acute abdominal pain', 'completed'),
(15, 16, 2, '2026-11-24 15:00:00', 'Pacemaker battery check', 'scheduled'),
(16, 17, 9, '2026-11-18 14:00:00', 'Chemotherapy cycle 2 planning', 'completed'),
(17, 18, 10, '2026-11-19 03:45:00', 'Motorcycle trauma initial triage', 'completed'),
(18, 19, 8, '2026-11-19 17:00:00', 'High fever and dehydration', 'completed'),
(19, 20, 1, '2026-11-25 09:15:00', 'Hypertension medication titration', 'scheduled'),
(20, 1, 1, '2026-11-20 11:00:00', 'Post-discharge follow-up', 'completed');

-- 7. diagnoses
INSERT INTO diagnoses (id, admission_id, physician_id, icd10_code, description, severity, diagnosed_at) VALUES
(1, 1, 1, 'I21.9', 'Acute myocardial infarction, unspecified', 'Severe', '2026-11-10 09:15:00'),
(2, 2, 2, 'I47.1', 'Supraventricular tachycardia', 'Moderate', '2026-11-12 12:30:00'),
(3, 3, 3, 'G43.909', 'Migraine, unspecified, not intractable', 'Moderate', '2026-11-05 08:00:00'),
(4, 4, 5, 'M17.11', 'Unilateral primary osteoarthritis, right knee', 'Moderate', '2026-11-15 10:30:00'),
(5, 5, 7, 'J45.909', 'Unspecified asthma, uncomplicated', 'Mild', '2026-11-14 14:45:00'),
(6, 6, 9, 'C50.911', 'Malignant neoplasm of unspecified site of right female breast', 'Severe', '2026-10-28 17:00:00'),
(7, 7, 1, 'I48.91', 'Unspecified atrial fibrillation', 'Critical', '2026-11-16 03:00:00'),
(8, 8, 10, 'K35.80', 'Unspecified acute appendicitis', 'Severe', '2026-11-17 22:30:00'),
(9, 9, 1, 'I25.10', 'Atherosclerotic heart disease of native coronary artery', 'Moderate', '2026-10-15 11:20:00'),
(10, 10, 6, 'S83.511A', 'Sprain of anterior cruciate ligament of right knee', 'Moderate', '2026-10-20 08:45:00'),
(11, 11, 3, 'S06.0X0A', 'Concussion without loss of consciousness', 'Mild', '2026-11-01 15:30:00'),
(12, 12, 9, 'C34.90', 'Malignant neoplasm of unconfirmed bronchus or lung', 'Critical', '2026-11-18 17:15:00'),
(13, 13, 10, 'S72.001A', 'Fracture of unspecified part of neck of right femur', 'Critical', '2026-11-19 05:40:00'),
(14, 14, 5, 'M54.5', 'Low back pain', 'Mild', '2026-10-10 12:15:00'),
(15, 15, 7, 'A08.4', 'Viral intestinal infection, unspecified', 'Moderate', '2026-11-19 19:10:00');

-- 8. prescriptions
INSERT INTO prescriptions (id, appointment_id, medication_name, dosage, frequency, days_supply, cost) VALUES
(1, 1, 'Atorvastatin', '40mg', 'Once daily at bedtime', 30, 24.50),
(2, 1, 'Clopidogrel', '75mg', 'Once daily with meal', 30, 38.00),
(3, 2, 'Metoprolol Tartrate', '25mg', 'Twice daily', 60, 18.25),
(4, 3, 'Sumatriptan Succinate', '50mg', 'As needed for acute migraine', 9, 45.00),
(5, 4, 'Meloxicam', '15mg', 'Once daily in the morning', 30, 12.80),
(6, 5, 'Cyclobenzaprine', '10mg', 'Three times daily as needed', 14, 15.50),
(7, 6, 'Albuterol HFA Inhaler', '90mcg/actuation', '2 puffs every 4-6 hours prn', 30, 65.00),
(8, 7, 'Gabapentin', '300mg', 'Three times daily', 90, 28.90),
(9, 8, 'Celecoxib', '200mg', 'Once daily', 30, 52.00),
(10, 9, 'Tamoxifen Citrate', '20mg', 'Once daily', 30, 78.40),
(11, 11, 'Acetaminophen', '500mg', 'Every 6 hours as needed', 10, 8.50),
(12, 12, 'Apixaban', '5mg', 'Twice daily', 60, 210.00),
(13, 14, 'Cefoxitin IV', '1g', 'Every 8 hours', 3, 135.00),
(14, 16, 'Ondansetron', '8mg', '30 mins prior to chemotherapy', 15, 42.00),
(15, 17, 'Morphine Sulfate', '4mg', 'IV every 3 hours PRN for severe pain', 5, 95.00),
(16, 18, 'Oral Electrolyte Solution', '1000ml', 'Throughout day', 3, 14.00),
(17, 20, 'Lisinopril', '10mg', 'Once daily in the morning', 90, 19.50);

-- 9. medical_procedures
INSERT INTO medical_procedures (id, admission_id, physician_id, procedure_name, procedure_date, cost) VALUES
(1, 1, 1, 'Percutaneous Coronary Intervention (Stent)', '2026-11-10 11:00:00', 14500.00),
(2, 2, 2, 'Cardiac Catheter Ablation', '2026-11-13 14:00:00', 9800.00),
(3, 3, 3, 'Diagnostic Lumbar Puncture & MRI', '2026-11-06 10:30:00', 3200.00),
(4, 4, 5, 'Total Knee Arthroplasty (Replacement)', '2026-11-16 08:00:00', 22500.00),
(5, 6, 9, 'Stereotactic Core Needle Biopsy', '2026-10-29 13:00:00', 4100.00),
(6, 7, 1, 'Transesophageal Echocardiogram & Cardioversion', '2026-11-16 09:30:00', 5600.00),
(7, 8, 10, 'Laparoscopic Appendectomy', '2026-11-18 01:00:00', 8700.00),
(8, 9, 1, 'Coronary Angiography', '2026-10-16 14:30:00', 6200.00),
(9, 10, 6, 'Arthroscopic ACL Reconstruction', '2026-10-21 09:00:00', 11800.00),
(10, 12, 9, 'Bronchoscopy with Transbronchial Biopsy', '2026-11-19 11:00:00', 4900.00),
(11, 13, 10, 'Open Reduction and Internal Fixation of Femur', '2026-11-19 09:00:00', 19400.00);

-- 10. billing_invoices
INSERT INTO billing_invoices (id, admission_id, patient_id, total_amount, insurance_covered, payment_status, due_date) VALUES
(1, 1, 1, 21900.00, 19500.00, 'paid', '2026-12-15'),
(2, 2, 2, 12350.00, 10200.00, 'pending', '2026-12-20'),
(3, 3, 3, 15550.00, 14000.00, 'paid', '2026-12-05'),
(4, 4, 6, 25000.00, 21500.00, 'pending', '2026-12-25'),
(5, 5, 7, 3500.00, 3200.00, 'pending', '2026-12-18'),
(6, 6, 10, 17300.00, 16000.00, 'paid', '2026-11-30'),
(7, 7, 13, 13000.00, 11500.00, 'pending', '2026-12-22'),
(8, 8, 10, 11700.00, 9500.00, 'overdue', '2026-11-15'),
(9, 9, 4, 12150.00, 11000.00, 'paid', '2026-11-20'),
(10, 10, 9, 15300.00, 13800.00, 'paid', '2026-11-28'),
(11, 11, 12, 8900.00, 7800.00, 'paid', '2026-12-01'),
(12, 12, 17, 9700.00, 8000.00, 'pending', '2026-12-30'),
(13, 13, 18, 23900.00, 20000.00, 'pending', '2026-12-31'),
(14, 14, 5, 2500.00, 2100.00, 'paid', '2026-11-10'),
(15, 15, 19, 2100.00, 1800.00, 'pending', '2026-12-28');
