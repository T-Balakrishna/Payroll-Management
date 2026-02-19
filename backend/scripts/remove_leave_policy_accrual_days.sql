-- Safely remove accrualDays from leave_policies if present.
SET @db_name := DATABASE();

SET @has_accrual_days := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'leave_policies'
    AND COLUMN_NAME = 'accrualDays'
);

SET @sql := IF(@has_accrual_days = 0,
  'SELECT 1',
  'ALTER TABLE leave_policies DROP COLUMN accrualDays'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
