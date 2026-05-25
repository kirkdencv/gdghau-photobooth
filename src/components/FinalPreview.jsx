import React, { useEffect, useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';

const FILTERS = [
  { id: 'none', filterStr: 'none' },
  { id: 'grayscale', filterStr: 'grayscale(100%)' },
  { id: 'sepia', filterStr: 'sepia(100%)' },
  { id: 'invert', filterStr: 'invert(100%)' },
  { id: 'vintage', filterStr: 'sepia(60%) contrast(120%) saturate(130%)' },
];

const mono = { fontFamily: "'Share Tech Mono', monospace" };
const vt = { fontFamily: "'VT323', monospace" };

// Set this to the URL/path of your event template (e.g., '/template.png' in public folder)
// If it fails to load, the system falls back to a minimal default design.
const TEMPLATE_URL = '/template.png';

export default function FinalPreview({ photos, onReset }) {
  const [compositeUrl, setCompositeUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [shareLink, setShareLink] = useState('');
  const [email, setEmail] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);
  const [emailError, setEmailError] = useState('');
  const hiddenCanvasRef = useRef(null);

  useEffect(() => {
    const randomId = Math.random().toString(36).substring(2, 11);
    setShareLink(`https://gdg-photobooth.web.app/share/${randomId}`);
  }, []);

  const handleEmailSend = (e) => {
    e.preventDefault();
    if (!email || !hiddenCanvasRef.current) return;

    setIsSendingEmail(true);
    setEmailError('');

    const canvas = hiddenCanvasRef.current;

    // Use toBlob for true binary transfer — no Base64 bloat
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setIsSendingEmail(false);
        setEmailError('CANVAS ERROR — Could not generate image blob.');
        return;
      }

      const formData = new FormData();
      formData.append('email', email);
      formData.append('photo', blob, `gdg-strip-${Date.now()}.jpg`);

      try {
        const res = await fetch('/api/sendEmail', {
          method: 'POST',
          body: formData,
          // Do NOT set Content-Type — the browser sets it automatically
          // with the correct multipart boundary.
        });

        const json = await res.json();

        if (!res.ok) {
          throw new Error(json.error || `Server responded with ${res.status}`);
        }

        setIsSendingEmail(false);
        setEmailSuccess(true);
        setEmail('');
        setTimeout(() => setEmailSuccess(false), 4000);
      } catch (err) {
        console.error('Email send failed:', err);
        setIsSendingEmail(false);
        setEmailError(`TRANSMISSION FAILED — ${err.message}`);
      }
    }, 'image/jpeg', 0.85); // 85% quality JPEG — good balance of size vs. quality
  };

  useEffect(() => {
    if (photos.length < 3) return;
    setLoading(true);
    const canvas = hiddenCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loadImg = (src) => new Promise((resolve, reject) => {
      const img = new Image();
      // Handle cross-origin if external
      if (src.startsWith('http')) img.crossOrigin = 'anonymous';
      img.src = src;
      img.onload = () => resolve(img);
      img.onerror = reject;
    });

    Promise.all([
      ...photos.map(p => loadImg(p.rawUrl)),
      loadImg(TEMPLATE_URL).catch(() => null) // Catch if template doesn't exist
    ]).then((loadedAssets) => {
      const images = loadedAssets.slice(0, 3);
      const templateImg = loadedAssets[3];

      canvas.width = 600;
      canvas.height = 1800;

      // Base background (white)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const photoWidth = 500;
      const photoHeight = 375;
      const photoX = 50;
      const photoYs = [150, 575, 1000];

      // Draw Photos
      images.forEach((img, idx) => {
        const photoData = photos[idx];
        const y = photoYs[idx];

        ctx.save();
        ctx.beginPath();
        ctx.rect(photoX, y, photoWidth, photoHeight);
        ctx.clip();
        
        // Calculate crop to fill (cover)
        const scale = Math.max(photoWidth / img.width, photoHeight / img.height);
        const drawW = img.width * scale;
        const drawH = img.height * scale;
        const drawX = photoX + (photoWidth - drawW) / 2;
        const drawY = y + (photoHeight - drawH) / 2;

        const activeFilter = FILTERS.find(f => f.id === photoData.filter) || FILTERS[0];
        ctx.filter = activeFilter.filterStr;
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
        ctx.restore();

        // Stickers
        // Scale sticker coordinates from original capture space to drawn space
        const originalWidth = 1280; // standard original webcam capture width used in CameraView
        const stickerScale = drawW / originalWidth; 
        photoData.stickers.forEach(sticker => {
          ctx.save();
          ctx.font = `${sticker.size * stickerScale}px Arial`;
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'center';
          ctx.fillText(sticker.text, drawX + sticker.x * stickerScale, drawY + sticker.y * stickerScale);
          ctx.restore();
        });
      });

      // Draw Template or Fallback
      if (templateImg) {
        ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height);
      } else {
        // Fallback drawing if no template.png is provided
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        photoYs.forEach(y => {
          ctx.strokeRect(photoX, y, photoWidth, photoHeight);
        });

        // Simple Fallback Header
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 42px "VT323", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('GDG ON CAMPUS HAU', canvas.width / 2, 80);

        // Simple Fallback Footer
        const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
        ctx.font = 'bold 24px monospace';
        ctx.fillText(dateStr.toUpperCase(), canvas.width / 2, 1450);
        ctx.font = '16px monospace';
        ctx.fillText('POWERED BY GOOGLE DEVELOPER GROUPS', canvas.width / 2, 1500);
      }

      setCompositeUrl(canvas.toDataURL('image/png'));
      setLoading(false);
    });
  }, [photos]);

  const downloadComposite = () => {
    if (!compositeUrl) return;
    const link = document.createElement('a');
    link.download = `gdg-photobooth-strip-${Date.now()}.png`;
    link.href = compositeUrl;
    link.click();
  };

  const downloadIndividual = (idx) => {
    const photo = photos[idx];
    const img = new Image();
    img.src = photo.rawUrl;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const activeFilter = FILTERS.find(f => f.id === photo.filter) || FILTERS[0];
      ctx.filter = activeFilter.filterStr;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.filter = 'none';
      photo.stickers.forEach(sticker => {
        ctx.font = `${sticker.size}px Arial`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText(sticker.text, sticker.x, sticker.y);
      });
      const link = document.createElement('a');
      link.download = `gdg-shot-${idx + 1}-${Date.now()}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
  };

  return (
    <div className="crt-overlay noise-bg min-h-screen bg-[#080808] text-[#e0e0e0] flex flex-col" style={mono}>
      {/* Header */}
      <div className="border-b border-[#1a1a1a] px-6 py-3 bg-[#0a0a0a] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-[#00ff41]" />
          <span className="text-[#00ff41] text-[10px] tracking-[0.3em] uppercase">NODE 04: OUTPUT METRICS</span>
        </div>
        <span className="text-[#333] text-[10px] tracking-widest">STRIP ASSEMBLED — READY FOR EXTRACTION</span>
      </div>

      <div className="flex-grow flex flex-col lg:flex-row gap-0">
        {/* Left: Strip preview */}
        <div className="flex-grow flex flex-col items-center justify-center p-6 bg-[#080808]">
          <canvas ref={hiddenCanvasRef} className="hidden" />

          {loading ? (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-12 h-12 border-2 border-[#00f5ff] border-t-transparent rounded-full animate-spin" />
              <p className="text-[#333] text-xs tracking-widest uppercase">ASSEMBLING STRIP...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 w-full max-w-xs">
              <div className="text-[#00f5ff] text-[9px] tracking-[0.3em] self-start uppercase">// PHOTO STRIP OUTPUT</div>
              <div className="border border-[#1a1a1a] p-2 w-full relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-[#00f5ff]" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-[#00f5ff]" />
                <img src={compositeUrl} alt="Photo Strip" className="w-full h-auto object-contain" />
              </div>
              <p className="text-[#222] text-[9px] text-center tracking-widest uppercase">
                TAP + HOLD ON MOBILE TO SAVE TO CAMERA ROLL
              </p>
            </div>
          )}
        </div>

        {/* Right: Download panel */}
        <div className="w-full lg:w-64 border-l border-[#1a1a1a] bg-[#0a0a0a] p-5 flex flex-col gap-5">
          <div>
            <div className="text-[#00f5ff] text-[9px] tracking-[0.25em] mb-1 uppercase">// DELIVERY SUITE</div>
            <h2 className="text-3xl text-white mb-3" style={vt}>EXTRACT OUTPUT</h2>
            <p className="text-[#333] text-[10px] leading-relaxed tracking-wider">
              DOWNLOAD THE COMPILED STRIP OR EXTRACT INDIVIDUAL SHOTS TO YOUR DEVICE.
            </p>
          </div>

          {/* QR Code */}
          <div className="cyber-panel p-4 flex flex-col items-center gap-3 text-center">
            <span className="text-[#f5e642] text-[9px] tracking-[0.25em] uppercase">// SCAN &amp; SHARE</span>
            <div className="bg-white p-2">
              <QRCodeSVG value={shareLink} size={100} fgColor="#080808" level="M" />
            </div>
            <code className="text-[8px] text-[#333] break-all block" style={mono}>{shareLink}</code>
          </div>

          {/* Email Delivery */}
          <div className="cyber-panel p-4 flex flex-col gap-3">
            <span className="text-[#f5e642] text-[9px] tracking-[0.25em] uppercase">// EMAIL DELIVERY</span>
            <form onSubmit={handleEmailSend} className="flex flex-col gap-2">
              <input
                type="email"
                required
                placeholder="ENTER EMAIL ADDRESS"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                className="w-full bg-[#111] border border-[#333] focus:border-[#00f5ff] text-[#e0e0e0] text-xs p-2 outline-none transition-all"
                style={mono}
              />
              <button
                type="submit"
                disabled={isSendingEmail || loading}
                className={`border text-[10px] tracking-widest uppercase transition-all py-2 flex items-center justify-center gap-2 ${
                  emailSuccess
                    ? 'border-[#00ff41] text-[#00ff41] bg-[#00ff41]/10'
                    : emailError
                    ? 'border-[#ff003c] text-[#ff003c] bg-[#ff003c]/10'
                    : 'border-[#00f5ff] text-[#00f5ff] hover:bg-[#00f5ff]/10 disabled:opacity-30'
                }`}
              >
                {isSendingEmail && (
                  <span className="w-3 h-3 border border-[#00f5ff] border-t-transparent rounded-full animate-spin inline-block" />
                )}
                {isSendingEmail ? 'TRANSMITTING...' : emailSuccess ? '✓ TRANSMISSION COMPLETE' : emailError ? '✕ RETRY' : 'SEND VIA EMAIL'}
              </button>
              {emailError && (
                <p className="text-[#ff003c] text-[9px] tracking-wider leading-relaxed" style={mono}>
                  !! {emailError}
                </p>
              )}
            </form>
          </div>

          {/* Individual shots */}
          <div>
            <div className="text-[#f5e642] text-[9px] tracking-[0.25em] mb-3 uppercase">// INDIVIDUAL SHOTS</div>
            <div className="grid grid-cols-3 gap-2">
              {[0, 1, 2].map(idx => (
                <button key={idx} onClick={() => downloadIndividual(idx)}
                  className="border border-[#1a1a1a] hover:border-[#00f5ff] text-[#333] hover:text-[#00f5ff] py-3 text-[9px] flex flex-col items-center gap-1 transition-all tracking-widest uppercase">
                  <span className="text-base">↓</span>
                  SHOT {idx + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto space-y-3">
            <button onClick={downloadComposite} disabled={loading}
              className="cyber-btn w-full py-4 text-xs disabled:opacity-30">
              ↓ DOWNLOAD FULL STRIP
            </button>
            <button onClick={onReset}
              className="cyber-btn-red cyber-btn w-full py-3 text-xs">
              ↺ NEW SESSION
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
