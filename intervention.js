/**
 * Device capability adapters. Every feature is opt-in and safely stoppable.
 */

export function speak(text, options = {}) {
  if (!('speechSynthesis' in globalThis) || !text) return false;
  globalThis.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = options.lang || 'ja-JP';
  utterance.rate = options.rate || 1;
  globalThis.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking() {
  globalThis.speechSynthesis?.cancel();
}

export function vibrate(pattern = [80, 120, 80]) {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
    ? navigator.vibrate(pattern)
    : false;
}

export function stopVibration() {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(0);
}

export function createShakeDetector({ threshold = 18, onShake } = {}) {
  let active = false;
  let last = 0;
  const handleMotion = (event) => {
    const acceleration = event.accelerationIncludingGravity || event.acceleration;
    if (!acceleration) return;
    const magnitude = Math.sqrt(
      (Number(acceleration.x) || 0) ** 2
      + (Number(acceleration.y) || 0) ** 2
      + (Number(acceleration.z) || 0) ** 2
    );
    const now = Date.now();
    if (magnitude >= threshold && now - last > 450) {
      last = now;
      onShake?.({ magnitude });
    }
  };
  return {
    start() {
      if (active || typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return false;
      window.addEventListener('devicemotion', handleMotion);
      active = true;
      return true;
    },
    stop() {
      if (!active || typeof window === 'undefined') return;
      window.removeEventListener('devicemotion', handleMotion);
      active = false;
    },
    get active() { return active; }
  };
}
