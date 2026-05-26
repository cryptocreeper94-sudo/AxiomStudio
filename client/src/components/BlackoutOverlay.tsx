import React, { useState, useEffect } from 'react';

export function BlackoutOverlay({ appName = "Ecosystem" }: { appName?: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0 });
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    const launchDate = new Date('June 23, 2026 00:00:00').getTime();
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const distance = launchDate - now;
      
      if (distance < 0) return;
      
      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60))
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[999999] bg-[#020617] flex flex-col items-center justify-center font-sans overflow-y-auto p-4 sm:p-8">
      <div className="text-center w-full max-w-3xl mx-auto">
        
        <h1 className="text-4xl sm:text-5xl font-black text-cyan-400 mb-2 uppercase tracking-wide drop-shadow-[0_0_25px_rgba(34,211,238,0.5)]">
          {appName}
        </h1>
        <div className="text-slate-300 text-xl sm:text-2xl font-bold mb-8 tracking-widest">
          COMING JUNE 23, 2026
        </div>
        
        {/* Video Teaser - YouTube iframe placeholder */}
        <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-[0_0_50px_rgba(34,211,238,0.2)] border border-cyan-400/30 mb-8 bg-black">
          <iframe 
            className="absolute top-0 left-0 w-full h-full"
            src="https://www.youtube.com/embed/YOUR_VIDEO_ID_HERE?autoplay=1&mute=1&loop=1&playlist=YOUR_VIDEO_ID_HERE" 
            title="Ecosystem Teaser" 
            frameBorder="0" 
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
            allowFullScreen>
          </iframe>
        </div>
        
        {/* Countdown */}
        <div className="flex justify-center gap-4 sm:gap-6 mb-10">
          <div className="bg-white/5 p-4 sm:p-6 rounded-xl border border-white/10 min-w-[90px] sm:min-w-[120px]">
            <div className="text-white text-4xl sm:text-5xl font-black">{timeLeft.days}</div>
            <div className="text-slate-400 text-xs sm:text-sm uppercase tracking-wider mt-1">Days</div>
          </div>
          <div className="bg-white/5 p-4 sm:p-6 rounded-xl border border-white/10 min-w-[90px] sm:min-w-[120px]">
            <div className="text-white text-4xl sm:text-5xl font-black">{timeLeft.hours.toString().padStart(2, '0')}</div>
            <div className="text-slate-400 text-xs sm:text-sm uppercase tracking-wider mt-1">Hours</div>
          </div>
          <div className="bg-white/5 p-4 sm:p-6 rounded-xl border border-white/10 min-w-[90px] sm:min-w-[120px]">
            <div className="text-white text-4xl sm:text-5xl font-black">{timeLeft.minutes.toString().padStart(2, '0')}</div>
            <div className="text-slate-400 text-xs sm:text-sm uppercase tracking-wider mt-1">Minutes</div>
          </div>
        </div>
        
        {/* CTA & Email Capture */}
        <div className="bg-cyan-400/5 border border-cyan-400/20 p-6 sm:p-8 rounded-2xl max-w-lg mx-auto">
          <h3 className="text-cyan-400 text-xl sm:text-2xl font-extrabold mb-4">Secure Early Access</h3>
          
          <a 
            href="https://dwtl.io/presale" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-block bg-gradient-to-br from-cyan-400 to-sky-600 text-white px-8 py-4 rounded-xl text-lg font-bold shadow-[0_5px_20px_rgba(34,211,238,0.4)] hover:scale-105 transition-transform mb-6"
          >
            Join the Presale
          </a>
          
          <div className="text-slate-300 text-sm mb-3">or join the Day 1 Access List:</div>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input 
              type="email" 
              placeholder="Enter your email" 
              className="flex-1 px-4 py-3 rounded-xl border border-white/20 bg-black/50 text-white text-base focus:outline-none focus:border-cyan-400"
            />
            <button 
              onClick={() => setSubscribed(true)}
              className={`px-6 py-3 rounded-xl font-bold transition-colors ${subscribed ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
            >
              {subscribed ? 'Subscribed!' : 'Notify Me'}
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
}
