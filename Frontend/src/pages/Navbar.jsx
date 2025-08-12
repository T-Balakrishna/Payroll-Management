import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <nav className="bg-blue-700 text-white shadow-md px-6 py-4 flex justify-between items-center">
        {/* <Link to="/" className="text-xl font-bold">Employee Management System</Link> */}

        {/* Desktop Links */}
        <div className="hidden md:flex gap-6 items-center">
          {/* <Link to="/" className="hover:text-gray-200">Home</Link>
          <Link to="/about" className="hover:text-gray-200">About</Link>
          <Link to="/tracks" className="hover:text-gray-200">Tracks</Link>
          <Link to="/schedule" className="hover:text-gray-200">Schedule</Link>
          <Link to="/speakers" className="hover:text-gray-200">Speakers</Link>    
          <Link to="/login">
            <button className="bg-white text-blue-700 px-4 py-1 rounded-md font-semibold hover:bg-gray-100">
              Login
            </button>
          </Link> */}
        </div>

        {/* Hamburger Icon */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="md:hidden text-3xl focus:outline-none"
        >
          ☰
        </button>
      </nav>

      {/* Sidebar (Mobile) */}
      <div
        className={`fixed top-0 right-0 h-full w-64 bg-blue-800 text-white transform transition-transform duration-300 ease-in-out z-50 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex justify-end p-4">
          <button onClick={() => setIsOpen(false)} className="text-2xl">×</button>
        </div>
        <div className="flex flex-col gap-4 p-6">
          
          {/* <Link to="/" onClick={() => setIsOpen(false)} className="hover:text-gray-200">Home</Link>
          <Link to="/about" onClick={() => setIsOpen(false)} className="hover:text-gray-200">About</Link>
          <Link to="/tracks" onClick={() => setIsOpen(false)} className="hover:text-gray-200">Tracks</Link>
          <Link to="/schedule" onClick={() => setIsOpen(false)} className="hover:text-gray-200">Schedule</Link>
          <Link to="/speakers" onClick={() => setIsOpen(false)} className="hover:text-gray-200">Speakers</Link>
          <Link to="/register" onClick={() => setIsOpen(false)} className="hover:text-gray-200">Register</Link>
          <Link to="/login" onClick={() => setIsOpen(false)}>
            <button className="bg-white text-blue-700 px-4 py-1 rounded-md font-semibold hover:bg-gray-100 w-full">
              Login
            </button>
          </Link> */}
        </div>
      </div>

      {/* Overlay to close sidebar */}
      {isOpen && (
        <div
          className="fixed inset-0 backdrop-blur z-40"
          onClick={() => setIsOpen(false)}
        ></div>
      )}
    </>
  );
};

export default Navbar;
