import React, { useState, useEffect } from 'react';
import { Search, MapPin, Navigation, Signal, Loader2, Info } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import api from '../api';
import 'leaflet/dist/leaflet.css';

// Fix for default leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

function MapEvents({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    },
  });
  return null;
}

const Drivers = () => {
  const [drivers, setDrivers] = useState([]);
  const [nearbyDrivers, setNearbyDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [searchCenter, setSearchCenter] = useState([25.2048, 55.2708]);
  const [radius, setRadius] = useState(5000);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      const response = await api.get('/drivers');
      setDrivers(response.data.data.drivers);
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNearbySearch = async (coords) => {
    const lat = coords ? coords.lat : searchCenter[0];
    const lng = coords ? coords.lng : searchCenter[1];
    
    if (coords) setSearchCenter([lat, lng]);
    setIsSearching(true);

    try {
      const response = await api.get(`/drivers/nearby?lat=${lat}&lng=${lng}&radius_meters=${radius}`);
      setNearbyDrivers(response.data.data.drivers);
    } catch (error) {
      console.error('Error searching nearby:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const onDriverClick = (driver) => {
    if (driver.driver_location) {
      setSelectedDriver(driver);
      setSearchCenter([driver.driver_location.latitude, driver.driver_location.longitude]);
    }
  };

  return (
    <div className="drivers-page">
      <div className="page-sidebar">
        <div className="sidebar-content">
          <div className="driver-list-header">
            <h2>Drivers Management</h2>
            <span className="count-badge">{drivers.length}</span>
          </div>

          {loading ? (
            <div className="loading-state">
              <Loader2 className="spin" />
              <span>Syncing fleet data...</span>
            </div>
          ) : (
            drivers.map((driver) => (
              <div 
                key={driver.id} 
                className={`driver-card ${selectedDriver?.id === driver.id ? 'active' : ''}`}
                onClick={() => onDriverClick(driver)}
              >
                <div className="driver-info-top">
                  <span className="driver-name">{driver.name}</span>
                  <span className={`status-badge ${driver.is_online ? 'status-online' : 'status-offline'}`}>
                    {driver.is_online ? 'Online' : 'Offline'}
                  </span>
                </div>
                <div className="driver-details">
                  <div className="detail-item">
                    <Navigation size={14} /> {driver.phone}
                  </div>
                  <div className="detail-item">
                    <MapPin size={14} /> {driver.driver_location ? 'Live Position' : 'No Signal'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="map-view">
        <div className="nearby-search-overlay">
          <div className="search-bar glass">
            <div className="search-input-wrapper">
              <Search size={18} color="var(--text-muted)" />
              <input 
                type="text" 
                className="search-input" 
                placeholder="Click map to search nearby..." 
              />
            </div>
            <div className="radius-control">
              <span className="radius-label">{radius / 1000} km</span>
              <input 
                type="range" 
                className="radius-slider" 
                min="1000" 
                max="50000" 
                step="1000" 
                value={radius}
                onChange={(e) => setRadius(parseInt(e.target.value))}
                onMouseUp={() => handleNearbySearch()}
              />
            </div>
          </div>
        </div>

        <MapContainer 
          center={searchCenter} 
          zoom={13} 
          zoomControl={false}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; OpenStreetMap'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          <MapController center={searchCenter} zoom={selectedDriver ? 15 : 13} />
          <MapEvents onMapClick={handleNearbySearch} />

          <Circle 
            center={searchCenter} 
            radius={radius} 
            pathOptions={{ fillColor: 'var(--primary)', fillOpacity: 0.1, color: 'var(--primary)', weight: 1 }} 
          />

          {drivers.map(driver => driver.driver_location && (
            <Marker 
              key={driver.id} 
              position={[driver.driver_location.latitude, driver.driver_location.longitude]}
            >
              <Popup>
                <div className="map-popup">
                  <h3>{driver.name}</h3>
                  <p><strong>Phone:</strong> {driver.phone}</p>
                  <p><strong>Status:</strong> {driver.is_online ? 'Online' : 'Offline'}</p>
                  <button className="popup-btn">View Full Track</button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

export default Drivers;
