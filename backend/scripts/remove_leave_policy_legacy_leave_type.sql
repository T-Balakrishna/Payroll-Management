-- Drop legacy leaveType enum column from leave_policies.
SET @db_name := DATABASE();

SET @has_legacy := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db_name
    AND TABLE_NAME = 'leave_policies'
    AND COLUMN_NAME = 'leaveType'
);

SET @sql := IF(@has_legacy = 0,
  'SELECT 1',
  'ALTER TABLE leave_policies DROP COLUMN leaveType'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
