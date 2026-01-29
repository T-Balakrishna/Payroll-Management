// controllers/statutoryReportsController.js
const { Op } = require('sequelize');
const sequelize = require('../config/database');
const db = require('../models');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const SalaryGeneration = db.SalaryGeneration;
const Employee = db.Employee;
const Department = db.Department;
const Company = db.Company;
const EmployeeLoan = db.EmployeeLoan;

// ==========================================
// 1. PF (PROVIDENT FUND) REPORT
// ==========================================

exports.getPFReport = async (req, res) => {
  try {
    const { companyId, departmentId, month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }

    const whereClause = {
      month: month,
      year: year,
      status: 'paid'
    };

    if (companyId) whereClause.companyId = companyId;

    const employeeWhere = {};
    if (departmentId) employeeWhere.departmentId = departmentId;

    const salaryData = await SalaryGeneration.findAll({
      where: whereClause,
      include: [
        {
          model: Employee,
          as: 'employee',
          where: employeeWhere,
          attributes: ['employeeCode', 'firstName', 'lastName', 'uanNumber', 'dateOfJoining'],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['departmentName']
            }
          ]
        },
        {
          model: Company,
          as: 'company',
          attributes: ['companyName', 'pfNumber']
        }
      ],
      order: [[{ model: Employee, as: 'employee' }, 'employeeCode', 'ASC']]
    });

    // Calculate PF components
    const pfData = salaryData.map(record => {
      const deductions = record.deductionsBreakdown || {};
      const earnings = record.earningsBreakdown || {};
      
      const pfWage = parseFloat(earnings.basicSalary || 0) + parseFloat(earnings.da || 0);
      const employeePF = parseFloat(deductions.providentFund || 0);
      
      // Calculate employer contribution (12% of PF wage)
      const employerPF = pfWage * 0.12;
      
      // Split employer contribution: 8.33% to EPS, rest to EPF
      const eps = Math.min(pfWage * 0.0833, 1250); // EPS capped at 1250
      const epf = employerPF - eps;

      return {
        id: record.id,
        employee: record.employee,
        pfWage: pfWage,
        employeePF: employeePF,
        employerEPF: epf,
        employerEPS: eps,
        totalEmployerContribution: employerPF,
        totalPF: employeePF + employerPF
      };
    });

    // Calculate totals
    const totals = {
      totalPFWage: pfData.reduce((sum, item) => sum + item.pfWage, 0),
      totalEmployeePF: pfData.reduce((sum, item) => sum + item.employeePF, 0),
      totalEmployerEPF: pfData.reduce((sum, item) => sum + item.employerEPF, 0),
      totalEmployerEPS: pfData.reduce((sum, item) => sum + item.employerEPS, 0),
      totalEmployerContribution: pfData.reduce((sum, item) => sum + item.totalEmployerContribution, 0),
      totalPF: pfData.reduce((sum, item) => sum + item.totalPF, 0),
      employeeCount: pfData.length
    };

    res.json({
      success: true,
      data: pfData,
      totals,
      companyInfo: salaryData[0]?.company || {}
    });

  } catch (error) {
    console.error('Get PF report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch PF report',
      error: error.message
    });
  }
};

// ==========================================
// 2. ESI (EMPLOYEE STATE INSURANCE) REPORT
// ==========================================

