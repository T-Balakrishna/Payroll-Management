const nodemailer = require('nodemailer');
const { Op } = require('sequelize');
const Employee = require('../models/Employee');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }

});

const sendEmail = async (to, subject, text) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Email sending failed:', error);
  }
};

const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

const autoEmailService = async () => {
  const today = getTodayDate();

  // Fetch all employees
  const employees = await Employee.findAll({
    where: { status: 'active' }
  });

  // Group employees by event type and date
  const birthdays = [];
  const workAnniversaries = [];
  const marriageAnniversaries = [];
  const attendanceIssues = [];

  employees.forEach(employee => {
    const dob = employee.DOB?.toISOString().split('T')[0];
    const doj = employee.DOJ?.toISOString().split('T')[0];
    const weddingDate = employee.weddingDate?.toISOString().split('T')[0];

    if (dob && dob.split('-')[1] + '-' + dob.split('-')[2] === today.split('-')[1] + '-' + today.split('-')[2]) {
      birthdays.push(employee);
    }
    if (doj && doj.split('-')[0] + '-' + doj.split('-')[1] === today.split('-')[0] + '-' + today.split('-')[1]) {
      workAnniversaries.push(employee);
    }
    if (weddingDate && weddingDate.split('-')[1] + '-' + weddingDate.split('-')[2] === today.split('-')[1] + '-' + today.split('-')[2]) {
      marriageAnniversaries.push(employee);
    }
    // Assuming attendance status is calculated in processAttendance and stored elsewhere
    const attendanceStatus = 'Absent'; // Replace with actual logic to get attendance
    if (attendanceStatus !== 'Present') {
      attendanceIssues.push(employee);
    }
  });

  // Send emails for attendance issues
  attendanceIssues.forEach(employee => {
    sendEmail(employee.employeeMail, 'Attendance Notification', 
      `Dear ${employee.firstName},\nYour attendance status for today is ${attendanceStatus}. Please check with HR.`);
  });

  // Send emails for birthdays
  if (birthdays.length > 0) {
    birthdays.forEach(employee => {
      sendEmail(employee.employeeMail, 'Happy Birthday!', 
        `Dear ${employee.firstName},\nWishing you a very happy birthday!`);
    });
  }

  // Send emails for work anniversaries
  if (workAnniversaries.length > 0) {
    const groupedByDate = workAnniversaries.reduce((acc, emp) => {
      const key = emp.DOJ.toISOString().split('T')[0];
      if (!acc[key]) acc[key] = [];
      acc[key].push(emp);
      return acc;
    }, {});

    Object.values(groupedByDate).forEach(group => {
      if (group.length === 1) {
        sendEmail(group[0].employeeMail, 'Work Anniversary Celebration!', 
          `Dear ${group[0].firstName},\nCongratulations on completing ${new Date().getFullYear() - new Date(group[0].DOJ).getFullYear()} years with us!`);
      } else {
        group.forEach(emp => {
          sendEmail(emp.employeeMail, 'Work Anniversary Celebration!', 
            `Dear ${emp.firstName},\nCongratulations on completing ${new Date().getFullYear() - new Date(emp.DOJ).getFullYear()} years with us!`);
        });
        const others = group.slice(1).map(emp => emp.firstName).join(', ');
        sendEmail(group[0].employeeMail, 'Team Work Anniversary!', 
          `Dear ${group[0].firstName},\nYou and ${others} celebrate your work anniversary today! Congratulations!`);
      }
    });
  }

  // Send emails for marriage anniversaries
  if (marriageAnniversaries.length > 0) {
    const groupedByDate = marriageAnniversaries.reduce((acc, emp) => {
      const key = emp.weddingDate.toISOString().split('T')[0];
      if (!acc[key]) acc[key] = [];
      acc[key].push(emp);
      return acc;
    }, {});

    Object.values(groupedByDate).forEach(group => {
      if (group.length === 1) {
        sendEmail(group[0].employeeMail, 'Happy Marriage Anniversary!', 
          `Dear ${group[0].firstName},\nWishing you a happy marriage anniversary!`);
      } else {
        group.forEach(emp => {
          sendEmail(emp.employeeMail, 'Happy Marriage Anniversary!', 
            `Dear ${emp.firstName},\nWishing you a happy marriage anniversary!`);
        });
        const others = group.slice(1).map(emp => emp.firstName).join(', ');
        sendEmail(group[0].employeeMail, 'Team Marriage Anniversary!', 
          `Dear ${group[0].firstName},\nYou and ${others} celebrate your marriage anniversary today! Congratulations!`);
      }
    });
  }
};

module.exports = autoEmailService;