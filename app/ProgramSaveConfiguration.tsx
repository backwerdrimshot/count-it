'use client';
import { useEffect, useRef, useState } from 'react';
import { useProgramOrigin } from './useProgramOrigin';
import { acceptsConfigurationSaveReply } from '../src/program-frame';
export default function ProgramSaveConfiguration({ name, link }: { name: string; link: string }) {
  const origin = useProgramOrigin();
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const pending = useRef<{ id: string; payload: string; timer?: number } | null>(null);
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (!acceptsConfigurationSaveReply(event, window.parent, origin, pending.current?.id)) return;
      clearTimeout(pending.current?.timer); setSaving(false);
      setMessage(event.data.ok ? 'Saved in Program. You can reopen these settings from Saved configurations.' : 'Program could not save this configuration. Check your workspace access and try again.');
    };
    window.addEventListener('message', listener);
    return () => { window.removeEventListener('message', listener); clearTimeout(pending.current?.timer); };
  }, [origin]);
  useEffect(() => {
    clearTimeout(pending.current?.timer); pending.current = null;
    const timer = window.setTimeout(() => { setSaving(false); setMessage(''); }, 0);
    return () => clearTimeout(timer);
  }, [name, link]);
  if (!origin) return null;
  function save() {
    const query = new URL(link).searchParams.toString(), payload = JSON.stringify({ name: name.trim(), query });
    if (pending.current?.payload !== payload) pending.current = { id: crypto.randomUUID(), payload };
    const requestId = pending.current.id;
    setSaving(true); setMessage('Saving in Program…');
    pending.current.timer = window.setTimeout(() => { setSaving(false); setMessage('The save was not confirmed. Try again to check the same save request.'); }, 15000);
    window.parent.postMessage({ type: 'count-it.configuration.save', version: 1, requestId, name: name.trim(), query }, origin!);
  }
  return <div className="builder-program-save">
    <button type="button" className="primary-button" disabled={saving || !name.trim()} onClick={save}>{saving ? 'Saving…' : 'Save to Program'}</button>
    <p role="status" aria-live="polite">{message || (name.trim() ? 'Save these settings in your Program workspace. Use a configuration name, without student names.' : 'Add a name above to save these settings in Program.')}</p>
  </div>;
}
