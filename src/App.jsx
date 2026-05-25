import React, { useState } from 'react';
import CameraView from './components/CameraView';
import EditingSuite from './components/EditingSuite';
import FinalPreview from './components/FinalPreview';
import HomeView from './components/HomeView';
import { Camera, Sparkles, Sliders, Info, Heart } from 'lucide-react';

export default function App() {
  // Navigation: 'welcome' | 'capture' | 'edit' | 'retake' | 'preview'
  const [step, setStep] = useState('welcome');
  const [photos, setPhotos] = useState([]);
  const [retakeIndex, setRetakeIndex] = useState(0);

  // Handle capture of the initial 3-shot sequence
  const handleInitialCaptureComplete = (capturedUrls, filter = 'none', stickers = []) => {
    const formattedPhotos = capturedUrls.map((url, idx) => ({
      rawUrl: url,
      filter: filter,
      stickers: stickers.map(s => ({
        ...s,
        id: `${s.id}-${idx}-${Math.random().toString(36).substr(2, 5)}`
      }))
    }));
    setPhotos(formattedPhotos);
    setStep('edit');
  };

  // Handle capture of a single retaken shot
  const handleRetakeCaptureComplete = (newPhotoUrl, filter, stickers) => {
    setPhotos(prev => 
      prev.map((photo, idx) => 
        idx === retakeIndex 
          ? { 
              ...photo, 
              rawUrl: newPhotoUrl,
              filter: filter || photo.filter,
              stickers: stickers ? stickers.map(s => ({ ...s, id: `${s.id}-${Math.random().toString(36).substr(2, 5)}` })) : photo.stickers
            } 
          : photo
      )
    );
    setStep('edit');
  };

  const handleRetakeRequest = (idx) => {
    setRetakeIndex(idx);
    setStep('retake');
  };

  const handleReset = () => {
    setPhotos([]);
    setStep('welcome');
  };

  return (
    <div className="min-h-screen bg-[#060a16] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Main View Router */}
      <main className="flex-grow flex flex-col">
        {step === 'welcome' && (
          <HomeView onStart={() => setStep('capture')} />
        )}

        {step === 'capture' && (
          <CameraView 
            onCaptureComplete={handleInitialCaptureComplete} 
            onBack={handleReset} 
          />
        )}

        {step === 'edit' && (
          <EditingSuite
            photos={photos}
            onUpdatePhotos={setPhotos}
            onNext={() => setStep('preview')}
            onRetakePhoto={handleRetakeRequest}
          />
        )}

        {step === 'retake' && (
          <CameraView
            singleShotMode={true}
            targetRetakeIndex={retakeIndex}
            initialFilter={photos[retakeIndex]?.filter}
            initialStickers={photos[retakeIndex]?.stickers}
            onCaptureComplete={handleRetakeCaptureComplete}
            onBack={() => setStep('edit')}
          />
        )}

        {step === 'preview' && (
          <FinalPreview 
            photos={photos} 
            onReset={handleReset} 
          />
        )}
      </main>
    </div>
  );
}
