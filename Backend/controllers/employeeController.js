const Employee = require('../models/Employee'); // Sequelize model

// Create
exports.createEmployee = async (req, res) => {
    try {
        const { empId, empName, role, email, phone } = req.body;
        const newEmployee = await Employee.create({ empId, empName, role, email, phone });
        res.status(201).json(newEmployee);
    } catch (error) {
        res.status(500).send("Error creating employee: " + error.message);
    }
};

// Read All
exports.getAllEmployees = async (req, res) => {
    try {
        const employees = await Employee.findAll();
        res.json(employees);
    } catch (error) {
        res.status(500).send("Error fetching employees: " + error.message);
    }
};

// Read One
exports.getEmployeeById = async (req, res) => {
    try {
        const employee = await Employee.findOne({ 
            where: { empId: req.params.id} 
        });
        if (!employee) return res.status(404).send("Employee not found");
        res.json(employee);
    } catch (error) {
        res.status(500).send("Error fetching employee: " + error.message);
    }
};

// Update
exports.updateEmployee = async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id);
        if (!employee) return res.status(404).send("Employee not found");
        await employee.update(req.body);
        res.json(employee);
    } catch (error) {
        res.status(500).send("Error updating employee: " + error.message);
    }
};

// Delete
exports.deleteEmployee = async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id);
        if (!employee) return res.status(404).send("Employee not found");
        await employee.destroy();
        res.json({ message: "Employee deleted successfully" });
    } catch (error) {
        res.status(500).send("Error deleting employee: " + error.message);
    }
};
