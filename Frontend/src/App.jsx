import { useState } from 'react'
import './App.css'
import Login from './components/Login'
import Register from './components/Register'
import Navbar from './components/Navbar'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
    <Navbar/>
      <Login/>
      <Register/>

    </>
  )
}

export default App
