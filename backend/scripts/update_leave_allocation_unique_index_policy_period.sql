-- Ensure duplicate prevention is period-aware and policy-aware:
-- one allocation per employee + leaveType + leavePolicy in a given leave period.
-- Note: old unique index was also serving FK(staffId), so create a plain staffId index first.

ALTER TABLE leave_allocations
  ADD INDEX idx_leave_allocations_staffId (staffId);

ALTER TABLE leave_allocations
  DROP INDEX unique_allocation_per_employee_type_period;

ALTER TABLE leave_allocations
  ADD UNIQUE INDEX unique_allocation_per_employee_type_period
  (staffId, leaveTypeId, leavePolicyId, effectiveFrom, effectiveTo);
