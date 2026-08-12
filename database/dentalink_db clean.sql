-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Feb 08, 2026 at 01:59 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `dentalink_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `appointments`
--

CREATE TABLE `appointments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `patient_id` bigint(20) UNSIGNED NOT NULL,
  `doctor_id` bigint(20) UNSIGNED NOT NULL,
  `service_id` bigint(20) UNSIGNED NOT NULL,
  `appointment_date` datetime NOT NULL,
  `appointment_time` time NOT NULL,
  `duration_minutes` int(11) NOT NULL DEFAULT 30,
  `status` enum('scheduled','confirmed','checked_in','not_available','completed','cancelled','no_show') NOT NULL DEFAULT 'scheduled',
  `checked_in_at` timestamp NULL DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `balance` decimal(10,2) DEFAULT 0.00 COMMENT 'Remaining balance for unpaid services',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `action` varchar(255) NOT NULL,
  `performed_by` bigint(20) UNSIGNED NOT NULL,
  `user_role` enum('patient','staff','admin') NOT NULL,
  `target_collection` varchar(255) NOT NULL,
  `target_id` bigint(20) UNSIGNED DEFAULT NULL,
  `details` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`details`)),
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `current_hash` varchar(255) NOT NULL,
  `previous_hash` varchar(255) DEFAULT NULL,
  `is_verified` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cache`
--

CREATE TABLE `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cache_locks`
--

CREATE TABLE `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `financial_records`
--

CREATE TABLE `financial_records` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `patient_id` bigint(20) UNSIGNED NOT NULL,
  `appointment_id` bigint(20) UNSIGNED DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `balance` decimal(10,2) NOT NULL DEFAULT 0.00,
  `payment_status` enum('pending','paid','partial','partial_completed','overdue') NOT NULL DEFAULT 'pending',
  `is_partial_payment` tinyint(1) DEFAULT 0,
  `parent_record_id` bigint(20) UNSIGNED DEFAULT NULL,
  `total_service_amount` decimal(10,2) DEFAULT NULL,
  `payment_method` enum('cash','credit_card','insurance','check') DEFAULT NULL,
  `transaction_date` date NOT NULL,
  `description` text DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `blockchain_hash` varchar(255) DEFAULT NULL,
  `previous_blockchain_hash` varchar(255) DEFAULT NULL,
  `is_verified` tinyint(1) NOT NULL DEFAULT 1,
  `verified_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `verified_by` bigint(20) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `hash_chain_verifications`
--

CREATE TABLE `hash_chain_verifications` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `table_name` varchar(255) NOT NULL,
  `last_record_id` bigint(20) UNSIGNED NOT NULL,
  `last_hash` varchar(255) NOT NULL,
  `records_verified` int(11) NOT NULL,
  `chain_valid` tinyint(1) NOT NULL DEFAULT 1,
  `tampering_detected` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`tampering_detected`)),
  `verified_by` bigint(20) UNSIGNED DEFAULT NULL,
  `verified_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `migrations`
--

