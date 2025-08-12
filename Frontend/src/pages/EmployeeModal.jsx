// import React, { useState, useEffect } from 'react';
// import axios from 'axios';
// import './EmployeeModal.css';


// const EmployeeModal = ({ show, onClose }) => {
//   const [formData, setFormData] = useState({
//     empId: '',
//     empName: '',
//     gender: '',
//     maritalStatus: '',
//     dob: '',
//     address: '',
//     location: '',
//     phone: '',
//     photo: null,
//     bloodGrp: '',
//     doj: '',
//     depyId: '',
//     desgId: '',
//     weeklyOff: '',
//     religion: '',
//     caste: '',
//     empType: '',
//     salaryTypeId: '',
//     shiftTypeId: '',
//     refPersonId: '',
//     qualification: '',
//     experience: '',
//     pfNumber: '',
//     pfNominee: '',
//     esiNumber: '',
//     bankId: '',
//     busNumber: '',
//   });

//   const handleChange = (e) => {
//     const { name, value, files } = e.target;
//     if (name === 'photo') {
//       setFormData({ ...formData, [name]: files[0] });
//     } else {
//       setFormData({ ...formData, [name]: value });
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();

//     // const fd = new FormData();
//     // for (const key in formData) {
//     //   fd.append(key, formData[key]);
//     // }

//     try {
//       // for (let pair of fd.entries()) {
//       //     console.log(`${pair[0]}: ${pair[1]}`);
//       //   }
//       console.log(formData)
//       await axios.post('http://localhost:5000/api/employee', formData, {
//         headers: { 'Content-Type': 'application/json' },
//       });
//       alert('Employee added!');
//       onClose();
//     } catch (err) {
//       console.error(err);
//       alert('Error adding employee');
//     }
//   };

//   const getEmployees = async () =>{
//       try{
//         const res = await axios.get('http://localhost:5000/api/employee')
//         console.log(res.data)
//       }
//       catch(e){
//         alert("Error in Request of Getting EMployees " + e.message)
//       }
//   }

//   if (!show) return null;

//   return (
//     <>
//     <div className="modal-backdrop">
//       <div className="modal-box">
//         <button onClick={onClose} className="close-btn">X</button>
//         <h2>Add New Employee</h2>
//         <form onSubmit={handleSubmit}>
//           <input
//             type="text"
//             name="empId"
//             value={formData.empId || ''}
//             onChange={(e) => setFormData({ ...formData, empId: e.target.value })}
//           />
//           <input name="empName" placeholder="Employee Name" onChange={handleChange} />
//           <select name="gender" onChange={handleChange}>
//             <option value="">Select Gender</option>
//             <option value="Male">Male</option>
//             <option value="Female">Female</option>
//           </select>
//           <select name="maritalStatus" onChange={handleChange}>
//             <option value="">Marital Status</option>
//             <option value="Single">Single</option>
//             <option value="Married">Married</option>
//           </select>
//           <input name="dob" type="date" onChange={handleChange} />
//           <input name="doj" type="date" onChange={handleChange} />
//           <input name="address" placeholder="Address" onChange={handleChange} />
//           <input name="location" placeholder="Location" onChange={handleChange} />
//           <input name="phone" placeholder="Phone" onChange={handleChange} />
//           {/* <input name="photo" type="file" accept="image/*" onChange={handleChange} /> */}
//           <input name="bloodGrp" placeholder="Blood Group" onChange={handleChange} />
//           <input name="weeklyOff" placeholder="Weekly Off" onChange={handleChange} />
//           <select name="religion" onChange={handleChange}>
//             <option value="">Select Religion</option>
//             <option value="Hindu">Hindu</option>
//             <option value="Muslim">Muslim</option>
//             <option value="Christian">Christian</option>
//             <option value="Other">Other</option>
//           </select>
//           <input name="caste" placeholder="Caste" onChange={handleChange} />
//           <input name="qualification" placeholder="Qualification" onChange={handleChange} />
//           <input name="experience" placeholder="Experience" onChange={handleChange} />
//           <input name="pfNumber" placeholder="PF Number" onChange={handleChange} />
//           <input name="pfNominee" placeholder="PF Nominee" onChange={handleChange} />
//           <input name="esiNumber" placeholder="ESI Number" onChange={handleChange} />
//           <input name="depyId" placeholder="Department ID" onChange={handleChange} />
//           <input name="desgId" placeholder="Designation ID" onChange={handleChange} />
//           <input name="empType" placeholder="Employee Type ID" onChange={handleChange} />
//           <input name="salaryTypeId" placeholder="Salary Type ID" onChange={handleChange} />
//           <input name="shiftTypeId" placeholder="Shift Type ID" onChange={handleChange} />
//           <input name="refPersonId" placeholder="Ref Person ID" onChange={handleChange} />
//           <input name="bankId" placeholder="Bank ID" onChange={handleChange} />
          

