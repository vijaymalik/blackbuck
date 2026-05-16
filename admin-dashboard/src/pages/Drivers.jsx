import React, { useState, useEffect } from 'react';
import { 
  Search, MapPin, Navigation, Signal, Loader2, Info, Map as MapIcon, 
  List, Eye, MoreVertical, Plus, Edit, Trash2, X, ChevronLeft, ChevronRight, 
  Filter, Clock, Truck, LocateFixed, Layers, RefreshCw 
} from 'lucide-react';
import { 
  MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents, 
  ZoomControl, LayersControl 
} from 'react-leaflet';
const { BaseLayer } = LayersControl;
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

const searchCenterIcon = new L.Icon({
  iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
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
  const [viewMode, setViewMode] = useState('map');
  const [drivers, setDrivers] = useState([]);
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0, per_page: 10 });
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [searchCenter, setSearchCenter] = useState([28.6139, 77.2090]); // Delhi (Reference Point)
  const [mapFocus, setMapFocus] = useState([28.6139, 77.2090]); // Current Map View focus
  const [radius, setRadius] = useState(5000); // meters
  const [loading, setLoading] = useState(true);
  
  const [driverSearchQuery, setDriverSearchQuery] = useState('');
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionTimeout, setSuggestionTimeout] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [capacityFilter, setCapacityFilter] = useState('');
  const [selectedAddress, setSelectedAddress] = useState('New Delhi, India');
  const [driverAddress, setDriverAddress] = useState('');

  // Reverse geocoding for searchCenter changes
  useEffect(() => {
    const reverseGeocode = async () => {
      try {
        const [lat, lon] = searchCenter;
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
        const data = await response.json();
        if (data.display_name) {
          setSelectedAddress(data.display_name);
          // Also update the input if it's not a manual search (optional but helpful)
          // setLocationSearchQuery(data.display_name);
        }
      } catch (err) {
        console.error("Reverse geocoding failed:", err);
      }
    };
    reverseGeocode();
  }, [searchCenter]);

  // CRUD States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentDriver, setCurrentDriver] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', truck_type: '', truck_number: '', truck_capacity: '' });

  useEffect(() => {
    fetchDrivers(pagination.current_page, pagination.per_page);
    
    // Auto-detect current location on first load
    if (navigator.geolocation && searchCenter[0] === 28.6139) { // Only auto-locate if default
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = [position.coords.latitude, position.coords.longitude];
          setSearchCenter(loc);
          setMapFocus(loc);
        },
        (error) => {
          console.error("Error detecting location:", error);
        }
      );
    }
  }, [pagination.current_page, pagination.per_page, statusFilter, capacityFilter]);

  useEffect(() => {
    // Only poll if modal is closed
    const interval = setInterval(() => {
      if (!isModalOpen) {
        fetchDrivers(pagination.current_page, pagination.per_page, true);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [pagination.current_page, pagination.per_page, statusFilter, capacityFilter, isModalOpen]);

  const fetchDrivers = async (page = 1, perPage = 10, silent = false) => {
    try {
      if (!silent) setLoading(true);
      const response = await api.get(`/drivers?page=${page}&per_page=${perPage}&status=${statusFilter}&capacity=${capacityFilter}`);
      setDrivers(response.data.data.drivers);
      setPagination({
        current_page: response.data.meta?.pagination?.current_page || 1,
        last_page: response.data.meta?.pagination?.last_page || 1,
        total: response.data.meta?.pagination?.total || 0,
        per_page: perPage
      });
    } catch (error) {
      console.error('Error fetching drivers:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleLocationInputChange = (e) => {
    const val = e.target.value;
    setLocationSearchQuery(val);
    
    if (suggestionTimeout) clearTimeout(suggestionTimeout);
    
    if (val.length > 2) {
      setSuggestionTimeout(setTimeout(async () => {
        setIsLocating(true);
        try {
          const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${val}&limit=5`);
          const data = await response.json();
          setLocationSuggestions(data);
          setShowSuggestions(true);
        } catch (err) {
          console.error('Location search failed:', err);
        } finally {
          setIsLocating(false);
        }
      }, 500));
    } else {
      setLocationSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (place) => {
    const latlng = [parseFloat(place.lat), parseFloat(place.lon)];
    setLocationSearchQuery(place.display_name);
    setSearchCenter(latlng);
    setMapFocus(latlng);
    setShowSuggestions(false);
    setLocationSuggestions([]);
  };

  const locateUser = () => {
    if (navigator.geolocation) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLoc = [parseFloat(position.coords.latitude), parseFloat(position.coords.longitude)];
          setSearchCenter(newLoc);
          setMapFocus(newLoc);
          setIsLocating(false);
        },
        (error) => {
          console.error("Error detecting location:", error);
          setIsLocating(false);
          if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            alert("Browser location requires HTTPS. Please search for your location manually in the search box.");
          } else {
            alert("Could not detect your location. Please ensure location services are enabled.");
          }
        }
      );
    } else {
      alert("Your browser does not support geolocation.");
    }
  };

  const handleLocationSearch = async (e) => {
    if (e.key === 'Enter' && locationSearchQuery) {
      if (locationSuggestions.length > 0) {
        selectSuggestion(locationSuggestions[0]);
      }
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const l1 = parseFloat(lat1);
    const n1 = parseFloat(lon1);
    const l2 = parseFloat(lat2);
    const n2 = parseFloat(lon2);
    
    const dLat = (l2 - l1) * Math.PI / 180;
    const dLon = (n2 - n1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(l1 * Math.PI / 180) * Math.cos(l2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const filteredDrivers = drivers.filter(d => {
    if (statusFilter !== 'all') {
      if (statusFilter === 'online' && !d.is_online) return false;
      if (statusFilter === 'offline' && d.is_online) return false;
    }
    if (driverSearchQuery) {
      const query = driverSearchQuery.toLowerCase();
      if (!d.name.toLowerCase().includes(query) && !d.phone.includes(query)) return false;
    }
    return true;
  }).map(d => {
    let dist = Infinity;
    if (d.driver_location) {
      dist = calculateDistance(searchCenter[0], searchCenter[1], d.driver_location.latitude, d.driver_location.longitude);
    }
    return { ...d, calculated_distance: dist };
  }).filter(d => {
    if (viewMode === 'map' && d.calculated_distance !== Infinity) {
      return d.calculated_distance <= radius / 1000;
    }
    return true;
  }).sort((a, b) => a.calculated_distance - b.calculated_distance);

  const resetFilters = () => {
    setDriverSearchQuery('');
    setStatusFilter('all');
    setCapacityFilter('');
    setRadius(5000);
    setLocationSearchQuery('');
  };

  const onDriverClick = async (driver) => {
    if (driver.driver_location) {
      setSelectedDriver(driver);
      const driverPos = [
        parseFloat(driver.driver_location.latitude), 
        parseFloat(driver.driver_location.longitude)
      ];
      setMapFocus(driverPos);
      setDriverAddress('Fetching address...');
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${driverPos[0]}&lon=${driverPos[1]}`);
        const data = await response.json();
        setDriverAddress(data.display_name || 'Address not found');
      } catch (err) {
        console.error("Geocoding error:", err);
        setDriverAddress('Could not fetch address');
      }
      setViewMode('map');
    }
  };

  const onDriverRowClick = (driver) => {
    if (driver.driver_location) {
      onDriverClick(driver);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this driver?')) {
      try {
        await api.delete(`/users/${id}`);
        fetchDrivers(pagination.current_page, pagination.per_page);
      } catch (error) {
        alert('Error deleting driver');
      }
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      if (currentDriver) {
        await api.put(`/users/${currentDriver.id}`, formData);
      } else {
        await api.post('/users', { ...formData, role: 'driver' });
      }
      setIsModalOpen(false);
      fetchDrivers(pagination.current_page, pagination.per_page);
    } catch (error) {
      alert('Error saving driver: ' + (error.response?.data?.message || error.message));
    }
  };

  const openEditModal = (driver = null) => {
    if (driver) {
      setCurrentDriver(driver);
      setFormData({
        name: driver.name,
        email: driver.email,
        phone: driver.phone || '',
        truck_type: driver.driver_profile?.truck_type || '',
        truck_number: driver.driver_profile?.truck_number || '',
        truck_capacity: driver.driver_profile?.truck_capacity || '',
        password: '' // Keep empty for edits
      });
    } else {
      setCurrentDriver(null);
      setFormData({ name: '', email: '', phone: '', password: '', truck_type: '', truck_number: '', truck_capacity: '' });
    }
    setIsModalOpen(true);
  };

  return (
    <div className="drivers-container" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* PROFESSIONAL DASHBOARD HEADER */}
      <div className="page-header" style={{ padding: '16px 24px' }}>
         <div>
            <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: '700', letterSpacing: '-0.02em' }}>Fleet Monitoring</h1>
            <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>Real-time driver tracking and management</p>
         </div>
         <div className="header-actions" style={{ display: 'flex', gap: '16px' }}>
            <div className="glass" style={{ padding: '4px', borderRadius: '14px', display: 'flex', background: 'rgba(255,255,255,0.05)' }}>
               <button onClick={() => setViewMode('map')} style={{ ...viewToggleStyle, ...(viewMode === 'map' ? activeToggleStyle : {}) }}>
                  <MapIcon size={18} /> Map View
               </button>
               <button onClick={() => setViewMode('table')} style={{ ...viewToggleStyle, ...(viewMode === 'table' ? activeToggleStyle : {}) }}>
                  <List size={18} /> Table View
               </button>
            </div>
            <button 
               onClick={() => openEditModal()} 
               style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  padding: '0 20px', 
                  height: '46px', 
                  borderRadius: '12px',
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  fontWeight: '600',
                  cursor: 'pointer'
               }}
            >
               <Plus size={20} /> Register Driver
            </button>
         </div>
      </div>

      {viewMode === 'map' ? (
        <div className="drivers-page" style={{ flex: 1, padding: '0 12px 12px', gap: '12px', minHeight: 0 }}>
          {/* MAP SIDEBAR */}
          <aside className="glass page-sidebar" style={{ borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', border: '1px solid rgba(255,255,255,0.05)' }}>
             <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                   <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>Search Range</h3>
                   <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: '600', background: 'rgba(59, 130, 246, 0.1)', padding: '4px 10px', borderRadius: '8px' }}>
                      {radius / 1000} km
                   </span>
                </div>
                <input type="range" min="1000" max="200000" step="1000" value={radius} onChange={(e) => setRadius(parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)', height: '6px', borderRadius: '3px' }} />
             </div>

             <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                <h4 style={{ padding: '12px 12px 8px', margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nearby Drivers</h4>
                {filteredDrivers.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Search size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
                    <p style={{ fontSize: '0.9rem' }}>No drivers found in this area</p>
                  </div>
                ) : (
                  filteredDrivers.map(d => (
                    <div key={d.id} onClick={() => onDriverClick(d)} className={`driver-card ${selectedDriver?.id === d.id ? 'active' : ''}`} style={{ padding: '16px', borderRadius: '16px', cursor: 'pointer', marginBottom: '8px', transition: 'all 0.2s', border: '1px solid transparent', background: selectedDriver?.id === d.id ? 'rgba(59, 130, 246, 0.08)' : 'transparent' }}>
                       <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                          <div style={{ position: 'relative' }}>
                             <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: '700', color: 'var(--primary)' }}>
                                {d.name.charAt(0)}
                             </div>
                             <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '14px', height: '14px', borderRadius: '50%', background: d.is_online ? '#22c55e' : '#94a3b8', border: '3px solid #0f172a' }}></div>
                          </div>
                          <div style={{ flex: 1 }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <strong style={{ fontSize: '0.95rem' }}>{d.name}</strong>
                                <span style={{ fontSize: '0.8rem', color: 'var(--primary)', fontWeight: '600' }}>
                                   {d.calculated_distance !== Infinity && d.calculated_distance !== null 
                                      ? d.calculated_distance.toFixed(1) + ' km' 
                                      : 'No GPS'}
                                </span>
                             </div>
                             <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                                {d.driver_profile?.truck_type} • {d.driver_profile?.truck_number}
                             </div>
                          </div>
                       </div>
                    </div>
                  ))
                )}
             </div>
          </aside>

          {/* INTERACTIVE MAP CONTAINER */}
          <div className="map-view" style={{ position: 'relative', borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
             <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 1000 }}>
                <div className="glass" style={{ ...searchBoxStyle, width: '300px', background: 'var(--card-bg)' }}>
                   <MapPin size={16} color="var(--primary)" />
                   <input type="text" placeholder="Search Place..." value={locationSearchQuery} onChange={handleLocationInputChange} onKeyDown={handleLocationSearch} style={searchInputStyle} />
                   {isLocating && <Loader2 className="spin" size={16} color="var(--primary)" />}
                </div>
                {showSuggestions && locationSuggestions.length > 0 && (
                  <div className="glass" style={{ width: '300px', background: 'var(--card-bg)', marginTop: '8px', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}>
                    {locationSuggestions.map((place, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => selectSuggestion(place)}
                        style={{ padding: '12px 16px', cursor: 'pointer', borderBottom: idx !== locationSuggestions.length - 1 ? '1px solid var(--border)' : 'none', fontSize: '0.85rem', color: 'var(--text-main)', display: 'flex', alignItems: 'flex-start', gap: '8px' }}
                        className="table-row-hover"
                      >
                        <MapPin size={14} color="var(--text-muted)" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <span>{place.display_name}</span>
                      </div>
                    ))}
                  </div>
                )}
             </div>

             <div style={{ position: 'absolute', bottom: '100px', right: '12px', zIndex: 1000 }}>
                <button 
                  onClick={locateUser}
                  className="glass"
                  style={{ 
                    width: '44px', 
                    height: '44px', 
                    borderRadius: '12px', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    cursor: 'pointer',
                    background: '#fff', // White background like gmaps
                    border: '1px solid rgba(0,0,0,0.1)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    color: '#334155'
                  }}
                  title="My Location"
                >
                  {isLocating ? <Loader2 size={22} className="spin" /> : <LocateFixed size={22} color="var(--primary)" />}
                </button>
             </div>

             <MapContainer center={mapFocus} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false}>
                <LayersControl position="topright">
                  <BaseLayer checked name="Street View">
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  </BaseLayer>
                  <BaseLayer name="Satellite View">
                    <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                  </BaseLayer>
                </LayersControl>
                
                <ZoomControl position="bottomright" />
                <MapController center={mapFocus} zoom={selectedDriver ? 15 : 13} />
                <MapEvents onMapClick={(latlng) => { 
                   setSearchCenter([latlng.lat, latlng.lng]); 
                   setMapFocus([latlng.lat, latlng.lng]);
                }} />
                <Circle center={searchCenter} radius={radius} pathOptions={{ fillColor: 'var(--primary)', fillOpacity: 0.1, color: 'var(--primary)', weight: 1 }} />
                <Marker position={searchCenter} icon={searchCenterIcon}>
                  <Popup>
                    <div style={{ padding: '8px', minWidth: '150px' }}>
                      <strong style={{ display: 'block', marginBottom: '4px', color: 'var(--primary)' }}>Search Origin</strong>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.4' }}>
                        {selectedAddress}
                      </div>
                    </div>
                  </Popup>
                </Marker>
                
                {filteredDrivers.map(d => d.driver_location && (
                  <Marker 
                    key={d.id} 
                    position={[d.driver_location.latitude, d.driver_location.longitude]}
                    eventHandlers={{
                      click: () => onDriverClick(d),
                    }}
                  >
                    <Popup closeButton={false}>
                      <div style={{ padding: '4px', minWidth: '200px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                           <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.is_online ? '#22c55e' : '#94a3b8' }}></div>
                           <strong style={{ fontSize: '1rem' }}>{d.name}</strong>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Truck size={14} />
                              <span>{d.driver_profile?.truck_type} ({d.driver_profile?.truck_number})</span>
                           </div>
                           <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '4px', borderTop: '1px solid var(--border)', paddingTop: '6px' }}>
                              <MapPin size={14} style={{ marginTop: '2px' }} />
                              <span style={{ color: 'var(--text-main)', lineHeight: '1.4' }}>
                                 {d.id === selectedDriver?.id ? driverAddress : 'Click to see address'}
                              </span>
                           </div>
                           <div style={{ fontSize: '0.7rem', fontStyle: 'italic', marginTop: '4px' }}>
                              Last updated: {new Date(d.driver_location.recorded_at).toLocaleTimeString()}
                           </div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
             </MapContainer>
          </div>
        </div>
      ) : (
        /* PROFESSIONAL TABLE VIEW WITH RESTORED PAGINATION & CRUD */
        <div style={{ padding: '0 32px 32px', flex: 1, overflowY: 'auto' }}>
            <div className="glass" style={{ borderRadius: '24px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column' }}>
               <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600', marginBottom: '4px' }}>Driver Directory</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                     <MapPin size={14} color="var(--primary)" />
                     <span>Showing results near <strong style={{ color: 'var(--text-main)' }}>{selectedAddress}</strong> ({radius / 1000} km range)</span>
                  </div>
               </div>
               <div className="table-filter-bar" style={{ padding: '20px', display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', background: 'var(--border)' }}>
                 <div className="glass" style={{ ...searchBoxStyle, width: '100%', maxWidth: '300px' }}>
                    <Search size={16} color="rgba(255,255,255,0.4)" />
                    <input type="text" placeholder="Filter list..." value={driverSearchQuery} onChange={e => setDriverSearchQuery(e.target.value)} style={searchInputStyle} />
                 </div>
                 <div className="filter-actions" style={{ marginLeft: 'auto', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <select value={capacityFilter} onChange={e => setCapacityFilter(e.target.value)} style={selectStyle}>
                       <option value="" style={{ background: 'var(--bg-sidebar)' }}>All Capacities</option>
                       <option value="5" style={{ background: 'var(--bg-sidebar)' }}>5+ Tons</option>
                       <option value="10" style={{ background: 'var(--bg-sidebar)' }}>10+ Tons</option>
                       <option value="20" style={{ background: 'var(--bg-sidebar)' }}>20+ Tons</option>
                       <option value="40" style={{ background: 'var(--bg-sidebar)' }}>40+ Tons</option>
                    </select>
                    <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={selectStyle}>
                       <option value="all" style={{ background: 'var(--bg-sidebar)' }}>All Status</option>
                       <option value="online" style={{ background: 'var(--bg-sidebar)' }}>Online Only</option>
                       <option value="offline" style={{ background: 'var(--bg-sidebar)' }}>Offline Only</option>
                    </select>
                     <button 
                        onClick={resetFilters} 
                        style={{ 
                          height: '38px',
                          padding: '0 16px',
                          borderRadius: '10px',
                          background: 'rgba(239, 68, 68, 0.1)', 
                          color: '#ef4444', 
                          border: '1px solid rgba(239, 68, 68, 0.2)',
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          fontSize: '0.85rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        className="btn-hover-danger"
                     >
                        <RefreshCw size={14} /> 
                        <span>Reset</span>
                     </button>
                    <select value={pagination.per_page} onChange={(e) => setPagination(p => ({ ...p, per_page: parseInt(e.target.value), current_page: 1 }))} style={selectStyle}>
                       <option value="10" style={{ background: 'var(--bg-sidebar)' }}>10 / pg</option>
                       <option value="25" style={{ background: 'var(--bg-sidebar)' }}>25 / pg</option>
                       <option value="50" style={{ background: 'var(--bg-sidebar)' }}>50 / pg</option>
                    </select>
                 </div>
              </div>
              
              <div className="table-container" style={{ overflowX: 'auto', flex: 1 }}>
                <table className="drivers-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                   <thead>
                      <tr style={{ textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                         <th style={{ padding: '16px 24px' }}>Driver Info</th>
                         <th style={{ padding: '16px 24px' }}>Vehicle</th>
                         <th style={{ padding: '16px 24px' }}>Location</th>
                         <th style={{ padding: '16px 24px' }}>Distance</th>
                         <th style={{ padding: '16px 24px' }}>Status</th>
                         <th style={{ padding: '16px 24px' }}>Last Seen</th>
                         <th style={{ padding: '16px 24px', textAlign: 'right' }}>Actions</th>
                      </tr>
                   </thead>
                   <tbody>
                      {loading ? (
                         <tr><td colSpan="6" style={{ padding: '60px', textAlign: 'center' }}><Loader2 className="spin" size={32} color="var(--primary)" /></td></tr>
                      ) : filteredDrivers.map(d => (
                         <tr key={d.id} className="table-row-hover" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                            <td style={{ padding: '16px 24px' }}>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                  <div className="user-avatar" style={{ width: '36px', height: '36px', background: 'var(--primary)', fontWeight: 'bold' }}>{d.name.charAt(0)}</div>
                                  <div>
                                     <p style={{ fontWeight: '600', margin: 0 }}>{d.name}</p>
                                     <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: 0 }}>{d.phone}</p>
                                  </div>
                               </div>
                            </td>
                            <td style={{ padding: '16px 24px' }}>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <Truck size={16} color="rgba(255,255,255,0.4)" />
                                  <div>
                                     <p style={{ margin: 0, fontSize: '0.85rem' }}>{d.driver_profile?.truck_type || 'General'}</p>
                                     <span style={{ fontSize: '0.7rem', background: 'var(--border)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)', marginRight: '4px' }}>{d.driver_profile?.truck_number || 'N/A'}</span>
                                     <span style={{ fontSize: '0.7rem', background: 'var(--primary)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-main)' }}>{d.driver_profile?.truck_capacity ? d.driver_profile.truck_capacity + 'T' : 'N/A'}</span>
                                  </div>
                               </div>
                            </td>
                             <td style={{ padding: '16px 24px', fontSize: '0.85rem' }}>
                                {d.driver_location ? (
                                   <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                         {Number(d.driver_location.latitude).toFixed(4)}, {Number(d.driver_location.longitude).toFixed(4)}
                                      </span>
                                      <button 
                                         onClick={() => onDriverClick(d)} 
                                         style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: 0, fontSize: '0.75rem', textAlign: 'left', textDecoration: 'underline' }}
                                      >
                                         View on Map
                                      </button>
                                   </div>
                                ) : 'N/A'}
                             </td>
                             <td style={{ padding: '16px 24px', fontSize: '0.85rem' }}>
                                {d.calculated_distance !== Infinity && d.calculated_distance !== null ? (
                                   <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{d.calculated_distance.toFixed(1)} km</span>
                                ) : (
                                   <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: '6px' }}>No GPS Yet</span>
                                )}
                             </td>
                            <td style={{ padding: '16px 24px' }}>
                               <span className={`status-badge ${d.is_online ? 'status-online' : 'status-offline'}`}>
                                  {d.is_online ? 'Live Now' : 'Offline'}
                               </span>
                            </td>
                            <td style={{ padding: '16px 24px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Clock size={14} />
                                  {d.driver_location ? new Date(d.driver_location.recorded_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'}
                               </div>
                            </td>
                            <td style={{ padding: '16px 24px' }}>
                               <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                  <button onClick={() => onDriverClick(d)} style={actionBtnStyle} title="View on Map"><MapIcon size={16} color="var(--primary)" /></button>
                                  <button onClick={() => openEditModal(d)} style={actionBtnStyle} title="Edit Driver"><Edit size={16} color="#eab308" /></button>
                                  <button onClick={() => handleDelete(d.id)} style={actionBtnStyle} title="Delete Driver"><Trash2 size={16} color="#ef4444" /></button>
                               </div>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
              </div>
              
              {/* RESTORED PAGINATION */}
              <div style={{ padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Showing {filteredDrivers.length} of {pagination.total} entries</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button style={pageBtnStyle} disabled={pagination.current_page === 1} onClick={() => setPagination(p => ({ ...p, current_page: p.current_page - 1 }))}>
                    <ChevronLeft size={18} />
                  </button>
                  <button style={pageBtnStyle} disabled={pagination.current_page === pagination.last_page} onClick={() => setPagination(p => ({ ...p, current_page: p.current_page + 1 }))}>
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* RESTORED CRUD MODAL */}
      {isModalOpen && (
        <div style={modalOverlayStyle}>
          <div className="glass" style={modalCardStyle}>
            <button onClick={() => setIsModalOpen(false)} style={closeBtnStyle}><X size={20} /></button>
            <h2 style={{ margin: '0 0 24px 0', fontSize: '1.5rem', color: 'var(--text-main)' }}>{currentDriver ? 'Edit Driver' : 'Register Driver'}</h2>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
               <div>
                  <label style={labelStyle}>Full Name</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} style={inputStyle} placeholder="John Doe" required />
               </div>
               <div style={{ display: 'flex', gap: '16px' }}>
                  <div style={{ flex: 1 }}>
                     <label style={labelStyle}>Email Address</label>
                     <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} style={inputStyle} placeholder="john@example.com" required />
                  </div>
                  <div style={{ flex: 1 }}>
                     <label style={labelStyle}>Phone Number</label>
                     <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} style={inputStyle} placeholder="+91..." required />
                  </div>
               </div>
               {!currentDriver && (
                 <div>
                    <label style={labelStyle}>Initial Password</label>
                    <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} style={inputStyle} placeholder="••••••••" required />
                 </div>
               )}
               <div style={{ display: 'flex', gap: '16px', marginTop: '8px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                  <div style={{ flex: 1 }}>
                     <label style={labelStyle}>Vehicle Type</label>
                     <input type="text" value={formData.truck_type} onChange={e => setFormData({...formData, truck_type: e.target.value})} style={inputStyle} placeholder="Heavy Duty, Mini Van..." />
                  </div>
                  <div style={{ flex: 1 }}>
                     <label style={labelStyle}>Plate Number</label>
                     <input type="text" value={formData.truck_number} onChange={e => setFormData({...formData, truck_number: e.target.value})} style={inputStyle} placeholder="DL 01 AB 1234" />
                  </div>
                  <div style={{ flex: 1 }}>
                     <label style={labelStyle}>Capacity (Tons)</label>
                     <input type="text" value={formData.truck_capacity} onChange={e => setFormData({...formData, truck_capacity: e.target.value})} style={inputStyle} placeholder="e.g., 5 Tons" />
                  </div>
               </div>
               <button 
                  type="submit" 
                  style={{ 
                     marginTop: '20px', 
                     padding: '14px', 
                     fontSize: '1rem',
                     background: 'var(--primary)',
                     color: 'white',
                     border: 'none',
                     borderRadius: '12px',
                     fontWeight: '600',
                     cursor: 'pointer'
                  }}
               >
                  {currentDriver ? 'Update Details' : 'Save Driver'}
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Styles
const searchBoxStyle = { display: 'flex', alignItems: 'center', padding: '6px 12px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' };
const searchInputStyle = { background: 'transparent', border: 'none', color: 'var(--text-main)', padding: '6px 10px', outline: 'none', width: '100%', fontSize: '0.85rem' };
const viewBtnStyle = (active) => ({ padding: '8px 12px', borderRadius: '8px', border: 'none', background: active ? 'var(--primary)' : 'transparent', color: active ? 'white' : 'rgba(255,255,255,0.4)', cursor: 'pointer' });
const miniCardStyle = (active) => ({ padding: '12px', borderRadius: '10px', background: active ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.03)', border: active ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255,255,255,0.05)', cursor: 'pointer', marginBottom: '8px' });
const dotStyle = (online) => ({ width: '8px', height: '8px', borderRadius: '50%', background: online ? '#10b981' : '#ef4444' });
const labelStyle = { fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' };
const selectStyle = { background: 'var(--border)', color: 'var(--text-main)', padding: '8px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', outline: 'none', fontSize: '0.85rem' };

const actionBtnStyle = { 
  display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px', 
  borderRadius: '10px', background: 'var(--border)', border: '1px solid rgba(255,255,255,0.1)', 
  cursor: 'pointer', transition: 'all 0.2s' 
};

const pageBtnStyle = {
  display: 'flex', alignItems: 'center', justifyContent: 'center', width: '36px', height: '36px',
  borderRadius: '8px', background: 'var(--border)', border: '1px solid rgba(255,255,255,0.1)',
  color: 'var(--text-main)', cursor: 'pointer'
};

const inputStyle = { width: '100%', padding: '12px 16px', borderRadius: '10px', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-main)', outline: 'none', boxSizing: 'border-box' };
const modalOverlayStyle = { position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' };
const modalCardStyle = { 
  width: '90%', 
  maxWidth: '600px', 
  maxHeight: '90vh', 
  overflowY: 'auto', 
  padding: '40px', 
  borderRadius: '24px', 
  border: '1px solid rgba(255,255,255,0.1)', 
  position: 'relative', 
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' 
};
const closeBtnStyle = { position: 'absolute', right: '24px', top: '24px', background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' };

const viewToggleStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  padding: '8px 20px',
  borderRadius: '10px',
  border: 'none',
  background: 'transparent',
  color: 'rgba(255,255,255,0.4)',
  fontSize: '0.9rem',
  fontWeight: '600',
  cursor: 'pointer',
  transition: 'all 0.2s'
};

const activeToggleStyle = {
  background: 'var(--primary)',
  color: 'white',
  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
};

export default Drivers;
