import React, { useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Cloud,
  Copy,
  Download,
  ExternalLink,
  LogIn,
  QrCode,
  Share2,
  Smartphone,
  X,
} from 'lucide-react';
import QRCode from 'qrcode';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface SyncConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string | null;
  onGoogleSignIn: () => void;
  authError: string | null;
}

export const SyncConnectModal: React.FC<SyncConnectModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  onGoogleSignIn,
  authError,
}) => {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isInIframe,
    standaloneUrl,
    chromeIntentUrl,
    install,
  } = usePWAInstall();

  const [copied, setCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [deviceTab, setDeviceTab] = useState<'opera' | 'chrome' | 'ios'>(
    isIOS ? 'ios' : 'opera'
  );

  useEffect(() => {
    if (!isOpen) return;
    if (isIOS) setDeviceTab('ios');
    else setDeviceTab('opera');

    QRCode.toDataURL(standaloneUrl, {
      width: 180,
      margin: 1,
      color: {
        dark: '#0B0E14',
        light: '#FFFFFF',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch(() => setQrDataUrl(''));
  }, [isOpen, standaloneUrl, isIOS]);

  if (!isOpen) return null;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(standaloneUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Enfoque — Trabajos, Exámenes y Día a Día',
          text: 'Abre este enlace para instalar Enfoque en tu móvil:',
          url: standaloneUrl,
        });
      } catch {
        // User cancelled share
      }
    } else {
      handleCopyUrl();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Conectar e instalar en ordenador y móvil"
    >
      <div className="w-full max-w-lg rounded-2xl bg-[#131822] border border-[#263044] p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FF6B4A]/20 border border-[#FF6B4A]/40 flex items-center justify-center text-[#FF6B4A]">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-white font-display">
                Instalar en Opera / Móvil y Sincronizar
              </h2>
              <p className="text-xs text-slate-400">
                Solución directa para Opera, Chrome y Safari
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana de sincronización"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Native 1-click install button if browser unlocked beforeinstallprompt */}
        {isInstallable && !isInstalled && (
          <div className="rounded-2xl bg-emerald-500/15 border border-emerald-500/40 p-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-emerald-300">¡Instalación directa lista!</p>
              <p className="text-xs text-slate-300 mt-0.5">
                Pulsa aquí para añadir Enfoque a tu pantalla de inicio ahora mismo.
              </p>
            </div>
            <button
              type="button"
              onClick={install}
              className="px-4 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-[#0B0E14] font-extrabold text-xs flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Instalar ahora</span>
            </button>
          </div>
        )}

        {/* Opera & Mobile Direct Action Box */}
        <div className="rounded-2xl bg-[#FF6B4A]/15 border border-[#FF6B4A]/50 p-4 space-y-3">
          <p className="text-xs font-bold text-[#FF6B4A]">
            ¿Usas Opera en el móvil y no te deja instalar?
          </p>
          <p className="text-xs text-slate-200 leading-relaxed">
            <strong>Opera móvil</strong> bloquea el botón automático de instalación dentro de esta
            vista y esconde la opción en su barra superior. Tienes <strong>2 opciones</strong> para
            tenerla hoy mismo en tu pantalla de inicio:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
            <a
              href={standaloneUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-xl bg-[#FF6B4A] hover:bg-[#ff7e62] text-[#0B0E14] font-extrabold text-xs py-2.5 px-3 transition-colors text-center"
            >
              <ExternalLink className="w-4 h-4 shrink-0" />
              <span>1. Abrir enlace directo</span>
            </a>
            <a
              href={chromeIntentUrl}
              className="flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-slate-200 text-[#0B0E14] font-extrabold text-xs py-2.5 px-3 transition-colors text-center"
            >
              <Smartphone className="w-4 h-4 shrink-0" />
              <span>2. Abrir en Chrome (1 toque)</span>
            </a>
            <button
              type="button"
              onClick={handleNativeShare}
              className="sm:col-span-2 flex items-center justify-center gap-2 rounded-xl bg-[#1B2333] hover:bg-[#253047] text-white font-semibold text-xs py-2.5 px-3 transition-colors cursor-pointer"
            >
              <Share2 className="w-4 h-4 text-[#FF6B4A] shrink-0" />
              <span>Compartir enlace a otro navegador</span>
            </button>
          </div>
        </div>

        {/* Step-by-Step Instructions with Opera Tab First */}
        <div className="rounded-xl bg-[#0B0E14] border border-[#1E2638] p-4 space-y-3">
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-[#131822] border border-[#1E2638]">
            <button
              type="button"
              onClick={() => setDeviceTab('opera')}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                deviceTab === 'opera'
                  ? 'bg-[#FF6B4A] text-[#0B0E14]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Opera
            </button>
            <button
              type="button"
              onClick={() => setDeviceTab('chrome')}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                deviceTab === 'chrome'
                  ? 'bg-[#FF6B4A] text-[#0B0E14]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Chrome
            </button>
            <button
              type="button"
              onClick={() => setDeviceTab('ios')}
              className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                deviceTab === 'ios'
                  ? 'bg-[#FF6B4A] text-[#0B0E14]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              iPhone
            </button>
          </div>

          {deviceTab === 'opera' && (
            <div className="space-y-2 text-xs text-slate-300 leading-relaxed">
              <p className="font-semibold text-white">
                Cómo añadirla a tu pantalla de inicio desde Opera:
              </p>
              <ol className="space-y-1.5 pl-4 list-decimal">
                <li>
                  Primero pulsa <strong>«1. Abrir fuera de vista previa»</strong> arriba para que la
                  página cargue directamente en Opera.
                </li>
                <li>
                  En Opera, <strong>NO</strong> pulses el botón de la «O» de abajo: mira{' '}
                  <strong>arriba del todo a la derecha</strong> (al lado de la dirección web) y toca
                  los <strong>tres puntos (⋮)</strong>.
                </li>
                <li>
                  En ese menú superior, toca <strong>«Pantalla de inicio»</strong> (icono de un
                  móvil con un signo <code>+</code>) y pulsa <strong>«Añadir»</strong>.
                </li>
              </ol>
              <div className="rounded-lg bg-[#161D2B] border border-[#26324A] p-2.5 text-[11px] text-slate-300">
                <strong className="text-[#FF6B4A]">Nota si tienes Xiaomi / Redmi / Samsung:</strong>{' '}
                Opera viene por defecto sin permiso para crear iconos. Si le das a «Pantalla de
                inicio» y no aparece el icono, ve a{' '}
                <strong>
                  Ajustes del móvil → Aplicaciones → Opera → Permisos → Activa «Accesos directos en
                  pantalla de inicio»
                </strong>
                .
              </div>
            </div>
          )}

          {deviceTab === 'chrome' && (
            <ol className="text-xs text-slate-300 space-y-1.5 pl-4 list-decimal leading-relaxed">
              <li>
                Pulsa el botón blanco <strong>«Abrir en Chrome para instalar»</strong> de arriba o
                pega el enlace en Google Chrome.
              </li>
              <li>
                Toca los <strong>tres puntos (⋮)</strong> arriba a la derecha en Chrome.
              </li>
              <li>
                Pulsa <strong>«Instalar aplicación»</strong> o{' '}
                <strong>«Añadir a pantalla de inicio»</strong>.
              </li>
            </ol>
          )}

          {deviceTab === 'ios' && (
            <ol className="text-xs text-slate-300 space-y-1.5 pl-4 list-decimal leading-relaxed">
              <li>
                En iPhone, Apple bloquea la instalación desde Opera o Chrome: debes abrir el enlace
                en <strong>Safari</strong>.
              </li>
              <li>
                En Safari, toca el botón <strong>Compartir</strong> abajo y selecciona{' '}
                <strong>«Añadir a pantalla de inicio»</strong>.
              </li>
            </ol>
          )}

          {/* QR + Copy URL */}
          <div className="pt-2.5 border-t border-[#1E2638] flex flex-col sm:flex-row items-center gap-3">
            {qrDataUrl && (
              <div className="bg-white p-2 rounded-xl shrink-0">
                <img
                  src={qrDataUrl}
                  alt="Código QR para abrir Enfoque en el móvil"
                  className="w-20 h-20 block"
                />
              </div>
            )}
            <div className="flex-1 min-w-0 w-full space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <QrCode className="w-3.5 h-3.5 text-[#FF6B4A]" />
                <span>Enlace directo de tu aplicación:</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={standaloneUrl}
                  aria-label="Enlace directo de instalación"
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-[#131822] border border-[#242F46] text-xs text-slate-200 font-mono-num"
                />
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="px-3 py-2 rounded-xl bg-[#1B2333] hover:bg-[#253047] text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 min-h-[38px]"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Google Cloud Sync Section */}
        <div className="rounded-xl bg-[#0B0E14] border border-[#1E2638] p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <Cloud className="w-4 h-4 text-[#FF6B4A]" />
            <span>Sincronización en tiempo real con Google</span>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Aunque la uses directamente desde una pestaña o marcador de Opera en el móvil y en el
            PC, al iniciar sesión con Google tendrás exactamente los mismos datos al instante.
          </p>

          {authError && (
            <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2">
              {authError}
            </p>
          )}

          {userEmail ? (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 px-3.5 py-2.5 text-xs font-medium text-emerald-300">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="truncate">Sincronizado como {userEmail}</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onGoogleSignIn}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-white hover:bg-slate-200 text-[#0B0E14] font-semibold text-xs py-2.5 px-4 transition-colors cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Conectar cuenta de Google</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
