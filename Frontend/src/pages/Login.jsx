import React from 'react'
import axios from 'axios'
import { useState } from 'react'
import EmployeeModal from '/employeeModal';

function Login() {
  const [open, setOpen] = useState(false);
  
  return (
    <>
      <button onClick={() => setOpen(true)}>Add Employee</button>
      <EmployeeModal show={open} onClose={() => setOpen(false)} />
    </>
  )
}

export default Login


