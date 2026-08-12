// components/sections/TeamSection.tsx
import React from 'react';

const TeamSection: React.FC = () => {
  const teamMembers = [
    {
      name: "Dr. Jonathan M. Bagtilay",
      role: "Owner/Dentist",
      color: "blue",
      description: "Leading dental expert with 15+ years experience"
    },
    {
      name: "Mrs. Bagtilay",
      role: "Dental Assistant",
      color: "green",
      description: "Certified assistant specializing in patient care"
    }
  ];

  return (
    <section id="team" className="py-24 bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-20">
          <h3 className="text-teal-600 font-semibold mb-4 text-lg">Meet Our Amazing Team</h3>
          <h2 className="text-5xl md:text-6xl font-bold text-gray-800 mb-6">The Faces Behind Our Success</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">We couldn't do it without them - Our dedicated professionals</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {teamMembers.map((member, index) => (
            <div key={index} className="bg-white rounded-3xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2 border border-gray-100">
              <div className={`w-24 h-24 bg-${member.color}-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg`}>
                <svg className={`w-12 h-12 text-${member.color}-600`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="text-center">
                <h4 className="text-xl font-bold text-gray-800 mb-2">{member.role}</h4>
                <p className="text-lg text-gray-600 mb-4">{member.name}</p>
                <p className="text-sm text-gray-500">{member.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TeamSection;