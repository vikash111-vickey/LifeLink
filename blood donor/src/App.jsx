import React, { useState, useEffect } from 'react';
import { 
  HeartPulse, Droplet, Search, User, FileText, AlertTriangle, MapPin, 
  Phone, Clock, CheckCircle2, ChevronRight, Share2, Download, LogIn, 
  Menu, X, ShieldAlert, Award
} from 'lucide-react';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const BLOOD_BANKS = [
  { id: 1, name: "Lions Blood Bank", area: "Indiranagar", distance: "2.5 km", phone: "+91 9876543210", status: "open", units: { 'O+': 12, 'B+': 5, 'AB-': 0, 'A-': 2 } },
  { id: 2, name: "Rotary TTK Blood Bank", area: "Koramangala", distance: "4.1 km", phone: "+91 9876543211", status: "open", units: { 'O+': 3, 'B+': 15, 'AB-': 1, 'A-': 5 } },
  { id: 3, name: "Apollo Hospitals Blood Center", area: "Jayanagar", distance: "6.8 km", phone: "+91 9876543212", status: "open", units: { 'O+': 8, 'B+': 8, 'AB-': 2, 'A-': 0 } },
  { id: 4, name: "Red Cross Blood Bank", area: "Majestic", distance: "8.2 km", phone: "+91 9876543213", status: "closed", units: { 'O+': 20, 'B+': 10, 'AB-': 0, 'A-': 1 } },
  { id: 5, name: "Fortis Blood Centre", area: "Bannerghatta", distance: "9.5 km", phone: "+91 9876543214", status: "open", units: { 'O+': 5, 'B+': 2, 'AB-': 3, 'A-': 4 } },
];

const DONORS = [
  { id: 1, name: "A*** S.", group: "AB-", distance: "1.2 km", lastDonated: "4 months ago", verified: true, available: true },
  { id: 2, name: "R*** K.", group: "O-", distance: "3.5 km", lastDonated: "6 months ago", verified: true, available: true },
  { id: 3, name: "V*** M.", group: "B-", distance: "2.1 km", lastDonated: "2 months ago", verified: false, available: false },
];

const EMERGENCIES = [
  { id: 1, hospital: "Manipal Hospital", group: "O-", units: 2, urgency: "Critical", time: "10 mins ago" },
  { id: 2, hospital: "Sakra World Hospital", group: "AB+", units: 1, urgency: "Urgent", time: "25 mins ago" },
  { id: 3, hospital: "Aster CMI", group: "A-", units: 3, urgency: "Stable", time: "1 hour ago" },
];

