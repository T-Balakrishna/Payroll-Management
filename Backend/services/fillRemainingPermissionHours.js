const { Company, Employee } = require("../models"); // adjust import path as needed

// Function to reset permission hours for all employees each month
const resetPermissionHours = async () => {
  console.log("🔁 Running monthly permission hour reset...");

  try {
    const companies = await Company.findAll({ where: { status: "active" } });

    for (const company of companies) {
      const { companyId, permissionHoursPerMonth } = company;

      if (permissionHoursPerMonth == null) {
        console.log(`⚠️ Skipping company ${companyId} — permissionHoursPerMonth not set`);
        continue;
      }

      // Update all employees of the company
      const [updatedCount] = await Employee.update(
        { remainingPermissionHour: permissionHoursPerMonth },
        { where: { companyId } }
      );

      console.log(`✅ Company ${companyId}: Updated ${updatedCount} employees`);
    }

    console.log("🎯 Monthly permission hour reset completed successfully");
  } catch (error) {
    console.error("❌ Error resetting permission hours:", error);
  }
};

module.exports = { resetPermissionHours };
