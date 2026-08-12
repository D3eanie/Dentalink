// components/sections/ClientsSection.tsx
import React from 'react';

const ClientsSection: React.FC = () => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const clientImages = [
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80",
    "https://images.unsplash.com/photo-1600486913747-55e5470d6f40?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
  ];

  return (
    <section id="clients" className="py-24 bg-white relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-gradient-to-br from-teal-100/30 to-blue-100/30 rounded-full blur-3xl -translate-y-48 -translate-x-48"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-blue-100/30 to-teal-100/30 rounded-full blur-3xl translate-y-48 translate-x-48"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-6xl font-bold text-gray-800 mb-6">Our Clients</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">Welcome to the Extraordinary - See what our amazing clients have to say</p>
        </div>

        {/* Thank You Section */}
        <div className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-12 md:p-16 mb-20 shadow-xl border border-gray-100">
          <div className="text-center mb-12">
            <p className="text-teal-600 font-semibold mb-4 text-lg">Service with a smile</p>
            <h3 className="text-4xl md:text-5xl font-bold text-gray-800">Thank you for Believing in Us!</h3>
          </div>

          {/* Client Photos */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-16">
            {clientImages.map((src, index) => (
              <div key={index} className="aspect-square rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
                <img 
                  src={src}
                  alt="Happy Client"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                />
              </div>
            ))}
          </div>

          {/* Beautiful Smiles Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="order-2 lg:order-1">
              <div className="relative">
                <img 
                  src="https://images.unsplash.com/photo-1511895426328-dc8714191300?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
                  alt="Happy Family"
                  className="w-full rounded-3xl shadow-2xl"
                />
                <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-gradient-to-br from-teal-400 to-blue-500 rounded-full opacity-20"></div>
              </div>
            </div>
            <div className="order-1 lg:order-2 space-y-8">
              <div>
                <p className="text-teal-600 font-semibold mb-4 text-lg">Quality and Top-Notch Dental Experience</p>
                <h4 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6 leading-tight">
                  Where Beautiful Smiles Are Made
                </h4>
                <div className="w-20 h-1 bg-gradient-to-r from-teal-500 to-blue-500 rounded-full mb-8"></div>
              </div>
              
              <p className="text-lg text-gray-600 leading-relaxed">
                At UpNorth Dental Clinic, we are committed to providing comprehensive dental care to our patients. We specialize in a wide range of dental procedures, using state of the art technology to ensure your safety and comfort at all times.
              </p>
              
              <button 
                onClick={() => scrollToSection('contact')} 
                className="px-8 py-4 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Contact Us
              </button>
            </div>
          </div>
        </div>

        {/* Testimonials */}
        <div className="text-center max-w-4xl mx-auto">
          <h5 className="text-3xl font-bold text-gray-800 mb-16">What our Clients have to say</h5>
          <div className="bg-white rounded-3xl p-12 shadow-xl border border-gray-100">
            <div className="mb-8">
              <img 
                src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-4.0.3&auto=format&fit=crop&w=200&q=80" 
                alt="Sofia Smith"
                className="w-20 h-20 rounded-full mx-auto mb-6 object-cover shadow-lg"
              />
            </div>
            <blockquote className="text-xl text-gray-600 italic leading-relaxed mb-8 max-w-2xl mx-auto">
              "The staffs and dentist are SUPER kind and gentle on! Service! Been coming here for many years and always feel like part of the family!"
            </blockquote>
            <div>
              <p className="font-bold text-gray-800 text-lg">Sofia Smith</p>
              <p className="text-gray-500">Long-time Patient</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ClientsSection;