CREATE TABLE `migrations` (
  `id` int(10) UNSIGNED NOT NULL,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `migrations`
--

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES
(1, '2025_07_30_000000_create_medicalclinic_tables', 1),
(2, '2025_07_31_000300_create_sessions_table', 1),
(3, '2025_08_22_072256_create_cache_table', 1),
(4, '2025_11_20_000001_rename_in_progress_status_to_not_available', 1),
(5, '2025_11_21_190054_add_blockchain_fields_to_financial_records_table', 1),
(6, '2025_11_21_191201_add_transaction_type_to_notifications_table', 1),
(7, '2025_12_22_151253_drop_reason_for_visit_from_appointments_table', 1),
(8, '2026_01_25_091603_add_last_login_at_to_users_table', 1),
(9, '2026_01_26_000000_add_last_appointment_date_to_patients', 1),
(10, '2026_01_26_100000_create_tooth_records_tables', 1),
(11, '2026_01_27_000001_add_requires_multiple_teeth_to_services', 1),
(12, '2026_02_08_000000_add_partial_completed_status_to_financial_records', 2),
(13, '2026_02_08_100000_add_balance_to_financial_records', 3),
(14, '2026_02_08_200000_drop_payment_status_from_financial_records', 4),
(15, '2026_02_08_024652_add_partial_payment_fields_to_financial_records_table', 5),
(16, '2026_02_08_031336_add_balance_to_appointments_table', 6),
(17, '2026_02_08_change_tooth_number_to_string', 7),
(18, '2026_02_08_210000_restore_payment_status_on_financial_records', 8);

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` enum('appointment','reminder','treatment','transaction','system') NOT NULL DEFAULT 'system',
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `patients`
--

CREATE TABLE `patients` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `last_appointment_date` timestamp NULL DEFAULT NULL,
  `birthday` date DEFAULT NULL,
  `gender` varchar(255) DEFAULT NULL,
  `emergency_contact_name` varchar(255) DEFAULT NULL,
  `emergency_contact_phone` varchar(255) DEFAULT NULL,
  `emergency_contact_relationship` varchar(255) DEFAULT NULL,
  `insurance_provider` varchar(255) DEFAULT NULL,
  `insurance_number` varchar(255) DEFAULT NULL,
  `medical_history` text DEFAULT NULL,
  `allergies` text DEFAULT NULL,
  `current_medications` text DEFAULT NULL,
  `blood_type` enum('A+','A-','B+','B-','AB+','AB-','O+','O-') DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `patient_records`
--

CREATE TABLE `patient_records` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `patient_id` bigint(20) UNSIGNED NOT NULL,
  `appointment_id` bigint(20) UNSIGNED DEFAULT NULL,
  `treatment_notes` text NOT NULL,
  `diagnosis` text DEFAULT NULL,
  `procedures_performed` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`procedures_performed`)),
  `recommendations` text DEFAULT NULL,
  `follow_up_instructions` text DEFAULT NULL,
  `created_by` bigint(20) UNSIGNED NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `schedules`
--

CREATE TABLE `schedules` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `staff_id` bigint(20) UNSIGNED NOT NULL,
  `date` date NOT NULL,
  `start_time` time NOT NULL,
  `end_time` time NOT NULL,
  `is_available` tinyint(1) NOT NULL DEFAULT 1,
  `notes` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `schedules`
--

INSERT INTO `schedules` (`id`, `staff_id`, `date`, `start_time`, `end_time`, `is_available`, `notes`, `created_at`, `updated_at`) VALUES
(61, 5, '2026-02-09', '09:00:00', '17:00:00', 1, NULL, '2026-02-07 07:47:27', '2026-02-07 07:47:27'),
(62, 5, '2026-02-10', '09:00:00', '17:00:00', 1, NULL, '2026-02-07 07:47:33', '2026-02-07 07:47:33'),
(63, 5, '2026-02-11', '09:00:00', '17:00:00', 1, NULL, '2026-02-07 07:47:46', '2026-02-07 07:47:46'),
(64, 5, '2026-02-12', '09:00:00', '17:00:00', 1, NULL, '2026-02-07 07:47:53', '2026-02-07 07:47:53'),
(65, 5, '2026-02-13', '09:00:00', '17:00:00', 1, NULL, '2026-02-07 07:47:58', '2026-02-07 07:47:58');

-- --------------------------------------------------------

--
-- Table structure for table `services`
--

CREATE TABLE `services` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `duration_minutes` int(11) NOT NULL DEFAULT 30,
  `category` enum('preventive','restorative','cosmetic','surgical','emergency') NOT NULL DEFAULT 'preventive',
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `requires_multiple_teeth` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `services`
--

INSERT INTO `services` (`id`, `name`, `description`, `price`, `duration_minutes`, `category`, `is_active`, `requires_multiple_teeth`, `created_at`, `updated_at`) VALUES
(2, 'Dental Crown', 'Porcelain-Fused-to-Metal or Zirconia', 15000.00, 120, 'cosmetic', 1, 0, '2025-12-26 10:50:40', '2026-01-25 21:19:02'),
(3, 'Dental Restoration', 'Pasta/Dental filling', 800.00, 30, 'restorative', 1, 0, '2025-12-26 10:51:11', '2025-12-26 10:51:11'),
(4, 'Root Canal Treatment', 'Root canal therapy', 3000.00, 90, 'emergency', 1, 0, '2025-12-26 11:02:57', '2025-12-26 16:04:54'),
(5, 'Tooth Extraction', 'Bunot/Tooth removal', 800.00, 15, 'preventive', 1, 0, '2025-12-26 16:18:17', '2025-12-26 17:17:48'),
(6, 'Dentures', 'Pustiso', 20000.00, 120, 'restorative', 1, 0, '2025-12-26 16:19:46', '2025-12-26 16:19:46'),
(7, 'Odontectomy', 'Wisdom tooth removal', 8000.00, 30, 'surgical', 1, 0, '2025-12-26 16:20:28', '2025-12-26 16:20:28'),
(8, 'Oral Prophylaxis', 'Teeth Cleaning or Scaling and Polishing', 700.00, 15, 'preventive', 1, 0, '2025-12-26 16:21:25', '2025-12-26 16:21:25'),
(9, 'Orthodontics', 'Braces', 30000.00, 120, 'restorative', 1, 0, '2025-12-26 16:22:00', '2025-12-26 16:22:00');

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sessions`
--

INSERT INTO `sessions` (`id`, `user_id`, `ip_address`, `user_agent`, `payload`, `last_activity`) VALUES
('MYAjMYxrU76SQ06Czwvi8xBYMi02Hw19ZZhB3BcF', NULL, '127.0.0.1', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36', 'YToyOntzOjY6Il90b2tlbiI7czo0MDoiT2x0TklOajJ2eEU0OHF0c1ZlUlZtOFRHNDVuU3hWZGR2WmR5ZFlZUiI7czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1770555542);

-- --------------------------------------------------------

--
-- Table structure for table `tooth_records`
--

CREATE TABLE `tooth_records` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `patient_id` bigint(20) UNSIGNED NOT NULL,
  `doctor_id` bigint(20) UNSIGNED NOT NULL,
  `patient_record_id` bigint(20) UNSIGNED DEFAULT NULL,
  `appointment_id` bigint(20) UNSIGNED DEFAULT NULL,
  `service_id` bigint(20) UNSIGNED DEFAULT NULL,
  `tooth_number` varchar(255) NOT NULL,
  `tooth_position` varchar(255) DEFAULT NULL,
  `surface` varchar(255) DEFAULT NULL,
  `service` varchar(255) NOT NULL,
  `treatment_type` varchar(255) DEFAULT NULL,
  `treatment_description` text DEFAULT NULL,
  `material_type` varchar(255) DEFAULT NULL,
  `materials_used` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`materials_used`)),
  `tooth_status` varchar(255) DEFAULT NULL,
  `tooth_condition` varchar(255) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `clinical_notes` text DEFAULT NULL,
  `date_done` date NOT NULL,
  `treatment_date` datetime DEFAULT NULL,
  `next_review_date` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('patient','staff','admin') NOT NULL DEFAULT 'patient',
  `phone` varchar(255) DEFAULT NULL,
  `address` text DEFAULT NULL,
  `status` enum('active','inactive','suspended') NOT NULL DEFAULT 'active',
  `employee_id` varchar(255) DEFAULT NULL,
  `position` varchar(255) DEFAULT NULL,
  `license_number` varchar(255) DEFAULT NULL,
  `license_expiry` date DEFAULT NULL,
  `hire_date` date DEFAULT NULL,
  `hourly_rate` decimal(8,2) DEFAULT NULL,
  `specializations` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`specializations`)),
  `bio` text DEFAULT NULL,
  `years_experience` int(11) NOT NULL DEFAULT 0,
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `last_login_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `email_verified_at`, `password`, `role`, `phone`, `address`, `status`, `employee_id`, `position`, `license_number`, `license_expiry`, `hire_date`, `hourly_rate`, `specializations`, `bio`, `years_experience`, `remember_token`, `created_at`, `updated_at`, `last_login_at`) VALUES
(4, 'System Administrator', 'admin@dentalink.site', '2025-12-26 10:17:11', '$2y$12$cVr1CA9Sc4gyo1Yk2GYlO.UjRoTS18Cpz2nf6jCetsDSV9PphHRjG', 'admin', '+1234567890', NULL, 'active', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, '2025-12-26 10:17:11', '2026-02-08 04:00:41', '2026-02-08 04:00:41'),
(5, 'Sarah Johnson', 'sarah.johnson@dentalclinic.com', '2025-12-26 10:17:11', '$2y$12$Q8ChVDw7npK7rJkIS7AFeOa4WwJUgWxWGinofyH8Qvdhs5P60a72i', 'staff', '+1234567891', NULL, 'active', 'EMP001', 'dentist', 'DDS123456', '2027-12-27', '2025-01-06', 75.00, '[\"General Dentistry\",\"Cosmetic Dentistry\"]', 'Dr. Johnson has over 10 years of experience in general and cosmetic dentistry.', 10, NULL, '2025-12-26 10:17:11', '2026-02-08 04:57:06', '2026-02-08 04:57:06'),
(6, 'Michael Chen', 'michael.chen@dentalclinic.com', '2025-12-26 10:17:11', '$2y$12$qN.wxliuk9BNnRd1lSB1XuQ028Vf2rlMk6csO/BhB.Xl/i0t.18w6', 'staff', '+1234567892', NULL, 'active', 'EMP002', 'dentist', 'DDS789012', '2028-12-27', '2025-01-06', 80.00, '[\"Orthodontics\",\"Oral Surgery\"]', 'Dr. Chen specializes in orthodontics and oral surgery with 15 years of experience.', 15, NULL, '2025-12-26 10:17:11', '2026-02-04 04:05:44', '2026-02-04 04:05:44'),
(7, 'Lisa Rodriguez', 'lisa.rodriguez@dentalclinic.com', '2025-12-26 10:17:11', '$2y$12$ZseCZYUOrjbTsL9lZE5Mh.A2p38L1VXQjHJxGcnNGcsbSMNklG0ke', 'staff', '+1234567893', '321 Hygiene St, City, State', 'active', 'EMP003', 'hygienist', 'RDH345678', '2027-12-27', '2025-04-27', 35.00, '[\"Preventive Care\",\"Periodontal Therapy\"]', 'Lisa is a certified dental hygienist with expertise in preventive care.', 8, NULL, '2025-12-26 10:17:11', '2025-12-26 10:17:11', NULL),
(8, 'Jennifer Smith', 'jennifer.smith@dentalclinic.com', '2025-12-26 10:17:11', '$2y$12$GhkJsuqaLNzxN7AUDz8TnObzft1lDQ0KUoVNxYoJBhvfKV01q8Ary', 'staff', '+1234567894', '654 Reception Rd, City, State', 'active', 'EMP004', 'receptionist', NULL, NULL, '2025-06-27', 18.00, NULL, 'Jennifer manages front desk operations and patient scheduling.', 5, NULL, '2025-12-26 10:17:11', '2025-12-26 10:17:11', NULL),
(9, 'John Doe', 'john.doe@email.com', '2025-12-26 10:17:12', '$2y$12$Du4kp3ajar9/uNziPX//9.ioQU00CNPyFG5Nzn8lSVnKayDpidmIW', 'patient', '+1234567895', '123 Patient Lane, City, State', 'active', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, '2025-12-26 10:17:12', '2025-12-26 10:17:12', NULL),
(11, 'Pat', 'pat@email.com', '2025-12-26 10:23:46', '$2y$12$W6Df0/yYZP8RLnu5pAaOqu0NSx3U302WI41iB1TNWjHxdJGok/OVe', 'patient', '09123456789', NULL, 'active', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, '2025-12-26 10:20:56', '2026-02-04 04:48:24', '2026-02-04 04:48:24'),
(12, 'Test User', 'test@example.com', '2026-01-25 21:14:39', '$2y$12$4AlQDvesb4BdQnK2DhrPeOjHf5ARM1US1lMk8tb4XipfrMfJRWMky', 'patient', NULL, NULL, 'active', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 'cxJ5KfQx34', '2026-01-25 21:14:39', '2026-01-25 21:14:39', NULL),
(618, 'Lei Bagsan', 'fraezedsloth@gmail.com', NULL, '$2y$12$2JPHoRT95y2UMK/ylNx2jOea/UTNqpNHOfb0gYVJp8mtcajFagMl.', 'patient', NULL, NULL, 'active', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, NULL, '2026-02-07 04:32:06', '2026-02-07 04:32:06', NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `appointments`
--
ALTER TABLE `appointments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `appointments_service_id_foreign` (`service_id`),
  ADD KEY `appointments_patient_id_appointment_date_index` (`patient_id`,`appointment_date`),
  ADD KEY `appointments_doctor_id_appointment_date_index` (`doctor_id`,`appointment_date`),
  ADD KEY `appointments_status_appointment_date_index` (`status`,`appointment_date`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `audit_logs_current_hash_unique` (`current_hash`),
  ADD KEY `audit_logs_performed_by_timestamp_index` (`performed_by`,`timestamp`),
  ADD KEY `audit_logs_action_timestamp_index` (`action`,`timestamp`),
  ADD KEY `audit_logs_current_hash_index` (`current_hash`),
  ADD KEY `audit_logs_previous_hash_index` (`previous_hash`),
  ADD KEY `audit_logs_is_verified_index` (`is_verified`);

--
-- Indexes for table `cache`
--
ALTER TABLE `cache`
  ADD PRIMARY KEY (`key`);

--
-- Indexes for table `cache_locks`
--
ALTER TABLE `cache_locks`
  ADD PRIMARY KEY (`key`);

--
-- Indexes for table `financial_records`
--
ALTER TABLE `financial_records`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `financial_records_blockchain_hash_unique` (`blockchain_hash`),
  ADD KEY `financial_records_verified_by_foreign` (`verified_by`),
  ADD KEY `financial_records_blockchain_hash_index` (`blockchain_hash`),
  ADD KEY `financial_records_previous_blockchain_hash_index` (`previous_blockchain_hash`),
  ADD KEY `financial_records_is_verified_index` (`is_verified`),
  ADD KEY `financial_records_is_verified_created_at_index` (`is_verified`,`created_at`),
  ADD KEY `financial_records_parent_record_id_index` (`parent_record_id`),
  ADD KEY `financial_records_appointment_id_is_partial_payment_index` (`appointment_id`,`is_partial_payment`),
  ADD KEY `financial_records_patient_id_payment_status_index` (`patient_id`,`payment_status`);

--
-- Indexes for table `hash_chain_verifications`
--
ALTER TABLE `hash_chain_verifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `hash_chain_verifications_verified_by_foreign` (`verified_by`),
  ADD KEY `hash_chain_verifications_table_name_verified_at_index` (`table_name`,`verified_at`),
  ADD KEY `hash_chain_verifications_chain_valid_index` (`chain_valid`);

--
-- Indexes for table `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `notifications_user_id_is_read_index` (`user_id`,`is_read`);

--
-- Indexes for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`email`);

