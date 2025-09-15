import BndyBadge from './bndy-badge';

const Footer = () => {
  return (
    <footer className="bg-slate-800 dark:bg-slate-900 border-t border-slate-700 py-6" data-testid="footer">
      <div className="container mx-auto px-4">
        {/* Horizontal layout: Badge on left, copyright + strapline stacked on right */}
        <div className="flex items-center gap-4 md:gap-6">
          
          {/* Badge - double height */}
          <BndyBadge size="large" className="flex-shrink-0" />

          {/* Copyright and Strapline - vertically stacked, left-aligned */}
          <div className="flex flex-col text-left leading-tight">
            
            {/* Copyright */}
            <span className="text-slate-400 text-sm mb-1" data-testid="copyright">
              © 2025 bndy
            </span>

            {/* Strapline - responsive layout */}
            <div className="text-sm">
              {/* Desktop: single line */}
              <div className="hidden sm:block" data-testid="strapline-desktop">
                <span className="text-white">Keeping </span>
                <span className="text-cyan-400 font-bold">LIVE</span>
                <span className="text-white"> Music </span>
                <span className="text-orange-500 font-bold">ALIVE</span>
              </div>
              
              {/* Mobile: two lines with perfect LIVE/ALIVE alignment */}
              <div className="block sm:hidden font-bold" data-testid="strapline-mobile">
                <div className="grid grid-cols-[max-content_max-content] gap-x-2 mb-0">
                  <span className="text-white">Keeping</span>
                  <span className="text-cyan-400">LIVE</span>
                </div>
                <div className="grid grid-cols-[max-content_max-content] gap-x-2">
                  <span className="text-white">Music</span>
                  <span className="text-orange-500">ALIVE</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;