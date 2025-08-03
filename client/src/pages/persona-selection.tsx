import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useUser } from "@/lib/user-context";
import type { BandMember } from "@shared/schema";

export default function PersonaSelection() {
  const [, setLocation] = useLocation();
  const { setCurrentUser } = useUser();

  const { data: bandMembers, isLoading } = useQuery<BandMember[]>({
    queryKey: ["/api/band-members"],
  });

  const selectPersona = (member: BandMember) => {
    setCurrentUser(member);
    setLocation("/calendar");
  };

  const getIconClass = (icon: string) => {
    return `fas ${icon} text-white text-2xl`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-torrist-cream to-torrist-cream-light p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-torrist-green mx-auto mb-4"></div>
          <p className="text-torrist-green font-sans">Loading band members...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-torrist-cream to-torrist-cream-light p-4">
      <div className="max-w-4xl mx-auto pt-8">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-serif text-torrist-green mb-4">Who's checking in?</h2>
          <p className="text-lg text-gray-600 font-sans">Select your band member profile</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {bandMembers?.map((member) => (
            <div 
              key={member.id}
              className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105"
              onClick={() => selectPersona(member)}
            >
              <div className="text-center">
                <div 
                  className="w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center"
                  style={{ backgroundColor: member.color }}
                >
                  <i className={getIconClass(member.icon)}></i>
                </div>
                <h3 className="text-xl font-sans font-semibold text-torrist-green mb-2">{member.name}</h3>
                <p className="text-gray-600">{member.role}</p>
                <div className="mt-4 flex justify-center">
                  <div 
                    className="w-6 h-6 rounded-full border-2 border-white shadow-md"
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
            className="text-torrist-green hover:text-torrist-green-dark font-sans underline"
          >
            Admin: Manage Band Members
          </button>
        </div>
      </div>
    </div>
  );
}
