import { useEffect, useRef } from 'react';
import roomiesLogo from './assets/roomies-wordmark.png';

export function Logo({ onClick }) {
  return <button className="brand-mark brand-link" onClick={onClick} aria-label="Roomies home" type="button">
    <svg className="brand-logo" viewBox="282 191 1210 561" role="img" aria-label="Roomies">
      <image href={roomiesLogo} width="1774" height="887" />
    </svg>
  </button>;
}
export function Field({ label, children, hint }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>;
}
export function Modal({ title, children, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);
  return <dialog ref={ref} className="modal" aria-labelledby="modal-title" onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <div className="modal-header"><h2 id="modal-title">{title}</h2><button type="button" className="icon-button" onClick={onClose} aria-label="Close dialog">×</button></div>
    {children}
  </dialog>;
}
export function ErrorMessage({ children }) {
  return children ? <p className="error-message" role="alert">{children}</p> : null;
}
export function Frequency({ value, onChange }) {
  const common = [1, 2, 3, 7, 14, 30];
  const custom = !common.includes(Number(value));
  return <div className="frequency-control"><select aria-label="Repeat frequency" value={custom ? 'custom' : value} onChange={event => onChange(event.target.value === 'custom' ? 4 : Number(event.target.value))}>
    <option value="1">Every day</option><option value="2">Every 2 days</option><option value="3">Every 3 days</option><option value="7">Every week</option><option value="14">Every 2 weeks</option><option value="30">Every 30 days</option><option value="custom">Custom interval</option>
  </select>{custom && <label className="inline-days"><input aria-label="Repeat every how many days" type="number" min="1" max="365" required value={value} onChange={event => onChange(event.target.value)} />days</label>}</div>;
}
