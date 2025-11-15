import L from 'leaflet';

const createMapPinSVG = (fillColor: string, faded = false) => {
  const opacity = faded ? 0.6 : 1.0;
  const dotColor = faded ? '#FFFFFF' : '#06B6D4';

  return `
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="29" viewBox="0 0 24 36">
      <path d="M12,0 C5.3,0 0,5.3 0,12 C0,20 12,36 12,36 C12,36 24,20 24,12 C24,5.3 18.6,0 12,0 Z"
        fill="${fillColor}"
        fill-opacity="${opacity}"
        stroke="#FFFFFF"
        stroke-width="1.5" />
      <circle cx="12" cy="12" r="3.5" fill="${dotColor}" fill-opacity="${opacity}" />
    </svg>
  `;
};

export const createManagedVenueIcon = () => L.divIcon({
  className: 'venue-marker-managed',
  html: createMapPinSVG('#FF1493', false),
  iconSize: [22, 29],
  iconAnchor: [11, 29],
  popupAnchor: [0, -27]
});

export const createUnmanagedVenueIcon = () => L.divIcon({
  className: 'venue-marker-unmanaged',
  html: createMapPinSVG('#6B7280', true),
  iconSize: [22, 29],
  iconAnchor: [11, 29],
  popupAnchor: [0, -27]
});

export const createClusterIcon = (count: number) => {
  const getClusterColor = (count: number) => {
    if (count < 10) return "#FF1493";
    if (count < 50) return "#E0115F";
    return "#C71585";
  };

  const html = `
    <div class="venue-cluster-icon" style="background-color: ${getClusterColor(count)};">${count}</div>
  `;

  return L.divIcon({
    html: html,
    className: 'leaflet-cluster-icon-container',
    iconSize: L.point(40, 40)
  });
};

export const createUserLocationIcon = () => L.divIcon({
  className: 'user-location-marker-container',
  html: `
    <div class="user-location-marker">
      <div class="user-location-pulse"></div>
      <div class="user-location-dot"></div>
    </div>
  `,
  iconSize: [1, 1],
  iconAnchor: [0, 0]
});
