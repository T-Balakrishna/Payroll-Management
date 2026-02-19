-- Run against the target payroll database.
-- Safely removes old LeavePolicy scoping columns if present.

SET @db_name := DATABASE();

-- Drop foreign keys only when present.
SET @fk_designation := (
  SELECT CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'leave_policies'
    AND COLUMN_NAME = 'designationId'
    AND REFERENCED_TABLE_NAME IS NOT NULL
  LIMIT 1
);
SET @sql := IF(@fk_designation IS NULL,
  'SELECT 1',
  CONCAT('ALTER TABLE leave_policies DROP FOREIGN KEY `', @fk_designation, '`')
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @fk_grade := (
  SELECT CONSTRAINT_NAME
  FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'leave_policies'
    AND COLUMN_NAME = 'employeeGradeId'
    AND REFERENCED_TABLE_NAME IS NOT NULL
  LIMIT 1
);
SET @sql := IF(@fk_grade IS NULL,
  'SELECT 1',
  CONCAT('ALTER TABLE leave_policies DROP FOREIGN KEY `', @fk_grade, '`')
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Drop index if it exists.
SET @idx_scope := (
  SELECT INDEX_NAME
  FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'leave_policies'
    AND INDEX_NAME = 'idx_policy_company_designation_grade'
  LIMIT 1
);
SET @sql := IF(@idx_scope IS NULL,
  'SELECT 1',
  'ALTER TABLE leave_policies DROP INDEX idx_policy_company_designation_grade'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Drop columns if they still exist.
SET @has_employment := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'leave_policies'
    AND COLUMN_NAME = 'employmentTypeId'
);
SET @sql := IF(@has_employment = 0,
  'SELECT 1',
  'ALTER TABLE leave_policies DROP COLUMN employmentTypeId'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_designation := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'leave_policies'
    AND COLUMN_NAME = 'designationId'
);
SET @sql := IF(@has_designation = 0,
  'SELECT 1',
  'ALTER TABLE leave_policies DROP COLUMN designationId'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_grade := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'leave_policies'
    AND COLUMN_NAME = 'employeeGradeId'
);
SET @sql := IF(@has_grade = 0,
  'SELECT 1',
  'ALTER TABLE leave_policies DROP COLUMN employeeGradeId'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
