import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  HeartPulse, Droplet, Search, User, FileText, AlertTriangle, MapPin, 
  Phone, Clock, CheckCircle2, ChevronRight, Share2, Download, LogIn, 
  ShieldAlert, Award, Calendar
} from 'lucide-react';
import { auth, loginWithEmail, registerWithEmail, loginWithGoogle, loginWithGoogleRedirect, logout, updateUserProfile, resolveGoogleRedirect, getAuthErrorMessage, saveUserProfileToFirestore, getUserProfileFromFirestore } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import CustomCursor from './components/CustomCursor';
import VideoBackground from './components/VideoBackground';
import AIChatbot from './components/AIChatbot';
import BloodBankMap from './components/BloodBankMap';
import { sortByNearest, formatDistance, getDirectionsUrl, BENGALURU_CENTER, distanceKm } from './utils/geo';
import { fetchNearbyFacilities } from './services/placesService';
import { BLOOD_GROUPS } from './constants';
import { useLifeLink } from './hooks/useLifeLink';
import BroadcastDashboard from './pages/BroadcastDashboard';
import CampsPage from './pages/CampsPage';
import { api } from './lib/api';

const BLOOD_BANKS = [
  { id: 1, name: "Lions Blood Bank", area: "Indiranagar", address: "Lions Blood Bank, 100 Feet Road, Indiranagar, Bengaluru", lat: 12.9784, lng: 77.6408, phone: "+91 9876543210", status: "open", units: { 'O+': 12, 'B+': 5, 'AB-': 0, 'A-': 2 } },
  { id: 2, name: "Rotary TTK Blood Bank", area: "Koramangala", address: "Rotary TTK Blood Bank, Koramangala, Bengaluru", lat: 12.9352, lng: 77.6245, phone: "+91 9876543211", status: "open", units: { 'O+': 3, 'B+': 15, 'AB-': 1, 'A-': 5 } },
  { id: 3, name: "Apollo Hospitals Blood Center", area: "Jayanagar", address: "Apollo Hospitals, Jayanagar, Bengaluru", lat: 12.9308, lng: 77.5838, phone: "+91 9876543212", status: "open", units: { 'O+': 8, 'B+': 8, 'AB-': 2, 'A-': 0 } },
  { id: 4, name: "Red Cross Blood Bank", area: "Majestic", address: "Indian Red Cross Blood Bank, Queen's Road, Bengaluru", lat: 12.9767, lng: 77.5713, phone: "+91 9876543213", status: "closed", units: { 'O+': 20, 'B+': 10, 'AB-': 0, 'A-': 1 } },
  { id: 5, name: "Fortis Blood Centre", area: "Bannerghatta", address: "Fortis Hospital, Bannerghatta Road, Bengaluru", lat: 12.8942, lng: 77.6100, phone: "+91 9876543214", status: "open", units: { 'O+': 5, 'B+': 2, 'AB-': 3, 'A-': 4 } },
];

const NEARBY_HOSPITALS = [
  { id: 'h1', name: "Manipal Hospital", area: "Old Airport Road", address: "Manipal Hospital, Old Airport Road, Bengaluru", lat: 12.9981, lng: 77.5925 },
  { id: 'h2', name: "Sakra World Hospital", area: "Devarabeesanahalli", address: "Sakra World Hospital, Bellandur, Bengaluru", lat: 12.9315, lng: 77.6834 },
  { id: 'h3', name: "Aster CMI Hospital", area: "Hebbal", address: "Aster CMI Hospital, Hebbal, Bengaluru", lat: 12.9797, lng: 77.5929 },
];

const DONORS = [
  { id: 1, name: "A*** S.", group: "AB-", distance: "1.2 km", lat: 12.9750, lng: 77.6350, lastDonated: "4 months ago", verified: true, available: true },
  { id: 2, name: "R*** K.", group: "O-", distance: "3.5 km", lat: 12.9400, lng: 77.6100, lastDonated: "6 months ago", verified: true, available: true },
  { id: 3, name: "V*** M.", group: "B-", distance: "2.1 km", lat: 12.9600, lng: 77.5850, lastDonated: "2 months ago", verified: false, available: false },
];

const EMERGENCIES = [
  { id: 1, hospital: "Manipal Hospital", group: "O-", units: 2, urgency: "Critical", time: "10 mins ago", patient: "Rajesh K.", contact: "+91 98765 43210" },
  { id: 2, hospital: "Sakra World Hospital", group: "AB+", units: 1, urgency: "Urgent", time: "25 mins ago", patient: "Sita M.", contact: "+91 98765 43211" },
  { id: 3, hospital: "Aster CMI", group: "A-", units: 3, urgency: "Stable", time: "1 hour ago", patient: "Amit S.", contact: "+91 98765 43212" },
];

