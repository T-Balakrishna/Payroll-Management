-- Add effectiveFrom / effectiveTo to leave_policies for financial year alignment.
SET @db_name := DATABASE();

SET @has_effective_from := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'leave_policies'
    AND COLUMN_NAME = 'effectiveFrom'
);

SET @sql := IF(@has_effective_from = 0,
  'ALTER TABLE leave_policies ADD COLUMN effectiveFrom DATE NULL AFTER accrualFrequency',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @has_effective_to := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'leave_policies'
    AND COLUMN_NAME = 'effectiveTo'
);

SET @sql := IF(@has_effective_to = 0,
  'ALTER TABLE leave_policies ADD COLUMN effectiveTo DATE NULL AFTER effectiveFrom',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
