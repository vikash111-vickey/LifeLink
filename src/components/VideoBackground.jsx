export default function VideoBackground() {
  return (
    <div className="video-bg fixed inset-0 -z-50 overflow-hidden pointer-events-none" aria-hidden="true">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover scale-110 video-bg-kenburns"
      >
        <source
          src="https://assets.mixkit.co/videos/preview/mixkit-cardiology-screening-in-a-hospital-41221-large.mp4"
          type="video/mp4"
        />
      </video>
      <div className="absolute inset-0 bg-gradient-to-br from-[#050508]/92 via-[#0a0510]/78 to-[#120508]/94" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(239,68,68,0.12)_0%,transparent_55%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#050508_75%)]" />
      <div className="video-bg-grain absolute inset-0 opacity-[0.04]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-transparent to-[#050508]/60" />
    </div>
  );
}
