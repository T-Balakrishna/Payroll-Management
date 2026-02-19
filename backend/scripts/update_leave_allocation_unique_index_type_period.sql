-- Enforce one leave type allocation per employee per leave period.
-- Same leaveType can exist in different leave periods.

-- Ensure staffId has a non-unique index so FK requirements are satisfied
-- before dropping/recreating unique index.
ALTER TABLE leave_allocations
  ADD INDEX idx_leave_allocations_staffId (staffId);

ALTER TABLE leave_allocations
  DROP INDEX unique_allocation_per_employee_type_period;

ALTER TABLE leave_allocations
  ADD UNIQUE INDEX unique_allocation_per_employee_type_period
  (staffId, leaveTypeId, effectiveFrom, effectiveTo);
