import { useLocation } from "wouter";
import { useUser } from "@/lib/user-context";

export default function PersonaSelection() {
  const [, setLocation] = useLocation();
  const { userProfile, selectBand, isLoading } = useUser();

  const selectPersona = (bandId: string) => {
    selectBand(bandId);
    setLocation("/calendar");
  };

  const getIconClass = (icon: string) => {
    return `fas ${icon} text-white text-2xl`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white font-sans">Loading bands...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 p-4 flex flex-col">
      <div className="max-w-2xl mx-auto flex-1 flex flex-col justify-center">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-serif text-white mb-2">Which band are you here for?</h2>
          <p className="text-slate-400 font-sans">Select your band to continue</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-6">
          {userProfile?.bands?.map((membership) => (
            <div 
              key={membership.id}
              className="bg-white rounded-xl p-4 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:scale-105"
              onClick={() => selectPersona(membership.bandId)}
            >
              <div className="text-center">
                <div 
                  className="w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center"
                  style={{ backgroundColor: membership.color }}
                >
                  <i className={`fas ${membership.icon} text-white text-lg`}></i>
                </div>
                <h3 className="text-lg font-sans font-semibold text-brand-primary mb-1">{membership.band.name}</h3>
                <p className="text-sm text-gray-600">{membership.displayName} • {membership.role}</p>
                <div className="mt-2 flex justify-center">
                  <div 
                    className="w-4 h-4 rounded-full border border-white shadow-sm"
                    style={{ backgroundColor: membership.color }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center">
          <button 
            onClick={() => setLocation("/onboarding")}
            className="text-slate-400 hover:text-white font-sans underline text-sm"
          >
            Create New Band
          </button>
        </div>
      </div>
    </div>
  );
}