export default function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [userRole, setUserRole] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [toast, setToast] = useState(null);
  
  const [searchGroup, setSearchGroup] = useState('');
  const [searchUrgency, setSearchUrgency] = useState('Stable');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const navigate = (page) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentPage(page);
  };

  const handleLogin = (role) => {
    setUserRole(role);
    setIsLoggedIn(true);
    showToast(`Logged in successfully as ${role}`);
    navigate('home');
  };

  const Navbar = () => (
    <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center cursor-pointer" onClick={() => navigate('home')}>
            <div className="relative flex items-center justify-center w-10 h-10 rounded-full bg-crimson/20 text-crimson animate-pulse-ring">
              <Droplet className="w-6 h-6 fill-crimson" />
            </div>
            <span className="ml-3 font-bebas text-2xl tracking-wider text-white">LifeLink</span>
          </div>
          <div className="hidden md:flex space-x-6 items-center">
            <button onClick={() => navigate('home')} className={`text-sm font-medium ${currentPage === 'home' ? 'text-crimson' : 'text-gray-300 hover:text-white'}`}>Home</button>
            <button onClick={() => navigate('search')} className={`text-sm font-medium ${currentPage === 'search' ? 'text-crimson' : 'text-gray-300 hover:text-white'}`}>Find Blood</button>
            <button onClick={() => navigate('donate')} className={`text-sm font-medium ${currentPage === 'donate' ? 'text-crimson' : 'text-gray-300 hover:text-white'}`}>Donate</button>
            
            {!isLoggedIn ? (
              <button onClick={() => navigate('login')} className="bg-crimson hover:bg-red-600 text-white px-5 py-2 rounded-full font-bold transition-all transform hover:scale-105 flex items-center">
                <LogIn className="w-4 h-4 mr-2" /> Login
              </button>
            ) : (
              <div className="flex space-x-4 items-center">
                <button onClick={() => navigate('sos')} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full font-bold flex items-center animate-[pulse_1s_ease-in-out_infinite]">
                  <ShieldAlert className="w-4 h-4 mr-2" /> SOS
                </button>
                <button onClick={() => navigate('profile')} className="w-10 h-10 rounded-full border-2 border-crimson overflow-hidden hover:opacity-80 transition-opacity bg-white">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="Profile" className="w-full h-full object-cover" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );

  const Ticker = () => (
    <div className="bg-red-900/40 border-b border-red-500/20 py-2 overflow-hidden flex items-center">
      <div className="w-full whitespace-nowrap animate-[marquee_25s_linear_infinite] flex space-x-8 text-sm font-medium text-red-200">
        <span className="flex items-center"><AlertTriangle className="w-4 h-4 mr-2 text-crimson" /> URGENT: O- blood needed at Manipal Hospital, Bengaluru.</span>
        <span className="flex items-center"><AlertTriangle className="w-4 h-4 mr-2 text-crimson" /> CRITICAL: AB+ platelets required at Apollo Jayanagar.</span>
        <span className="flex items-center"><AlertTriangle className="w-4 h-4 mr-2 text-crimson" /> URGENT: A- blood needed at Sakra World Hospital.</span>
      </div>
    </div>
  );

  const LoginPage = () => {
    const [isRegister, setIsRegister] = useState(false);
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-crimson/20 rounded-full blur-[100px] pointer-events-none animate-[pulse_2s_ease-in-out_infinite]"></div>
        
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 w-full max-w-md relative z-10 shadow-2xl">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-crimson/20 rounded-full flex items-center justify-center mb-4 text-crimson">
              <Droplet className="w-8 h-8 fill-crimson" />
            </div>
            <h2 className="text-4xl font-bebas tracking-wide">{isRegister ? 'Join LifeLink' : 'Welcome Back'}</h2>
            <p className="text-gray-400 mt-2">Connect to save lives</p>
          </div>

          <div className="flex bg-black/40 p-1 rounded-full mb-6">
            <button onClick={() => setIsRegister(false)} className={`flex-1 py-2 rounded-full text-sm font-bold transition-colors ${!isRegister ? 'bg-crimson text-white' : 'text-gray-400'}`}>Login</button>
            <button onClick={() => setIsRegister(true)} className={`flex-1 py-2 rounded-full text-sm font-bold transition-colors ${isRegister ? 'bg-crimson text-white' : 'text-gray-400'}`}>Register</button>
          </div>

          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleLogin('donor'); }}>
            {isRegister && (
              <input type="text" placeholder="Full Name" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-crimson focus:outline-none transition-colors" required />
            )}
            <input type="email" placeholder="Email Address" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-crimson focus:outline-none transition-colors" required />
            <input type="password" placeholder="Password" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-crimson focus:outline-none transition-colors" required />
            
            {isRegister && (
              <div className="flex space-x-4">
                <select className="w-1/2 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-gray-400 focus:border-crimson focus:outline-none" required>
                  <option value="">Blood Group</option>
                  {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <input type="text" placeholder="City" className="w-1/2 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-crimson focus:outline-none" required />
              </div>
            )}

            <button type="submit" className="w-full bg-gradient-to-r from-crimson to-red-700 text-white font-bold py-3 rounded-xl hover:from-red-600 hover:to-red-800 transition-all transform hover:-translate-y-1 shadow-[0_0_15px_rgba(239,68,68,0.4)]">
              {isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
              <div className="relative flex justify-center text-sm"><span className="px-2 bg-black text-gray-500">Or continue with</span></div>
            </div>
            <div className="mt-6 flex space-x-4">
              <button className="flex-1 bg-white text-black font-bold py-2 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors">
                <span className="mr-2 text-xl font-serif font-black">G</span> Google
              </button>
              <button className="flex-1 bg-black text-white border border-white/20 font-bold py-2 rounded-xl flex items-center justify-center hover:bg-gray-900 transition-colors">
                <span className="mr-2 text-xl font-serif"></span> Apple
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const HomePage = () => (
    <div className="space-y-16 pb-16">
      <Ticker />
      
      <section className="px-4 text-center max-w-4xl mx-auto pt-8">
        <div className="inline-block px-4 py-1.5 rounded-full bg-crimson/10 border border-crimson/30 text-crimson text-sm font-bold mb-6">
          Every drop counts.
        </div>
        <h1 className="text-6xl md:text-8xl font-bebas tracking-wider leading-none mb-6">
          <span className="text-white">Save a Life.</span><br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-crimson to-red-500">Be a Hero.</span>
        </h1>
        <p className="text-lg text-gray-400 mb-10 max-w-2xl mx-auto">
          Connect with blood seekers and donors in real-time. Join the emergency network that delivers life-saving blood when it matters most.
        </p>
        <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
          <button onClick={() => navigate('search')} className="bg-crimson hover:bg-red-600 text-white px-8 py-4 rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(239,68,68,0.5)] flex items-center justify-center">
            <Search className="w-5 h-5 mr-2" /> Find Blood NOW
          </button>
          <button onClick={() => navigate('donate')} className="bg-white/10 hover:bg-white/20 text-white px-8 py-4 rounded-full font-bold text-lg transition-all backdrop-blur-sm border border-white/10 flex items-center justify-center">
            <HeartPulse className="w-5 h-5 mr-2" /> Donate Blood
          </button>
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
            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center backdrop-blur-sm hover:-translate-y-2 transition-transform">
              <div className={`text-4xl md:text-5xl font-bebas ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-gray-400 font-medium uppercase tracking-wider mt-2">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 max-w-4xl mx-auto">
        <div className="bg-gradient-to-b from-white/10 to-transparent border border-white/10 rounded-3xl p-8 backdrop-blur-md">
          <h3 className="text-2xl font-bebas mb-6 text-center">Quick Blood Search</h3>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 mb-8">
            {BLOOD_GROUPS.map(g => (
              <button 
                key={g} 
                onClick={() => setSearchGroup(g)}
                className={`aspect-square rounded-2xl flex flex-col items-center justify-center border transition-all ${searchGroup === g ? 'bg-crimson border-crimson text-white scale-110 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'bg-black/50 border-white/10 text-gray-400 hover:border-crimson/50 hover:text-white'}`}
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
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-colors ${searchUrgency === u ? (u === 'Critical' ? 'bg-red-600 text-white' : u === 'Urgent' ? 'bg-orange-500 text-white' : 'bg-emerald text-white') : 'text-gray-400 hover:text-white'}`}
                >
                  {u}
                </button>
              ))}
            </div>
            <button 
              onClick={() => navigate('search')}
              disabled={!searchGroup}
              className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Search Availability
            </button>
          </div>
        </div>
      </section>

      <section className="px-4 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-3xl font-bebas">Live Emergency Feed</h3>
          <div className="flex items-center text-sm text-gray-400"><span className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></span> Auto-updating</div>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {EMERGENCIES.map(e => (
            <div key={e.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
              <div className={`absolute top-0 left-0 w-1 h-full ${e.urgency === 'Critical' ? 'bg-red-500' : e.urgency === 'Urgent' ? 'bg-orange-500' : 'bg-emerald'}`}></div>
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-black/50 border border-white/10 rounded-full flex items-center justify-center font-bebas text-2xl text-crimson">
                    {e.group}
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{e.hospital}</h4>
                    <span className="text-xs text-gray-400 flex items-center"><Clock className="w-3 h-3 mr-1"/> {e.time}</span>
                  </div>
                </div>
                <div className={`px-2 py-1 rounded text-xs font-bold ${e.urgency === 'Critical' ? 'bg-red-500/20 text-red-500' : e.urgency === 'Urgent' ? 'bg-orange-500/20 text-orange-500' : 'bg-emerald/20 text-emerald'}`}>
                  {e.urgency}
                </div>
              </div>
              <div className="flex justify-between items-center mt-6">
                <span className="text-sm font-medium">{e.units} Units Required</span>
                <button className="text-sm font-bold text-crimson hover:text-red-400 flex items-center">Donate <ChevronRight className="w-4 h-4 ml-1" /></button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );

  const SearchResultsPage = () => {
    const isRare = ['AB-', 'B-', 'A-', 'O-'].includes(searchGroup);
    
    return (
      <div className="max-w-7xl mx-auto px-4 py-8 animate-fadeIn">
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h2 className="text-4xl font-bebas">Search Results</h2>
            <p className="text-gray-400 mt-1">Showing availability for <span className="text-crimson font-bold">{searchGroup || 'All Groups'}</span> • Urgency: <span className="font-bold">{searchUrgency}</span></p>
          </div>
          <button onClick={() => navigate('home')} className="mt-4 md:mt-0 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-sm font-medium transition-colors">
            Change Filters
          </button>
        </div>

        {searchUrgency === 'Critical' && (
          <div className="bg-red-600/20 border border-red-500 rounded-2xl p-4 mb-8 flex items-center shadow-[0_0_15px_rgba(239,68,68,0.2)]">
            <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center mr-4 animate-pulse">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h4 className="font-bold text-white">Critical Alert</h4>
              <p className="text-sm text-red-200">Displaying nearest blood banks and donors immediately. Please contact them directly.</p>
            </div>
          </div>
        )}

        <div className={`grid ${isRare ? 'md:grid-cols-2' : 'grid-cols-1'} gap-8`}>
          <div className="space-y-4">
            <h3 className="text-2xl font-bebas mb-4 flex items-center"><MapPin className="w-5 h-5 mr-2 text-crimson"/> Blood Banks</h3>
            {BLOOD_BANKS.map(bank => {
              const units = searchGroup ? bank.units[searchGroup] : 5; 
              const availabilityColor = units > 5 ? 'text-emerald' : units > 0 ? 'text-orange-500' : 'text-red-500';
              return (
                <div key={bank.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-lg">{bank.name}</h4>
                      <p className="text-sm text-gray-400">{bank.area} • {bank.distance}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold border ${bank.status === 'open' ? 'bg-emerald/10 border-emerald/30 text-emerald' : 'bg-red-500/10 border-red-500/30 text-red-500'}`}>
                      {bank.status.toUpperCase()}
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className={`text-2xl font-bebas ${availabilityColor}`}>{units || 0}</div>
                        <div className="text-xs text-gray-400 uppercase tracking-wide">Units</div>
                      </div>
                      <div className="h-8 w-px bg-white/10"></div>
                      <div className="text-sm font-medium"><Phone className="w-4 h-4 inline mr-1 text-gray-400"/> {bank.phone}</div>
                    </div>
                    <button className="px-4 py-2 bg-crimson hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors">
                      Directions
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {isRare && (
            <div className="space-y-4">
              <h3 className="text-2xl font-bebas mb-4 flex items-center text-violet"><User className="w-5 h-5 mr-2"/> Rare Donors</h3>
              {DONORS.filter(d => !searchGroup || d.group === searchGroup).map(donor => (
                <div key={donor.id} className="bg-violet-900/10 border border-violet-500/30 rounded-2xl p-5">
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-full bg-violet-600/20 text-violet flex items-center justify-center font-bebas text-xl border border-violet-500/50">
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
  };

  const ProfilePage = () => (
    <div className="max-w-5xl mx-auto px-4 py-8 animate-fadeIn">
      <div className="bg-white/5 border border-white/10 rounded-3xl p-8 relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-crimson/10 rounded-full blur-[80px]"></div>
        <div className="flex flex-col md:flex-row items-start md:items-center space-y-6 md:space-y-0 md:space-x-8 relative z-10">
          <div className="relative">
            <div className="w-32 h-32 rounded-full border-4 border-black overflow-hidden shadow-[0_0_0_2px_#ef4444] bg-white">
              <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="User" className="w-full h-full object-cover" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-crimson text-white w-10 h-10 rounded-full flex items-center justify-center font-bebas text-xl border-4 border-black">O+</div>
          </div>
          <div className="flex-1">
            <h2 className="text-4xl font-bebas">Vikram Sharma</h2>
            <p className="text-gray-400">Bengaluru, KA • +91 9876543210</p>
            <div className="mt-4 flex space-x-4">
              <div className="flex items-center px-3 py-1 bg-emerald/10 border border-emerald/30 rounded-full text-emerald text-sm font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald mr-2 animate-pulse"></span> Available to Donate
              </div>
              <button className="px-4 py-1 bg-white/10 hover:bg-white/20 rounded-full text-sm font-medium transition-colors">Edit Profile</button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
              <div className="text-3xl font-bebas text-crimson">4</div>
              <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">Donations</div>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
              <div className="text-3xl font-bebas text-emerald">12</div>
              <div className="text-xs text-gray-400 uppercase tracking-wide mt-1">Lives Saved</div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h3 className="text-xl font-bebas mb-4">Achievements</h3>
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
              <h3 className="text-2xl font-bebas">Donation History</h3>
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
                <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
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

  const DonateWizard = () => {
    const [step, setStep] = useState(1);
    const steps = ['Details', 'Location', 'Schedule', 'Confirm'];

    return (
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h2 className="text-4xl font-bebas text-center mb-8">Schedule Donation</h2>
        
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
              <h3 className="text-2xl font-bebas mb-6">Health Declaration</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <input type="text" defaultValue="Vikram Sharma" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-crimson outline-none" />
                <input type="text" defaultValue="O+" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-crimson outline-none" disabled />
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
              <h3 className="text-2xl font-bebas mb-6">Select Blood Bank</h3>
              {BLOOD_BANKS.slice(0, 3).map(bank => (
                <div key={bank.id} onClick={() => setStep(3)} className="bg-black/50 border border-white/10 rounded-xl p-4 flex justify-between items-center cursor-pointer hover:border-crimson hover:bg-crimson/5 transition-all">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                      <MapPin className="w-6 h-6 text-crimson" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white">{bank.name}</h4>
                      <p className="text-sm text-gray-400">{bank.area} • {bank.distance}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-fadeIn">
              <h3 className="text-2xl font-bebas mb-6">Select Time Slot</h3>
              <div className="bg-black/50 border border-white/10 p-4 rounded-xl mb-6">
                <span className="text-sm text-gray-400 block mb-1">Selected Location:</span>
                <span className="font-bold text-white">Lions Blood Bank, Indiranagar</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {['09:00 AM', '10:30 AM', '12:00 PM', '02:00 PM', '03:30 PM', '05:00 PM'].map(time => (
                  <button key={time} className="py-3 border border-white/10 rounded-xl text-sm font-medium hover:bg-crimson hover:border-crimson hover:text-white transition-colors">
                    {time}
                  </button>
                ))}
              </div>
              <div className="p-4 bg-emerald/10 border border-emerald/20 rounded-xl text-sm text-emerald">
                <span className="font-bold">Tip:</span> Drink plenty of water and have a light meal before your appointment.
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center py-8 animate-fadeIn">
              <div className="w-24 h-24 bg-emerald/20 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                <div className="absolute inset-0 border-4 border-emerald rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-20"></div>
                <CheckCircle2 className="w-12 h-12 text-emerald" />
              </div>
              <h3 className="text-4xl font-bebas mb-2">Appointment Confirmed!</h3>
              <p className="text-gray-400 mb-8 max-w-md mx-auto">Your heroic journey begins. We've sent the details to your email and phone.</p>
              
              <div className="bg-black/50 border border-white/10 rounded-xl p-6 inline-block text-left mb-8">
                <div className="grid grid-cols-2 gap-x-12 gap-y-4">
                  <div><span className="text-gray-500 text-xs uppercase block">Date & Time</span><span className="font-bold">Tomorrow, 10:30 AM</span></div>
                  <div><span className="text-gray-500 text-xs uppercase block">Location</span><span className="font-bold">Lions Blood Bank</span></div>
                  <div><span className="text-gray-500 text-xs uppercase block">Booking ID</span><span className="font-bold text-crimson">#LL-9824X</span></div>
                </div>
              </div>
              
              <div>
                <button onClick={() => navigate('profile')} className="px-8 py-3 bg-white text-black font-bold rounded-full hover:bg-gray-200 transition-colors">
                  View Dashboard
                </button>
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
                onClick={() => setStep(Math.min(4, step + 1))}
                className="px-8 py-2 bg-crimson text-white rounded-full font-bold hover:bg-red-600 transition-colors"
              >
                {step === 3 ? 'Confirm Booking' : 'Continue'}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const CertificatePage = () => (
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
              <span className="font-bebas text-3xl tracking-widest">LIFELINK</span>
            </div>
            <h1 className="font-bebas text-5xl md:text-6xl text-[#c0a062] tracking-wider uppercase">Certificate of Appreciation</h1>
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
            
            <div className="w-24 h-24 rounded-full border-4 border-[#c0a062] flex items-center justify-center bg-red-50 text-red-700 font-bebas text-2xl rotate-12 shadow-lg">
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

  const EmergencySOS = () => {
    const [status, setStatus] = useState('idle');
    const [timeLeft, setTimeLeft] = useState(180);

    const activateSOS = () => {
      setStatus('locating');
      setTimeout(() => setStatus('found'), 2500);
    };

    useEffect(() => {
      if (status === 'found') {
        const timer = setInterval(() => setTimeLeft(t => t > 0 ? t - 1 : 0), 1000);
        return () => clearInterval(timer);
      }
    }, [status]);

    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center p-4 relative overflow-hidden bg-red-950/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/30 via-black to-black -z-10"></div>
        
        {status === 'idle' && (
          <div className="text-center animate-fadeIn">
            <h2 className="text-5xl font-bebas text-red-500 mb-4 tracking-widest">EMERGENCY MODE</h2>
            <p className="text-gray-400 mb-12 max-w-md mx-auto">Tap the button below to instantly alert nearby blood banks and rare donors of a critical emergency.</p>
            
            <button 
              onClick={activateSOS}
              className="relative group cursor-pointer"
            >
              <div className="absolute inset-0 bg-red-600 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] opacity-75"></div>
              <div className="relative w-48 h-48 bg-gradient-to-b from-red-500 to-red-800 rounded-full flex items-center justify-center border-8 border-red-900 shadow-[0_0_50px_rgba(220,38,38,0.6)] group-hover:scale-105 transition-transform">
                <span className="font-bebas text-6xl text-white tracking-widest drop-shadow-md">SOS</span>
              </div>
            </button>
          </div>
        )}

        {status === 'locating' && (
          <div className="text-center">
            <div className="w-24 h-24 border-4 border-red-500/30 border-t-red-500 rounded-full animate-spin mx-auto mb-8"></div>
            <h3 className="text-3xl font-bebas text-white animate-pulse">Detecting Location & Matches...</h3>
          </div>
        )}

        {status === 'found' && (
          <div className="w-full max-w-2xl animate-fadeIn">
            <div className="bg-red-600 text-white rounded-t-3xl p-6 text-center border border-red-500">
              <h2 className="text-4xl font-bebas mb-2">Help is on the way</h2>
              <p className="text-red-100 flex items-center justify-center font-medium">
                <Clock className="w-5 h-5 mr-2"/> Estimated match in: {Math.floor(timeLeft / 60)}:{timeLeft % 60 < 10 ? '0' : ''}{timeLeft % 60}
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 border-t-0 rounded-b-3xl p-6 backdrop-blur-xl">
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-black/50 rounded-xl border border-white/5">
                  <div className="flex items-center">
                    <MapPin className="w-5 h-5 text-crimson mr-3" />
                    <div>
                      <h4 className="font-bold">Lions Blood Bank</h4>
                      <p className="text-xs text-gray-400">2.5 km away • Has O-</p>
                    </div>
                  </div>
                  <button className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-full shadow-[0_0_15px_rgba(22,163,74,0.4)]">
                    <Phone className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex justify-between items-center p-4 bg-black/50 rounded-xl border border-white/5">
                  <div className="flex items-center">
                    <User className="w-5 h-5 text-violet mr-3" />
                    <div>
                      <h4 className="font-bold">R*** K. (Verified Donor)</h4>
                      <p className="text-xs text-gray-400">3.5 km away • O- Match</p>
                    </div>
                  </div>
                  <button className="bg-crimson hover:bg-red-700 text-white px-6 py-2 rounded-full font-bold text-sm">
                    Alert Donor
                  </button>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/10 text-center">
                <button className="flex items-center justify-center w-full py-4 bg-white/5 hover:bg-white/10 rounded-xl font-bold transition-colors border border-white/10 text-gray-300">
                  <Share2 className="w-5 h-5 mr-2" /> Share Emergency Link via WhatsApp
                </button>
                <button onClick={() => { setStatus('idle'); navigate('home'); }} className="mt-6 text-sm text-gray-500 hover:text-white transition-colors">
                  Cancel Emergency State
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-noir text-white font-sans selection:bg-crimson/30">
      {toast && (
        <div className="fixed bottom-4 right-4 z-[100] bg-white text-black px-6 py-3 rounded-full font-bold shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-white/20 animate-slideUp flex items-center">
          <CheckCircle2 className="w-5 h-5 mr-2 text-emerald" /> {toast}
        </div>
      )}

      <Navbar />
      
      <main>
        {currentPage === 'home' && <HomePage />}
        {currentPage === 'login' && <LoginPage />}
        {currentPage === 'search' && <SearchResultsPage />}
        {currentPage === 'profile' && <ProfilePage />}
        {currentPage === 'donate' && <DonateWizard />}
        {currentPage === 'certificate' && <CertificatePage />}
        {currentPage === 'sos' && <EmergencySOS />}
      </main>
    </div>
  );
}
