// components/sections/ContactSection.tsx
import React from 'react';

const ContactSection: React.FC = () => {
  return (
    <section id="contact" className="py-24 bg-gradient-to-br from-slate-800 to-slate-900 text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-64 bg-white" style={{clipPath: "polygon(0 0, 100% 0, 100% 30%, 0 60%)"}}></div>
        <div className="absolute bottom-0 right-0 w-full h-64 bg-white" style={{clipPath: "polygon(0 70%, 100% 40%, 100% 100%, 0 100%)"}}></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center mb-20">
          {/* Contact Form */}
          <div className="bg-white rounded-3xl p-8 md:p-12 text-gray-800 shadow-2xl">
            <div className="mb-8">
              <h3 className="text-3xl font-bold text-gray-800 mb-4">Get In Touch</h3>
              <p className="text-gray-600">Ready to schedule your appointment? Fill out the form below.</p>
            </div>
            
            <form className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <input 
                  type="text" 
                  placeholder="First Name"
                  className="w-full px-4 py-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
                <input 
                  type="text" 
                  placeholder="Last Name"
                  className="w-full px-4 py-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                />
              </div>
              <input 
                type="tel" 
                placeholder="Phone Number"
                className="w-full px-4 py-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              />
              <input 
                type="email" 
                placeholder="Email Address"
                className="w-full px-4 py-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              />
              <textarea 
                placeholder="How can we help you?"
                rows={5}
                className="w-full px-4 py-4 bg-gray-50 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none transition-all"
              ></textarea>
              <button 
                type="submit"
                className="w-full px-8 py-4 bg-gradient-to-r from-teal-600 to-blue-600 hover:from-teal-700 hover:to-blue-700 text-white rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Send Message
              </button>
            </form>
          </div>

          {/* Contact Info */}
          <div className="space-y-12">
            <div>
              <p className="text-teal-400 font-semibold mb-4 text-lg">Call us, Write us, Knock on our Door</p>
              <h3 className="text-5xl md:text-6xl font-bold leading-tight">We Would be Happy to Meet You</h3>
            </div>
            
            <p className="text-xl text-gray-300 leading-relaxed">
              We are ready to help to book you in or with any questions 
              you may have about seeing our dentist.
            </p>

            {/* Hours */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
              <h4 className="text-2xl font-bold mb-6">Office Hours</h4>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 text-lg">Sunday:</span>
                  <span className="text-white font-semibold">Closed</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300 text-lg">Monday - Saturday:</span>
                  <span className="text-white font-semibold">10:30am - 3:00pm</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Cards and Clinic Photo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Phone Card */}
          <div className="bg-white rounded-2xl p-8 text-center text-gray-800 shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
            </div>
            <h6 className="text-xl font-bold mb-3">Give us a Call</h6>
            <p className="text-gray-600 text-lg font-semibold">09271247780</p>
          </div>

          {/* Email Card */}
          <div className="bg-white rounded-2xl p-8 text-center text-gray-800 shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
              </svg>
            </div>
            <h6 className="text-xl font-bold mb-3">Write to Us</h6>
            <p className="text-gray-600 font-semibold">support@urbansmiles.com.p</p>
          </div>

          {/* Clinic Photo */}
          <div className="bg-white rounded-2xl p-4 shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <img 
              src="https://images.unsplash.com/photo-1551601651-2a8555f1a136?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80" 
              alt="Our Clinic"
              className="w-full h-40 object-cover rounded-xl mb-4"
            />
            <p className="text-center text-gray-600 font-semibold">Visit Our Clinic</p>
            <p className="text-center text-gray-500 text-sm mt-1">Modern facilities & equipment</p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;