exports.getESIReport = async (req, res) => {
  try {
    const { companyId, departmentId, month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }

    const whereClause = {
      month: month,
      year: year,
      status: 'paid'
    };

    if (companyId) whereClause.companyId = companyId;

    const employeeWhere = {};
    if (departmentId) employeeWhere.departmentId = departmentId;

    const salaryData = await SalaryGeneration.findAll({
      where: whereClause,
      include: [
        {
          model: Employee,
          as: 'employee',
          where: employeeWhere,
          attributes: ['employeeCode', 'firstName', 'lastName', 'esiNumber', 'dateOfJoining'],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['departmentName']
            }
          ]
        },
        {
          model: Company,
          as: 'company',
          attributes: ['companyName', 'esiNumber']
        }
      ],
      order: [[{ model: Employee, as: 'employee' }, 'employeeCode', 'ASC']]
    });

    // Calculate ESI components
    const esiData = salaryData.map(record => {
      const grossPay = parseFloat(record.grossPay);
      const deductions = record.deductionsBreakdown || {};
      
      const employeeESI = parseFloat(deductions.esi || 0);
      
      // Employer ESI is 3.25% of gross pay
      const employerESI = grossPay * 0.0325;
      
      const totalESI = employeeESI + employerESI;

      return {
        id: record.id,
        employee: record.employee,
        grossPay: grossPay,
        employeeESI: employeeESI,
        employerESI: employerESI,
        totalESI: totalESI,
        workingDays: record.workingDays,
        presentDays: record.presentDays
      };
    });

    // Calculate totals
    const totals = {
      totalGrossPay: esiData.reduce((sum, item) => sum + item.grossPay, 0),
      totalEmployeeESI: esiData.reduce((sum, item) => sum + item.employeeESI, 0),
      totalEmployerESI: esiData.reduce((sum, item) => sum + item.employerESI, 0),
      totalESI: esiData.reduce((sum, item) => sum + item.totalESI, 0),
      employeeCount: esiData.length
    };

    res.json({
      success: true,
      data: esiData,
      totals,
      companyInfo: salaryData[0]?.company || {}
    });

  } catch (error) {
    console.error('Get ESI report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch ESI report',
      error: error.message
    });
  }
};

// ==========================================
// 3. TAX DEDUCTION (TDS) REPORT
// ==========================================

exports.getTaxReport = async (req, res) => {
  try {
    const { companyId, departmentId, month, year, quarter } = req.query;

    const whereClause = {
      status: 'paid'
    };

    if (companyId) whereClause.companyId = companyId;

    // If quarter is specified, filter by quarter months
    if (quarter) {
      const quarterMonths = {
        'Q1': [4, 5, 6],      // Apr-Jun
        'Q2': [7, 8, 9],      // Jul-Sep
        'Q3': [10, 11, 12],   // Oct-Dec
        'Q4': [1, 2, 3]       // Jan-Mar
      };
      whereClause.month = { [Op.in]: quarterMonths[quarter] };
      if (quarter === 'Q4') {
        // Q4 spans two calendar years
        whereClause[Op.or] = [
          { year: year, month: { [Op.in]: [1, 2, 3] } },
          { year: parseInt(year) - 1, month: { [Op.in]: [1, 2, 3] } }
        ];
      } else {
        whereClause.year = year;
      }
    } else if (month && year) {
      whereClause.month = month;
      whereClause.year = year;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Month and year, or quarter and year are required'
      });
    }

    const employeeWhere = {};
    if (departmentId) employeeWhere.departmentId = departmentId;

    const salaryData = await SalaryGeneration.findAll({
      where: whereClause,
      include: [
        {
          model: Employee,
          as: 'employee',
          where: employeeWhere,
          attributes: ['employeeCode', 'firstName', 'lastName', 'panNumber', 'dateOfJoining'],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['departmentName']
            }
          ]
        },
        {
          model: Company,
          as: 'company',
          attributes: ['companyName', 'tanNumber']
        }
      ],
      order: [
        [{ model: Employee, as: 'employee' }, 'employeeCode', 'ASC'],
        ['month', 'ASC']
      ]
    });

    // Group by employee and calculate tax
    const employeeTaxMap = {};
    
    salaryData.forEach(record => {
      const empId = record.employeeId;
      const deductions = record.deductionsBreakdown || {};
      const taxDeducted = parseFloat(deductions.incomeTax || 0);

      if (!employeeTaxMap[empId]) {
        employeeTaxMap[empId] = {
          employee: record.employee,
          months: [],
          totalGross: 0,
          totalTaxDeducted: 0
        };
      }

      employeeTaxMap[empId].months.push({
        month: record.month,
        year: record.year,
        grossPay: parseFloat(record.grossPay),
        taxDeducted: taxDeducted
      });

      employeeTaxMap[empId].totalGross += parseFloat(record.grossPay);
      employeeTaxMap[empId].totalTaxDeducted += taxDeducted;
    });

    const taxData = Object.values(employeeTaxMap);

    // Calculate totals
    const totals = {
      totalGross: taxData.reduce((sum, item) => sum + item.totalGross, 0),
      totalTaxDeducted: taxData.reduce((sum, item) => sum + item.totalTaxDeducted, 0),
      employeeCount: taxData.length
    };

    res.json({
      success: true,
      data: taxData,
      totals,
      companyInfo: salaryData[0]?.company || {},
      period: quarter ? `Quarter ${quarter} ${year}` : `${getMonthName(month)} ${year}`
    });

  } catch (error) {
    console.error('Get tax report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tax report',
      error: error.message
    });
  }
};

