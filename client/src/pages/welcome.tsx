import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useUser } from "@/lib/user-context";
import type { BandMember } from "@shared/schema";
import torristsLogoPath from "@assets/Screenshot_20250803_113321_WhatsApp_1754250527535.jpg";

export default function Welcome() {
  const [, setLocation] = useLocation();
  const { setCurrentUser } = useUser();
  const [showPersonaSelection, setShowPersonaSelection] = useState(false);

  const { data: bandMembers, isLoading } = useQuery<BandMember[]>({
    queryKey: ["/api/band-members"],
    enabled: showPersonaSelection, // Only fetch when needed
  });

  const selectPersona = (member: BandMember) => {
    setCurrentUser(member);
    setLocation("/calendar");
  };

  if (showPersonaSelection) {
    if (isLoading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-torrist-green to-torrist-green-light p-4 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white font-sans">Loading band members...</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-torrist-green to-torrist-green-light p-4 flex flex-col items-center justify-center">
        <div className="text-center animate-fade-in">
          {/* Keep the large band logo */}
          <div className="mb-8">
            <img 
              src={torristsLogoPath} 
              alt="The Torrists Band Logo" 
              className="w-72 h-72 md:w-80 md:h-80 object-cover rounded-2xl shadow-2xl mx-auto"
            />
          </div>
          
          <h2 className="text-2xl md:text-3xl font-sans text-white mb-2 opacity-90">Who's checking in?</h2>
          <p className="text-white opacity-70 font-sans mb-8">Select your band member profile</p>

          {/* Wider user boxes in 2 columns */}
          <div className="grid grid-cols-2 gap-4 mb-8 max-w-md mx-auto">
            {bandMembers?.map((member) => (
              <div 
                key={member.id}
                className="bg-white/90 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105"
                onClick={() => selectPersona(member)}
              >
                <div className="text-center">
                  <div 
                    className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center"
                    style={{ backgroundColor: member.color }}
                  >
                    <i className={`fas ${member.icon} text-white text-xl`}></i>
                  </div>
                  <h3 className="text-lg font-sans font-semibold text-torrist-green mb-1">{member.name}</h3>
                  <p className="text-sm text-gray-600">{member.role}</p>
                  <div className="mt-3 flex justify-center">
                    <div 
                      className="w-4 h-4 rounded-full border border-white shadow-sm"
                      style={{ backgroundColor: member.color }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button 
              onClick={() => setLocation("/admin")}
              className="text-white hover:text-gray-200 font-sans underline text-sm mb-4"
            >
              Admin: Manage Band Members
            </button>
            <br />
            <button 
              onClick={() => setShowPersonaSelection(false)}
              className="text-white/80 hover:text-white font-sans text-sm"
            >
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-torrist-green to-torrist-green-light">
      <div className="text-center animate-fade-in">
        {/* Actual band logo */}
        <div className="mb-8">
          <img 
            src={torristsLogoPath} 
            alt="The Torrists Band Logo" 
            className="w-72 h-72 md:w-80 md:h-80 object-cover rounded-2xl shadow-2xl mx-auto"
          />
        </div>
        
        <h2 className="text-2xl md:text-3xl font-sans text-white mb-8 opacity-90">Band Calendar & Schedule</h2>
        
        <button 
          onClick={() => setShowPersonaSelection(true)}
          className="bg-torrist-orange hover:bg-torrist-orange-light text-white px-8 py-4 rounded-full text-xl font-sans font-semibold transform transition-all duration-300 hover:scale-105 vintage-shadow"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