function Navbar({ currentPage, isLoggedIn, user, navigate, dbUser, onlineCount }) {
  return (
    <nav className="sticky top-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center cursor-pointer" onClick={() => navigate('home')}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-crimson/20 text-crimson animate-pulse-ring">
              <Droplet className="w-6 h-6 fill-crimson" />
            </div>
            <span className="ml-3 font-heading text-2xl font-bold tracking-tight text-white">LifeLink</span>
          </div>
          <div className="hidden md:flex space-x-6 items-center">
            <button onClick={() => navigate('home')} className={`nav-link-pop text-sm font-semibold ${currentPage === 'home' ? 'text-crimson' : 'text-gray-300 hover:text-white'}`}>Home</button>
            <button onClick={() => navigate('search')} className={`nav-link-pop text-sm font-semibold ${currentPage === 'search' ? 'text-crimson' : 'text-gray-300 hover:text-white'}`}>Find Blood</button>
            <button onClick={() => navigate('donate')} className={`nav-link-pop text-sm font-semibold ${currentPage === 'donate' ? 'text-crimson' : 'text-gray-300 hover:text-white'}`}>Donate</button>
            {isLoggedIn && (
              <>
                <button onClick={() => navigate('broadcast')} className={`nav-link-pop text-sm font-semibold ${currentPage === 'broadcast' ? 'text-crimson' : 'text-gray-300 hover:text-white'}`}>Broadcast</button>
                <button onClick={() => navigate('camps')} className={`nav-link-pop text-sm font-semibold ${currentPage === 'camps' ? 'text-crimson' : 'text-gray-300 hover:text-white'}`}>Camps</button>
                {onlineCount > 0 && (
                  <span className="text-[10px] text-emerald font-bold">{onlineCount} online</span>
                )}
              </>
            )}
            {!isLoggedIn ? (
              <button onClick={() => navigate('login')} className="btn-glow hover-pop bg-crimson hover:bg-red-600 text-white px-5 py-2 rounded-full font-bold flex items-center">
                <LogIn className="w-4 h-4 mr-2" /> Login
              </button>
            ) : (
              <div className="flex space-x-4 items-center">
                <button onClick={() => navigate('sos')} className="btn-glow hover-pop bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full font-bold flex items-center animate-[pulse_1s_ease-in-out_infinite]">
                  <ShieldAlert className="w-4 h-4 mr-2" /> SOS
                </button>
                <button onClick={() => navigate('profile')} className="hover-pop w-10 h-10 rounded-full border-2 border-crimson overflow-hidden bg-white flex items-center justify-center">
                  <img src={user?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.displayName || user?.email || 'U'}`} alt="Profile" className="w-full h-full object-cover" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

function Ticker({ liveBroadcasts = [] }) {
  const alerts = liveBroadcasts.length > 0
    ? liveBroadcasts.map(b => `${b.priority ? b.priority.toUpperCase() : 'URGENT'}: ${b.message}`)
    : [
        "URGENT: O- blood needed at Manipal Hospital, Bengaluru.",
        "CRITICAL: AB+ platelets required at Apollo Jayanagar.",
        "URGENT: A- blood needed at Sakra World Hospital."
      ];

  return (
    <div className="bg-red-900/40 border-b border-red-500/20 py-2 overflow-hidden flex items-center">
      <div className="w-full whitespace-nowrap animate-[marquee_25s_linear_infinite] flex space-x-8 text-sm font-medium text-red-200">
        {alerts.map((text, i) => (
          <span key={`a1-${i}`} className="flex items-center"><AlertTriangle className="w-4 h-4 mr-2 text-crimson" /> {text}</span>
        ))}
        {alerts.map((text, i) => (
          <span key={`a2-${i}`} className="flex items-center"><AlertTriangle className="w-4 h-4 mr-2 text-crimson" /> {text}</span>
        ))}
      </div>
    </div>
  );
}

function LoginPage({ navigate, showToast }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isRegister) {
        const userCredential = await registerWithEmail(email, password);
        await updateUserProfile(userCredential.user, name);
        showToast(`Account created successfully! Welcome ${name}`);
      } else {
        await loginWithEmail(email, password);
        showToast('Welcome back!');
      }
      navigate('home');
    } catch (error) {
      showToast(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setGoogleLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result.user) {
        showToast(`Welcome, ${result.user.displayName || 'donor'}!`);
        navigate('home');
        setGoogleLoading(false);
      } else if (result.method === 'redirect') {
        showToast('Redirecting to Google…');
      }
    } catch (error) {
      showToast(getAuthErrorMessage(error));
      setGoogleLoading(false);
    }
  };

  const handleGoogleRedirect = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogleRedirect();
      showToast('Opening Google sign-in…');
    } catch (error) {
      showToast(getAuthErrorMessage(error));
      setGoogleLoading(false);
    }
  };

  return (
    <div className="login-page min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 relative z-20">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-crimson/25 rounded-full blur-[100px] pointer-events-none" />
      
      <div className="login-panel w-full max-w-md relative z-30 rounded-3xl p-8 shadow-2xl border border-white/15 bg-zinc-950/92 backdrop-blur-xl">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-crimson/20 rounded-full flex items-center justify-center mb-4 text-crimson">
            <Droplet className="w-8 h-8 fill-crimson" />
          </div>
          <h2 className="text-4xl font-heading tracking-wide">{isRegister ? 'Join LifeLink' : 'Welcome Back'}</h2>
          <p className="text-gray-400 mt-2">Connect to save lives</p>
        </div>

        <div className="flex bg-black/40 p-1 rounded-full mb-6">
          <button onClick={() => setIsRegister(false)} className={`flex-1 py-2 rounded-full text-sm font-bold transition-colors ${!isRegister ? 'bg-crimson text-white' : 'text-gray-400'}`}>Login</button>
          <button onClick={() => setIsRegister(true)} className={`flex-1 py-2 rounded-full text-sm font-bold transition-colors ${isRegister ? 'bg-crimson text-white' : 'text-gray-400'}`}>Register</button>
        </div>

        <form className="space-y-4" onSubmit={handleAuth}>
          {isRegister && (
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" className="input-pop w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-crimson focus:outline-none" required />
          )}
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" className="input-pop w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-crimson focus:outline-none" required />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="input-pop w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-crimson focus:outline-none" required />
          
          {isRegister && (
            <div className="flex space-x-4">
              <select className="w-1/2 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-gray-400 focus:border-crimson focus:outline-none" required defaultValue="">
                <option value="" disabled>Blood Group</option>
                {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <input type="text" placeholder="City" className="w-1/2 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-crimson focus:outline-none" required />
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-glow hover-pop w-full bg-gradient-to-r from-crimson to-red-700 text-white font-bold py-3 rounded-xl hover:from-red-600 hover:to-red-800 shadow-[0_0_15px_rgba(239,68,68,0.4)] disabled:opacity-50">
            {loading ? 'Processing...' : (isRegister ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
            <div className="relative flex justify-center text-sm"><span className="px-2 bg-black text-gray-500">Or continue with</span></div>
          </div>
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={googleLoading || loading}
              className="flex-1 bg-white text-black font-bold py-3 rounded-xl flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {googleLoading ? 'Please wait…' : 'Continue with Google'}
            </button>
            <button
              type="button"
              onClick={handleGoogleRedirect}
              disabled={googleLoading || loading}
              className="flex-1 bg-black/60 text-gray-300 border border-white/15 font-medium py-3 rounded-xl hover:bg-black/80 hover:text-white transition-colors disabled:opacity-50 text-sm"
              title="Use if popup sign-in does not work"
            >
              Google (redirect)
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-500 text-center">
            Popup blocked? Use &quot;Google (redirect)&quot; instead.
          </p>
        </div>
      </div>
    </div>
  );
}

function BloodCellCanvas() {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    
    let width = canvas.width = canvas.offsetWidth;
    let height = canvas.height = canvas.offsetHeight;
    
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    
    window.addEventListener('resize', handleResize);
    
    // Create particles (translucent red blood cells)
    const particles = [];
    const particleCount = Math.min(25, Math.floor((width * height) / 40000));
    
    class Cell {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.radius = Math.random() * 8 + 6;
        this.speedX = (Math.random() - 0.5) * 0.3;
        this.speedY = (Math.random() - 0.5) * 0.3;
        this.opacity = Math.random() * 0.3 + 0.15;
        this.angle = Math.random() * Math.PI * 2;
        this.spin = (Math.random() - 0.5) * 0.01;
      }
      
      update(mouseX, mouseY) {
        this.x += this.speedX;
        this.y += this.speedY;
        this.angle += this.spin;
        
        // Wrap around edge
        if (this.x < -this.radius * 2) this.x = width + this.radius * 2;
        if (this.x > width + this.radius * 2) this.x = -this.radius * 2;
        if (this.y < -this.radius * 2) this.y = height + this.radius * 2;
        if (this.y > height + this.radius * 2) this.y = -this.radius * 2;
        
        // Mouse avoidance
        if (mouseX !== null && mouseY !== null) {
          const dx = this.x - mouseX;
          const dy = this.y - mouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            const force = (100 - dist) / 100;
            this.x += (dx / dist) * force * 1.2;
            this.y += (dy / dist) * force * 1.2;
          }
        }
      }
      
      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        
        // Radial gradient for 3D-like red blood cell biconcave shape
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
        gradient.addColorStop(0, '#580505'); // dark center pocket
        gradient.addColorStop(0.3, '#dc2626'); // bright middle ring
        gradient.addColorStop(0.8, '#ef4444'); // outer body
        gradient.addColorStop(1, 'rgba(239, 68, 68, 0)'); // fade out edge
        
        ctx.fillStyle = gradient;
        ctx.globalAlpha = this.opacity;
        
        ctx.beginPath();
        // Squashed circle (ellipse) for 3D tilt
        ctx.ellipse(0, 0, this.radius, this.radius * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Subtle outer glow
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 4;
        ctx.globalAlpha = this.opacity * 0.25;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radius, this.radius * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      }
    }
    
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Cell());
    }
    
    let mouseX = null;
    let mouseY = null;
    
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    };
    
    const handleMouseLeave = () => {
      mouseX = null;
      mouseY = null;
    };
    
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);
    
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      particles.forEach(p => {
        p.update(mouseX, mouseY);
        p.draw();
      });
      
      animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (canvas) {
        canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, []);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full pointer-events-auto"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}

function HomePage({ navigate, searchGroup, setSearchGroup, searchUrgency, setSearchUrgency, liveBroadcasts = [], setPreselectedBloodGroup }) {
  const [camps, setCamps] = useState([]);
  
  useEffect(() => {
    api.upcomingCamps().then(data => setCamps(data.camps || [])).catch(() => {});
  }, []);

  return (
    <div className="space-y-16 pb-16">
      <Ticker liveBroadcasts={liveBroadcasts} />
      
      <section className="relative px-6 py-16 text-center max-w-5xl mx-auto mt-6 rounded-3xl overflow-hidden border border-white/15 bg-black/30 backdrop-blur-md shadow-2xl flex flex-col items-center justify-center min-h-[480px] hover-pop">
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/70 -z-10 pointer-events-none"></div>
        <BloodCellCanvas />

        {/* Content Container */}
        <div className="relative z-10 max-w-3xl mx-auto pointer-events-auto">
          <div className="inline-block px-4 py-1.5 rounded-full bg-crimson/15 border border-crimson/30 text-crimson text-sm font-bold mb-6 backdrop-blur-md animate-pulse">
            Every drop counts.
          </div>
          <h1 className="text-6xl md:text-8xl font-heading font-extrabold leading-none mb-6">
            <span className="text-gradient-hero drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)]">Save a Life.</span><br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-crimson via-red-400 to-orange-400 animate-floatGlow inline-block">Be a Hero.</span>
          </h1>
          <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
            Connect with blood seekers and donors in real-time. Join the emergency network that delivers life-saving blood when it matters most.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <button onClick={() => navigate('search')} className="btn-glow hover-pop bg-crimson hover:bg-red-600 text-white px-8 py-4 rounded-full font-bold text-lg shadow-[0_0_20px_rgba(239,68,68,0.5)] flex items-center justify-center">
              <Search className="w-5 h-5 mr-2" /> Find Blood NOW
            </button>
            <button onClick={() => navigate('donate')} className="btn-glow hover-pop bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-full font-bold text-lg backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <HeartPulse className="w-5 h-5 mr-2" /> Donate Blood
            </button>
          </div>
        </div>
      </section>

      <section className="px-4 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
          {[
            { label: 'Total Donors', value: '12,450', color: 'text-white' },
            { label: 'Units Available', value: '840', color: 'text-emerald' },
            { label: 'Lives Saved', value: '45,200', color: 'text-crimson' },
            { label: 'Active Requests', value: '34', color: 'text-violet' },
          ].map((stat, i) => (
            <div key={i} className="glass-premium interactive-card rounded-2xl p-6 text-center shadow-lg border border-white/10 animate-cardEntrance" style={{ animationDelay: `${i * 100}ms` }}>
              <div className={`text-4xl md:text-5xl font-heading ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-gray-400 font-medium uppercase tracking-wider mt-2">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 max-w-4xl mx-auto">
        <div className="glass-premium rounded-3xl p-8 border border-white/10 shadow-2xl animate-cardEntrance" style={{ animationDelay: '300ms' }}>
          <h3 className="text-2xl font-heading mb-6 text-center">Quick Blood Search</h3>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 mb-8">
            {BLOOD_GROUPS.map(g => (
              <button 
                key={g} 
                onClick={() => setSearchGroup(g)}
                className={`hover-pop aspect-square rounded-2xl flex flex-col items-center justify-center border transition-all duration-300 ${searchGroup === g ? 'bg-crimson border-crimson text-white scale-110 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-black/50 border-white/10 text-gray-400 hover:border-crimson/50 hover:text-white'}`}
              >
                <Droplet className={`w-6 h-6 mb-1 ${searchGroup === g ? 'fill-white' : ''}`} />
                <span className="font-bold">{g}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex space-x-2 bg-black/50 p-1 rounded-full border border-white/10">
              {['Stable', 'Urgent', 'Critical'].map(u => (
                <button 
                  key={u} 
                  onClick={() => setSearchUrgency(u)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 ${searchUrgency === u ? (u === 'Critical' ? 'bg-red-600 text-white shadow-[0_0_10px_rgba(220,38,38,0.4)]' : u === 'Urgent' ? 'bg-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.4)]' : 'bg-emerald text-white shadow-[0_0_10px_rgba(16,185,129,0.4)]') : 'text-gray-400 hover:text-white'}`}
                >
                  {u}
                </button>
              ))}
            </div>
            <button 
              onClick={() => navigate('search')}
              disabled={!searchGroup}
              className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-crimson hover:text-white hover:shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Search Availability
            </button>
          </div>
        </div>
      </section>

      <section className="px-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-3xl font-heading">Live Emergency Feed</h3>
          <div className="flex items-center text-sm text-gray-400"><span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span> Auto-updating</div>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {(liveBroadcasts.length > 0 ? liveBroadcasts.map((b, i) => ({
            id: b.broadcastId || i,
            hospital: b.alertType === 'hospital' ? 'Hospital Request' : 'Emergency Need',
            group: b.bloodType || 'Any',
            urgency: b.priority ? b.priority.charAt(0).toUpperCase() + b.priority.slice(1) : 'Urgent',
            time: 'Just now',
            patient: b.message,
            contact: 'Check app for details',
            units: 'Needed'
          })) : EMERGENCIES).map((e, index) => (
            <div key={e.id} className="glass-premium interactive-card rounded-2xl p-6 relative overflow-hidden group border border-white/10 shadow-lg animate-cardEntrance" style={{ animationDelay: `${index * 150}ms` }}>
              <div className={`absolute top-0 left-0 w-1.5 h-full ${e.urgency === 'Critical' || e.urgency === 'critical' ? 'bg-red-500 animate-pulse' : e.urgency === 'Urgent' || e.urgency === 'urgent' ? 'bg-orange-500' : 'bg-emerald'}`}></div>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-black/50 border border-white/10 rounded-full flex items-center justify-center font-heading text-xl text-crimson">
                    {e.group}
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">{e.hospital}</h4>
                    <span className="text-xs text-gray-400 flex items-center"><Clock className="w-3 h-3 mr-1"/> {e.time}</span>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-bold ${e.urgency === 'Critical' || e.urgency === 'critical' ? 'bg-red-500/20 text-red-500 shadow-[0_0_5px_rgba(239,68,68,0.2)]' : e.urgency === 'Urgent' || e.urgency === 'urgent' ? 'bg-orange-500/20 text-orange-500' : 'bg-emerald/20 text-emerald'}`}>
                  {e.urgency}
                </div>
              </div>
              <div className="mt-4 bg-black/30 p-3 rounded-lg border border-white/5 space-y-1">
                <p className="text-sm text-gray-300 line-clamp-2">{e.patient}</p>
                <p className="text-sm text-gray-300 flex items-center"><Phone className="w-3 h-3 mr-2 text-gray-500"/> {e.contact}</p>
              </div>
              <div className="flex justify-between items-center mt-6">
                <span className="text-sm font-medium">{e.units} Units Required</span>
                <button 
                  onClick={() => {
                    if (setPreselectedBloodGroup && e.group && e.group !== 'Any' && e.group !== 'any') {
                      setPreselectedBloodGroup(e.group);
                    } else if (setPreselectedBloodGroup) {
                      setPreselectedBloodGroup('');
                    }
                    navigate('donate');
                  }}
                  className="text-sm font-bold text-crimson hover:text-red-400 flex items-center transition-colors"
                >
                  Donate <ChevronRight className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {camps.length > 0 && (
        <section className="px-4 max-w-7xl mx-auto">
          <h3 className="text-3xl font-heading mb-6 flex items-center"><Calendar className="w-6 h-6 mr-3 text-violet" /> Upcoming Blood Camps</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {camps.map(camp => (
              <div key={camp.id} className="glass-premium rounded-2xl p-5 border border-violet-500/30 shadow-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <Calendar className="w-24 h-24 text-violet" />
                </div>
                <div className="relative z-10">
                  <div className="inline-block px-3 py-1 bg-violet-500/20 text-violet-300 text-xs font-bold rounded-full mb-3 border border-violet-500/30">
                    {new Date(camp.camp_date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <h4 className="text-xl font-bold text-white mb-2">{camp.title}</h4>
                  <p className="text-sm text-gray-300 mb-4 line-clamp-2">{camp.description}</p>
                  
                  <div className="bg-black/50 p-3 rounded-xl border border-white/10 mb-4">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Location</p>
                    <p className="text-sm font-medium text-white flex items-start">
                      <MapPin className="w-4 h-4 mr-1 text-crimson shrink-0 mt-0.5" />
                      {camp.address}
                    </p>
                  </div>
                  
                  <div className="mt-4 rounded-xl overflow-hidden border border-white/10 h-32 relative">
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      style={{ border: 0 }}
                      src={`https://www.google.com/maps?q=${camp.lat},${camp.lng}&z=15&output=embed`}
                      allowFullScreen
                    ></iframe>
                  </div>
                  
                  <div className="mt-5 pt-4 border-t border-white/10 flex justify-between items-center">
                    <div className="flex gap-1 flex-wrap">
                      {(camp.blood_types_needed || []).map(bt => (
                        <span key={bt} className="text-[10px] font-bold bg-white/10 px-2 py-1 rounded text-gray-300 border border-white/20">{bt}</span>
                      ))}
                    </div>
                    <button onClick={() => navigate('camps')} className="text-sm font-bold text-violet hover:text-white transition-colors">Register →</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SearchResultsPage({ searchGroup, searchUrgency, navigate, showToast }) {
  const isRare = ['AB-', 'B-', 'A-', 'O-'].includes(searchGroup);
  const [userLocation, setUserLocation] = useState(null);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState(null);
  const [selectedMapId, setSelectedMapId] = useState(null);
  const [routeTarget, setRouteTarget] = useState(null);
  const [googleBanks, setGoogleBanks] = useState([]);
  const [googleHospitals, setGoogleHospitals] = useState([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placesError, setPlacesError] = useState(null);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser.');
      return;
    }
    setLocLoading(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocLoading(false);
        showToast('Showing nearest locations from your position');
      },
      (err) => {
        setLocLoading(false);
        setLocError(
          err.code === 1
            ? 'Location permission denied. Enable location or we will use Bengaluru center.'
            : 'Could not detect location. Using Bengaluru as reference.'
        );
        setUserLocation(BENGALURU_CENTER);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    requestLocation();
  }, []);

  const sortCenter = userLocation ?? BENGALURU_CENTER;

  useEffect(() => {
    let cancelled = false;
    const loadPlaces = async () => {
      setPlacesLoading(true);
      setPlacesError(null);
      try {
        const { bloodBanks, hospitals } = await fetchNearbyFacilities(
          sortCenter.lat,
          sortCenter.lng
        );
        if (cancelled) return;
        setGoogleBanks(bloodBanks.length > 0 ? bloodBanks : BLOOD_BANKS);
        setGoogleHospitals(hospitals.length > 0 ? hospitals : NEARBY_HOSPITALS);
        if (bloodBanks.length === 0 && hospitals.length === 0) {
          setPlacesError('No Google results nearby — showing sample listings.');
        }
      } catch (e) {
        if (cancelled) return;
        console.error(e);
        setGoogleBanks(BLOOD_BANKS);
        setGoogleHospitals(NEARBY_HOSPITALS);
        setPlacesError(
          'Could not load live data from Google. Enable Places API on your API key, or check billing.'
        );
      } finally {
        if (!cancelled) setPlacesLoading(false);
      }
    };
    loadPlaces();
    return () => {
      cancelled = true;
    };
  }, [sortCenter.lat, sortCenter.lng]);

  const sortedBanks = sortByNearest(
    googleBanks.length > 0 ? googleBanks : BLOOD_BANKS,
    sortCenter.lat,
    sortCenter.lng
  );

  const sortedHospitals = sortByNearest(
    googleHospitals.length > 0 ? googleHospitals : NEARBY_HOSPITALS,
    sortCenter.lat,
    sortCenter.lng
  );

  const showRouteOnMap = (place) => {
    if (!userLocation) {
      showToast('Allow location access to show the route on the map');
      requestLocation();
      return;
    }
    setRouteTarget(place);
    setSelectedMapId(place.id);
    showToast(`Route to ${place.name} shown on map`);
  };

  const openInGoogleMaps = (place) => {
    window.open(getDirectionsUrl(place, userLocation), '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fadeIn">
      <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-heading">Find Blood Near You</h2>
          <p className="text-gray-400 mt-1">
            <span className="text-crimson font-bold">{searchGroup || 'All Groups'}</span>
            {' • '}
            Urgency: <span className="font-bold">{searchUrgency}</span>
            {sortedBanks[0]?.computedDistanceKm != null && (
              <span className="text-emerald ml-2">
                • Nearest: {sortedBanks[0].name} ({formatDistance(sortedBanks[0].computedDistanceKm)})
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={requestLocation}
            disabled={locLoading}
            className="px-4 py-2 bg-crimson/20 border border-crimson/40 text-crimson rounded-full text-sm font-bold hover:bg-crimson/30 disabled:opacity-50"
          >
            {locLoading ? 'Locating…' : 'Refresh my location'}
          </button>
          <button onClick={() => navigate('home')} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-sm font-medium transition-colors">
            Change Filters
          </button>
        </div>
      </div>

      {locError && (
        <p className="text-amber-400/90 text-sm mb-4 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2">{locError}</p>
      )}

      {placesError && (
        <p className="text-amber-400/90 text-sm mb-4 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2">{placesError}</p>
      )}

      {placesLoading && (
        <p className="text-gray-400 text-sm mb-4">Loading blood banks and hospitals from Google…</p>
      )}

      <div className="mb-8 relative z-0">
        <BloodBankMap
          bloodBanks={sortedBanks}
          hospitals={sortedHospitals}
          donors={DONORS}
          userLocation={userLocation}
          selectedId={selectedMapId}
          onSelectLocation={(id) => setSelectedMapId(id)}
        />
        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-400">
          <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-red-500 mr-2 shadow-[0_0_8px_#ef4444]" /> Blood bank</span>
          <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-blue-500 mr-2 shadow-[0_0_8px_#3b82f6]" /> Hospital</span>
          <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-emerald-500 mr-2 shadow-[0_0_8px_#10b981]" /> Active Donors</span>
          <span className="flex items-center"><span className="w-3 h-3 rounded-full bg-cyan-400 border border-white mr-2 shadow-[0_0_8px_#06b6d4]" /> You</span>
        </div>
      </div>

      {searchUrgency === 'Critical' && (
        <div className="bg-red-600/20 border border-red-500 rounded-2xl p-4 mb-8 flex items-center shadow-[0_0_15px_rgba(239,68,68,0.2)]">
          <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center mr-4 animate-pulse">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h4 className="font-bold text-white">Critical Alert</h4>
            <p className="text-sm text-red-200">Nearest blood banks and hospitals from Google are listed first. Tap Directions to see the driving route on the map.</p>
          </div>
        </div>
      )}

      <div className={`grid ${isRare ? 'md:grid-cols-2' : 'grid-cols-1'} gap-8`}>
        <div className="space-y-4">
          <h3 className="text-2xl font-heading mb-4 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-crimson"/> Blood Banks
            <span className="ml-2 text-sm font-sans text-gray-500 font-normal">(nearest first)</span>
          </h3>
          {sortedBanks.map((bank, index) => {
            const hasUnits = bank.units && searchGroup && bank.units[searchGroup] != null;
            const units = hasUnits ? bank.units[searchGroup] : null;
            const availabilityColor =
              units == null ? 'text-gray-400' : units > 5 ? 'text-emerald' : units > 0 ? 'text-orange-500' : 'text-red-500';
            const distLabel = bank.computedDistanceKm != null
              ? formatDistance(bank.computedDistanceKm)
              : bank.distance;
            return (
              <div
                key={bank.id}
                id={`bank-${bank.id}`}
                className={`glass-premium interactive-card rounded-2xl p-5 transition-all ${selectedMapId === bank.id ? 'ring-2 ring-crimson' : ''}`}
                onMouseEnter={() => setSelectedMapId(bank.id)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      {index === 0 && (
                        <span className="text-[10px] uppercase font-bold bg-emerald/20 text-emerald px-2 py-0.5 rounded-full border border-emerald/30">
                          Nearest
                        </span>
                      )}
                      <h4 className="font-bold text-lg">{bank.name}</h4>
                    </div>
                    <p className="text-sm text-gray-400">{bank.area} • {distLabel}</p>
                    <p className="text-xs text-gray-500 mt-1">{bank.address}</p>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${bank.status === 'open' ? 'bg-emerald/10 border-emerald/30 text-emerald' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                    {bank.status.toUpperCase()}
                  </div>
                </div>
                <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-4">
                    <div className="text-center">
                      <div className={`text-2xl font-heading ${availabilityColor}`}>
                        {units != null ? units : '—'}
                      </div>
                      <div className="text-xs text-gray-400 uppercase tracking-wide">
                        {units != null ? 'Units' : 'Call to check'}
                      </div>
                    </div>
                    <div className="h-8 w-px bg-white/10 hidden sm:block" />
                    {bank.phone && bank.phone !== 'Not listed' ? (
                      <a href={`tel:${bank.phone.replace(/[^\d+]/g, '')}`} className="text-sm font-medium hover:text-crimson">
                        <Phone className="w-4 h-4 inline mr-1 text-gray-400"/> {bank.phone}
                      </a>
                    ) : (
                      <span className="text-sm text-gray-500">
                        <Phone className="w-4 h-4 inline mr-1 text-gray-400"/> Phone not listed
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        const originStr = userLocation ? `&origin=${userLocation.lat},${userLocation.lng}` : '';
                        const url = `https://www.google.com/maps/dir/?api=1${originStr}&destination=${bank.lat},${bank.lng}&travelmode=driving`;
                        window.open(url, '_blank', 'noopener,noreferrer');
                      }}
                      className="btn-glow hover-pop px-6 py-2 bg-crimson text-white rounded-xl text-sm font-bold w-full sm:w-auto text-center"
                    >
                      Get Directions
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          <h3 className="text-2xl font-heading mb-4 mt-8 flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-blue-400"/> Nearby Hospitals
          </h3>
          {sortedHospitals.map((hospital, index) => (
            <div
              key={hospital.id}
              className={`glass-premium rounded-2xl p-5 border border-blue-500/20 ${selectedMapId === hospital.id ? 'ring-2 ring-blue-400' : ''}`}
              onMouseEnter={() => setSelectedMapId(hospital.id)}
            >
              <div className="flex justify-between items-start">
                <div>
                  {index === 0 && (
                    <span className="text-[10px] uppercase font-bold bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full border border-blue-500/30 mb-1 inline-block">
                      Nearest hospital
                    </span>
                  )}
                  <h4 className="font-bold text-lg">{hospital.name}</h4>
                  <p className="text-sm text-gray-400">
                    {hospital.area} • {formatDistance(hospital.computedDistanceKm)}
                  </p>
                  {hospital.address && (
                    <p className="text-xs text-gray-500 mt-1">{hospital.address}</p>
                  )}
                </div>
              </div>
              {hospital.phone && hospital.phone !== 'Not listed' && (
                <a
                  href={`tel:${hospital.phone.replace(/[^\d+]/g, '')}`}
                  className="text-sm font-medium hover:text-blue-300 mt-2 inline-block"
                >
                  <Phone className="w-4 h-4 inline mr-1 text-gray-400"/> {hospital.phone}
                </a>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const originStr = userLocation ? `&origin=${userLocation.lat},${userLocation.lng}` : '';
                    const url = `https://www.google.com/maps/dir/?api=1${originStr}&destination=${hospital.lat},${hospital.lng}&travelmode=driving`;
                    window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                  className="btn-glow hover-pop px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold text-center"
                >
                  Get Directions
                </button>
              </div>
            </div>
          ))}
        </div>

        {isRare && (
          <div className="space-y-4">
            <h3 className="text-2xl font-heading mb-4 flex items-center text-violet"><User className="w-5 h-5 mr-2"/> Rare Donors</h3>
            {DONORS.filter(d => !searchGroup || d.group === searchGroup).map(donor => (
              <div key={donor.id} className="bg-violet-900/10 border border-violet-500/30 rounded-2xl p-5">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-violet-600/20 text-violet flex items-center justify-center font-heading text-xl border border-violet-500/50">
                      {donor.group}
                    </div>
                    <div>
                      <h4 className="font-bold text-white flex items-center">
                        {donor.name} 
                        {donor.verified && <CheckCircle2 className="w-4 h-4 ml-1 text-blue-400" />}
                      </h4>
                      <p className="text-xs text-gray-400">{donor.distance} • Last donated: {donor.lastDonated}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-xs font-medium">
                    <span className={`w-2 h-2 rounded-full ${donor.available ? 'bg-emerald' : 'bg-gray-500'}`}></span>
                    <span className={donor.available ? 'text-emerald' : 'text-gray-500'}>{donor.available ? 'Available' : 'Unavailable'}</span>
                  </div>
                </div>
                <button 
                  disabled={!donor.available}
                  onClick={() => showToast('Contact request sent to donor.')}
                  className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-bold transition-colors border border-white/10 disabled:opacity-50"
                >
                  Request Contact
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProfilePage({ user, handleLogout, navigate, dbUser, syncProfile, showToast }) {
  const [phone, setPhone] = useState(dbUser?.phone || '');
  const [bloodType, setBloodType] = useState(dbUser?.blood_type || 'O+');
  const [role, setRole] = useState(dbUser?.role || 'admin');
  const [whatsapp, setWhatsapp] = useState(dbUser?.whatsapp_opt_in || false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(!dbUser?.phone);

  useEffect(() => {
    if (dbUser) {
      setPhone(dbUser.phone || '');
      setBloodType(dbUser.blood_type || 'O+');
      setRole(dbUser.role || 'admin');
      setWhatsapp(dbUser.whatsapp_opt_in || false);
      if (dbUser.phone) setEditMode(false);
    }
  }, [dbUser]);

  const saveProfile = async () => {
    if (!phone) {
      showToast('Phone number is required');
      return;
    }
    setSaving(true);
    try {
      await api.updateProfile({ phone, blood_type: bloodType, whatsapp_opt_in: whatsapp, role });
      await syncProfile({ phone, blood_type: bloodType, whatsapp_opt_in: whatsapp, role });
      if (user?.uid) {
        await saveUserProfileToFirestore(user.uid, {
          email: user.email || '',
          displayName: user.displayName || '',
          phone,
          blood_type: bloodType,
          whatsapp_opt_in: whatsapp,
          role,
        });
      }
      showToast('Profile saved & synced to Firebase!');
      setEditMode(false);
    } catch (err) {
      showToast(err.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fadeIn">
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-crimson/10 rounded-full blur-[80px]"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8 relative z-10">
          <div className="relative">
            <div className="w-32 h-32 rounded-full border-4 border-black overflow-hidden shadow-[0_0_0_2px_#ef4444] bg-white">
              <img src={user?.photoURL || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.displayName || user?.email || 'U'}`} alt="User" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-crimson text-white w-10 h-10 rounded-full flex items-center justify-center font-heading text-xl border-4 border-black">{bloodType}</div>
          </div>
          <div className="flex-1">
            <h2 className="text-4xl font-heading">{user?.displayName || 'Hero Donor'}</h2>
            <p className="text-gray-400">{user?.email}</p>
            <div className="mt-4 flex space-x-4">
              <div className="flex items-center px-3 py-1 bg-emerald/10 border border-emerald/30 rounded-full text-emerald text-sm font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald mr-2 animate-pulse"></span> {role?.toUpperCase() || 'DONOR'}
              </div>
              {!editMode && (
                <button onClick={() => setEditMode(true)} className="px-4 py-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full text-sm font-medium transition-colors">Edit Profile</button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-premium rounded-2xl p-6 mb-8 border border-white/10">
        <h3 className="text-xl font-heading mb-4">Live location & alerts</h3>
        <p className="text-sm text-gray-400 mb-4">GPS updates while logged in. Phone & blood type used for emergency broadcasts.</p>
        
        {editMode ? (
          <>
            <div className="grid sm:grid-cols-3 gap-4">
              <label className="block text-sm">
                Phone
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white" placeholder="+91…" />
              </label>
              <label className="block text-sm">
                Blood type
                <select value={bloodType} onChange={(e) => setBloodType(e.target.value)} className="w-full mt-1 bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white">
                  {BLOOD_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </label>
              <label className="block text-sm">
                User Role (for UI Testing)
                <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full mt-1 bg-crimson/10 border border-crimson/30 rounded-xl px-3 py-2 text-white font-bold focus:border-crimson">
                  <option value="donor" className="bg-zinc-950">Donor (Default)</option>
                  <option value="hospital_admin" className="bg-zinc-950">Hospital Admin (Hospital tab)</option>
                  <option value="blood_bank_manager" className="bg-zinc-950">Blood Bank Manager (Inventory tab)</option>
                  <option value="admin" className="bg-zinc-950">Admin (All tabs)</option>
                </select>
              </label>
            </div>
            <label className="flex items-center gap-2 mt-4 text-sm text-gray-300">
              <input type="checkbox" checked={whatsapp} onChange={(e) => setWhatsapp(e.target.checked)} />
              WhatsApp emergency alerts
            </label>
            <div className="flex flex-col sm:flex-row justify-between items-center mt-6 pt-4 border-t border-white/10 gap-4">
              <button onClick={handleLogout} className="w-full sm:w-auto px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm transition-colors shadow-[0_0_15px_rgba(220,38,38,0.4)]">
                Log Out
              </button>
              <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-3">
                {dbUser?.phone && (
                  <button type="button" onClick={() => {
                    setEditMode(false);
                    setPhone(dbUser.phone);
                    setBloodType(dbUser.blood_type);
                    setRole(dbUser.role);
                    setWhatsapp(dbUser.whatsapp_opt_in);
                  }} className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium text-sm">
                    Cancel
                  </button>
                )}
                <button type="button" onClick={saveProfile} disabled={saving} className="px-6 py-2 bg-crimson rounded-xl font-bold text-sm disabled:opacity-50">
                  {saving ? 'Saving…' : 'Save profile'}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4 bg-black/30 p-4 rounded-xl border border-white/5">
              <div><span className="text-xs text-gray-500 block uppercase">Phone</span><span className="font-medium text-white">{phone || 'Not set'}</span></div>
              <div><span className="text-xs text-gray-500 block uppercase">Blood Type</span><span className="font-medium text-white">{bloodType}</span></div>
              <div><span className="text-xs text-gray-500 block uppercase">Role</span><span className="font-medium text-white">{role?.toUpperCase()}</span></div>
            </div>
            {dbUser?.lat != null && (
              <p className="text-xs text-emerald flex items-center"><MapPin className="w-3 h-3 mr-1"/> GPS Active</p>
            )}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
              <div className="text-3xl font-heading text-crimson">4</div>
              <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">Donations</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
              <div className="text-3xl font-heading text-emerald">12</div>
              <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">Lives Saved</div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-heading mb-4">Achievements</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-500/50 mb-2">
                  <Award className="w-6 h-6" />
                </div>
                <span className="text-[10px] text-gray-400 text-center uppercase">First Drop</span>
              </div>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-crimson/20 text-crimson flex items-center justify-center border border-crimson/50 mb-2">
                  <HeartPulse className="w-6 h-6" />
                </div>
                <span className="text-[10px] text-gray-400 text-center uppercase">Life Saver</span>
              </div>
              <div className="flex flex-col items-center opacity-30 grayscale">
                <div className="w-12 h-12 rounded-full bg-gray-500/20 text-gray-500 flex items-center justify-center border border-gray-500/50 mb-2">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <span className="text-[10px] text-gray-400 text-center uppercase">Rare Hero</span>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-2">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-heading">Donation History</h3>
              <button onClick={() => navigate('certificate')} className="text-sm text-crimson hover:text-white font-medium flex items-center">
                <FileText className="w-4 h-4 mr-1"/> View Certificates
              </button>
            </div>
            
            <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/20 before:to-transparent">
              {[
                { date: "Oct 12, 2023", location: "Lions Blood Bank", type: "Whole Blood" },
                { date: "Mar 05, 2023", location: "Apollo Hospitals", type: "Whole Blood" },
                { date: "Aug 20, 2022", location: "Rotary TTK", type: "Whole Blood" },
              ].map((item, i) => (
                <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-black bg-crimson text-white shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                    <Droplet className="w-4 h-4 fill-white" />
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-black/50 border border-white/10 p-4 rounded-xl">
                    <div className="flex justify-between mb-1">
                      <span className="font-bold text-white">{item.location}</span>
                      <span className="text-xs text-crimson font-bold">{item.date}</span>
                    </div>
                    <p className="text-sm text-gray-400">{item.type} Donation</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DonateWizard({ navigate, user, showToast, preselectedBloodGroup, setPreselectedBloodGroup }) {
  const [step, setStep] = useState(1);
  const [donorName, setDonorName] = useState(user?.displayName || '');
  const [bloodGroup, setBloodGroup] = useState(preselectedBloodGroup || '');
  
  // Selection states
  const [selectedBank, setSelectedBank] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [donationType, setDonationType] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  
  const [nearestFacilities, setNearestFacilities] = useState([]);
  const [locLoading, setLocLoading] = useState(false);
  const [locError, setLocError] = useState('');
  const [validationError, setValidationError] = useState('');

  const steps = ['Details', 'Location', 'Schedule', 'Confirm'];

  useEffect(() => {
    if (user?.displayName) setDonorName(user.displayName);
  }, [user]);

  // Sync preselected blood group from parent App
  useEffect(() => {
    if (preselectedBloodGroup) {
      setBloodGroup(preselectedBloodGroup);
    }
  }, [preselectedBloodGroup]);

  // Load facilities sorted by distance
  useEffect(() => {
    if (step === 2) {
      setLocLoading(true);
      setLocError('');
      
      const computeAndSetFacilities = (lat, lng) => {
        const combined = [
          ...BLOOD_BANKS.map(b => ({ ...b, type: 'Blood Bank' })),
          ...NEARBY_HOSPITALS.map(h => ({ ...h, type: 'Hospital' }))
        ];
        const calculated = combined.map(item => {
          const dist = distanceKm(lat, lng, item.lat, item.lng);
          return { ...item, distanceKm: dist };
        }).sort((a, b) => a.distanceKm - b.distanceKm);
        setNearestFacilities(calculated);
        setLocLoading(false);
      };

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            computeAndSetFacilities(pos.coords.latitude, pos.coords.longitude);
          },
          (err) => {
            setLocError('GPS access denied. Sorting facilities from city center.');
            computeAndSetFacilities(BENGALURU_CENTER.lat, BENGALURU_CENTER.lng);
          },
          { enableHighAccuracy: true, timeout: 8000 }
        );
      } else {
        setLocError('Geolocation not supported. Sorting from city center.');
        computeAndSetFacilities(BENGALURU_CENTER.lat, BENGALURU_CENTER.lng);
      }
    }
  }, [step]);

  const handleContinue = () => {
    if (step === 1) {
      if (!donorName.trim()) {
        showToast('Please enter your full name');
        return;
      }
      if (!bloodGroup) {
        showToast('Please select your blood group');
        return;
      }
    }
    if (step === 2) {
      if (!selectedBank) {
        showToast('Please select a Blood Bank or Hospital to continue');
        return;
      }
    }
    if (step === 3) {
      if (!selectedDate) {
        showToast('Please select a donation date');
        return;
      }
      if (!donationType) {
        showToast('Please select a donation type');
        return;
      }
      if (!selectedTime) {
        showToast('Please select a time slot');
        return;
      }
    }
    setStep((s) => Math.min(4, s + 1));
  };

  const handleViewDashboard = () => {
    if (!selectedBank || !selectedDate || !donationType || !selectedTime) {
      setValidationError('Please select an option to continue.');
      return;
    }
    setValidationError('');
    if (setPreselectedBloodGroup) {
      setPreselectedBloodGroup(''); // Clear preselected group
    }
    navigate('profile');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h2 className="text-4xl font-heading text-center mb-8">Schedule Donation</h2>
      
      <div className="flex justify-between items-center mb-12 relative">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-white/10 -translate-y-1/2 -z-10"></div>
        <div className="absolute top-1/2 left-0 h-1 bg-crimson -translate-y-1/2 -z-10 transition-all duration-500" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
        {steps.map((s, i) => (
          <div key={s} className="flex flex-col items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-black transition-colors ${step >= i + 1 ? 'bg-crimson text-white' : 'bg-gray-800 text-gray-500'}`}>
              {step > i + 1 ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
            </div>
            <span className={`text-xs mt-2 font-medium uppercase tracking-wide ${step >= i + 1 ? 'text-white' : 'text-gray-500'}`}>{s}</span>
          </div>
        ))}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-sm min-h-[400px]">
        {step === 1 && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="text-2xl font-heading mb-6">Health Declaration</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <input
                type="text"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
                placeholder="Full name"
                className="input-pop w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-crimson outline-none"
                required
              />
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className={`input-pop w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 focus:border-crimson outline-none appearance-none cursor-pointer ${bloodGroup ? 'text-white' : 'text-gray-400'}`}
                required
              >
                <option value="" disabled>Select blood group</option>
                {BLOOD_GROUPS.map((g) => (
                  <option key={g} value={g} className="bg-black text-white">
                    {g}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              {[
                "I am feeling well and healthy today.",
                "I have not donated blood in the last 3 months.",
                "I am not currently taking antibiotics.",
                "I weigh at least 50 kg."
              ].map((q, i) => (
                <label key={i} className="flex items-center space-x-3 p-3 border border-white/5 rounded-xl hover:bg-white/5 cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 rounded border-gray-600 text-crimson focus:ring-crimson focus:ring-offset-black bg-black" defaultChecked />
                  <span className="text-sm text-gray-300">{q}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <h3 className="text-2xl font-heading mb-4">Select Blood Bank or Hospital</h3>
            {locLoading && <p className="text-sm text-gray-400">Locating closest facilities using GPS…</p>}
            {locError && <p className="text-sm text-amber-400/90 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2">{locError}</p>}
            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
              {nearestFacilities.map(facility => (
                <div 
                  key={facility.id} 
                  onClick={() => setSelectedBank(facility)} 
                  className={`glass-premium hover-pop rounded-xl p-4 flex justify-between items-center cursor-pointer border transition-all ${
                    selectedBank?.id === facility.id 
                      ? 'border-crimson bg-crimson/5 shadow-[0_0_15px_rgba(239,68,68,0.1)]' 
                      : 'border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center shrink-0">
                      <MapPin className={`w-5 h-5 ${facility.type === 'Hospital' ? 'text-blue-400' : 'text-crimson'}`} />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-sm">{facility.name}</h4>
                      <p className="text-xs text-gray-400">{facility.area} • {facility.distanceKm ? `${facility.distanceKm.toFixed(1)} km away` : facility.distance}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                    facility.type === 'Hospital' ? 'bg-blue-500/10 border-blue-500/30 text-blue-300' : 'bg-red-500/10 border-red-500/30 text-crimson'
                  }`}>
                    {facility.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-fadeIn">
            <h3 className="text-2xl font-heading mb-6">Schedule Slot & Type</h3>
            
            <div className="bg-black/50 border border-white/10 p-4 rounded-xl mb-4">
              <span className="text-xs text-gray-400 block mb-1">Selected Location:</span>
              <span className="font-bold text-white flex items-center"><MapPin className="w-4 h-4 mr-2 text-crimson"/> {selectedBank?.name} ({selectedBank?.area})</span>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <label className="block text-sm">
                <span className="text-gray-400 block mb-1">Select Date</span>
                <input 
                  type="date" 
                  value={selectedDate} 
                  onChange={(e) => setSelectedDate(e.target.value)} 
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-crimson outline-none"
                  required
                />
              </label>
              <label className="block text-sm">
                <span className="text-gray-400 block mb-1">Donation Type</span>
                <select 
                  value={donationType} 
                  onChange={(e) => setDonationType(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-crimson outline-none appearance-none cursor-pointer"
                  required
                >
                  <option value="" disabled>Select type</option>
                  <option value="Whole Blood">Whole Blood</option>
                  <option value="Plasma">Plasma</option>
                  <option value="Platelets">Platelets</option>
                </select>
              </label>
            </div>

            <div>
              <span className="text-sm text-gray-400 block mb-2">Select Time Slot</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {['09:00 AM', '10:30 AM', '12:00 PM', '02:00 PM', '03:30 PM', '05:00 PM'].map(time => (
                  <button 
                    key={time} 
                    type="button"
                    onClick={() => setSelectedTime(time)} 
                    className={`py-3 border rounded-xl text-sm font-medium transition-colors ${
                      selectedTime === time 
                        ? 'bg-crimson border-crimson text-white shadow-[0_0_10px_rgba(239,68,68,0.3)]' 
                        : 'border-white/10 text-gray-300 hover:bg-white/5'
                    }`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="text-center py-8 animate-fadeIn">
            <div className="w-20 h-20 bg-emerald/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
              <div className="absolute inset-0 border-4 border-emerald rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-20"></div>
              <CheckCircle2 className="w-10 h-10 text-emerald" />
            </div>
            <h3 className="text-3xl font-heading mb-2">Appointment Scheduled!</h3>
            <p className="text-gray-400 mb-6 max-w-md mx-auto text-sm">Thank you for stepping up to save lives. Below are your booking details:</p>
            
            <div className="bg-black/50 border border-white/10 rounded-xl p-5 inline-block text-left mb-6 w-full max-w-md">
              <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div><span className="text-gray-500 text-xs uppercase block">Date & Time</span><span className="font-bold">{selectedDate} at {selectedTime}</span></div>
                <div><span className="text-gray-500 text-xs uppercase block">Location</span><span className="font-bold truncate block">{selectedBank?.name}</span></div>
                <div><span className="text-gray-500 text-xs uppercase block">Donation Type</span><span className="font-bold">{donationType}</span></div>
                <div><span className="text-gray-500 text-xs uppercase block">Booking ID</span><span className="font-bold text-crimson">#LL-9824X</span></div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <button 
                  onClick={handleViewDashboard} 
                  className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors shadow-lg"
                >
                  View Dashboard
                </button>
              </div>
              {validationError && (
                <p className="text-red-500 text-sm font-semibold animate-shake">{validationError}</p>
              )}
            </div>
          </div>
        )}

        {step < 4 && (
          <div className="mt-8 flex justify-between border-t border-white/10 pt-6">
            <button 
              onClick={() => setStep(Math.max(1, step - 1))}
              className={`px-6 py-2 rounded-full font-bold transition-colors ${step === 1 ? 'opacity-0 pointer-events-none' : 'text-gray-400 hover:text-white bg-white/5'}`}
            >
              Back
            </button>
            <button 
              onClick={handleContinue}
              className="btn-glow hover-pop px-8 py-2 bg-crimson text-white rounded-full font-bold hover:bg-red-600 transition-colors"
            >
              {step === 3 ? 'Confirm Booking' : 'Continue'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CertificatePage({ showToast }) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12 flex flex-col items-center animate-fadeIn">
      <div className="w-full flex justify-end space-x-4 mb-6">
        <button className="flex items-center px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-sm font-medium transition-colors">
          <Share2 className="w-4 h-4 mr-2" /> Share
        </button>
        <button onClick={() => showToast('Downloading PDF...')} className="flex items-center px-4 py-2 bg-crimson hover:bg-red-600 rounded-full text-sm font-bold text-white transition-colors">
          <Download className="w-4 h-4 mr-2" /> Download PDF
        </button>
      </div>

      <div className="w-full aspect-[1.4/1] bg-white text-black p-8 md:p-12 relative shadow-2xl overflow-hidden">
        <div className="absolute inset-0 border-[12px] border-[#c0a062] m-4 pointer-events-none"></div>
        <div className="absolute inset-0 border-2 border-[#c0a062]/50 m-6 pointer-events-none"></div>
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-red-50 rounded-full opacity-50 blur-3xl pointer-events-none"></div>

        <div className="relative h-full flex flex-col items-center justify-between text-center z-10">
          <div className="space-y-2">
            <div className="flex items-center justify-center text-red-700 mb-2">
              <Droplet className="w-8 h-8 fill-red-700 mr-2" />
              <span className="font-heading text-3xl tracking-widest">LIFELINK</span>
            </div>
            <h1 className="font-heading text-5xl md:text-6xl text-[#c0a062] tracking-wider uppercase">Certificate of Appreciation</h1>
          </div>

          <div className="space-y-4">
            <p className="text-gray-600 italic font-serif">This certificate is proudly presented to</p>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 border-b-2 border-[#c0a062] pb-2 inline-block px-8">
              Vikram Sharma
            </h2>
            <p className="text-gray-600 max-w-xl mx-auto mt-4 text-sm md:text-base leading-relaxed">
              For your selfless act of humanity and outstanding contribution to the community by donating <strong className="text-red-700">O+ Blood</strong>. Your noble gesture has given the gift of life.
            </p>
          </div>

          <div className="w-full flex justify-between items-end px-12 mt-8">
            <div className="text-center">
              <div className="border-b border-gray-400 w-32 mb-2 font-serif italic text-xl">Oct 12, 2023</div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Date of Donation</p>
            </div>
            
            <div className="w-24 h-24 rounded-full border-4 border-[#c0a062] flex items-center justify-center bg-red-50 text-red-700 font-heading text-2xl rotate-12 shadow-lg">
              Official<br/>Seal
            </div>

            <div className="text-center">
              <div className="border-b border-gray-400 w-32 mb-2 font-serif italic text-xl text-blue-900">Dr. R. Menon</div>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Medical Director</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmergencySOS({ navigate, dbUser, user, showToast }) {
  const [status, setStatus] = useState('idle');
  const [timeLeft, setTimeLeft] = useState(180);
  const [sosDetails, setSosDetails] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const activateSOS = () => {
    if (!navigator.geolocation) {
      showToast('Geolocation is not supported by your browser.');
      return;
    }

    setStatus('locating');
    setErrorMsg('');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        try {
          const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/users/sos`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${await auth.currentUser.getIdToken()}`,
            },
            body: JSON.stringify({ lat, lng }),
          });
          const data = await res.json();
          if (res.ok) {
            setSosDetails(data);
            setStatus('found');
          } else {
            setErrorMsg(data.error || 'Failed to trigger SOS.');
            setStatus('idle');
          }
        } catch (err) {
          setErrorMsg('Server connection failed. Could not trigger SOS.');
          setStatus('idle');
        }
      },
      (err) => {
        setErrorMsg('Location access is required to activate SOS. Please enable GPS.');
        setStatus('idle');
        showToast('Please enable GPS to trigger SOS.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    let timer;
    if (status === 'found') {
      timer = setInterval(() => setTimeLeft(t => (t > 0 ? t - 1 : 0)), 1000);
    }
    return () => clearInterval(timer);
  }, [status]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4 relative overflow-hidden bg-red-950/20">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/30 via-black to-black -z-10"></div>
      
      {status === 'idle' && (
        <div className="text-center animate-cardEntrance max-w-md mx-auto">
          <h2 className="text-5xl font-heading text-red-500 mb-4 tracking-widest drop-shadow-[0_0_15px_rgba(239,68,68,0.3)]">EMERGENCY MODE</h2>
          <p className="text-gray-400 mb-6 font-medium">Tap the button below to instantly alert nearby blood banks, hospitals, and emergency contacts of a critical emergency.</p>
          
          {errorMsg && (
            <p className="text-red-500 font-semibold mb-6 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{errorMsg}</p>
          )}

          <button 
            onClick={activateSOS}
            className="relative group cursor-pointer"
          >
            {/* Cascading Pulse Rings */}
            <div className="absolute inset-0 bg-red-600 rounded-full animate-ripple"></div>
            <div className="absolute inset-0 bg-red-600 rounded-full animate-ripple" style={{ animationDelay: '0.5s' }}></div>
            <div className="absolute inset-0 bg-red-600 rounded-full animate-ripple" style={{ animationDelay: '1s' }}></div>
            
            <div className="relative w-48 h-48 bg-gradient-to-b from-red-500 to-red-800 rounded-full flex items-center justify-center border-8 border-red-950 shadow-[0_0_50px_rgba(220,38,38,0.7)] group-hover:scale-105 transition-transform duration-300">
              <span className="font-heading text-6xl text-white tracking-widest drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">SOS</span>
            </div>
          </button>
        </div>
      )}

      {status === 'locating' && (
        <div className="text-center relative flex flex-col items-center justify-center min-h-[300px] animate-fadeIn">
          {/* Radar Waves */}
          <div className="absolute w-80 h-80 border border-red-500/20 rounded-full animate-radar"></div>
          <div className="absolute w-64 h-64 border border-red-500/30 rounded-full animate-radar" style={{ animationDelay: '0.5s' }}></div>
          <div className="absolute w-48 h-48 border border-red-500/40 rounded-full animate-radar" style={{ animationDelay: '1s' }}></div>
          
          <div className="relative z-10 w-20 h-20 bg-red-600/10 border-2 border-red-500 rounded-full flex items-center justify-center mb-8 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
            <MapPin className="w-8 h-8 text-red-500 animate-bounce" />
          </div>
          <h3 className="text-3xl font-heading text-white tracking-wider animate-pulse">Detecting Location & Matches...</h3>
          <p className="text-sm text-gray-400 mt-2 max-w-xs mx-auto">Connecting to real-time satellite coordinates and rare donor network</p>
        </div>
      )}

      {status === 'found' && sosDetails && (
        <div className="w-full max-w-2xl animate-fadeIn">
          <div className="bg-red-600 text-white rounded-t-3xl p-6 text-center border border-red-500">
            <h2 className="text-4xl font-heading mb-2">Help is on the way</h2>
            <p className="text-red-100 flex items-center justify-center font-medium">
              <Clock className="w-5 h-5 mr-2"/> Estimated match in: {Math.floor(timeLeft / 60)}:{timeLeft % 60 < 10 ? '0' : ''}{timeLeft % 60}
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 border-t-0 rounded-b-3xl p-6 backdrop-blur-xl">
            <div className="space-y-4">
              <h3 className="text-lg font-heading text-red-400 mb-2">Closest Facilities Alerted</h3>
              
              <div className="flex justify-between items-center p-4 bg-black/50 rounded-xl border border-white/5">
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-crimson mr-3" />
                  <div>
                    <h4 className="font-bold text-white">{sosDetails.closestBank?.name}</h4>
                    <p className="text-xs text-gray-400">{sosDetails.closestBank?.distanceKm?.toFixed(1)} km away • {sosDetails.closestBank?.area}</p>
                  </div>
                </div>
                {sosDetails.closestBank?.phone ? (
                  <a href={`tel:${sosDetails.closestBank.phone}`} className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-full shadow-[0_0_15px_rgba(22,163,74,0.4)]">
                    <Phone className="w-5 h-5" />
                  </a>
                ) : (
                  <span className="text-xs text-gray-500">No phone</span>
                )}
              </div>

              <div className="flex justify-between items-center p-4 bg-black/50 rounded-xl border border-white/5">
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 text-blue-400 mr-3 animate-pulse" />
                  <div>
                    <h4 className="font-bold text-white">{sosDetails.closestHospital?.name}</h4>
                    <p className="text-xs text-gray-400">{sosDetails.closestHospital?.distanceKm?.toFixed(1)} km away • {sosDetails.closestHospital?.area}</p>
                  </div>
                </div>
                {sosDetails.closestHospital?.phone ? (
                  <a href={`tel:${sosDetails.closestHospital.phone}`} className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-full shadow-[0_0_15px_rgba(22,163,74,0.4)]">
                    <Phone className="w-5 h-5" />
                  </a>
                ) : (
                  <span className="text-xs text-gray-500">No phone</span>
                )}
              </div>

              <div className="p-4 bg-red-950/20 border border-red-500/20 rounded-xl text-sm text-red-200">
                <span className="font-bold uppercase block text-xs text-red-400 mb-1">Emergency Contact Notified ({sosDetails.emergencyContact})</span>
                <p className="whitespace-pre-wrap font-mono text-xs mt-1 bg-black/30 p-3 rounded-lg border border-white/5">{sosDetails.sosMessage}</p>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 text-center">
              <button 
                onClick={() => { setStatus('idle'); navigate('home'); }} 
                className="mt-6 text-sm text-gray-500 hover:text-white transition-colors"
              >
                Cancel Emergency State
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [toast, setToast] = useState(null);
  const [user, setUser] = useState(null);
  const [searchGroup, setSearchGroup] = useState('');
  const [searchUrgency, setSearchUrgency] = useState('Stable');
  const [preselectedBloodGroup, setPreselectedBloodGroup] = useState('');

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const { dbUser, onlineCount, syncProfile, liveBroadcasts } = useLifeLink(user, showToast);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsLoggedIn(!!currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    resolveGoogleRedirect()
      .then((result) => {
        if (cancelled || !result?.user) return;
        showToast(`Welcome, ${result.user.displayName || 'donor'}!`);
        setCurrentPage('home');
      })
      .catch((error) => {
        if (!cancelled) showToast(getAuthErrorMessage(error));
      });
    return () => { cancelled = true; };
  }, []);

  const navigate = (page) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentPage(page);
  };

  const handleLogout = async () => {
    try {
      await logout();
      showToast('Logged out successfully');
      navigate('home');
    } catch {
      showToast('Error logging out');
    }
  };

  return (
    <div className="min-h-screen text-white font-sans selection:bg-crimson/30 relative">
      <VideoBackground />
      <CustomCursor />
      <AIChatbot />
      {toast && (
        <div className="fixed bottom-4 right-4 z-[100] bg-white text-black px-6 py-3 rounded-full font-bold shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-white/20 animate-slideUp flex items-center">
          <CheckCircle2 className="w-5 h-5 mr-2 text-emerald" /> {toast}
        </div>
      )}

      <Navbar currentPage={currentPage} isLoggedIn={isLoggedIn} user={user} navigate={navigate} dbUser={dbUser} onlineCount={onlineCount} />
      
      <main className="relative z-10">
        {currentPage === 'home' && (
          <HomePage 
            navigate={navigate} 
            searchGroup={searchGroup} 
            setSearchGroup={setSearchGroup} 
            searchUrgency={searchUrgency} 
            setSearchUrgency={setSearchUrgency} 
            liveBroadcasts={liveBroadcasts}
            setPreselectedBloodGroup={setPreselectedBloodGroup}
          />
        )}
        {currentPage === 'login' && <LoginPage navigate={navigate} showToast={showToast} />}
        {currentPage === 'search' && (
          <SearchResultsPage 
            searchGroup={searchGroup} 
            searchUrgency={searchUrgency} 
            navigate={navigate} 
            showToast={showToast} 
          />
        )}
        {currentPage === 'profile' && (
          <ProfilePage user={user} handleLogout={handleLogout} navigate={navigate} dbUser={dbUser} syncProfile={syncProfile} showToast={showToast} />
        )}
        {currentPage === 'broadcast' && isLoggedIn && (
          <BroadcastDashboard dbUser={dbUser} showToast={showToast} navigate={navigate} />
        )}
        {currentPage === 'hospital' && isLoggedIn && (
          <HospitalDashboard dbUser={dbUser} showToast={showToast} navigate={navigate} />
        )}
        {currentPage === 'inventory' && isLoggedIn && (
          <InventoryDashboard dbUser={dbUser} showToast={showToast} navigate={navigate} />
        )}
        {currentPage === 'camps' && isLoggedIn && (
          <CampsPage dbUser={dbUser} showToast={showToast} navigate={navigate} />
        )}
        {currentPage === 'donate' && <DonateWizard navigate={navigate} user={user} showToast={showToast} preselectedBloodGroup={preselectedBloodGroup} setPreselectedBloodGroup={setPreselectedBloodGroup} />}
        {currentPage === 'certificate' && <CertificatePage showToast={showToast} />}
        {currentPage === 'sos' && <EmergencySOS navigate={navigate} />}
      </main>
    </div>
  );
}