// ==========================================
// 4. PROFESSIONAL TAX REPORT
// ==========================================

exports.getProfessionalTaxReport = async (req, res) => {
  try {
    const { companyId, departmentId, month, year, state } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }

    const whereClause = {
      month: month,
      year: year,
      status: 'paid'
    };

    if (companyId) whereClause.companyId = companyId;

    const employeeWhere = {};
    if (departmentId) employeeWhere.departmentId = departmentId;
    if (state) employeeWhere.state = state;

    const salaryData = await SalaryGeneration.findAll({
      where: whereClause,
      include: [
        {
          model: Employee,
          as: 'employee',
          where: employeeWhere,
          attributes: ['employeeCode', 'firstName', 'lastName', 'state'],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['departmentName']
            }
          ]
        },
        {
          model: Company,
          as: 'company',
          attributes: ['companyName']
        }
      ],
      order: [
        [{ model: Employee, as: 'employee' }, 'state', 'ASC'],
        [{ model: Employee, as: 'employee' }, 'employeeCode', 'ASC']
      ]
    });

    // Calculate PT
    const ptData = salaryData.map(record => {
      const deductions = record.deductionsBreakdown || {};
      const professionalTax = parseFloat(deductions.professionalTax || 0);

      return {
        id: record.id,
        employee: record.employee,
        grossPay: parseFloat(record.grossPay),
        professionalTax: professionalTax,
        state: record.employee.state || 'N/A'
      };
    });

    // Group by state
    const stateWisePT = {};
    ptData.forEach(item => {
      const state = item.state;
      if (!stateWisePT[state]) {
        stateWisePT[state] = {
          employees: [],
          totalPT: 0,
          count: 0
        };
      }
      stateWisePT[state].employees.push(item);
      stateWisePT[state].totalPT += item.professionalTax;
      stateWisePT[state].count++;
    });

    // Calculate totals
    const totals = {
      totalGrossPay: ptData.reduce((sum, item) => sum + item.grossPay, 0),
      totalPT: ptData.reduce((sum, item) => sum + item.professionalTax, 0),
      employeeCount: ptData.length,
      stateCount: Object.keys(stateWisePT).length
    };

    res.json({
      success: true,
      data: ptData,
      stateWiseData: stateWisePT,
      totals,
      companyInfo: salaryData[0]?.company || {}
    });

  } catch (error) {
    console.error('Get professional tax report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch professional tax report',
      error: error.message
    });
  }
};

// ==========================================
// 5. LOAN/ADVANCE REPORT
// ==========================================

exports.getLoanReport = async (req, res) => {
  try {
    const { companyId, departmentId, status, loanType } = req.query;

    const whereClause = {};
    if (status) whereClause.status = status;
    if (loanType) whereClause.loanType = loanType;

    const employeeWhere = {};
    if (companyId) employeeWhere.companyId = companyId;
    if (departmentId) employeeWhere.departmentId = departmentId;

    const loanData = await EmployeeLoan.findAll({
      where: whereClause,
      include: [
        {
          model: Employee,
          as: 'employee',
          where: employeeWhere,
          attributes: ['employeeCode', 'firstName', 'lastName', 'dateOfJoining'],
          include: [
            {
              model: Department,
              as: 'department',
              attributes: ['departmentName']
            },
            {
              model: Company,
              as: 'company',
              attributes: ['companyName']
            }
          ]
        }
      ],
      order: [
        ['status', 'ASC'],
        [{ model: Employee, as: 'employee' }, 'employeeCode', 'ASC']
      ]
    });

    // Calculate loan details
    const loanDetails = loanData.map(loan => {
      const paidAmount = parseFloat(loan.paidAmount || 0);
      const outstandingAmount = parseFloat(loan.loanAmount) - paidAmount;
      const completionPercentage = (paidAmount / parseFloat(loan.loanAmount)) * 100;

      return {
        id: loan.id,
        employee: loan.employee,
        loanType: loan.loanType,
        loanAmount: parseFloat(loan.loanAmount),
        sanctionDate: loan.sanctionDate,
        installmentAmount: parseFloat(loan.installmentAmount),
        numberOfInstallments: loan.numberOfInstallments,
        paidInstallments: loan.paidInstallments || 0,
        paidAmount: paidAmount,
        outstandingAmount: outstandingAmount,
        remainingInstallments: loan.numberOfInstallments - (loan.paidInstallments || 0),
        completionPercentage: completionPercentage.toFixed(2),
        status: loan.status,
        remarks: loan.remarks
      };
    });

    // Calculate totals by status
    const totals = {
      totalLoans: loanDetails.length,
      totalLoanAmount: loanDetails.reduce((sum, item) => sum + item.loanAmount, 0),
      totalPaidAmount: loanDetails.reduce((sum, item) => sum + item.paidAmount, 0),
      totalOutstanding: loanDetails.reduce((sum, item) => sum + item.outstandingAmount, 0),
      activeLoans: loanDetails.filter(l => l.status === 'active').length,
      completedLoans: loanDetails.filter(l => l.status === 'completed').length,
      pendingLoans: loanDetails.filter(l => l.status === 'pending').length
    };

    res.json({
      success: true,
      data: loanDetails,
      totals
    });

  } catch (error) {
    console.error('Get loan report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch loan report',
      error: error.message
    });
  }
};

