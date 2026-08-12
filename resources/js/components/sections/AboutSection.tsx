// components/sections/AboutSection.tsx
import React from 'react';

const AboutSection: React.FC = () => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="about" className="py-24 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-teal-100/50 to-blue-100/50 rounded-full blur-3xl -translate-y-48 translate-x-48"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-blue-100/50 to-teal-100/50 rounded-full blur-3xl translate-y-48 -translate-x-48"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          {/* Left Image */}
          <div className="relative order-2 lg:order-1">
            <div className="relative">
              {/* Main image container */}
              <div className="relative w-full max-w-lg mx-auto">
                {/* Decorative elements */}
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-teal-400 rounded-full opacity-20"></div>
                <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-blue-400 rounded-full opacity-15"></div>
                <div className="absolute top-1/2 -right-12 w-16 h-16 bg-gradient-to-br from-teal-400 to-blue-500 rounded-full opacity-25"></div>
                
                {/* Main image */}
                <div className="relative bg-white rounded-3xl p-4 shadow-2xl">
                  <img 
                    src="https://images.unsplash.com/photo-1609840114035-3c981b782dfe?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                    alt="Professional dental care service"
                    className="w-full h-80 object-cover rounded-2xl"
                  />
                </div>
                
                {/* Floating badge */}
                <div className="absolute -bottom-6 left-8 bg-white rounded-2xl p-4 shadow-xl border border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-blue-600 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-bold text-gray-800">Quality Care</p>
                      <p className="text-sm text-gray-500">Certified & Trusted</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Right Content */}
          <div className="space-y-8 order-1 lg:order-2">
            <div>
              <h2 className="text-5xl md:text-6xl font-bold text-gray-800 mb-6 leading-tight">
                Where <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-blue-600">Quality</span> Meets<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-blue-600">Affordability</span>
              </h2>
              
              <div className="w-24 h-1 bg-gradient-to-r from-teal-500 to-blue-500 rounded-full mb-8"></div>
            </div>
            
            <div className="space-y-6">
              <p className="text-lg text-gray-600 leading-relaxed">
                At UpNorth Dental Clinic, we are dedicated to providing top-quality, comprehensive, 
                and personalized dental care. Our mission is to promote excellent and healthy dental 
                outcomes through advanced technology, expert care, and modern solutions.
              </p>
              
              <p className="text-lg text-gray-600 leading-relaxed">
                We aim to create a comfortable and welcoming environment where every patient feels valued 
                and cared for. Through advanced technology, expert care, and patient education, we 
                aim to make every dental experience positive and stress-free.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={() => scrollToSection('team')} 
                className="px-8 py-4 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Meet Our Team
              </button>
              <button 
                onClick={() => scrollToSection('services')} 
                className="px-8 py-4 border-2 border-gray-300 hover:border-teal-500 text-gray-700 hover:text-teal-600 rounded-xl font-semibold transition-all duration-300"
              >
                Our Services
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;