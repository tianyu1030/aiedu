-- 家校沟通话术助手 MVP - 数据库结构
-- 字符集: utf8mb4
-- 隔离策略: 所有业务表均含 user_id，业务查询强制按 user_id 过滤

CREATE DATABASE IF NOT EXISTS `jiaxiao`
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `jiaxiao`;

-- 用户表
CREATE TABLE IF NOT EXISTS `users` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `email` VARCHAR(190) NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 班级表
CREATE TABLE IF NOT EXISTS `classes` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `name` VARCHAR(30) NOT NULL,
  `grade` TINYINT NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_classes_user_id` (`user_id`),
  CONSTRAINT `fk_classes_user_id` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 学生表
CREATE TABLE IF NOT EXISTS `students` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `class_id` BIGINT NOT NULL,
  `name` VARCHAR(20) NOT NULL,
  `gender` VARCHAR(4) NULL,
  `tags` VARCHAR(500) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_students_user_id` (`user_id`),
  KEY `idx_students_class_id` (`class_id`),
  CONSTRAINT `fk_students_class_id` FOREIGN KEY (`class_id`)
    REFERENCES `classes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_students_user_id` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 沟通记录表
CREATE TABLE IF NOT EXISTS `communication_records` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `user_id` BIGINT NOT NULL,
  `student_id` BIGINT NULL,
  `parent_message` TEXT NOT NULL,
  `reply` TEXT NULL,
  `strategy` TEXT NULL,
  `risks` TEXT NULL,
  `result` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_comm_user_id` (`user_id`),
  KEY `idx_comm_student_id` (`student_id`),
  CONSTRAINT `fk_comm_student_id` FOREIGN KEY (`student_id`)
    REFERENCES `students` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_comm_user_id` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 通用话术库（内置场景库，全局共享，所有用户共用）
CREATE TABLE IF NOT EXISTS `script_library` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `scene_id` VARCHAR(50) NOT NULL COMMENT '场景唯一标识',
  `title` VARCHAR(50) NOT NULL COMMENT '场景标题',
  `parent_expression` VARCHAR(500) NOT NULL COMMENT '家长常见表述',
  `reply_template` TEXT NOT NULL COMMENT '回复话术模板（含占位符）',
  `strategy` VARCHAR(500) NOT NULL COMMENT '沟通策略',
  `risk` VARCHAR(500) NOT NULL COMMENT '风险提示',
  `sort_order` INT NOT NULL DEFAULT 0 COMMENT '排序（小在前）',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_script_scene_id` (`scene_id`),
  KEY `idx_script_sort` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='通用话术库（内置场景）';
