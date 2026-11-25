import { useState } from 'react';
import { AREA_OPTIONS, SUGGESTIONS, balance, uid } from './api';
import { ErrorMessage, Field, Frequency } from './ui';
import houseLogo from './assets/roomies-house-logo.png';

function initialDraft(user) {
  const fresh = { name: '', type: 'apartment', living: 'sharing', features: ['chores'], areas: ['Kitchen', 'Bathroom'], members: [{ id: uid(), name: user.name }, { id: uid(), name: 'Roommate 1' }], chores: SUGGESTIONS.filter(chore => ['kitchen-reset', 'bins', 'bathroom'].includes(chore.id)).map(chore => ({ ...chore })), rotate: true, assignmentMode: 'auto' };
  try {
    const stored = JSON.parse(localStorage.getItem(`roomies-draft-${user.id}`));
    if (stored && Array.isArray(stored.members) && stored.members.length && Array.isArray(stored.chores) && Array.isArray(stored.features) && Array.isArray(stored.areas)) return { ...fresh, ...stored, members: stored.members.map((member, index) => index === 0 ? { ...member, name: user.name } : member) };
  } catch { /* Start a fresh draft if local storage is unavailable or damaged. */ }
  return fresh;
}
export default function Setup({ user, onCreate, onTransition = () => {} }) {
  const [draft, setDraft] = useState(() => initialDraft(user));
  const [step, setStep] = useState('home');
  const [customArea, setCustomArea] = useState('');
  const [customChore, setCustomChore] = useState('');
  const [customChoreArea, setCustomChoreArea] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const hasChores = draft.features.includes('chores');
  const steps = [{ id: 'home', title: 'Your home' }, { id: 'sharing', title: 'Sharing' }, ...(hasChores ? [{ id: 'areas', title: 'Shared areas' }, { id: 'chores', title: 'Chores' }] : []), { id: 'members', title: 'Roommates' }, { id: 'assign', title: 'Review' }];
  const index = steps.findIndex(item => item.id === step);
  const changeStep = next => { onTransition(); setStep(next); };
  const update = changes => {
    setDraft(current => {
      const next = { ...current, ...changes };
      try { localStorage.setItem(`roomies-draft-${user.id}`, JSON.stringify(next)); } catch { /* The live form still works without local storage. */ }
      return next;
    });
    setError('');
  };
  const setCount = count => {
    const n = Math.min(12, Math.max(draft.living === 'alone' ? 1 : 2, Number(count) || 2));
    update({ members: Array.from({ length: n }, (_, i) => draft.members[i] || { id: uid(), name: `Roommate ${i}` }) });
  };
  const toggleArea = area => {
    const areas = draft.areas.includes(area) ? draft.areas.filter(item => item !== area) : [...draft.areas, area];
    update({ areas, chores: draft.chores.filter(chore => areas.includes(chore.area)) });
  };
  const toggleChore = chore => update({ chores: draft.chores.some(item => item.id === chore.id) ? draft.chores.filter(item => item.id !== chore.id) : [...draft.chores, { ...chore }] });
  const editChore = (id, changes) => update({ chores: draft.chores.map(chore => chore.id === id ? { ...chore, ...changes } : chore) });
  const available = [...SUGGESTIONS.filter(chore => draft.areas.includes(chore.area)), ...draft.chores.filter(chore => !SUGGESTIONS.some(item => item.id === chore.id))];
  const assignments = balance(draft.chores, draft.members);
  const names = Object.fromEntries(draft.members.map(member => [member.id, member.name]));
  async function next(event) {
    event.preventDefault();
    setError('');
    if (step === 'home' && !draft.name.trim()) return setError('Give your house a name.');
    if (step === 'sharing' && !draft.features.length) return setError('Choose at least one thing to share.');
    if (step === 'areas' && !draft.areas.length) return setError('Select or add at least one shared area.');
    if (step === 'chores' && !draft.chores.length) return setError('Choose or add at least one chore.');
    if (step === 'members' && draft.members.some(member => !member.name.trim())) return setError('Add a name for each roommate. You can use a placeholder until they join.');
    if (index < steps.length - 1) {
      changeStep(steps[index + 1].id);
      window.scrollTo(0, 0);
      return;
    }
    setBusy(true);
    try {
      await onCreate({ ...draft, chores: hasChores ? draft.chores.map(chore => ({ ...chore, memberId: draft.assignmentMode === 'auto' ? assignments[chore.id] : chore.memberId || draft.members[0].id })) : [] });
      try { localStorage.removeItem(`roomies-draft-${user.id}`); } catch { /* Optional draft storage. */ }
    } catch (problem) { setError(problem.message); }
    finally { setBusy(false); }
  }
  const titles = { home: ['A little place to call yours.', 'Let’s set up your household. You can share the invite after setup.'], sharing: ['Better when you share.', 'Pick what you want to organise together.'], areas: ['Every corner counts.', 'Choose the spaces you look after together.'], chores: ['Small jobs. Happy house.', 'Pick your chores and how often they should repeat.'], members: ['Meet your roomies.', 'Add everyone, including yourself. Your roommates can claim their spot using your invite code.'], assign: ['A fair start for everyone.', 'Check the plan, then make your house official.'] };
  return <div className="setup-layout">
    <aside className="setup-sidebar"><img className="setup-mascot" src={houseLogo} alt="Pixel house" /><p className="eyebrow">Your next chapter</p><h2>A happy home starts here.</h2><ol className="step-list">{steps.map((item, i) => <li key={item.id} className={i === index ? 'current' : i < index ? 'finished' : ''}><button type="button" disabled={i > index || busy} onClick={() => { changeStep(item.id); setError(''); }} aria-current={i === index ? 'step' : undefined}><span>{i < index ? '✓' : i + 1}</span>{item.title}</button></li>)}</ol><p className="muted small-copy">Your setup progress is saved on this browser.</p></aside>
    <section className="setup-main" aria-labelledby="setup-title">
      <p className="eyebrow">Step {index + 1} of {steps.length}</p><div className="setup-progress" aria-hidden="true"><span style={{ width: `${(index + 1) / steps.length * 100}%` }} /></div>
      <h1 id="setup-title" className="page-title">{titles[step][0]}</h1><p className="page-description">{titles[step][1]}</p>
      <form onSubmit={next}>
        {step === 'home' && <div className="form-stack">
          <Field label="House name"><input autoFocus required maxLength="60" placeholder="The Pink House" value={draft.name} onChange={event => update({ name: event.target.value })} /></Field>
          <fieldset><legend>What kind of home?</legend><div className="choice-grid">{['apartment', 'house'].map(type => <label className={`choice-card ${draft.type === type ? 'selected' : ''}`} key={type}><input type="radio" name="home-type" checked={draft.type === type} onChange={() => update({ type })} /><strong>{type === 'apartment' ? 'Apartment' : 'House'}</strong><span>{type === 'apartment' ? 'A cosy spot above the street' : 'Your own little home base'}</span></label>)}</div></fieldset>
          <fieldset><legend>Who lives here?</legend><div className="choice-grid">{['sharing', 'alone'].map(living => <label className={`choice-card ${draft.living === living ? 'selected' : ''}`} key={living}><input type="radio" name="living" checked={draft.living === living} onChange={() => update({ living, members: living === 'alone' ? [draft.members[0]] : draft.members.length > 1 ? draft.members : [...draft.members, { id: uid(), name: 'Roommate 1' }] })} /><strong>{living === 'sharing' ? 'Sharing with roomies' : 'Just me'}</strong><span>{living === 'sharing' ? 'Teamwork makes it tidier' : 'Build your own routine'}</span></label>)}</div></fieldset>
          {draft.living === 'sharing' && <Field label="People in your house, including you" hint="You can reserve spots before your roommates join."><input type="number" min="2" max="12" value={draft.members.length} onChange={event => setCount(event.target.value)} /></Field>}
        </div>}
        {step === 'sharing' && <div className="choice-grid">{[{ id: 'chores', title: 'Chores', description: 'Split the jobs and rotate turns fairly.' }, { id: 'groceries', title: 'Groceries', description: 'One shared shopping list for the house.' }].map(feature => <label key={feature.id} className={`choice-card tall ${draft.features.includes(feature.id) ? 'selected' : ''}`}><input type="checkbox" checked={draft.features.includes(feature.id)} onChange={() => update({ features: draft.features.includes(feature.id) ? draft.features.filter(item => item !== feature.id) : [...draft.features, feature.id] })} /><strong>{feature.title}</strong><span>{feature.description}</span></label>)}</div>}
        {step === 'areas' && <div className="form-stack"><div className="choice-grid">{[...new Set([...AREA_OPTIONS, ...draft.areas])].map(area => <label key={area} className={`choice-card compact ${draft.areas.includes(area) ? 'selected' : ''}`}><input type="checkbox" checked={draft.areas.includes(area)} onChange={() => toggleArea(area)} /><strong>{area}</strong></label>)}</div><div className="inline-form"><input aria-label="Custom shared area" maxLength="40" placeholder="Another space? Add it here" value={customArea} onChange={event => setCustomArea(event.target.value)} /><button className="small-button" type="button" onClick={() => { const area = customArea.trim(); if (!area) return setError('Enter a name for your custom area.'); if (draft.areas.length >= 20) return setError('You can add up to 20 areas.'); update({ areas: [...new Set([...draft.areas, area])] }); setCustomArea(''); }}>Add area</button></div></div>}
        {step === 'chores' && <div className="form-stack">{draft.areas.map(area => <fieldset className="chore-picker" key={area}><legend>{area}</legend>{available.filter(chore => chore.area === area).length === 0 && <p className="muted">Add a custom chore for this space below.</p>}{available.filter(chore => chore.area === area).map(chore => { const selected = draft.chores.find(item => item.id === chore.id); return <div className={`picker-row ${selected ? 'picked' : ''}`} key={chore.id}><label><input type="checkbox" checked={Boolean(selected)} onChange={() => toggleChore(chore)} /><span>{chore.name}</span></label>{selected && <div className="picker-controls"><Frequency value={selected.frequencyDays} onChange={frequencyDays => editChore(chore.id, { frequencyDays })} /><select aria-label={`Effort for ${chore.name}`} value={selected.effort} onChange={event => editChore(chore.id, { effort: Number(event.target.value) })}><option value="1">Quick job</option><option value="2">Regular job</option><option value="3">Deep clean</option></select></div>}</div>; })}</fieldset>)}<div className="custom-chore-box"><h3>Your house, your chores</h3><div className="form-stack"><input aria-label="Custom chore name" maxLength="80" placeholder="Name a custom chore" value={customChore} onChange={event => setCustomChore(event.target.value)} /><div className="inline-form"><select aria-label="Custom chore area" value={draft.areas.includes(customChoreArea) ? customChoreArea : draft.areas[0]} onChange={event => setCustomChoreArea(event.target.value)}>{draft.areas.map(area => <option key={area}>{area}</option>)}</select><button type="button" className="small-button" onClick={() => { if (!customChore.trim()) return setError('Enter a name for your custom chore.'); update({ chores: [...draft.chores, { id: uid(), name: customChore.trim(), area: draft.areas.includes(customChoreArea) ? customChoreArea : draft.areas[0], frequencyDays: 7, effort: 1 }] }); setCustomChore(''); }}>Add chore</button></div></div></div></div>}
        {step === 'members' && <div className="form-stack">{draft.members.map((member, i) => <div className="member-input" key={member.id}><span className={`avatar avatar-${i % 4}`}>{i === 0 ? user.name.slice(0, 1).toUpperCase() : i + 1}</span><Field label={i === 0 ? 'You · house creator' : `Roommate ${i}`}><input required maxLength="50" value={member.name} readOnly={i === 0} onChange={event => update({ members: draft.members.map(item => item.id === member.id ? { ...item, name: event.target.value } : item) })} /></Field></div>)}<div className="note">{draft.living === 'alone' ? 'Your chores will be assigned to you. You can still use your house code if someone joins later.' : 'No email invitations needed. After setup, share your house code or invite link so each roommate can join.'}</div></div>}
        {step === 'assign' && <div className="form-stack"><div className="review-banner"><span className="avatar">⌂</span><div><h2>{draft.name}</h2><p>{draft.type === 'apartment' ? 'Apartment' : 'House'} · {draft.members.length} {draft.members.length === 1 ? 'person' : 'people'} · {draft.features.join(' + ')}</p></div></div>{hasChores && <><fieldset><legend>How should we divide the chores?</legend><div className="choice-grid">{['auto', 'manual'].map(mode => <label key={mode} className={`choice-card ${draft.assignmentMode === mode ? 'selected' : ''}`}><input type="radio" name="assignment-mode" checked={draft.assignmentMode === mode} onChange={() => update({ assignmentMode: mode, chores: mode === 'manual' ? draft.chores.map(chore => ({ ...chore, memberId: assignments[chore.id] })) : draft.chores })} /><strong>{mode === 'auto' ? 'Balance it for us' : 'Let us choose'}</strong><span>{mode === 'auto' ? 'Considers repeat frequency and job effort.' : 'Choose who starts each chore.'}</span></label>)}</div></fieldset><div className="assignment-list">{draft.chores.map(chore => <div className="assignment-row" key={chore.id}><div><strong>{chore.name}</strong><small>{chore.area} · every {chore.frequencyDays} {Number(chore.frequencyDays) === 1 ? 'day' : 'days'}</small></div>{draft.assignmentMode === 'auto' ? <span className="member-pill">{names[assignments[chore.id]]}</span> : <select aria-label={`Assign ${chore.name}`} value={chore.memberId || draft.members[0].id} onChange={event => editChore(chore.id, { memberId: event.target.value })}>{draft.members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select>}</div>)}</div><label className="check-line"><input type="checkbox" checked={draft.rotate} onChange={event => update({ rotate: event.target.checked })} /><span><strong>Rotate turns after each completion</strong><small>Move the next occurrence to the next roommate.</small></span></label></>}<p className="note">{hasChores ? 'Your first chores are due today. You can change due dates, add jobs, and adjust assignments from your dashboard.' : 'Your shared grocery list will be ready to use as soon as you create the house.'}</p></div>}
        <ErrorMessage>{error}</ErrorMessage><div className="form-footer">{index > 0 && <button type="button" className="secondary-button" disabled={busy} onClick={() => { changeStep(steps[index - 1].id); setError(''); }}>Back</button>}<button className="primary-button" disabled={busy} type="submit">{busy ? 'Creating your house…' : index === steps.length - 1 ? 'Create my house' : 'Continue'}</button></div>
      </form>
    </section>
  </div>;
}
