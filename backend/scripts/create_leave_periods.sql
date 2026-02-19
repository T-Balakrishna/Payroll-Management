CREATE TABLE IF NOT EXISTS leave_periods (
  leavePeriodId INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  startDate DATE NOT NULL,
  endDate DATE NOT NULL,
  status ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Active',
  companyId INT NOT NULL,
  createdBy INT NULL,
  updatedBy INT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_leave_period_company FOREIGN KEY (companyId) REFERENCES companies(companyId) ON DELETE CASCADE,
  CONSTRAINT fk_leave_period_created_by FOREIGN KEY (createdBy) REFERENCES users(userId) ON DELETE SET NULL,
  CONSTRAINT fk_leave_period_updated_by FOREIGN KEY (updatedBy) REFERENCES users(userId) ON DELETE SET NULL
);

CREATE INDEX idx_leave_period_company_status ON leave_periods (companyId, status);
CREATE INDEX idx_leave_period_company_dates ON leave_periods (companyId, startDate, endDate);
