import { useEffect, useState } from 'react';

export default function ChargingCentersList({ onSelectCenter }) {
  const [centers, setCenters] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [distances, setDistances] = useState({});

  useEffect(() => {
    const chargingCenters = [
      { id: 1, name: 'Superchargeur Tunis', lat: 36.8065, lng: 10.1815, address: 'Les Berges du Lac, Tunis' },
      { id: 2, name: 'Superchargeur Sousse', lat: 35.8256, lng: 10.6369, address: 'Mall of Sousse' },
      { id: 3, name: 'Superchargeur Sfax', lat: 34.7406, lng: 10.7603, address: 'Route de Tunis, Sfax' },
      { id: 4, name: 'Superchargeur Mahdia', lat: 35.5047, lng: 11.0622, address: 'Zone Touristique, Mahdia' },
      { id: 5, name: 'Superchargeur Monastir', lat: 35.7833, lng: 10.8333, address: 'Aéroport Monastir' },
      { id: 6, name: 'Superchargeur Gabès', lat: 33.8815, lng: 10.0982, address: 'Centre Ville, Gabès' }
    ];
    setCenters(chargingCenters);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Erreur de géolocalisation:', error);
          setUserLocation({ lat: 36.8065, lng: 10.1815 });
        }
      );
    } else {
      setUserLocation({ lat: 36.8065, lng: 10.1815 });
    }
  }, []);

  useEffect(() => {
    if (userLocation && centers.length > 0) {
      const newDistances = {};
      centers.forEach(center => {
        newDistances[center.id] = calculateDistance(userLocation.lat, userLocation.lng, center.lat, center.lng);
      });
      setDistances(newDistances);
    }
  }, [userLocation, centers]);

  function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    return distance.toFixed(1);
  }

  return (
    <div className="glass-panel" style={{ width: '100%', maxWidth: '600px', height: '70vh', padding: '30px' }}>
      <h2 style={{ marginBottom: "5px" }}>Superchargeurs</h2>
      <p style={{ textAlign: "center", color: "var(--text-secondary)", marginBottom: "20px", fontSize: "0.9rem" }}>
        Sélectionnez la station la plus proche
      </p>

      <div style={{ 
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        paddingRight: '10px'
      }}>
        {centers.map(center => (
          <div
            key={center.id}
            style={{
              border: '1px solid var(--input-border)',
              borderRadius: '12px',
              padding: '16px',
              cursor: 'pointer',
              backgroundColor: 'var(--input-bg)',
              transition: 'all 0.3s ease',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
            onClick={() => onSelectCenter(center)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--input-bg)';
              e.currentTarget.style.borderColor = 'var(--input-border)';
              e.currentTarget.style.transform = 'none';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: '0', fontSize: '1.1rem', fontWeight: '500', color: 'var(--text-primary)' }}>
                {center.name}
              </h3>
              {distances[center.id] && (
                <span style={{ 
                  backgroundColor: 'rgba(232, 33, 39, 0.15)',
                  color: 'var(--accent-red)',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}>
                  {distances[center.id]} km
                </span>
              )}
            </div>
            <p style={{ margin: '0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {center.address}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}