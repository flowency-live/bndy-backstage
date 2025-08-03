import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useUser } from "@/lib/user-context";
import type { BandMember } from "@shared/schema";
import torristsLogoPath from "@assets/Screenshot_20250803_113321_WhatsApp_1754250527535.jpg";

export default function Welcome() {
  const [, setLocation] = useLocation();
  const { setCurrentUser } = useUser();

  const { data: bandMembers, isLoading } = useQuery<BandMember[]>({
    queryKey: ["/api/band-members"],
  });

  const selectPersona = (member: BandMember) => {
    setCurrentUser(member);
    setLocation("/calendar");
  };

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
        {/* Band logo */}
        <div className="mb-8">
          <img 
            src={torristsLogoPath} 
            alt="The Torrists Band Logo" 
            className="w-72 h-72 md:w-80 md:h-80 object-cover rounded-2xl shadow-2xl mx-auto"
          />
        </div>
        
        {/* User selection boxes - 2x2 grid with shorter height */}
        <div className="grid grid-cols-2 gap-3 mb-8 max-w-lg mx-auto">
          {bandMembers?.map((member) => (
            <div 
              key={member.id}
              className="bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105"
              onClick={() => selectPersona(member)}
            >
              <div className="text-center">
                <div 
                  className="w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center"
                  style={{ backgroundColor: member.color }}
                >
                  <i className={`fas ${member.icon} text-white text-lg`}></i>
                </div>
                <h3 className="text-base font-sans font-semibold text-torrist-green mb-1">{member.name}</h3>
                <p className="text-xs text-gray-600">{member.role}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button 
            onClick={() => setLocation("/admin")}
            className="text-white hover:text-gray-200 font-sans underline text-sm"
          >
            Admin: Manage Band Members
          </button>
        </div>
      </div>
    </div>
  );
}
