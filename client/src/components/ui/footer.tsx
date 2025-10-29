import BndyBadge from './bndy-badge';

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border py-2 flex-shrink-0" data-testid="footer">
      <div className="container mx-auto px-3">
        {/* Horizontal layout: Badge on left, copyright + strapline stacked on right */}
        <div className="flex items-center gap-4 md:gap-6">
          
          {/* Badge - double height */}
          <BndyBadge size="large" className="flex-shrink-0" />

          {/* Strapline and Copyright - vertically stacked, right-aligned */}
          <div className="flex flex-col text-right leading-tight flex-1 min-w-0">

            {/* Strapline - responsive layout */}
            <div className="text-sm mb-0.5">
              {/* Desktop: single line - force no wrap */}
              <div className="hidden md:block whitespace-nowrap" data-testid="strapline-desktop">
                <span className="text-foreground">Keeping </span>
                <span className="text-cyan-400 font-bold">LIVE</span>
                <span className="text-foreground"> Music </span>
                <span className="text-orange-500 font-bold">ALIVE</span>
              </div>

              {/* Mobile: K/M left-aligned, E's right-aligned, no gap */}
              <div className="block md:hidden font-bold" data-testid="strapline-mobile">
                <div className="grid grid-cols-[max-content_max-content] gap-x-0 items-center justify-end">
                  <span className="text-foreground text-left">Keeping</span>
                  <span className="text-cyan-400 text-right">LIVE</span>
                  <span className="text-foreground text-left">Music</span>
                  <span className="text-orange-500 text-right">ALIVE</span>
                </div>
              </div>
            </div>

            {/* Copyright */}
            <span className="text-muted-foreground text-sm" data-testid="copyright">
              © 2025 bndy
            </span>

          </div>

        </div>
      </div>
    </footer>
  );
};

export default Footer;