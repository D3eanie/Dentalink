// components/layout/Footer.tsx
import React from 'react';

const Footer: React.FC = () => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Logo Column */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg">
                   <img src="logo-removebg.png" alt="Logo" className="w-15 h-15 object-contain" />
              </div>
              <div>
                <span className="text-2xl font-bold">UpNorth</span>
                <p className="text-gray-400 text-sm">Dental Clinic</p>
              </div>
            </div>
            <p className="text-gray-400 mb-6 max-w-md">
              Providing exceptional dental care with state-of-the-art technology and compassionate service. Your smile is our priority.
            </p>
            <p className="text-gray-500 text-sm">
              Copyright © 2025. All rights reserved.
            </p>
            <div className="flex space-x-4 mt-6">
              {['facebook', 'twitter', 'linkedin', 'instagram'].map((social) => (
                <a key={social} href="#" className="w-10 h-10 bg-gray-800 hover:bg-teal-600 rounded-full flex items-center justify-center transition-colors duration-200">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/>
                  </svg>
                </a>
              ))}
            </div>
          </div>
          
          {/* Quick Links */}
          <div>
            <h4 className="text-xl font-bold mb-6">Quick Links</h4>
            <ul className="space-y-3">
              <li><button onClick={() => scrollToSection('about')} className="text-gray-400 hover:text-white transition-colors duration-200">About us</button></li>
              <li><button onClick={() => scrollToSection('services')} className="text-gray-400 hover:text-white transition-colors duration-200">Services</button></li>
              <li><button onClick={() => scrollToSection('team')} className="text-gray-400 hover:text-white transition-colors duration-200">Our Team</button></li>
              <li><button onClick={() => scrollToSection('contact')} className="text-gray-400 hover:text-white transition-colors duration-200">Contact</button></li>
            </ul>
          </div>
          
          {/* Services */}
          <div>
            <h4 className="text-xl font-bold mb-6">Services</h4>
            <ul className="space-y-3 text-gray-400">
              <li className="hover:text-white transition-colors duration-200 cursor-pointer">Cosmetics Dentistry</li>
              <li className="hover:text-white transition-colors duration-200 cursor-pointer">Dental Implants</li>
              <li className="hover:text-white transition-colors duration-200 cursor-pointer">Dental Dentures</li>
              <li className="hover:text-white transition-colors duration-200 cursor-pointer">Emergency Care</li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;