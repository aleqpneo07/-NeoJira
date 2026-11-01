import React, { useState } from 'react';
import { Download, ExternalLink, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  onOpenConnectGuide?: () => void;
  compact?: boolean;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  onOpenConnectGuide,
  compact = false,
}) => {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isAndroid,
    isInIframe,
    standaloneUrl,
    install,
  } = usePWAInstall();
  const [showInstallModal, setShowInstallModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  // When native prompt is ready (outside iframe on Android/Desktop Chrome), trigger directly
  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className={`flex items-center justify-center gap-2 rounded-xl bg-[#FF6B4A] text-[#0B0E14] font-semibold hover:bg-[#ff7d60] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          compact ? 'px-3 py-2 text-xs min-h-[40px]' : 'w-full px-3.5 py-2.5 text-xs min-h-[44px]'
        }`}
      >
        <Download className="w-4 h-4 shrink-0" />
        <span>Instalar App ahora</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (onOpenConnectGuide) {
            onOpenConnectGuide();
          } else {
            setShowInstallModal(true);
          }
        }}
        className={`flex items-center justify-center gap-2 rounded-xl bg-[#19202E] border border-[#FF6B4A]/40 text-white font-semibold hover:bg-[#212A3C] hover:border-[#FF6B4A] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          compact ? 'px-3 py-2 text-xs min-h-[40px]' : 'w-full px-3.5 py-2.5 text-xs min-h-[44px]'
        }`}
      >
        <Smartphone className="w-4 h-4 text-[#FF6B4A] shrink-0" />
        <span>{compact ? 'Instalar en Móvil' : 'Instalar en Móvil / PC'}</span>
      </button>

      {showInstallModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Cómo instalar la aplicación en tu móvil"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#131822] border border-[#263044] p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-white font-display">
                Instalar App en tu Móvil
              </h3>
              <button
                type="button"
                onClick={() => setShowInstallModal(false)}
                aria-label="Cerrar guía de instalación"
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isInIframe && (
              <div className="rounded-xl bg-[#FF6B4A]/15 border border-[#FF6B4A]/40 p-3.5 space-y-2.5">
                <p className="text-xs font-semibold text-[#FF6B4A]">
                  Paso obligatorio: Abrir fuera de la vista previa
                </p>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Los navegadores móviles bloquean la instalación mientras la app está dentro del
                  panel de vista previa. Pulsa el botón de abajo para abrirla en una pestaña directa
                  de Chrome o Safari:
                </p>
                <a
                  href={standaloneUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#FF6B4A] hover:bg-[#ff7d60] text-[#0B0E14] font-bold text-xs py-2.5 px-4 transition-colors"
                >
                  <ExternalLink className="w-4 h-4 shrink-0" />
                  <span>Abrir versión instalable a pantalla completa</span>
                </a>
              </div>
            )}

            <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
              <div
                className={`p-3 rounded-xl border ${
                  isAndroid
                    ? 'bg-[#1B2333] border-[#FF6B4A]/50'
                    : 'bg-[#0B0E14] border-[#1E2638]'
                }`}
              >
                <p className="font-bold text-white mb-1">En Android (Google Chrome):</p>
                <p>
                  1. Abre el enlace directo en <strong>Chrome</strong>.<br />
                  2. Toca el menú de <strong>tres puntos (⋮)</strong> arriba a la derecha.<br />
                  3. Pulsa <strong>«Instalar aplicación»</strong> o{' '}
                  <strong>«Añadir a pantalla de inicio»</strong>.
                </p>
              </div>

              <div
                className={`p-3 rounded-xl border ${
                  isIOS ? 'bg-[#1B2333] border-[#FF6B4A]/50' : 'bg-[#0B0E14] border-[#1E2638]'
                }`}
              >
                <p className="font-bold text-white mb-1">En iPhone / iPad (Safari):</p>
                <p>
                  1. Abre el enlace directo en <strong>Safari</strong>.<br />
                  2. Toca el icono <strong>Compartir</strong> en la barra inferior.<br />
                  3. Desliza hacia abajo y pulsa <strong>«Añadir a pantalla de inicio»</strong>.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowInstallModal(false)}
              className="w-full rounded-xl bg-[#1B2333] hover:bg-[#253047] py-2.5 text-xs font-semibold text-white transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </>
  );
};