// ==========================================
// 6. DOWNLOAD PF REPORT AS PDF
// ==========================================

exports.downloadPFReportPDF = async (req, res) => {
  try {
    const { companyId, month, year } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }

    const whereClause = {
      month: month,
      year: year,
      status: 'paid'
    };

    if (companyId) whereClause.companyId = companyId;

    const salaryData = await SalaryGeneration.findAll({
      where: whereClause,
      include: [
        {
          model: Employee,
          as: 'employee',
          include: [
            {
              model: Department,
              as: 'department'
            }
          ]
        },
        {
          model: Company,
          as: 'company'
        }
      ],
      order: [[{ model: Employee, as: 'employee' }, 'employeeCode', 'ASC']]
    });

    // Calculate PF components
    const pfData = salaryData.map(record => {
      const deductions = record.deductionsBreakdown || {};
      const earnings = record.earningsBreakdown || {};
      
      const pfWage = parseFloat(earnings.basicSalary || 0) + parseFloat(earnings.da || 0);
      const employeePF = parseFloat(deductions.providentFund || 0);
      const employerPF = pfWage * 0.12;
      const eps = Math.min(pfWage * 0.0833, 1250);
      const epf = employerPF - eps;

      return {
        employee: record.employee,
        pfWage,
        employeePF,
        employerEPF: epf,
        employerEPS: eps,
        totalEmployerContribution: employerPF,
        totalPF: employeePF + employerPF
      };
    });

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 30 });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=pf-report-${month}-${year}.pdf`);
    
    doc.pipe(res);

    // Header
    const companyName = salaryData[0]?.company?.companyName || 'Company Name';
    const pfNumber = salaryData[0]?.company?.pfNumber || 'N/A';
    
    doc.fontSize(16).font('Helvetica-Bold').text(companyName, { align: 'center' });
    doc.fontSize(12).font('Helvetica').text(`Provident Fund Report - ${getMonthName(month)} ${year}`, { align: 'center' });
    doc.fontSize(10).text(`PF Number: ${pfNumber}`, { align: 'center' });
    doc.moveDown(1);

    // Table
    let yPos = doc.y;
    
    // Header
    doc.fontSize(9).font('Helvetica-Bold');
    doc.rect(30, yPos, 792 - 60, 20).fillAndStroke('#4A5568', '#2D3748');
    doc.fillColor('white');
    
    doc.text('S.No', 40, yPos + 6, { width: 40 });
    doc.text('Emp Code', 80, yPos + 6, { width: 70 });
    doc.text('Name', 150, yPos + 6, { width: 100 });
    doc.text('UAN', 250, yPos + 6, { width: 80 });
    doc.text('PF Wage', 330, yPos + 6, { width: 70 });
    doc.text('Emp PF', 400, yPos + 6, { width: 60 });
    doc.text('Emp EPF', 460, yPos + 6, { width: 60 });
    doc.text('Emp EPS', 520, yPos + 6, { width: 60 });
    doc.text('Total', 580, yPos + 6, { width: 70 });

    yPos += 20;
    doc.fillColor('black').font('Helvetica');

    let totalPFWage = 0, totalEmpPF = 0, totalEmpEPF = 0, totalEmpEPS = 0, totalPF = 0;

    pfData.forEach((item, index) => {
      if (yPos > 520) {
        doc.addPage();
        yPos = 50;
      }

      if (index % 2 === 0) {
        doc.rect(30, yPos, 792 - 60, 18).fillAndStroke('#F7FAFC', '#E2E8F0');
      }

      doc.fillColor('black').fontSize(8);
      doc.text(index + 1, 40, yPos + 5, { width: 40 });
      doc.text(item.employee.employeeCode, 80, yPos + 5, { width: 70, ellipsis: true });
      doc.text(`${item.employee.firstName} ${item.employee.lastName}`, 150, yPos + 5, { width: 100, ellipsis: true });
      doc.text(item.employee.uanNumber || 'N/A', 250, yPos + 5, { width: 80 });
      doc.text(item.pfWage.toFixed(2), 330, yPos + 5, { width: 70, align: 'right' });
      doc.text(item.employeePF.toFixed(2), 400, yPos + 5, { width: 60, align: 'right' });
      doc.text(item.employerEPF.toFixed(2), 460, yPos + 5, { width: 60, align: 'right' });
      doc.text(item.employerEPS.toFixed(2), 520, yPos + 5, { width: 60, align: 'right' });
      doc.text(item.totalPF.toFixed(2), 580, yPos + 5, { width: 70, align: 'right' });

      totalPFWage += item.pfWage;
      totalEmpPF += item.employeePF;
      totalEmpEPF += item.employerEPF;
      totalEmpEPS += item.employerEPS;
      totalPF += item.totalPF;

      yPos += 18;
    });

    // Total row
    yPos += 10;
    doc.fontSize(10).font('Helvetica-Bold');
    doc.rect(30, yPos, 792 - 60, 25).fillAndStroke('#E6F2FF', '#2D3748');
    
    doc.fillColor('black');
    doc.text('TOTAL', 40, yPos + 8, { width: 280 });
    doc.text(totalPFWage.toFixed(2), 330, yPos + 8, { width: 70, align: 'right' });
    doc.text(totalEmpPF.toFixed(2), 400, yPos + 8, { width: 60, align: 'right' });
    doc.text(totalEmpEPF.toFixed(2), 460, yPos + 8, { width: 60, align: 'right' });
    doc.text(totalEmpEPS.toFixed(2), 520, yPos + 8, { width: 60, align: 'right' });
    doc.text(totalPF.toFixed(2), 580, yPos + 8, { width: 70, align: 'right' });

    // Footer
    yPos += 40;
    doc.fontSize(8).fillColor('gray');
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 30, yPos);
    doc.text(`Total Employees: ${pfData.length}`, 30, yPos + 15);

    doc.end();

  } catch (error) {
    console.error('Download PF report PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PF PDF',
      error: error.message
    });
  }
};

// ==========================================
// 7. DOWNLOAD STATUTORY REPORTS AS EXCEL
// ==========================================

exports.downloadStatutoryReportsExcel = async (req, res) => {
  try {
    const { companyId, month, year, reportType } = req.query;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: 'Month and year are required'
      });
    }

    const workbook = new ExcelJS.Workbook();

    // Fetch salary data
    const whereClause = {
      month: month,
      year: year,
      status: 'paid'
    };

    if (companyId) whereClause.companyId = companyId;

    const salaryData = await SalaryGeneration.findAll({
      where: whereClause,
      include: [
        {
          model: Employee,
          as: 'employee',
          include: [
            { model: Department, as: 'department' }
          ]
        },
        {
          model: Company,
          as: 'company'
        }
      ],
      order: [[{ model: Employee, as: 'employee' }, 'employeeCode', 'ASC']]
    });

    const companyName = salaryData[0]?.company?.companyName || 'Company Name';

    // PF Sheet
    if (!reportType || reportType === 'pf') {
      const pfSheet = workbook.addWorksheet('PF Report');
      
      pfSheet.mergeCells('A1:I1');
      pfSheet.getCell('A1').value = companyName;
      pfSheet.getCell('A1').font = { size: 14, bold: true };
      pfSheet.getCell('A1').alignment = { horizontal: 'center' };

      pfSheet.mergeCells('A2:I2');
      pfSheet.getCell('A2').value = `Provident Fund Report - ${getMonthName(month)} ${year}`;
      pfSheet.getCell('A2').font = { size: 12 };
      pfSheet.getCell('A2').alignment = { horizontal: 'center' };

      const headerRow = pfSheet.getRow(4);
      headerRow.values = [
        'S.No', 'Emp Code', 'Name', 'UAN', 'PF Wage', 
        'Employee PF', 'Employer EPF', 'Employer EPS', 'Total PF'
      ];
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4A5568' }
      };

      pfSheet.columns = [
        { key: 'sno', width: 8 },
        { key: 'empCode', width: 12 },
        { key: 'name', width: 25 },
        { key: 'uan', width: 15 },
        { key: 'pfWage', width: 12 },
        { key: 'empPF', width: 12 },
        { key: 'empEPF', width: 12 },
        { key: 'empEPS', width: 12 },
        { key: 'total', width: 12 }
      ];

      let rowNum = 5;
      salaryData.forEach((record, index) => {
        const earnings = record.earningsBreakdown || {};
        const deductions = record.deductionsBreakdown || {};
        const pfWage = parseFloat(earnings.basicSalary || 0) + parseFloat(earnings.da || 0);
        const employeePF = parseFloat(deductions.providentFund || 0);
        const employerPF = pfWage * 0.12;
        const eps = Math.min(pfWage * 0.0833, 1250);
        const epf = employerPF - eps;

        const row = pfSheet.getRow(rowNum);
        row.values = [
          index + 1,
          record.employee.employeeCode,
          `${record.employee.firstName} ${record.employee.lastName}`,
          record.employee.uanNumber || 'N/A',
          pfWage,
          employeePF,
          epf,
          eps,
          employeePF + employerPF
        ];

        for (let col = 5; col <= 9; col++) {
          row.getCell(col).numFmt = '₹#,##0.00';
        }

        if (index % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF7FAFC' }
          };
        }

        rowNum++;
      });
    }

    // ESI Sheet
    if (!reportType || reportType === 'esi') {
      const esiSheet = workbook.addWorksheet('ESI Report');
      
      esiSheet.mergeCells('A1:G1');
      esiSheet.getCell('A1').value = companyName;
      esiSheet.getCell('A1').font = { size: 14, bold: true };
      esiSheet.getCell('A1').alignment = { horizontal: 'center' };

      esiSheet.mergeCells('A2:G2');
      esiSheet.getCell('A2').value = `ESI Report - ${getMonthName(month)} ${year}`;
      esiSheet.getCell('A2').font = { size: 12 };
      esiSheet.getCell('A2').alignment = { horizontal: 'center' };

      const headerRow = esiSheet.getRow(4);
      headerRow.values = [
        'S.No', 'Emp Code', 'Name', 'ESI Number', 'Gross Pay', 
        'Employee ESI', 'Employer ESI', 'Total ESI'
      ];
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4A5568' }
      };

      esiSheet.columns = [
        { key: 'sno', width: 8 },
        { key: 'empCode', width: 12 },
        { key: 'name', width: 25 },
        { key: 'esiNum', width: 15 },
        { key: 'gross', width: 12 },
        { key: 'empESI', width: 12 },
        { key: 'empESIer', width: 12 },
        { key: 'total', width: 12 }
      ];

      let rowNum = 5;
      salaryData.forEach((record, index) => {
        const grossPay = parseFloat(record.grossPay);
        const deductions = record.deductionsBreakdown || {};
        const employeeESI = parseFloat(deductions.esi || 0);
        const employerESI = grossPay * 0.0325;

        const row = esiSheet.getRow(rowNum);
        row.values = [
          index + 1,
          record.employee.employeeCode,
          `${record.employee.firstName} ${record.employee.lastName}`,
          record.employee.esiNumber || 'N/A',
          grossPay,
          employeeESI,
          employerESI,
          employeeESI + employerESI
        ];

        for (let col = 5; col <= 8; col++) {
          row.getCell(col).numFmt = '₹#,##0.00';
        }

        if (index % 2 === 0) {
          row.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF7FAFC' }
          };
        }

        rowNum++;
      });
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=statutory-reports-${month}-${year}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Download statutory reports Excel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate Excel',
      error: error.message
    });
  }
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getMonthName(month) {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[parseInt(month) - 1];
}

module.exports = exports;
