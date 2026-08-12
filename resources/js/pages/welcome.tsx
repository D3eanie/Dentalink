// components/welcome.tsx
import React from 'react';
import Header from '../components/layouts/Header';
import Footer from '../components/layouts/Footer';
import HeroSection from '../components/sections/HeroSection';
import AboutSection from '../components/sections/AboutSection';
import ServicesSection from '../components/sections/ServicesSection';
import ClientsSection from '../components/sections/ClientsSection';
import TeamSection from '../components/sections/TeamSection';
import ContactSection from '../components/sections/ContactSection';

const Welcome: React.FC = () => {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-800">
      <Header />
      <HeroSection />
      <AboutSection />
      <ServicesSection />
      <ClientsSection />
      <TeamSection />
      <ContactSection />
      <Footer />
    </div>
  );
};

export default Welcome;