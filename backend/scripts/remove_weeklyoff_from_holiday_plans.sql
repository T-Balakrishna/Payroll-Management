-- Safe, idempotent removal of weeklyOff column from holiday_plans (MySQL)
-- Run this once on the target database.

SET @db_name = DATABASE();

SET @drop_col_sql = (
  SELECT IF(
    EXISTS (
      SELECT 1
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = @db_name
        AND TABLE_NAME = 'holiday_plans'
        AND COLUMN_NAME = 'weeklyOff'
    ),
    'ALTER TABLE holiday_plans DROP COLUMN weeklyOff',
    'SELECT ''weeklyOff column not found; nothing to do'' AS info'
  )
);

PREPARE stmt FROM @drop_col_sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
