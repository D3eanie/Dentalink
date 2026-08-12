// components/sections/ServicesSection.tsx
import React from 'react';

const ServicesSection: React.FC = () => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const services = [
    {
      title: "Cosmetics Dentistry",
      description: "UpNorth are transformation dentist who can change people's lives.",
      image: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      gradient: "from-pink-100 to-rose-100"
    },
    {
      title: "Dental Implants",
      description: "There's a smile to gain with us. We have higher standard of dentistry.",
      image: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      gradient: "from-red-100 to-pink-100"
    },
    {
      title: "Dental Dentures",
      description: "Smile with confidence at affordable and amazing prices on dentures.",
      image: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80",
      gradient: "from-blue-100 to-cyan-100"
    }
  ];

  return (
    <section id="services" className="py-24 bg-gradient-to-br from-teal-500 via-teal-400 to-blue-500 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-32 bg-white" style={{clipPath: "polygon(0 0, 100% 0, 100% 70%, 0 100%)"}}></div>
        <div className="absolute bottom-0 right-0 w-full h-32 bg-white" style={{clipPath: "polygon(0 30%, 100% 0, 100% 100%, 0 100%)"}}></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">Our Services</h2>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">We offer wide range of services with advanced technology and expert care</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center mb-20">
          {/* Left Quote Section */}
          <div className="text-white">
            <div className="text-8xl text-white/20 mb-6 font-serif">"</div>
            <h3 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
              Fast, Simple<br />
              <span className="text-white/80 font-light">And Routine Procedures</span><br />
              to <span className="font-black">Maintain</span><br />
              <span className="font-black">Oral</span> <span className="text-white/60">Health</span>
            </h3>
            <div className="text-8xl text-white/20 text-right font-serif">"</div>
          </div>

          {/* Right Content */}
          <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
            <h4 className="text-3xl font-bold text-white mb-6">We Offer Wide Range of Services</h4>
            <p className="text-lg text-white/90 leading-relaxed mb-8">
              Here at UpNorth Dental Clinic, we give you quality and affordable 
              dental services. From the simplest up to the most complex dental 
              procedures, we got you covered. We have lots of promos too.
            </p>
            <button 
              onClick={() => scrollToSection('contact')} 
              className="px-8 py-4 bg-white text-teal-600 hover:bg-gray-100 rounded-xl font-semibold transition-all duration-300 shadow-lg"
            >
              Book Now
            </button>
          </div>
        </div>

        {/* Service Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div key={index} className="bg-white rounded-3xl shadow-2xl overflow-hidden hover:shadow-3xl transition-all duration-500 transform hover:-translate-y-2 group">
              <div className="relative h-64 overflow-hidden">
                <img 
                  src={service.image}
                  alt={service.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
              <div className="p-8">
                <h5 className="text-2xl font-bold text-gray-800 mb-4">{service.title}</h5>
                <p className="text-gray-600 leading-relaxed mb-6">{service.description}</p>
                <button className="text-teal-600 font-semibold hover:text-teal-700 transition-colors duration-200 flex items-center group">
                  Learn More 
                  <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;