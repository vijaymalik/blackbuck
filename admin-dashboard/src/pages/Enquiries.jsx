import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Send, MapPin, Navigation, Users, Search, Info, CheckCircle2, XCircle, ArrowRight, ToggleLeft, ToggleRight, Check } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Sleek Color Markers
const blueIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const redIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Dynamic Re-center Map child
const ChangeView = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center]);
  return null;
};

// Map click event interceptor
const MapEventsHandler = ({ onMapClick }) => {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

// Precise Haversine distance calculator between coordinates
const getHaversineDistance = (coords1, coords2) => {
  if (!coords1 || !coords2) return '0.0';
  const [lat1, lon1] = coords1;
  const [lat2, lon2] = coords2;
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const d = R * c;
  return d.toFixed(1); // Return 1 decimal place
};

const Enquiries = () => {
  const { token } = useAuth();
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [nearbyDriversCount, setNearbyDriversCount] = useState(0);
  const [countLoading, setCountLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  // Bids & Load Assignment state
  const [activeBidEnquiry, setActiveBidEnquiry] = useState(null);
  const [bidsList, setBidsList] = useState([]);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [toasts, setToasts] = useState([]);
  
  // Selection target mode: 'pickup' or 'dropoff'
  const [activeTarget, setActiveTarget] = useState('pickup');

  // Search state queries
  const [pickupSearchQuery, setPickupSearchQuery] = useState('');
  const [dropoffSearchQuery, setDropoffSearchQuery] = useState('');

  // Autocomplete Suggestions State
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropoffSuggestions, setDropoffSuggestions] = useState([]);
  const [pickupSuggestionsOpen, setPickupSuggestionsOpen] = useState(false);
  const [dropoffSuggestionsOpen, setDropoffSuggestionsOpen] = useState(false);

  // Map coordinates state
  const [pickupCoords, setPickupCoords] = useState([28.5921, 77.0460]); // Dwarka
  const [dropoffCoords, setDropoffCoords] = useState([28.6139, 77.2090]); // Delhi Center default

  const [formData, setFormData] = useState({
    pickup_location: 'Dwarka Sector 10, Delhi',
    pickup_instruction: '',
    dropoff_location: 'Connaught Place, Delhi',
    pickup_latitude: '28.5921',
    pickup_longitude: '77.0460',
    radius_km: 15
  });

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const api = axios.create({
    baseURL: 'http://' + window.location.hostname + ':8002/api/v1',
    headers: { Authorization: `Bearer ${token}` }
  });

  // Fetch enquiries
  const fetchEnquiries = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/enquiries');
      if (response.data.success) {
        setEnquiries(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch enquiries', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBidsForEnquiry = async (enquiryId, quiet = false) => {
    if (!quiet) setBidsLoading(true);
    try {
      const res = await api.get(`/admin/enquiries/${enquiryId}/responses`);
      if (res.data.success) {
        setBidsList(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      if (!quiet) setBidsLoading(false);
    }
  };

  const showNotification = (message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  // Real-time polling loop for active monitoring of bids/responses
  useEffect(() => {
    let activeEnquiryId = activeBidEnquiry?.id;
    
    const pollInterval = setInterval(async () => {
      try {
        const response = await api.get('/admin/enquiries');
        if (response.data.success) {
          setEnquiries(response.data.data);

          // If the bids details modal is active, reload it in place quietly
          if (activeEnquiryId) {
            fetchBidsForEnquiry(activeEnquiryId, true);
          }
        }
      } catch (err) {
        console.error('Real-time polling failed', err);
      }
    }, 5000); // 5 seconds polling interval

    return () => clearInterval(pollInterval);
  }, [activeBidEnquiry?.id]);

  // Fetch nearby active drivers count
  const fetchNearbyCount = async () => {
    if (!formData.pickup_latitude || !formData.pickup_longitude) return;
    setCountLoading(true);
    try {
      const response = await api.get('/admin/enquiries/nearby-drivers-count', {
        params: {
          pickup_latitude: formData.pickup_latitude,
          pickup_longitude: formData.pickup_longitude,
          radius_km: formData.radius_km
        }
      });
      if (response.data.success) {
        setNearbyDriversCount(response.data.data.count);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCountLoading(false);
    }
  };

  // Reverse geocode to get a clean short address
  const reverseGeocode = async (lat, lng) => {
    try {
      const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      if (response.data && response.data.address) {
        const addr = response.data.address;
        const parts = [
          addr.suburb || addr.neighbourhood || addr.village || addr.road || '',
          addr.city || addr.town || addr.county || '',
          addr.state || ''
        ].filter(p => p.trim() !== '');
        
        const shortName = parts.slice(0, 4).join(', ');
        return shortName || response.data.display_name.split(',').slice(0, 4).join(', ');
      }
    } catch (err) {
      console.error('Failed to reverse geocode', err);
    }
    return `Point (${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)})`;
  };

  // Debounced Pickup Suggestions Fetcher
  useEffect(() => {
    if (!pickupSuggestionsOpen || pickupSearchQuery.trim().length < 3) {
      setPickupSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const response = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(pickupSearchQuery)}&limit=5&countrycodes=in`);
        if (response.data) {
          setPickupSuggestions(response.data);
        }
      } catch (err) {
        console.error(err);
      }
    }, 400); // 400ms debounce delay
    return () => clearTimeout(delayDebounce);
  }, [pickupSearchQuery, pickupSuggestionsOpen]);

  // Debounced Dropoff Suggestions Fetcher
  useEffect(() => {
    if (!dropoffSuggestionsOpen || dropoffSearchQuery.trim().length < 3) {
      setDropoffSuggestions([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      try {
        const response = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(dropoffSearchQuery)}&limit=5&countrycodes=in`);
        if (response.data) {
          setDropoffSuggestions(response.data);
        }
      } catch (err) {
        console.error(err);
      }
    }, 400); // 400ms debounce delay
    return () => clearTimeout(delayDebounce);
  }, [dropoffSearchQuery, dropoffSuggestionsOpen]);

  // Trigger when a suggestion is clicked
  const selectPickupSuggestion = (sug) => {
    const lat = parseFloat(sug.lat);
    const lon = parseFloat(sug.lon);
    setPickupCoords([lat, lon]);
    
    const displayNameParts = sug.display_name.split(',');
    const shortName = displayNameParts.slice(0, 4).join(',').trim();
    
    setFormData(prev => ({
      ...prev,
      pickup_location: shortName,
      pickup_latitude: lat.toString(),
      pickup_longitude: lon.toString()
    }));
    
    setPickupSearchQuery(shortName);
    setPickupSuggestions([]);
    setPickupSuggestionsOpen(false);
    setActiveTarget('pickup');
  };

  const selectDropoffSuggestion = (sug) => {
    const lat = parseFloat(sug.lat);
    const lon = parseFloat(sug.lon);
    setDropoffCoords([lat, lon]);
    
    const displayNameParts = sug.display_name.split(',');
    const shortName = displayNameParts.slice(0, 4).join(',').trim();
    
    setFormData(prev => ({
      ...prev,
      dropoff_location: shortName,
      dropoff_latitude: lat.toString(),
      dropoff_longitude: lon.toString()
    }));
    
    setDropoffSearchQuery(shortName);
    setDropoffSuggestions([]);
    setDropoffSuggestionsOpen(false);
    setActiveTarget('dropoff');
  };

  // Map click handler (assigns to the currently selected active target mode)
  const handleMapClick = async (lat, lng) => {
    const shortName = await reverseGeocode(lat, lng);
    if (activeTarget === 'pickup') {
      setPickupCoords([lat, lng]);
      setFormData(prev => ({
        ...prev,
        pickup_location: shortName,
        pickup_latitude: lat.toFixed(6),
        pickup_longitude: lng.toFixed(6)
      }));
      setPickupSearchQuery(shortName);
      setPickupSuggestionsOpen(false);
    } else {
      setDropoffCoords([lat, lng]);
      setFormData(prev => ({
        ...prev,
        dropoff_location: shortName,
        dropoff_latitude: lat.toFixed(6),
        dropoff_longitude: lng.toFixed(6)
      }));
      setDropoffSearchQuery(shortName);
      setDropoffSuggestionsOpen(false);
    }
  };

  // Toggle status (Active / Inactive)
  const handleToggleStatus = async (enquiryId) => {
    try {
      const response = await api.post(`/admin/enquiries/${enquiryId}/toggle-status`);
      if (response.data.success) {
        setEnquiries(prev => prev.map(e => e.id === enquiryId ? { ...e, is_active: !e.is_active } : e));
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update enquiry status.');
    }
  };

  useEffect(() => {
    fetchEnquiries();
    
    // Auto detect initial current coords for setup
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setPickupCoords([lat, lng]);
        
        // Auto offset dropoff coordinates slightly for dynamic beautiful dual marker renders
        setDropoffCoords([lat + 0.02, lng + 0.02]);
        
        const pickupName = await reverseGeocode(lat, lng);
        const dropoffName = await reverseGeocode(lat + 0.02, lng + 0.02);

        setFormData(prev => ({
          ...prev,
          pickup_location: pickupName,
          dropoff_location: dropoffName,
          pickup_latitude: lat.toFixed(6),
          pickup_longitude: lng.toFixed(6),
          dropoff_latitude: (lat + 0.02).toFixed(6),
          dropoff_longitude: (lng + 0.02).toFixed(6)
        }));

        setPickupSearchQuery(pickupName);
        setDropoffSearchQuery(dropoffName);
        setPickupSuggestionsOpen(false);
        setDropoffSuggestionsOpen(false);
      }, (err) => {
        console.log('Admin Geolocation denied / failed, using defaults');
      });
    }
  }, []);

  // Poll driver coverage dynamically
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchNearbyCount();
    }, 500);

    return () => clearTimeout(delayDebounce);
  }, [formData.pickup_latitude, formData.pickup_longitude, formData.radius_km]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSuccessMsg('');
    try {
      const response = await api.post('/admin/enquiries', formData);
      if (response.data.success) {
        setSuccessMsg(response.data.message || 'Enquiry successfully broadcasted!');
        fetchEnquiries();
        // Clear queries but keep pickup coords active
        setPickupSearchQuery('');
        setDropoffSearchQuery('');
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to create enquiry');
    } finally {
      setSubmitLoading(false);
    }
  };

  return (
    <div className="page-container" style={{ padding: isMobile ? '12px 16px 80px' : '30px', color: 'var(--text-main)', minHeight: '100vh' }}>
      
      {/* Page Header */}
      <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', justifyContent: 'space-between', alignItems: isMobile ? 'flex-start' : 'center', marginBottom: isMobile ? '20px' : '32px', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: isMobile ? '1.5rem' : '2rem', fontWeight: '800', margin: 0, letterSpacing: '-0.5px' }}>Spatial Enquiry Portal</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: isMobile ? '0.8rem' : '0.9rem', marginTop: '4px' }}>
             Create logistics load queries, search locations dynamically, and toggle broadcast availability instantly.
          </p>
        </div>
        <div style={{ background: 'var(--primary)', color: 'white', padding: isMobile ? '8px 16px' : '10px 20px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold', fontSize: isMobile ? '0.8rem' : '0.9rem', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)', width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'center' : 'flex-start' }}>
           <Send size={16} /> In-App Dynamic Broadcast Active
        </div>
      </div>

      {successMsg && (
        <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1.5px solid #10b981', color: '#10b981', padding: '16px', borderRadius: '12px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px', animation: 'fadeIn 0.3s ease-in' }}>
          <CheckCircle2 size={20} />
          <strong style={{ fontSize: '0.95rem' }}>{successMsg}</strong>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.3fr 1fr', gap: isMobile ? '20px' : '30px', alignItems: 'start' }}>
        
        {/* CREATE ENQUIRY FORM & SEARCH */}
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '18px', padding: isMobile ? '16px' : '28px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
          <h3 style={{ fontSize: isMobile ? '1.05rem' : '1.25rem', fontWeight: '700', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Navigation size={18} color="var(--primary)" /> Autocomplete & Geocoder Broadcast Control
          </h3>

          {/* Autocomplete Search Inputs (Pickup & Dropoff) */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
            
            {/* Pickup autocomplete search */}
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>Search Pickup Location (Type & Select)</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  placeholder="e.g. Bandra Mumbai"
                  value={pickupSearchQuery}
                  onChange={e => {
                    setPickupSearchQuery(e.target.value);
                    setPickupSuggestionsOpen(true);
                  }}
                  style={{ width: '100%', padding: '10px 12px 10px 34px', background: 'var(--input-bg, rgba(255,255,255,0.03))', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', outline: 'none', fontSize: '0.85rem' }}
                />
                <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '12px' }} />
              </div>

              {/* Suggestions Dropdown */}
              {pickupSuggestionsOpen && pickupSuggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.25)', zIndex: 1000, marginTop: '5px', maxHeight: '180px', overflowY: 'auto' }}>
                  {pickupSuggestions.map((sug, idx) => (
                    <div 
                      key={idx}
                      onClick={() => selectPickupSuggestion(sug)}
                      style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-main)', transition: 'background 0.2s' }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                      📍 {sug.display_name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dropoff autocomplete search */}
            <div style={{ position: 'relative' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>Search Dropoff Location (Type & Select)</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  placeholder="e.g. Noida Sector 62"
                  value={dropoffSearchQuery}
                  onChange={e => {
                    setDropoffSearchQuery(e.target.value);
                    setDropoffSuggestionsOpen(true);
                  }}
                  style={{ width: '100%', padding: '10px 12px 10px 34px', background: 'var(--input-bg, rgba(255,255,255,0.03))', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', outline: 'none', fontSize: '0.85rem' }}
                />
                <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '10px', top: '12px' }} />
              </div>

              {/* Suggestions Dropdown */}
              {dropoffSuggestionsOpen && dropoffSuggestions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.25)', zIndex: 1000, marginTop: '5px', maxHeight: '180px', overflowY: 'auto' }}>
                  {dropoffSuggestions.map((sug, idx) => (
                    <div 
                      key={idx}
                      onClick={() => selectDropoffSuggestion(sug)}
                      style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--text-main)', transition: 'background 0.2s' }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                      onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                      🚩 {sug.display_name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Active Target Mode Toggle Tabs */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', alignSelf: 'center', fontWeight: '600' }}>Map Click Action:</span>
            <button 
              type="button" 
              onClick={() => setActiveTarget('pickup')}
              style={{
                padding: '6px 14px', 
                borderRadius: '8px', 
                border: '1.5px solid var(--primary)', 
                background: activeTarget === 'pickup' ? 'rgba(59, 130, 246, 0.1)' : 'transparent', 
                color: activeTarget === 'pickup' ? 'var(--primary)' : 'var(--text-muted)', 
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {activeTarget === 'pickup' && <Check size={14} />} Set Pickup Pin (Blue)
            </button>
            <button 
              type="button" 
              onClick={() => setActiveTarget('dropoff')}
              style={{
                padding: '6px 14px', 
                borderRadius: '8px', 
                border: '1.5px solid rgba(239, 68, 68, 0.8)', 
                background: activeTarget === 'dropoff' ? 'rgba(239, 68, 68, 0.1)' : 'transparent', 
                color: activeTarget === 'dropoff' ? 'rgba(239, 68, 68, 0.9)' : 'var(--text-muted)', 
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '0.78rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              {activeTarget === 'dropoff' && <Check size={14} />} Set Dropoff Pin (Red)
            </button>
          </div>

          {/* Interactive Geocoder Map */}
          <div style={{ height: '260px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)', marginBottom: '20px' }}>
            <MapContainer center={pickupCoords} zoom={12} style={{ width: '100%', height: '100%', zIndex: 1 }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <Marker position={pickupCoords} icon={blueIcon} />
              <Marker position={dropoffCoords} icon={redIcon} />
              <ChangeView center={activeTarget === 'pickup' ? pickupCoords : dropoffCoords} />
              <MapEventsHandler onMapClick={handleMapClick} />
            </MapContainer>
          </div>
          
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>Pickup From (Short Location Name)</label>
                <input 
                  type="text" 
                  value={formData.pickup_location}
                  onChange={e => setFormData({...formData, pickup_location: e.target.value})}
                  required
                  placeholder="e.g. Dwarka, Delhi"
                  style={{ width: '100%', padding: '12px 14px', background: 'var(--input-bg, rgba(255,255,255,0.03))', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-main)', outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>Dropoff To (Short Location Name)</label>
                <input 
                  type="text" 
                  value={formData.dropoff_location}
                  onChange={e => setFormData({...formData, dropoff_location: e.target.value})}
                  required
                  placeholder="e.g. Connaught Place, Delhi"
                  style={{ width: '100%', padding: '12px 14px', background: 'var(--input-bg, rgba(255,255,255,0.03))', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-main)', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>Pickup Landmark / Nearby Instructions (Optional)</label>
              <input 
                type="text" 
                value={formData.pickup_instruction}
                onChange={e => setFormData({...formData, pickup_instruction: e.target.value})}
                placeholder="e.g. Near HDFC Bank ATM, Opposite metro pillar 12"
                style={{ width: '100%', padding: '12px 14px', background: 'var(--input-bg, rgba(255,255,255,0.03))', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-main)', outline: 'none' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>Pickup Latitude</label>
                <input 
                  type="text" 
                  value={formData.pickup_latitude}
                  required
                  readOnly
                  style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-muted)', outline: 'none', cursor: 'not-allowed' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: '600' }}>Pickup Longitude</label>
                <input 
                  type="text" 
                  value={formData.pickup_longitude}
                  required
                  readOnly
                  style={{ width: '100%', padding: '12px 14px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-muted)', outline: 'none', cursor: 'not-allowed' }}
                />
              </div>
            </div>

            {/* Radius Slider */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>Broadcast Radius</label>
                <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 'bold' }}>{formData.radius_km} km</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="100" 
                value={formData.radius_km}
                onChange={e => setFormData({...formData, radius_km: parseInt(e.target.value)})}
                style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
            </div>

            {/* Estimated Route Distance display */}
            {formData.pickup_location && formData.dropoff_location && (
              <div style={{ 
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(16, 185, 129, 0.02))', 
                border: '1.5px dashed #10b981', 
                borderRadius: '12px', 
                padding: '16px', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginTop: '10px'
              }}>
                <div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: '600', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Route Trip Distance</span>
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-main)', fontWeight: '700' }}>
                    {formData.pickup_location.split(',')[0]} ➔ {formData.dropoff_location.split(',')[0]}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '1.6rem', fontWeight: '900', color: '#10b981' }}>
                    {getHaversineDistance(pickupCoords, dropoffCoords)} km
                  </span>
                </div>
              </div>
            )}

            <button 
              type="submit" 
              disabled={submitLoading}
              style={{ width: '100%', padding: '14px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '10px', transition: 'all 0.2s', boxShadow: '0 6px 20px rgba(59, 130, 246, 0.3)' }}
            >
              {submitLoading ? 'Broadcasting...' : (
                <>
                  <Send size={18} /> Broadcast Load Enquiry
                </>
              )}
            </button>
          </form>
        </div>

        {/* BROADCAST COVERAGE WIDGET */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          <div style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(59, 130, 246, 0.03))', border: '1.5px dashed var(--primary)', borderRadius: '18px', padding: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px', minHeight: '190px', justifyContent: 'center' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContents: 'center', justifyContent: 'center' }}>
              <Users size={28} color="var(--primary)" />
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)', fontWeight: '600' }}>Active Driver Coverage</h4>
              {countLoading ? (
                <div style={{ fontSize: '3rem', fontWeight: '950', color: 'var(--text-main)', margin: '8px 0', letterSpacing: '-1px' }}>...</div>
              ) : (
                <div style={{ fontSize: '3rem', fontWeight: '950', color: 'var(--text-main)', margin: '8px 0', letterSpacing: '-1px', display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '4px' }}>
                  {nearbyDriversCount} <span style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--text-muted)' }}>drivers</span>
                </div>
              )}
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', maxWidth: '280px', lineHeight: '1.4' }}>
                drivers currently online & active within the <strong>{formData.radius_km} km</strong> broadcast radius of <strong>{formData.pickup_location || 'Selected Area'}</strong>.
              </p>
            </div>
          </div>

          <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '18px', padding: '20px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <Info size={20} color="var(--primary)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.8rem', lineHeight: '1.5', color: 'var(--text-muted)' }}>
              <strong>Typeahead Suggestions Active:</strong> Try typing "Bandra" or "Noida" in either box. Real-time geocoded matching addresses will load below the fields instantly!
            </div>
          </div>

        </div>

      </div>

      {/* RECENT BROADCASTS */}
      <div style={{ marginTop: '40px', background: 'var(--card-bg)', border: '1px solid var(--border)', borderRadius: '18px', padding: isMobile ? '16px' : '28px', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
        <h3 style={{ fontSize: isMobile ? '1.1rem' : '1.25rem', fontWeight: '700', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <MapPin size={20} color="var(--primary)" /> Recent Broadcast History
        </h3>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading enquiries history...</div>
        ) : enquiries.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>No enquiries broadcasted yet. Create one above!</div>
        ) : isMobile ? (
          /* MOBILE CARDS VIEW */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {enquiries.map((e) => {
              const acceptedResp = e.responses?.find(r => ['accepted', 'dispatched', 'completed'].includes(r.status));
              return (
                <div 
                  key={e.id} 
                  style={{ 
                    background: 'rgba(255,255,255,0.01)', 
                    border: '1px solid var(--border)', 
                    borderRadius: '16px', 
                    padding: '16px',
                    opacity: e.is_active ? 1 : 0.75,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                    <span style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '0.9rem' }}>#ENQ-{e.id}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(e.created_at).toLocaleDateString()}</span>
                  </div>

                  {/* Route details */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                      <span style={{ fontSize: '12px', marginTop: '2px' }}>📍</span>
                      <div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: '700' }}>Pickup From</span>
                        <span style={{ color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: '700' }}>{e.pickup_location}</span>
                        {e.pickup_instruction && (
                          <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--primary)', fontStyle: 'italic', marginTop: '2px', fontWeight: '600' }}>
                            Landmark: {e.pickup_instruction}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                      <span style={{ fontSize: '12px', marginTop: '2px' }}>🏁</span>
                      <div>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', fontWeight: '700' }}>Dropoff To</span>
                        <span style={{ color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: '700' }}>{e.dropoff_location}</span>
                        {e.dropoff_latitude && e.dropoff_longitude && (
                          <span style={{ display: 'block', fontSize: '0.72rem', color: '#10b981', fontWeight: '700', marginTop: '2px' }}>
                            Trip Distance: {getHaversineDistance([parseFloat(e.pickup_latitude), parseFloat(e.pickup_longitude)], [parseFloat(e.dropoff_latitude), parseFloat(e.dropoff_longitude)])} km
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Operational Controls & Status */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', borderTop: '1px solid var(--border)', paddingTop: '12px', marginTop: '4px' }}>
                    {/* Radius badge */}
                    <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.72rem' }}>
                       Radius: {e.radius_km} km
                    </span>
                    
                    {/* Broadcast Toggle Button */}
                    <button 
                      onClick={() => handleToggleStatus(e.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        color: e.is_active ? '#10b981' : 'var(--text-muted)',
                        backgroundColor: e.is_active ? 'rgba(16, 185, 129, 0.1)' : 'var(--border)',
                        fontWeight: 'bold',
                        fontSize: '0.72rem'
                      }}
                    >
                      {e.is_active ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                      <span>{e.is_active ? 'ACTIVE' : 'OFF'}</span>
                    </button>
                  </div>

                  {/* Manage Bids Block */}
                  <div style={{ marginTop: '4px' }}>
                    {e.is_active ? (
                      <button 
                        onClick={async () => {
                          setActiveBidEnquiry(e);
                          await fetchBidsForEnquiry(e.id);
                        }}
                        style={{
                          width: '100%',
                          background: 'rgba(59, 130, 246, 0.05)',
                          border: '1.5px solid var(--primary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          padding: '8px',
                          borderRadius: '8px',
                          color: 'var(--primary)',
                          fontWeight: 'bold',
                          fontSize: '0.8rem',
                        }}
                      >
                        📩 View Bids ({e.responses_count !== undefined ? e.responses_count : 0})
                      </button>
                    ) : acceptedResp ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                        {acceptedResp.status === 'dispatched' ? (
                          <span style={{
                            background: 'rgba(234, 179, 8, 0.1)', 
                            color: '#eab308', 
                            padding: '6px 12px', 
                            borderRadius: '8px', 
                            border: '1px solid #eab308', 
                            fontWeight: 'bold', 
                            fontSize: '0.78rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}>
                            🚚 In Transit: {acceptedResp.driver?.name}
                          </span>
                        ) : acceptedResp.status === 'completed' ? (
                          <span style={{
                            background: 'rgba(16, 185, 129, 0.15)', 
                            color: '#10b981', 
                            padding: '6px 12px', 
                            borderRadius: '8px', 
                            border: '2px solid #10b981', 
                            fontWeight: 'bold', 
                            fontSize: '0.78rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}>
                            🏁 Delivered: {acceptedResp.driver?.name}
                          </span>
                        ) : (
                          <span style={{
                            background: 'rgba(59, 130, 246, 0.1)', 
                            color: '#3b82f6', 
                            padding: '6px 12px', 
                            borderRadius: '8px', 
                            border: '1px solid #3b82f6', 
                            fontWeight: 'bold', 
                            fontSize: '0.78rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                          }}>
                            ✓ Assigned to: {acceptedResp.driver?.name}
                          </span>
                        )}
                        
                        {acceptedResp.status === 'accepted' && (
                          <button
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to mark ENQ-${e.id} as DISPATCHED?`)) {
                                try {
                                  const res = await api.post(`/admin/enquiries/${e.id}/status`, { status: 'dispatched' });
                                  if (res.data.success) {
                                    showNotification(`Load status successfully updated to DISPATCHED.`, 'success');
                                    await fetchEnquiries();
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }
                            }}
                            style={{
                              width: '100%',
                              background: '#eab308',
                              border: 'none',
                              color: '#0f172a',
                              borderRadius: '8px',
                              padding: '8px',
                              fontSize: '0.8rem',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                            }}
                          >
                            🚚 Confirm Pickup / Dispatch
                          </button>
                        )}

                        {acceptedResp.status === 'dispatched' && (
                          <button
                            onClick={async () => {
                              if (window.confirm(`Are you sure you want to mark ENQ-${e.id} as COMPLETED?`)) {
                                try {
                                  const res = await api.post(`/admin/enquiries/${e.id}/status`, { status: 'completed' });
                                  if (res.data.success) {
                                    showNotification(`Load status successfully updated to COMPLETED.`, 'success');
                                    await fetchEnquiries();
                                  }
                                } catch (err) {
                                  console.error(err);
                                }
                              }
                            }}
                            style={{
                              width: '100%',
                              background: '#10b981',
                              border: 'none',
                              color: 'white',
                              borderRadius: '8px',
                              padding: '8px',
                              fontSize: '0.8rem',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                            }}
                          >
                            🏁 Complete Delivery / Dropoff
                          </button>
                        )}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold' }}>
                        Closed / No Bids
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* DESKTOP TABLE VIEW */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: '700', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 16px' }}>Enquiry ID</th>
                  <th style={{ padding: '12px 16px' }}>From / Pickup</th>
                  <th style={{ padding: '12px 16px' }}>Dropoff</th>
                  <th style={{ padding: '12px 16px' }}>Radius</th>
                  <th style={{ padding: '12px 16px' }}>Manage Bids</th>
                  <th style={{ padding: '12px 16px' }}>Broadcast ON/OFF</th>
                  <th style={{ padding: '12px 16px' }}>Created At</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.map((e) => {
                  const acceptedResp = e.responses?.find(r => ['accepted', 'dispatched', 'completed'].includes(r.status));
                  return (
                    <tr key={e.id} style={{ borderBottom: '1px solid var(--border)', fontSize: '0.85rem', transition: 'background 0.2s', opacity: e.is_active ? 1 : 0.6 }}>
                      <td style={{ padding: '16px', fontWeight: 'bold' }}>#ENQ-{e.id}</td>
                      <td style={{ padding: '16px' }}>
                        <div style={{ fontWeight: '600' }}>{e.pickup_location}</div>
                        {e.pickup_instruction && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--primary)', marginTop: '4px', fontStyle: 'italic', fontWeight: '600' }}>
                            📍 Landmark: {e.pickup_instruction}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '16px' }}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                           <ArrowRight size={14} color="var(--text-muted)" />
                           <span style={{ fontWeight: '600' }}>{e.dropoff_location}</span>
                         </div>
                         {e.dropoff_latitude && e.dropoff_longitude && (
                           <div style={{ fontSize: '0.74rem', color: '#10b981', marginTop: '4px', fontWeight: 'bold' }}>
                             🛣️ Trip Distance: {getHaversineDistance([parseFloat(e.pickup_latitude), parseFloat(e.pickup_longitude)], [parseFloat(e.dropoff_latitude), parseFloat(e.dropoff_longitude)])} km
                           </div>
                         )}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <span style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', padding: '2px 8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '0.75rem' }}>
                           {e.radius_km} km
                        </span>
                      </td>
                      <td style={{ padding: '16px' }}>
                        {e.is_active ? (
                          <button 
                            onClick={async () => {
                              setActiveBidEnquiry(e);
                              await fetchBidsForEnquiry(e.id);
                            }}
                            style={{
                              background: 'rgba(59, 130, 246, 0.05)',
                              border: '1.5px solid var(--primary)',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              color: 'var(--primary)',
                              fontWeight: 'bold',
                              fontSize: '0.75rem',
                              transition: 'all 0.2s',
                            }}
                          >
                            📩 Bids ({e.responses_count !== undefined ? e.responses_count : 0})
                          </button>
                        ) : acceptedResp ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {acceptedResp.status === 'dispatched' ? (
                              <span style={{
                                background: 'rgba(234, 179, 8, 0.1)', 
                                color: '#eab308', 
                                padding: '4px 10px', 
                                borderRadius: '20px', 
                                border: '1px solid #eab308', 
                                fontWeight: '900', 
                                fontSize: '0.75rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                alignSelf: 'flex-start'
                              }}>
                                🚚 Dispatched: {acceptedResp.driver?.name || 'Assigned'}
                              </span>
                            ) : acceptedResp.status === 'completed' ? (
                              <span style={{
                                background: 'rgba(16, 185, 129, 0.15)', 
                                color: '#10b981', 
                                padding: '4px 10px', 
                                borderRadius: '20px', 
                                border: '2px solid #10b981', 
                                fontWeight: '900', 
                                fontSize: '0.75rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                alignSelf: 'flex-start'
                              }}>
                                🏁 Completed: {acceptedResp.driver?.name || 'Assigned'}
                              </span>
                            ) : (
                              <span style={{
                                background: 'rgba(59, 130, 246, 0.1)', 
                                color: '#3b82f6', 
                                padding: '4px 10px', 
                                borderRadius: '20px', 
                                border: '1px solid #3b82f6', 
                                fontWeight: '900', 
                                fontSize: '0.75rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                alignSelf: 'flex-start'
                              }}>
                                ✓ Assigned: {acceptedResp.driver?.name || 'Assigned'}
                              </span>
                            )}
                            {acceptedResp.status === 'accepted' && (
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Are you sure you want to manually mark ENQ-${e.id} as DISPATCHED / IN TRANSIT?`)) {
                                    try {
                                      const res = await api.post(`/admin/enquiries/${e.id}/status`, { status: 'dispatched' });
                                      if (res.data.success) {
                                        showNotification(`Load ENQ-${e.id} status successfully updated to DISPATCHED.`, 'success');
                                        await fetchEnquiries();
                                      }
                                    } catch (err) {
                                      console.error(err);
                                      alert('Failed to update status.');
                                    }
                                  }
                                }}
                                style={{
                                  background: 'rgba(234, 179, 8, 0.1)',
                                  border: '1px solid #eab308',
                                  color: '#eab308',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '0.65rem',
                                  fontWeight: '800',
                                  cursor: 'pointer',
                                  alignSelf: 'flex-start',
                                  transition: 'all 0.2s',
                                  marginTop: '4px'
                                }}
                              >
                                🚚 Dispatch Load
                              </button>
                            )}

                            {acceptedResp.status === 'dispatched' && (
                              <button
                                onClick={async () => {
                                  if (window.confirm(`Are you sure you want to manually mark ENQ-${e.id} as COMPLETED / DELIVERED?`)) {
                                    try {
                                      const res = await api.post(`/admin/enquiries/${e.id}/status`, { status: 'completed' });
                                      if (res.data.success) {
                                        showNotification(`Load ENQ-${e.id} status successfully updated to COMPLETED.`, 'success');
                                        await fetchEnquiries();
                                      }
                                    } catch (err) {
                                      console.error(err);
                                      alert('Failed to update status.');
                                    }
                                  }
                                }}
                                style={{
                                  background: 'rgba(16, 185, 129, 0.1)',
                                  border: '1px solid #10b981',
                                  color: '#10b981',
                                  borderRadius: '6px',
                                  padding: '4px 8px',
                                  fontSize: '0.65rem',
                                  fontWeight: '800',
                                  cursor: 'pointer',
                                  alignSelf: 'flex-start',
                                  transition: 'all 0.2s',
                                  marginTop: '4px'
                                }}
                              >
                                🏁 Complete Delivery
                              </button>
                            )}
                            {acceptedResp.status === 'accepted' && (
                              <button 
                                onClick={async () => {
                                  if (window.confirm(`Are you sure you want to change driver / re-open bidding for ENQ-${e.id}?`)) {
                                    try {
                                      setBidsLoading(true);
                                      const res = await api.post(`/admin/enquiries/${e.id}/reopen`);
                                      if (res.data.success) {
                                        showNotification(`Enquiry ENQ-${e.id} re-opened successfully. Bidding is now active again!`, 'success');
                                        await fetchEnquiries();
                                        // Automatically open bids modal so admin can select new driver right away!
                                        setActiveBidEnquiry(e);
                                        await fetchBidsForEnquiry(e.id);
                                      }
                                    } catch (err) {
                                      console.error(err);
                                      alert('Failed to re-open bidding.');
                                    } finally {
                                      setBidsLoading(false);
                                    }
                                  }
                                }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--primary)',
                                  cursor: 'pointer',
                                  fontWeight: 'bold',
                                  fontSize: '0.7rem',
                                  textAlign: 'left',
                                  textDecoration: 'underline',
                                  padding: '0 4px'
                                }}
                              >
                                🔄 Change Driver / Re-open
                              </button>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'bold' }}>
                            Closed / No Bids
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '16px' }}>
                        <button 
                          onClick={() => handleToggleStatus(e.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 8px',
                            borderRadius: '8px',
                            color: e.is_active ? '#10b981' : 'var(--text-muted)',
                            backgroundColor: e.is_active ? 'rgba(16, 185, 129, 0.1)' : 'var(--border)',
                            fontWeight: 'bold',
                            fontSize: '0.75rem'
                          }}
                        >
                          {e.is_active ? (
                            <>
                              <ToggleRight size={20} />
                              <span>ACTIVE</span>
                            </>
                          ) : (
                            <>
                              <ToggleLeft size={20} />
                              <span>OFF</span>
                            </>
                          )}
                        </button>
                      </td>
                      <td style={{ padding: '16px', color: 'var(--text-muted)' }}>
                        {new Date(e.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Driver Responses Bids Overlay Modal */}
      {activeBidEnquiry && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 99999,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border)',
            borderRadius: isMobile ? '16px' : '24px',
            padding: isMobile ? '16px' : '32px',
            width: '600px',
            maxWidth: '95%',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: '800', margin: 0, color: 'var(--text-main)' }}>
                  📩 Enquiry Bids & Responses
                </h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '4px' }}>
                  Manage driver acceptances for load <strong>#ENQ-{activeBidEnquiry.id}</strong>
                </p>
              </div>
              <button 
                onClick={() => setActiveBidEnquiry(null)}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border)',
                  borderRadius: '50%',
                  width: '36px',
                  height: '36px',
                  cursor: 'pointer',
                  color: 'var(--text-main)',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>

            {/* Bids List */}
            <div style={{ maxHeight: '350px', overflowY: 'auto', marginBottom: '20px' }}>
              {bidsLoading ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Fetching responses...
                </div>
              ) : bidsList.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                  <p style={{ fontWeight: 'bold', fontSize: '0.95rem', margin: 0 }}>No bids received yet</p>
                  <p style={{ fontSize: '0.8rem', marginTop: '4px', maxWidth: '280px', marginInline: 'auto' }}>
                    Drivers in Dwarka will receive alert notifications on their app. Once they click accept, their bid response will populate here instantly!
                  </p>
                </div>
              ) : (
                bidsList.map((bid) => (
                  <div 
                    key={bid.response_id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid var(--border)',
                      borderRadius: '16px',
                      padding: '18px',
                      marginBottom: '12px',
                      display: 'flex',
                      flexDirection: isMobile ? 'column' : 'row',
                      justifyContent: 'space-between',
                      alignItems: isMobile ? 'stretch' : 'center',
                      gap: isMobile ? '12px' : '0'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--text-main)' }}>
                          {bid.driver_name}
                        </span>
                        {['accepted', 'dispatched', 'completed'].includes(bid.status) ? (
                          <span style={{ 
                            background: bid.status === 'completed' ? 'rgba(16, 185, 129, 0.15)' : bid.status === 'dispatched' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(59, 130, 246, 0.15)', 
                            color: bid.status === 'completed' ? '#10b981' : bid.status === 'dispatched' ? '#eab308' : '#3b82f6', 
                            padding: '2px 8px', 
                            borderRadius: '20px', 
                            fontSize: '0.7rem', 
                            fontWeight: 'bold', 
                            border: bid.status === 'completed' ? '1px solid #10b981' : bid.status === 'dispatched' ? '1px solid #eab308' : '1px solid #3b82f6' 
                          }}>
                            {bid.status === 'completed' ? 'COMPLETED 🏁' : bid.status === 'dispatched' ? 'DISPATCHED 🚚' : 'ASSIGNED ✅'}
                          </span>
                        ) : bid.status === 'rejected' ? (
                          <span style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', padding: '2px 8px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid #ef4444' }}>
                            REJECTED ✕
                          </span>
                        ) : (
                          <span style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '2px 8px', borderRadius: '20px', fontSize: '0.7rem', fontWeight: 'bold', border: '1px solid #f59e0b' }}>
                            PENDING ⏳
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        📞 Phone: <strong>{bid.driver_phone}</strong>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '4px', fontWeight: 'bold' }}>
                        📍 Distance: {parseFloat(bid.distance_km).toFixed(1)} km from Pickup Location
                      </div>
                    </div>
                    
                    {bid.status === 'pending' && (
                      <button
                        onClick={async () => {
                          if (window.confirm(`Are you sure you want to assign this load to driver ${bid.driver_name}?`)) {
                            try {
                              setBidsLoading(true);
                              const res = await api.post(`/admin/enquiries/${activeBidEnquiry.id}/responses/${bid.response_id}/accept`);
                              if (res.data.success) {
                                showNotification(`Load successfully assigned to driver ${bid.driver_name}! 🎉`, 'success');
                                setActiveBidEnquiry(null);
                                fetchEnquiries();
                              }
                            } catch (err) {
                              console.error(err);
                              alert('Assignment failed.');
                            } finally {
                              setBidsLoading(false);
                            }
                          }
                        }}
                        style={{
                          background: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          padding: '10px 16px',
                          borderRadius: '10px',
                          fontSize: '0.8rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          boxShadow: '0 4px 10px rgba(59, 130, 246, 0.25)',
                          transition: 'all 0.2s',
                          width: isMobile ? '100%' : 'auto',
                          marginTop: isMobile ? '8px' : '0'
                        }}
                      >
                        Assign Load
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setActiveBidEnquiry(null)}
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  color: 'var(--text-main)',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.85rem'
                }}
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification Container */}
      <div 
        style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          pointerEvents: 'none'
        }}
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            style={{
              pointerEvents: 'auto',
              background: '#1e293b',
              color: '#fff',
              padding: '16px 20px',
              borderRadius: '12px',
              borderWidth: '1.5px',
              borderStyle: 'solid',
              borderColor: toast.type === 'success' ? '#10b981' : '#3b82f6',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 8px 10px -6px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              minWidth: '320px',
              maxWidth: '420px',
              animation: 'slideIn 0.3s ease-out forwards',
            }}
          >
            <span style={{ fontSize: '1.4rem' }}>
              {toast.type === 'success' ? '🎉' : '🔔'}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: '900', fontSize: '0.75rem', color: toast.type === 'success' ? '#34d399' : '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                {toast.type === 'success' ? 'Load Confirmation' : 'New Bid Recieved'}
              </div>
              <div style={{ fontSize: '0.85rem', color: '#e2e8f0', marginTop: '3px', fontWeight: '600', lineHeight: '1.3' }}>
                {toast.message}
              </div>
            </div>
            <button 
              onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.4)',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1rem',
                padding: '0 4px',
                alignSelf: 'flex-start',
                marginTop: '-2px'
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Enquiries;
