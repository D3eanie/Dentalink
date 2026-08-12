// components/layout/Header.tsx
import React, { useState, useEffect } from 'react';

const Header: React.FC = () => {
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll events for header changes
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMobileMenu = () => {
    setShowMobileMenu(!showMobileMenu);
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setShowMobileMenu(false);
  };

  return (
    <header className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-xl py-3' : 'bg-white/95 backdrop-blur-sm py-4'}`}>
      <div className="container mx-auto px-4 flex justify-between items-center">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-white from-teal-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
             <img src="logo-removebg.png" alt="Logo" className="w-15 h-15 object-contain" />
          </div>
          <div>
            <span className="text-2xl font-bold text-gray-800">Up North</span>
            <p className="text-xs text-gray-500 font-medium">Dental Clinic</p>
          </div>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex space-x-8">
          <button onClick={() => scrollToSection('about')} className="text-gray-600 hover:text-teal-600 transition-colors duration-200 font-medium">About Us</button>
          <button onClick={() => scrollToSection('services')} className="text-gray-600 hover:text-teal-600 transition-colors duration-200 font-medium">Services</button>
          <button onClick={() => scrollToSection('clients')} className="text-gray-600 hover:text-teal-600 transition-colors duration-200 font-medium">Clients</button>
          <button onClick={() => scrollToSection('contact')} className="text-gray-600 hover:text-teal-600 transition-colors duration-200 font-medium">Contact Us</button>
        </nav>
        
        {/* Login Button */}
        <div className="hidden md:block">
          <a 
            href="/login" 
            className="px-6 py-2.5 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-lg hover:from-teal-700 hover:to-blue-700 transition-all duration-200 font-medium shadow-lg"
          >
            Login
          </a>
        </div>
        
        {/* Mobile Menu Button */}
        <button 
          className="md:hidden text-gray-600 p-2"
          onClick={toggleMobileMenu}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={showMobileMenu ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}></path>
          </svg>
        </button>
      </div>
      
      {/* Mobile Menu */}
      <div className={`md:hidden absolute w-full bg-white shadow-xl transition-all duration-300 ease-in-out overflow-hidden ${showMobileMenu ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <nav className="flex flex-col space-y-1 px-6 py-4">
          <button onClick={() => scrollToSection('about')} className="text-gray-600 hover:text-teal-600 hover:bg-gray-50 transition-colors duration-200 py-3 text-left rounded-lg px-3">About Us</button>
          <button onClick={() => scrollToSection('services')} className="text-gray-600 hover:text-teal-600 hover:bg-gray-50 transition-colors duration-200 py-3 text-left rounded-lg px-3">Services</button>
          <button onClick={() => scrollToSection('clients')} className="text-gray-600 hover:text-teal-600 hover:bg-gray-50 transition-colors duration-200 py-3 text-left rounded-lg px-3">Clients</button>
          <button onClick={() => scrollToSection('contact')} className="text-gray-600 hover:text-teal-600 hover:bg-gray-50 transition-colors duration-200 py-3 text-left rounded-lg px-3">Contact Us</button>
          <a href="/login" className="mt-3 px-4 py-3 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-lg hover:from-teal-700 hover:to-blue-700 transition-all duration-200 text-center font-medium">
            Login
          </a>
        </nav>
      </div>
    </header>
  );
};

export default Header;