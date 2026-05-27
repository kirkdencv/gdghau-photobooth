import React, { useState, useEffect, useRef } from 'react';
import { Trash2, ZoomIn, RefreshCw } from 'lucide-react';

const STICKER_TEMPLATES = ['😎', '🎉', '❤️', '🎩', '🕶️', '👑', '🍕', '✨'];

const FILTERS = [
  { id: 'none',      name: 'NORMAL',  filterStr: 'none' },
  { id: 'grayscale', name: 'B&W',     filterStr: 'grayscale(100%)' },
  { id: 'sepia',     name: 'WARM',    filterStr: 'sepia(100%)' },
  { id: 'invert',    name: 'INVERT',  filterStr: 'invert(100%)' },
  { id: 'vintage',   name: 'VINTAGE', filterStr: 'sepia(60%) contrast(120%) saturate(130%)' },
];

const mono = { fontFamily: "'Share Tech Mono', monospace" };
const vt   = { fontFamily: "'VT323', monospace" };

export default function EditingSuite({ photos, onUpdatePhotos, onNext, onRetakePhoto }) {
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(0);
  const [selectedStickerId, setSelectedStickerId]   = useState(null);

  const canvasRef    = useRef(null);
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const activePhoto = photos[selectedPhotoIndex];

  useEffect(() => { drawCanvas(); }, [selectedPhotoIndex, photos, selectedStickerId]);

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !activePhoto) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.src = activePhoto.rawUrl;
    img.onload = () => {
      canvas.width  = img.width;
      canvas.height = img.height;
      const activeFilter = FILTERS.find(f => f.id === activePhoto.filter) || FILTERS[0];
      ctx.filter = activeFilter.filterStr;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';
      activePhoto.stickers.forEach(sticker => {
        ctx.font          = `${sticker.size}px Arial`;
        ctx.textBaseline  = 'middle';
        ctx.textAlign     = 'center';
        ctx.fillText(sticker.text, sticker.x, sticker.y);
        if (sticker.id === selectedStickerId) {
          ctx.strokeStyle = '#00f5ff';
          ctx.lineWidth   = 3;
          ctx.setLineDash([6, 6]);
          const pad = sticker.size * 0.7;
          ctx.strokeRect(sticker.x - pad, sticker.y - pad, pad * 2, pad * 2);
          ctx.setLineDash([]);
        }
      });
    };
  };

  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect    = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * (canvas.width / rect.width), y: (clientY - rect.top) * (canvas.height / rect.height) };
  };

  const handlePointerDown = (e) => {
    const coords = getCanvasCoords(e);
    if (!coords) return;
    const clicked = [...activePhoto.stickers].reverse().find(s => Math.hypot(coords.x - s.x, coords.y - s.y) < s.size * 0.7);
    if (clicked) {
      setSelectedStickerId(clicked.id);
      isDraggingRef.current = true;
      dragOffsetRef.current = { x: coords.x - clicked.x, y: coords.y - clicked.y };
    } else { setSelectedStickerId(null); }
  };

  const handlePointerMove = (e) => {
    if (!isDraggingRef.current || selectedStickerId === null) return;
    const coords = getCanvasCoords(e);
    if (!coords) return;
    updateActivePhotoStickers(activePhoto.stickers.map(s =>
      s.id === selectedStickerId ? { ...s, x: coords.x - dragOffsetRef.current.x, y: coords.y - dragOffsetRef.current.y } : s));
  };

  const handlePointerUp = () => { isDraggingRef.current = false; };

  const updateActivePhotoFilter = (filterId) => {
    const updated = [...photos];
    updated[selectedPhotoIndex] = { ...activePhoto, filter: filterId };
    onUpdatePhotos(updated);
  };

  const updateActivePhotoStickers = (newStickers) => {
    const updated = [...photos];
    updated[selectedPhotoIndex] = { ...activePhoto, stickers: newStickers };
    onUpdatePhotos(updated);
  };

  const addSticker = (emoji) => {
    const canvas = canvasRef.current;
    const newSticker = { id: Date.now(), text: emoji, x: canvas ? canvas.width / 2 : 640, y: canvas ? canvas.height / 2 : 360, size: 100 };
    updateActivePhotoStickers([...activePhoto.stickers, newSticker]);
    setSelectedStickerId(newSticker.id);
  };

  const deleteSelectedSticker = () => {
    if (selectedStickerId === null) return;
    updateActivePhotoStickers(activePhoto.stickers.filter(s => s.id !== selectedStickerId));
    setSelectedStickerId(null);
  };

  const changeSelectedStickerSize = (newSize) => {
    if (selectedStickerId === null) return;
    updateActivePhotoStickers(activePhoto.stickers.map(s => s.id === selectedStickerId ? { ...s, size: parseInt(newSize, 10) } : s));
  };

  const selectedSticker = activePhoto.stickers.find(s => s.id === selectedStickerId);

  return (
    <div className="crt-overlay noise-bg grid-bg min-h-screen bg-[#050505] text-[#e0e0e0] flex flex-col relative overflow-hidden" style={mono}>
      {/* Ambient Glows */}
      <div className="ambient-glow ambient-tl"></div>
      <div className="ambient-glow ambient-tr"></div>
      <div className="ambient-glow ambient-bl"></div>
      <div className="ambient-glow ambient-br"></div>

      {/* Header */}
      <div className="relative z-20 border-b border-[#1a1a1a] px-6 py-3 bg-black/40 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-[#f5e642]" />
          <span className="text-[#f5e642] text-[10px] tracking-[0.3em] uppercase">NODE 02: DATA MODIFICATION</span>
        </div>
        <span className="text-[#333] text-[10px] tracking-widest">
          EDITING SHOT <span className="text-[#00f5ff]">{selectedPhotoIndex + 1}</span>/3
        </span>
      </div>

      <div className="flex-grow flex flex-col lg:flex-row gap-0">
        {/* Left: Canvas */}
        <div className="flex-grow flex flex-col p-4 gap-4">
          {/* Canvas */}
          <div className="flex-grow relative bg-black border border-[#1a1a1a] overflow-hidden" style={{ minHeight: '50vh' }}>
            {/* HUD corners */}
            <div className="absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-[#00f5ff] z-10 pointer-events-none" />
            <div className="absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-[#00f5ff] z-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 border-[#00f5ff] z-10 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 border-[#00f5ff] z-10 pointer-events-none" />

            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown} onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}     onPointerLeave={handlePointerUp}
              onTouchStart={handlePointerDown}  onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
              className="w-full h-full object-contain cursor-crosshair touch-none"
            />
            {activePhoto.stickers.length > 0 && !selectedStickerId && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 border border-[#1a1a1a] px-4 py-1 text-[9px] text-[#333] tracking-widest pointer-events-none uppercase">
                CLICK &amp; DRAG OVERLAYS TO POSITION
              </div>
            )}
          </div>

          {/* Filter bar */}
          <div className="cyber-panel p-4">
            <div className="text-[#00f5ff] text-[9px] tracking-[0.25em] mb-3 uppercase">// VISUAL FILTER MODE</div>
            <div className="grid grid-cols-5 gap-2">
              {FILTERS.map(filter => {
                const isActive = activePhoto.filter === filter.id;
                return (
                  <button key={filter.id} onClick={() => updateActivePhotoFilter(filter.id)}
                    className={`py-2 px-1 text-[10px] border transition-all tracking-widest ${
                      isActive
                        ? 'bg-[#00f5ff]/10 border-[#00f5ff] text-[#00f5ff]'
                        : 'bg-transparent border-[#1a1a1a] text-[#444] hover:border-[#333] hover:text-[#666]'
                    }`} style={mono}>
                    {filter.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right: Controls */}
        <div className="relative z-20 w-full lg:w-64 border-l border-[#1a1a1a] bg-black/40 backdrop-blur-md p-4 flex flex-col gap-5">
          {/* Thumbnail switcher */}
          <div>
            <div className="text-[#f5e642] text-[9px] tracking-[0.25em] mb-3 uppercase">// SELECT SHOT</div>
            <div className="grid grid-cols-3 gap-2">
              {photos.map((photo, idx) => (
                <button key={idx}
                  onClick={() => { setSelectedPhotoIndex(idx); setSelectedStickerId(null); }}
                  className={`aspect-video overflow-hidden border-2 transition-all ${
                    idx === selectedPhotoIndex ? 'border-[#00f5ff]' : 'border-[#1a1a1a] hover:border-[#333]'
                  }`}>
                  <img src={photo.rawUrl} alt={`Shot ${idx + 1}`} className="w-full h-full object-cover"
                    style={{ filter: FILTERS.find(f => f.id === photo.filter)?.filterStr || 'none' }} />
                </button>
              ))}
            </div>
          </div>

          {/* Retake */}
          <button onClick={() => onRetakePhoto(selectedPhotoIndex)}
            className="border border-[#1a1a1a] hover:border-[#ff003c] text-[#333] hover:text-[#ff003c] py-2 px-3 text-[10px] tracking-widest flex items-center gap-2 transition-all uppercase">
            <RefreshCw className="w-3 h-3" /> RETAKE SHOT {selectedPhotoIndex + 1}
          </button>

          <div className="h-px bg-[#1a1a1a]" />

          {/* Face overlays */}
          <div>
            <div className="text-[#f5e642] text-[9px] tracking-[0.25em] mb-3 uppercase">// FACE OVERLAYS</div>
            <div className="grid grid-cols-4 gap-2">
              {STICKER_TEMPLATES.map(emoji => (
                <button key={emoji} onClick={() => addSticker(emoji)}
                  className="bg-[#0d0d0d] hover:bg-[#111] border border-[#1a1a1a] hover:border-[#333] p-2 text-xl text-center transition-all active:scale-95">
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Selected sticker controls */}
          {selectedSticker ? (
            <div className="cyber-panel p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[#00f5ff] text-[9px] tracking-widest uppercase">OVERLAY CTRL</span>
                <button onClick={deleteSelectedSticker}
                  className="text-[#ff003c] hover:bg-[#ff003c]/10 p-1 transition-all border border-[#ff003c]/30 hover:border-[#ff003c]">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <div>
                <div className="flex justify-between text-[9px] text-[#444] mb-2 uppercase tracking-widest">
                  <span className="flex items-center gap-1"><ZoomIn className="w-3 h-3" /> SIZE</span>
                  <span className="text-[#00f5ff]">{selectedSticker.size}px</span>
                </div>
                <input type="range" min="40" max="250" value={selectedSticker.size}
                  onChange={e => changeSelectedStickerSize(e.target.value)}
                  className="w-full h-1 appearance-none cursor-pointer" />
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-[#1a1a1a] p-4 text-center">
              <p className="text-[9px] text-[#333] tracking-widest uppercase leading-relaxed">
                SELECT AN OVERLAY TO RESIZE OR DELETE
              </p>
            </div>
          )}

          <div className="mt-auto">
            <button onClick={onNext} className="cyber-btn-yellow cyber-btn w-full py-4 text-sm">
              ▶ BUILD PHOTO STRIP
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
