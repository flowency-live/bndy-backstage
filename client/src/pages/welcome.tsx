import { useLocation } from "wouter";

export default function Welcome() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-torrist-green to-torrist-green-light">
      <div className="text-center animate-fade-in">
        {/* Vintage band logo recreation */}
        <div className="relative mb-8 p-8 bg-torrist-cream rounded-3xl vintage-shadow">
          <h1 className="text-6xl md:text-8xl font-serif text-torrist-orange mb-2">The</h1>
          <h1 className="text-6xl md:text-8xl font-serif text-torrist-orange-light">Torrists</h1>
          <div className="absolute -bottom-2 -right-2 w-16 h-16 bg-torrist-orange rounded-full opacity-80"></div>
          <div className="absolute -top-2 -left-2 w-12 h-12 bg-torrist-green-dark rounded-full opacity-60"></div>
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