//           <button type="submit">Submit</button>
//           <button type='button' onClick={getEmployees}>Get Employees</button>
//         </form>
//       </div>
//     </div>
// </>
// );
// };

// export default EmployeeModal;

import React, { useState } from 'react';
import axios from 'axios';

const EmployeeModal = ({ show, onClose }) => {
  const [formData, setFormData] = useState({
    empId: '',
    empName: '',
    gender: '',
    maritalStatus: '',
    dob: '',
    address: '',
    location: '',
    phone: '',
    photo: null,
    bloodGrp: '',
    doj: '',
    depyId: '',
    desgId: '',
    weeklyOff: '',
    religion: '',
    caste: '',
    empType: '',
    salaryTypeId: '',
    shiftTypeId: '',
    refPersonId: '',
    qualification: '',
    experience: '',
    pfNumber: '',
    pfNominee: '',
    esiNumber: '',
    bankId: '',
    busNumber: '',
  });

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'photo') {
      setFormData({ ...formData, [name]: files[0] });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log(formData);
      await axios.post('http://localhost:5000/api/employee', formData, {
        headers: { 'Content-Type': 'application/json' },
      });
      alert('Employee added!');
      onClose();
    } catch (err) {
      console.error(err);
      alert('Error adding employee');
    }
  };

  const getEmployees = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/employee');
      console.log(res.data);
    } catch (e) {
      alert('Error in Request of Getting Employees ' + e.message);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg w-full max-w-3xl p-6 overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold">Add New Employee</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-red-500 text-xl font-bold"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input type="text" name="empId" value={formData.empId} onChange={handleChange} placeholder="Employee ID" className="input" required/>
            <input name="empName" placeholder="Employee Name" onChange={handleChange} className="input" required/>
            <select name="gender" onChange={handleChange} className="input">
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
            <select name="maritalStatus" onChange={handleChange} className="input">
              <option value="">Marital Status</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
            </select>
            <input name="dob" type="date" onChange={handleChange} className="input" />
            <input name="doj" type="date" onChange={handleChange} className="input" />
            <input name="address" placeholder="Address" onChange={handleChange} className="input" />
            <input name="location" placeholder="Location" onChange={handleChange} className="input" />
            <input name="phone" placeholder="Phone" onChange={handleChange} className="input" />
            <input name="bloodGrp" placeholder="Blood Group" onChange={handleChange} className="input" />
            <input name="weeklyOff" placeholder="Weekly Off" onChange={handleChange} className="input" />
            <select name="religion" onChange={handleChange} className="input">
              <option value="">Select Religion</option>
              <option value="Hindu">Hindu</option>
              <option value="Muslim">Muslim</option>
              <option value="Christian">Christian</option>
              <option value="Other">Other</option>
            </select>
            <input name="caste" placeholder="Caste" onChange={handleChange} className="input" />
            <input name="qualification" placeholder="Qualification" onChange={handleChange} className="input" />
            <input name="experience" placeholder="Experience" onChange={handleChange} className="input" />
            <input name="pfNumber" placeholder="PF Number" onChange={handleChange} className="input" />
            <input name="pfNominee" placeholder="PF Nominee" onChange={handleChange} className="input" />
            <input name="esiNumber" placeholder="ESI Number" onChange={handleChange} className="input" />
            <input name="depyId" placeholder="Department ID" onChange={handleChange} className="input" />
            <input name="desgId" placeholder="Designation ID" onChange={handleChange} className="input" />
            <input name="empType" placeholder="Employee Type ID" onChange={handleChange} className="input" />
            <input name="salaryTypeId" placeholder="Salary Type ID" onChange={handleChange} className="input" />
            <input name="shiftTypeId" placeholder="Shift Type ID" onChange={handleChange} className="input" />
            <input name="refPersonId" placeholder="Ref Person ID" onChange={handleChange} className="input" />
            <input name="bankId" placeholder="Bank ID" onChange={handleChange} className="input" />
          </div>

          <div className="flex gap-4 justify-end mt-4">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={getEmployees}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
            >
              Get Employees
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EmployeeModal;
