import React, { useState, useEffect, useRef } from 'react';

const STICKER_TEMPLATES = ['🎭', '🦊', '👽', '🤖', '🥸', '😎', '🐶', '👻', '🕶️', '👑'];

const FILTERS = [
  { id: 'none', name: 'NORMAL', filterStr: 'none' },
  { id: 'grayscale', name: 'B&W', filterStr: 'grayscale(100%)' },
  { id: 'sepia', name: 'WARM', filterStr: 'sepia(100%)' },
  { id: 'invert', name: 'INVERT', filterStr: 'invert(100%)' },
  { id: 'vintage', name: 'VINTAGE', filterStr: 'sepia(60%) contrast(120%) saturate(130%)' },
];

const mono = { fontFamily: "'Share Tech Mono', monospace" };
const vt = { fontFamily: "'VT323', monospace" };

const EMPTY_STICKERS = [];

export default function CameraView({
  onCaptureComplete,
  onBack,
  singleShotMode = false,
  targetRetakeIndex = 0,
  initialFilter = 'none',
  initialStickers = EMPTY_STICKERS
}) {
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');

  const [isCapturingSession, setIsCapturingSession] = useState(false);
  const [currentShotIndex, setCurrentShotIndex] = useState(targetRetakeIndex);
  const [countdown, setCountdown] = useState(10);
  const [capturedPhotos, setCapturedPhotos] = useState([]);
  const [flash, setFlash] = useState(false);

  const [selectedFilter, setSelectedFilter] = useState(initialFilter);
  const [stickers, setStickers] = useState(initialStickers);
  const [selectedStickerId, setSelectedStickerId] = useState(null);
  const [showFiltersMenu, setShowFiltersMenu] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const captureTimeoutRef = useRef(null);
  const capturedPhotosRef = useRef([]);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (singleShotMode) setCurrentShotIndex(targetRetakeIndex);
  }, [targetRetakeIndex, singleShotMode]);

  useEffect(() => {
    setSelectedFilter(initialFilter);
    setStickers(initialStickers);
    setSelectedStickerId(null);
  }, [initialFilter, initialStickers]);

  const initCamera = async (deviceIdToUse = null) => {
    try {
      setError('');
      if (stream) stream.getTracks().forEach(t => t.stop());

      const constraints = {
        video: deviceIdToUse
          ? { deviceId: { exact: deviceIdToUse }, width: { ideal: 1920 }, height: { ideal: 1080 } }
          : { width: { ideal: 1920 }, height: { ideal: 1080 } }
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) videoRef.current.srcObject = mediaStream;

      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
      setDevices(videoDevices);

      if (videoDevices.length > 0) {
        const activeTrack = mediaStream.getVideoTracks()[0];
        const activeSettings = activeTrack ? activeTrack.getSettings() : null;
        const activeDeviceId = activeSettings ? activeSettings.deviceId : null;
        setSelectedDeviceId(deviceIdToUse || activeDeviceId || videoDevices[0].deviceId);
      } else {
        setError('No camera devices found. Please connect a camera.');
      }
    } catch (err) {
      console.error(err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('PERMISSION DENIED — Allow camera access to use the photobooth.');
      } else {
        setError('CAMERA UNAVAILABLE — Device may be in use by another application.');
      }
    }
  };

  useEffect(() => {
    initCamera();
    const handleDeviceChange = async () => {
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(d => d.kind === 'videoinput');
        setDevices(videoDevices);
      } catch (e) { console.error(e); }
    };
    if (navigator.mediaDevices?.addEventListener) {
      navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    }
    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      if (navigator.mediaDevices?.removeEventListener) {
        navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedDeviceId) return;
    if (stream) {
      const activeTrack = stream.getVideoTracks()[0];
      const activeSettings = activeTrack?.getSettings();
      if (activeSettings?.deviceId === selectedDeviceId) return;
    }
    initCamera(selectedDeviceId);
  }, [selectedDeviceId]);

  useEffect(() => () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (captureTimeoutRef.current) clearTimeout(captureTimeoutRef.current);
  }, []);

  // ── Sticker canvas ──────────────────────────────────────────────
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    stickers.forEach(sticker => {
      ctx.save();
      ctx.font = `${sticker.size}px Arial`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(sticker.text, sticker.x, sticker.y);
      if (sticker.id === selectedStickerId) {
        ctx.strokeStyle = '#00f5ff';
        ctx.lineWidth = 3;
        ctx.setLineDash([6, 6]);
        const pad = sticker.size * 0.7;
        ctx.strokeRect(sticker.x - pad, sticker.y - pad, pad * 2, pad * 2);
      }
      ctx.restore();
    });
  };

  useEffect(() => { drawCanvas(); }, [stickers, selectedStickerId]);

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.changedTouches ? e.changedTouches[0].clientX : (e.touches ? e.touches[0].clientX : e.clientX);
    const clientY = e.changedTouches ? e.changedTouches[0].clientY : (e.touches ? e.touches[0].clientY : e.clientY);
    return { x: (clientX - rect.left) * (canvas.width / rect.width), y: (clientY - rect.top) * (canvas.height / rect.height) };
  };

  const handlePointerDown = (e) => {
    if (isCapturingSession) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;
    const clicked = [...stickers].reverse().find(s => Math.hypot(coords.x - s.x, coords.y - s.y) < s.size * 0.7);
    if (clicked) {
      setSelectedStickerId(clicked.id);
      isDraggingRef.current = true;
      dragOffsetRef.current = { x: coords.x - clicked.x, y: coords.y - clicked.y };
    } else { setSelectedStickerId(null); }
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current || selectedStickerId === null || isCapturingSession) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;
    setStickers(prev => prev.map(s => s.id === selectedStickerId
      ? { ...s, x: coords.x - dragOffsetRef.current.x, y: coords.y - dragOffsetRef.current.y } : s));
  };

  const handlePointerUp = () => { isDraggingRef.current = false; };

  const addSticker = (emoji) => {
    if (isCapturingSession) return;
    const canvas = canvasRef.current;
    const newSticker = { id: Date.now(), text: emoji, x: canvas ? canvas.width / 2 : 640, y: canvas ? canvas.height / 2 : 360, size: 100 };
    setStickers(prev => [...prev, newSticker]);
    setSelectedStickerId(newSticker.id);
  };

  const deleteSelectedSticker = () => {
    if (selectedStickerId === null || isCapturingSession) return;
    setStickers(prev => prev.filter(s => s.id !== selectedStickerId));
    setSelectedStickerId(null);
  };

  // ── Capture logic ────────────────────────────────────────────────
  const startSession = () => {
    setIsCapturingSession(true);
    setCapturedPhotos([]);
    capturedPhotosRef.current = [];
    setSelectedStickerId(null);
    runCountdown(singleShotMode ? targetRetakeIndex : 0);
  };

  const runCountdown = (shotIndex) => {
    setCountdown(10);
    setCurrentShotIndex(shotIndex);
    let count = 10;
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    countdownIntervalRef.current = setInterval(() => {
      count--;
      setCountdown(count);
      if (count <= 0) {
        clearInterval(countdownIntervalRef.current);
        takePhoto(shotIndex);
      }
    }, 1000);
  };

  const takePhoto = (shotIndex) => {
    const video = videoRef.current;
    if (!video) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 800);
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.type = 'sine'; osc.frequency.setValueAtTime(880, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      osc.start(); osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) { }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    const filterObj = FILTERS.find(f => f.id === selectedFilter);
    if (filterObj && filterObj.filterStr !== 'none') ctx.filter = filterObj.filterStr;
    ctx.translate(canvas.width, 0); ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/png');

    if (singleShotMode) {
      captureTimeoutRef.current = setTimeout(() => {
        setIsCapturingSession(false);
        onCaptureComplete(dataUrl, selectedFilter, stickers);
      }, 1500);
    } else {
      const updatedPhotos = [...capturedPhotosRef.current, dataUrl];
      capturedPhotosRef.current = updatedPhotos;
      setCapturedPhotos(updatedPhotos);
      if (shotIndex < 2) {
        captureTimeoutRef.current = setTimeout(() => runCountdown(shotIndex + 1), 1500);
      } else {
        captureTimeoutRef.current = setTimeout(() => {
          setIsCapturingSession(false);
          onCaptureComplete(updatedPhotos, selectedFilter, stickers);
        }, 1500);
      }
    }
  };

  const cancelSession = () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (captureTimeoutRef.current) clearTimeout(captureTimeoutRef.current);
    setIsCapturingSession(false);
    setCapturedPhotos([]);
    setCountdown(10);
  };

  return (
    <div className="crt-overlay noise-bg min-h-screen bg-[#080808] text-[#e0e0e0] flex flex-col overflow-hidden" style={mono}>
      {flash && <div className="fixed inset-0 z-50 pointer-events-none animate-flash bg-white" />}

      {/* Header HUD bar */}
      <header className="relative z-20 border-b-2 border-[#1a1a1a] px-8 py-5 flex items-center justify-between bg-[#0a0a0a]">
        <div className="flex items-center gap-4">
          <div className="w-4 h-4 rounded-full bg-[#ff003c] rec-dot" />
          <span className="text-sm font-bold text-[#ff003c] tracking-[0.3em] uppercase">NODE 01: ENTITY CAPTURE</span>
        </div>
        <div className="flex items-center gap-6 text-[#ccc] text-sm font-bold tracking-widest">
          <span>SHOTS: <span className="text-[#00f5ff]">{capturedPhotos.length}/3</span></span>
          <span className="text-[#333]">|</span>
          <span>FILTER: <span className="text-[#f5e642]">{FILTERS.find(f => f.id === selectedFilter)?.name}</span></span>
          {isCapturingSession && <span className="text-[#333]">|</span>}
          {isCapturingSession && <span className="text-[#00ff41] neon-blink">● REC</span>}
        </div>
        <button onClick={onBack} className="cyber-btn text-sm font-bold px-6 py-3">← BACK</button>
      </header>

      {/* Main layout */}
      <main className="relative z-10 flex-grow flex flex-col lg:flex-row gap-0">

        {/* Camera feed — takes almost entire screen */}
        <div className="flex-grow relative flex flex-col items-center justify-center p-4 lg:p-8 bg-[#111]">
          {/* Camera viewport */}
          <div className="relative w-full max-w-6xl aspect-video border-4 border-[#222] rounded-md overflow-hidden bg-black shadow-[0_0_50px_rgba(0,0,0,0.8)]">

            {/* HUD corner brackets */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-[#00f5ff] z-30 pointer-events-none" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-[#00f5ff] z-30 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-[#00f5ff] z-30 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-[#00f5ff] z-30 pointer-events-none" />

            {/* Center crosshair */}
            {!isCapturingSession && (
              <>
                <div className="absolute top-1/2 left-0 right-0 h-px bg-[#00f5ff] opacity-10 z-30 pointer-events-none" />
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-[#00f5ff] opacity-10 z-30 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 z-30 pointer-events-none"
                  style={{ boxShadow: '0 0 0 1px rgba(0,245,255,0.3), 0 0 0 4px rgba(0,245,255,0.05)' }} />
              </>
            )}

            {/* HUD scan line */}
            <div className="scan-line z-20" />

            {/* REC indicator */}
            {isCapturingSession && (
              <div className="absolute top-6 left-6 z-30 flex items-center gap-3">
                <div className="w-4 h-4 rounded-full bg-[#ff003c] rec-dot shadow-[0_0_10px_#ff003c]" />
                <span className="text-[#ff003c] font-bold text-lg tracking-widest shadow-black drop-shadow-md">REC</span>
              </div>
            )}

            {error ? (
              <div className="flex flex-col items-center justify-center h-full gap-6 text-center px-8">
                <div className="border border-[#ff003c] px-8 py-8 text-center">
                  <div className="text-[#ff003c] text-xl mb-4" style={vt}>!! CAMERA ERROR !!</div>
                  <p className="text-[#555] text-xs leading-relaxed mb-6 max-w-sm">{error}</p>
                  <button onClick={() => initCamera()} className="cyber-btn-red cyber-btn text-xs">
                    RETRY ACCESS
                  </button>
                </div>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay playsInline muted
                  className="w-full h-full object-cover scale-x-[-1]"
                  style={{ filter: FILTERS.find(f => f.id === selectedFilter)?.filterStr || 'none' }}
                />
                <canvas
                  ref={canvasRef}
                  width={1280} height={720}
                  className={`absolute top-0 left-0 w-full h-full object-cover z-20 touch-none ${isCapturingSession ? 'pointer-events-none' : 'cursor-crosshair'}`}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  onTouchStart={handlePointerDown}
                  onTouchMove={handlePointerMove}
                  onTouchEnd={handlePointerUp}
                />

                {/* Countdown overlay */}
                {isCapturingSession && countdown > 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black/30">
                    <div className="text-[12rem] leading-none text-[#00f5ff]" style={{ ...vt, textShadow: '0 0 60px rgba(0,245,255,0.8)' }}>
                      {countdown}
                    </div>
                    <div className="text-[#00f5ff] text-sm tracking-[0.4em] uppercase mt-2" style={mono}>
                      SHOT {singleShotMode ? (targetRetakeIndex + 1) : (currentShotIndex + 1)} OF 3
                    </div>
                  </div>
                )}
                {isCapturingSession && countdown === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center z-30 bg-white/5">
                    <div className="border-2 border-[#00f5ff] px-10 py-5 text-[#00f5ff] tracking-[0.4em] text-xl" style={vt}>
                      CAPTURED
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Bottom HUD overlay */}
            <div className="absolute bottom-0 left-0 right-0 z-25 px-6 py-4 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent pointer-events-none">
              <span className="text-[#aaa] font-bold text-sm tracking-widest">GDG ON CAMPUS HAU // OVERRIDE 2026</span>
              <span className="text-[#aaa] font-bold text-sm tracking-widest">NODE-01 // ENTITY-PROFILE</span>
            </div>
          </div>

          {/* Bottom strip: Camera source + stickers */}
          <div className="w-full max-w-6xl mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Source selector */}
            <div className="cyber-panel p-6 relative bg-[#111]">
              <div className="text-[#00f5ff] text-xs font-bold tracking-[0.25em] mb-4 uppercase">// INPUT SOURCE</div>
              <div className="flex items-center gap-3">
                <select
                  value={selectedDeviceId}
                  onChange={e => setSelectedDeviceId(e.target.value)}
                  disabled={isCapturingSession}
                  className="flex-1 text-sm p-2 bg-[#1a1a1a] text-white border border-[#333] rounded-md focus:border-[#00f5ff]"
                  style={mono}
                >
                  {devices.length > 0 ? devices.map((d, i) => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${i + 1}`}</option>
                  )) : <option>No cameras found</option>}
                </select>
                <button onClick={() => initCamera()} disabled={isCapturingSession}
                  className="border border-[#333] hover:border-[#00f5ff] text-[#999] hover:text-[#00f5ff] px-4 py-2 text-lg rounded-md transition-all disabled:opacity-30 bg-[#1a1a1a]">
                  ↺
                </button>
              </div>
            </div>

            {/* Stickers picker */}
            <div className="cyber-panel p-6 bg-[#111]">
              <div className="text-[#f5e642] text-xs font-bold tracking-[0.25em] mb-4 uppercase">// FACE OVERLAYS</div>
              <div className="flex flex-wrap gap-4 items-center">
                {STICKER_TEMPLATES.map(emoji => (
                  <button key={emoji} onClick={() => addSticker(emoji)} disabled={isCapturingSession}
                    className="text-3xl hover:scale-125 transition-transform disabled:opacity-30 active:scale-95">
                    {emoji}
                  </button>
                ))}
                {selectedStickerId && (
                  <button onClick={deleteSelectedSticker}
                    className="ml-auto border-2 border-[#ff003c]/50 text-[#ff003c] text-xs font-bold px-4 py-2 rounded-md hover:bg-[#ff003c]/10 transition-all">
                    DELETE
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Control Panel */}
        <div className="w-full lg:w-48 flex lg:flex-col items-center justify-center gap-6 border-l-4 border-[#1a1a1a] bg-[#0a0a0a] p-6 overflow-y-auto">

          {/* Filter button */}
          <div className="w-full flex flex-col items-center gap-2">
            <button
              onClick={() => setShowFiltersMenu(true)}
              disabled={isCapturingSession}
              className={`w-20 h-20 rounded-full border-4 overflow-hidden transition-all disabled:opacity-30 ${showFiltersMenu ? 'border-[#00f5ff] shadow-[0_0_15px_#00f5ff]' : 'border-[#222] hover:border-[#00f5ff]/50'}`}
            >
              <img src="https://api.dicebear.com/7.x/bottts/svg?seed=GDGPUP&backgroundColor=0d0d0d" alt="Filter" className="w-full h-full object-cover" />
            </button>
            <span className="text-white font-bold text-sm tracking-[0.2em] uppercase">FILTER</span>
            <span className="text-[#00f5ff] font-bold text-xs">{FILTERS.find(f => f.id === selectedFilter)?.name}</span>
          </div>

          <div className="h-px w-full bg-[#1a1a1a]" />

          {/* Shot counter */}
          <div className="flex flex-col items-center gap-2">
            <div className="text-[#aaa] text-xs font-bold tracking-widest uppercase">SHOTS TAKEN</div>
            <div className="flex gap-2">
              {[0, 1, 2].map(i => (
                <div key={i} className={`w-5 h-5 rounded-full border-2 transition-all ${i < capturedPhotos.length ? 'bg-[#00f5ff] border-[#00f5ff] shadow-[0_0_10px_#00f5ff]' : 'bg-[#1a1a1a] border-[#444]'}`} />
              ))}
            </div>
            <div className="text-[#00f5ff] text-base font-bold tracking-widest">{capturedPhotos.length}/3</div>
          </div>

          {/* Thumbnail gallery */}
          {capturedPhotos.length > 0 && (
            <div className="w-full flex flex-col gap-2">
              {capturedPhotos.map((p, i) => (
                <img key={i} src={p} alt={`Shot ${i + 1}`} className="w-full aspect-video rounded-md object-cover border-2 border-[#1a1a1a] opacity-90" />
              ))}
            </div>
          )}

          <div className="h-px w-full bg-[#1a1a1a]" />

          {/* CAPTURE button */}
          <div className="flex flex-col items-center gap-4 mt-auto py-4">
            {isCapturingSession ? (
              <button onClick={cancelSession}
                className="w-32 h-32 rounded-full border-4 border-[#ff003c] bg-[#1a1a1a] flex items-center justify-center transition-transform active:scale-95 disabled:opacity-30 shadow-[0_0_20px_rgba(255,0,60,0.6)]">
                <div className="w-10 h-10 bg-[#ff003c] rounded-md" />
              </button>
            ) : (
              <button
                onClick={startSession}
                disabled={!!error}
                className="w-32 h-32 rounded-full p-2 flex items-center justify-center transition-transform active:scale-95 disabled:opacity-30 bg-gradient-to-tr from-[#8a2be2] to-[#00f5ff] shadow-[0_0_20px_rgba(0,245,255,0.5)]"
              >
                <div className="w-full h-full rounded-full bg-[#1a1a1a] flex items-center justify-center">
                  <div className="w-16 h-16 bg-white rounded-full shadow-[0_0_10px_white]" />
                </div>
              </button>
            )}
            <div className="text-white font-bold text-lg tracking-widest uppercase mt-2 drop-shadow-md">
              {isCapturingSession ? 'ABORT' : 'CAPTURE'}
            </div>
            <div className="text-[#888] text-xs font-bold text-center tracking-widest uppercase">
              {singleShotMode ? `RETAKE SHOT ${targetRetakeIndex + 1}` : '3-SHOT SEQUENCE'}
            </div>
          </div>
        </div>
      </main>

      {/* Filter Modal */}
      {showFiltersMenu && !isCapturingSession && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none p-4 pb-6">
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] p-6 max-w-3xl w-full relative pointer-events-auto"
            style={{ clipPath: 'polygon(0 0, calc(100% - 16px) 0, 100% 16px, 100% 100%, 16px 100%, 0 calc(100% - 16px))' }}>
            {/* Corner accents */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00f5ff]" />
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00f5ff]" />

            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-[#00f5ff] text-[9px] tracking-[0.3em] uppercase mb-1">// VISUAL OVERRIDE</div>
                <h2 className="text-3xl text-white" style={vt}>SELECT FILTER MODE</h2>
              </div>
              <button onClick={() => setShowFiltersMenu(false)}
                className="border border-[#333] hover:border-[#ff003c] text-[#555] hover:text-[#ff003c] w-9 h-9 flex items-center justify-center text-sm transition-all">
                ✕
              </button>
            </div>

            <div className="grid grid-cols-3 md:grid-cols-5 gap-3 mb-5">
              {FILTERS.map(filter => (
                <div key={filter.id} className="flex flex-col gap-2">
                  <button
                    onClick={() => setSelectedFilter(filter.id)}
                    className={`relative aspect-square overflow-hidden border-2 transition-all ${selectedFilter === filter.id
                        ? 'border-[#00f5ff] shadow-[0_0_15px_rgba(0,245,255,0.3)] scale-105'
                        : 'border-[#1a1a1a] hover:border-[#333]'
                      }`}
                  >
                    <img
                      src="https://api.dicebear.com/7.x/bottts/svg?seed=Sparky"
                      alt={filter.name}
                      className="w-full h-full object-cover scale-110"
                      style={{ filter: filter.filterStr }}
                    />
                    {selectedFilter === filter.id && (
                      <div className="absolute top-1 right-1 w-5 h-5 bg-[#00f5ff] flex items-center justify-center text-black text-xs font-bold">✓</div>
                    )}
                  </button>
                  <span className={`text-center text-[10px] tracking-widest ${selectedFilter === filter.id ? 'text-[#00f5ff]' : 'text-[#444]'}`} style={mono}>
                    {filter.name}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-[#1a1a1a] pt-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 overflow-hidden border border-[#1a1a1a]">
                  <img src="https://api.dicebear.com/7.x/bottts/svg?seed=Sparky" alt="Sparky" className="w-full h-full object-cover" />
                </div>
                <span className="text-[#333] text-[10px] tracking-widest">LIVE PREVIEW ACTIVE</span>
              </div>
              <button onClick={() => setShowFiltersMenu(false)} className="cyber-btn text-xs px-8 py-3">
                CONFIRM
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