--
-- Indexes for table `patients`
--
ALTER TABLE `patients`
  ADD PRIMARY KEY (`id`),
  ADD KEY `patients_user_id_foreign` (`user_id`),
  ADD KEY `patients_birthday_index` (`birthday`),
  ADD KEY `patients_gender_index` (`gender`),
  ADD KEY `patients_last_appointment_date_index` (`last_appointment_date`);

--
-- Indexes for table `patient_records`
--
ALTER TABLE `patient_records`
  ADD PRIMARY KEY (`id`),
  ADD KEY `patient_records_appointment_id_foreign` (`appointment_id`),
  ADD KEY `patient_records_created_by_foreign` (`created_by`),
  ADD KEY `patient_records_patient_id_created_at_index` (`patient_id`,`created_at`);

--
-- Indexes for table `schedules`
--
ALTER TABLE `schedules`
  ADD PRIMARY KEY (`id`),
  ADD KEY `schedules_staff_id_date_index` (`staff_id`,`date`),
  ADD KEY `schedules_date_is_available_index` (`date`,`is_available`);

--
-- Indexes for table `services`
--
ALTER TABLE `services`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sessions_user_id_index` (`user_id`),
  ADD KEY `sessions_last_activity_index` (`last_activity`);

--
-- Indexes for table `tooth_records`
--
ALTER TABLE `tooth_records`
  ADD PRIMARY KEY (`id`),
  ADD KEY `tooth_records_appointment_id_foreign` (`appointment_id`),
  ADD KEY `tooth_records_service_id_foreign` (`service_id`),
  ADD KEY `tooth_records_patient_id_index` (`patient_id`),
  ADD KEY `tooth_records_doctor_id_index` (`doctor_id`),
  ADD KEY `tooth_records_patient_record_id_index` (`patient_record_id`),
  ADD KEY `tooth_records_tooth_number_index` (`tooth_number`),
  ADD KEY `tooth_records_date_done_index` (`date_done`),
  ADD KEY `tooth_records_treatment_date_index` (`treatment_date`),
  ADD KEY `tooth_records_next_review_date_index` (`next_review_date`),
  ADD KEY `tooth_records_tooth_status_index` (`tooth_status`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email_unique` (`email`),
  ADD UNIQUE KEY `users_employee_id_unique` (`employee_id`),
  ADD KEY `users_role_status_index` (`role`,`status`),
  ADD KEY `users_employee_id_index` (`employee_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `appointments`
--
ALTER TABLE `appointments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `financial_records`
--
ALTER TABLE `financial_records`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `hash_chain_verifications`
--
ALTER TABLE `hash_chain_verifications`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `patients`
--
ALTER TABLE `patients`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `patient_records`
--
ALTER TABLE `patient_records`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `schedules`
--
ALTER TABLE `schedules`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=66;

--
-- AUTO_INCREMENT for table `services`
--
ALTER TABLE `services`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=144;

--
-- AUTO_INCREMENT for table `tooth_records`
--
ALTER TABLE `tooth_records`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=619;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `appointments`
--
ALTER TABLE `appointments`
  ADD CONSTRAINT `appointments_doctor_id_foreign` FOREIGN KEY (`doctor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `appointments_patient_id_foreign` FOREIGN KEY (`patient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `appointments_service_id_foreign` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_performed_by_foreign` FOREIGN KEY (`performed_by`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `financial_records`
--
ALTER TABLE `financial_records`
  ADD CONSTRAINT `financial_records_appointment_id_foreign` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `financial_records_patient_id_foreign` FOREIGN KEY (`patient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `financial_records_verified_by_foreign` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `hash_chain_verifications`
--
ALTER TABLE `hash_chain_verifications`
  ADD CONSTRAINT `hash_chain_verifications_verified_by_foreign` FOREIGN KEY (`verified_by`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `patients`
--
ALTER TABLE `patients`
  ADD CONSTRAINT `patients_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `patient_records`
--
ALTER TABLE `patient_records`
  ADD CONSTRAINT `patient_records_appointment_id_foreign` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `patient_records_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `patient_records_patient_id_foreign` FOREIGN KEY (`patient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `schedules`
--
ALTER TABLE `schedules`
  ADD CONSTRAINT `schedules_staff_id_foreign` FOREIGN KEY (`staff_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `tooth_records`
--
ALTER TABLE `tooth_records`
  ADD CONSTRAINT `tooth_records_appointment_id_foreign` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `tooth_records_doctor_id_foreign` FOREIGN KEY (`doctor_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tooth_records_patient_id_foreign` FOREIGN KEY (`patient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tooth_records_patient_record_id_foreign` FOREIGN KEY (`patient_record_id`) REFERENCES `patient_records` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `tooth_records_service_id_foreign` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
