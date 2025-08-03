import { useLocation } from "wouter";
import torristsLogoPath from "@assets/Screenshot_20250803_113321_WhatsApp_1754250527535.jpg";

export default function Welcome() {
  const [, setLocation] = useLocation();

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
          onClick={() => setLocation("/personas")}
          className="bg-torrist-orange hover:bg-torrist-orange-light text-white px-8 py-4 rounded-full text-xl font-sans font-semibold transform transition-all duration-300 hover:scale-105 vintage-shadow"
        >
          Get Started
        </button>
      </div>
    </div>
  );
}
