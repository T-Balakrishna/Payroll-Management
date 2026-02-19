-- Drop old unique index (staffId + leaveTypeId) and recreate as period-aware
-- (staffId + leaveTypeId + effectiveFrom + effectiveTo).

ALTER TABLE leave_allocations
  DROP INDEX unique_allocation_per_employee_type_period;

ALTER TABLE leave_allocations
  ADD UNIQUE INDEX unique_allocation_per_employee_type_period
  (staffId, leaveTypeId, effectiveFrom, effectiveTo);
