import { useState } from 'react';
import { api, IS_DEMO, dueLabel, repeatLabel, today } from './api';
import { ErrorMessage, Field, Frequency, Modal } from './ui';
import Calendar from './Calendar';
import strawberryLogo from './assets/roomies-strawberry-transparent.png';

function ChoreEditor({ chore, house, onSave, onDelete, onClose }) {
  const [form, setForm] = useState(chore || { name: '', area: house.areas[0], memberId: house.members[0].id, frequencyDays: 7, effort: 1, dueDate: today() });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const update = changes => setForm(current => ({ ...current, ...changes }));
  async function submit(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await onSave(form); onClose(); } catch (problem) { setError(problem.message); } finally { setBusy(false); }
  }
  return <Modal title={chore ? 'Edit chore' : 'A new little quest'} onClose={() => { if (!busy) onClose(); }}><form onSubmit={submit} className="form-stack">
    <Field label="Chore name"><input autoFocus required maxLength="80" value={form.name} onChange={event => update({ name: event.target.value })} placeholder="What needs doing?" /></Field>
    <div className="form-columns"><Field label="Shared area"><select value={form.area} disabled={Boolean(chore)} onChange={event => update({ area: event.target.value })}>{house.areas.map(area => <option key={area}>{area}</option>)}</select></Field><Field label="Whose turn?"><select value={form.memberId} onChange={event => update({ memberId: event.target.value })}>{house.members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></Field></div>
    <Field label="Repeat"><Frequency value={form.frequencyDays} onChange={frequencyDays => update({ frequencyDays })} /></Field>
    {chore ? <Field label="Next due date"><input required type="date" value={form.dueDate} onChange={event => update({ dueDate: event.target.value })} /></Field> : <Field label="Effort"><select value={form.effort} onChange={event => update({ effort: Number(event.target.value) })}><option value="1">Quick job</option><option value="2">Regular job</option><option value="3">Deep clean</option></select></Field>}
    <ErrorMessage>{error}</ErrorMessage><div className="form-footer"><button className="secondary-button" type="button" onClick={onClose} disabled={busy}>Cancel</button><button className="primary-button" disabled={busy}>{busy ? 'Saving…' : 'Save chore'}</button></div>
    {chore && <div className="delete-area">{confirmDelete ? <><p>Remove this chore from the house? Past completions will stay in your history.</p><button className="danger-button" disabled={busy} type="button" onClick={async () => { setBusy(true); try { await onDelete(chore.id); onClose(); } catch (problem) { setError(problem.message); setBusy(false); } }}>Yes, remove chore</button><button type="button" className="text-button" onClick={() => setConfirmDelete(false)}>Keep it</button></> : <button type="button" className="text-button danger-text" onClick={() => setConfirmDelete(true)}>Remove chore</button>}</div>}
  </form></Modal>;
}

function InviteCard({ house, notify }) {
  const link = `${window.location.origin}${window.location.pathname}?invite=${house.inviteCode}#join`;
  async function copy(value, description) {
    try { await navigator.clipboard.writeText(value); notify(`${description} copied.`); }
    catch { notify('Copy the code from the field below and share it with your roommate.'); }
  }
  return <section className="panel invite-panel"><p className="eyebrow">More hands, lighter work</p><h2>Bring your roomies home.</h2><p className="muted">{IS_DEMO ? 'Explore the invitation flow. Demo codes belong to this browser’s private demo.' : 'Share this code or link. Roommates can create an account and claim their spot.'}</p><label className="field"><span>Your house code</span><input className="invite-code" readOnly value={house.inviteCode} onClick={event => event.target.select()} /></label><div className="actions"><button className="primary-button" onClick={() => copy(house.inviteCode, 'House code')}>Copy code</button><button className="secondary-button" onClick={() => copy(link, 'Invite link')}>Copy invite link</button></div><p className="small-copy muted">{IS_DEMO ? 'This portfolio demo does not share household data between visitors. Everyone gets their own private demo.' : 'Keep this code within your household. Links using localhost work on this computer; remote access needs a shared server address.'}</p></section>;
}

function Groceries({ house, mutate }) {
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function add(event) {
    event.preventDefault(); setBusy(true); setError('');
    try { await mutate('/groceries', 'POST', { name, quantity }); setName(''); setQuantity(''); } catch (problem) { setError(problem.message); } finally { setBusy(false); }
  }
  return <section className="panel"><div className="section-heading"><div><p className="eyebrow">The shared shopping list</p><h2>What’s missing at home?</h2></div><span className="member-pill">{house.groceries.filter(item => !item.purchased).length} to buy</span></div><form onSubmit={add} className="grocery-form"><Field label="Item"><input required maxLength="80" value={name} onChange={event => setName(event.target.value)} placeholder="Milk, dish soap, strawberries…" /></Field><Field label="Quantity"><input maxLength="40" value={quantity} onChange={event => setQuantity(event.target.value)} placeholder="e.g. 2 litres" /></Field><button className="primary-button" disabled={busy}>{busy ? 'Adding…' : 'Add item'}</button></form><ErrorMessage>{error}</ErrorMessage><div className="grocery-list">{house.groceries.length === 0 ? <div className="empty-state"><img src={strawberryLogo} alt="" /><h3>A fresh little list.</h3><p>Add your first item and shop together.</p></div> : [...house.groceries].sort((a, b) => Number(a.purchased) - Number(b.purchased)).map(item => <div className={`grocery-row ${item.purchased ? 'purchased' : ''}`} key={item.id}><label><input type="checkbox" checked={item.purchased} disabled={busy} onChange={async () => { setBusy(true); try { await mutate(`/groceries/${item.id}`, 'PATCH', { purchased: !item.purchased }); } catch (problem) { setError(problem.message); } finally { setBusy(false); } }} /><span><strong>{item.name}</strong><small>{item.quantity || 'Any quantity'} · added by {item.addedBy}</small></span></label><button type="button" className="icon-button" aria-label={`Remove ${item.name}`} disabled={busy} onClick={async () => { setBusy(true); try { await mutate(`/groceries/${item.id}`, 'DELETE', {}); } catch (problem) { setError(problem.message); } finally { setBusy(false); } }}>×</button></div>)}</div></section>;
}

export default function Dashboard({ user, house, setHouse, notify, onTransition = () => {} }) {
  const [tab, setTab] = useState(house.features.includes('chores') ? 'chores' : 'groceries');
  const changeTab = next => { if (next !== tab) onTransition(); setTab(next); };
  const [filter, setFilter] = useState('all');
  const [area, setArea] = useState('all');
  const [editor, setEditor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [undo, setUndo] = useState(null);
  const [newName, setNewName] = useState(house.name);
  const [rotate, setRotate] = useState(house.rotate);
  const [confirmRebalance, setConfirmRebalance] = useState(false);
  const me = house.members.find(member => member.userId === user.id);
  const owner = house.ownerId === user.id;
  const memberName = id => house.members.find(member => member.id === id)?.name || 'Roommate';
  const due = house.chores.filter(chore => chore.dueDate <= today());
  const recent = house.history.filter(item => Date.now() - new Date(item.completedAt).getTime() < 7 * 86400000);
  const filtered = house.chores.filter(chore => (filter !== 'mine' || chore.memberId === me?.id) && (filter !== 'overdue' || chore.dueDate < today()) && (area === 'all' || chore.area === area)).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  async function mutate(path, method = 'POST', data = {}) {
    const result = await api(path, method, data);
    if (result.house) setHouse(result.house);
    return result;
  }
  async function complete(chore) {
    setBusy(true); setError('');
    try {
      const result = await mutate(`/chores/${chore.id}/complete`);
      setUndo({ choreId: chore.id, completionId: result.completionId, name: chore.name });
      notify(`Nice work! ${chore.name} is done. Next due ${dueLabel(result.house.chores.find(item => item.id === chore.id).dueDate)}.`);
    } catch (problem) { setError(problem.message); } finally { setBusy(false); }
  }
  return <div className="dashboard">
    <div className="dashboard-heading"><div><p className="eyebrow">Home sweet shared home</p><h1 className="page-title">{house.name}</h1><p className="page-description">Hey {user.name.split(' ')[0]}, let’s keep things fair.</p></div><span className="house-badge">{house.type === 'apartment' ? 'Apartment' : 'House'} · {house.members.length} {house.members.length === 1 ? 'person' : 'people'}</span></div>
    <div className="stats-grid"><div className="stat-card"><span>Due now</span><strong>{due.length}</strong><small>{due.length ? 'Little quests, ready for you' : 'All caught up. Enjoy your space.'}</small></div><div className="stat-card"><span>Done in the last 7 days</span><strong>{recent.length}</strong><small>Every little job counts</small></div><div className="stat-card"><span>Your next turns</span><strong>{house.chores.filter(chore => chore.memberId === me?.id).length}</strong><small>{house.rotate ? 'Turns rotate after completion' : 'Assigned to you'}</small></div></div>
    <nav className="dashboard-tabs" aria-label="Household sections"><button className={tab === 'chores' ? 'active' : ''} onClick={() => changeTab('chores')} aria-current={tab === 'chores' ? 'page' : undefined}>Chores</button><button className={tab === 'groceries' ? 'active' : ''} onClick={() => changeTab('groceries')} aria-current={tab === 'groceries' ? 'page' : undefined}>Groceries</button><button className={tab === 'calendar' ? 'active' : ''} onClick={() => changeTab('calendar')} aria-current={tab === 'calendar' ? 'page' : undefined}>Calendar</button><button className={tab === 'house' ? 'active' : ''} onClick={() => changeTab('house')} aria-current={tab === 'house' ? 'page' : undefined}>Your household</button></nav>
    <ErrorMessage>{error}</ErrorMessage>
    {tab === 'chores' && <div className="dashboard-grid"><section className="panel tasks-panel"><div className="section-heading"><div><p className="eyebrow">A little teamwork</p><h2>The chore board</h2></div><button className="primary-button" onClick={() => setEditor({})}>Add chore</button></div><div className="task-filters"><div className="segmented" aria-label="Filter chores">{[{ id: 'all', label: 'All chores' }, { id: 'mine', label: 'My turns' }, { id: 'overdue', label: 'Overdue' }].map(item => <button key={item.id} aria-pressed={filter === item.id} className={filter === item.id ? 'active' : ''} onClick={() => setFilter(item.id)}>{item.label}</button>)}</div><select aria-label="Filter by shared area" value={area} onChange={event => setArea(event.target.value)}><option value="all">All areas</option>{house.areas.map(item => <option key={item}>{item}</option>)}</select></div>
      {undo && <div className="undo-banner" role="status"><span>{undo.name} completed.</span><button className="text-button" disabled={busy} onClick={async () => { setBusy(true); try { await mutate(`/chores/${undo.choreId}/undo`, 'POST', { completionId: undo.completionId }); setUndo(null); notify('Completion undone.'); } catch (problem) { setError(problem.message); setUndo(null); } finally { setBusy(false); } }}>Undo</button><button className="icon-button" aria-label="Dismiss undo" onClick={() => setUndo(null)}>×</button></div>}
      <div className="task-list">{filtered.length === 0 ? <div className="empty-state"><img src={strawberryLogo} alt="" /><h3>{house.chores.length ? 'Nothing on this list.' : 'A fresh start.'}</h3><p>{house.chores.length ? 'Try another filter, or enjoy a well-earned break.' : 'Add your first chore to get your routine going.'}</p></div> : filtered.map(chore => <article key={chore.id} className={`task-row ${chore.dueDate < today() ? 'overdue' : ''}`}><button className="complete-button" disabled={busy} aria-label={`Complete ${chore.name}`} onClick={() => complete(chore)}><span aria-hidden="true">✓</span></button><div className="task-details"><button className="task-title" onClick={() => setEditor(chore)}>{chore.name}</button><p>{chore.area} · {repeatLabel(chore.frequencyDays)}</p><span className={`due-tag ${chore.dueDate < today() ? 'late' : ''}`}>{chore.dueDate < today() ? 'Overdue · ' : 'Due '}{dueLabel(chore.dueDate)}</span></div><button className="assignee-button" onClick={() => setEditor(chore)} aria-label={`Edit ${chore.name}, assigned to ${memberName(chore.memberId)}`}><span className={`avatar avatar-${house.members.findIndex(member => member.id === chore.memberId) % 4}`}>{memberName(chore.memberId).slice(0, 1).toUpperCase()}</span><span>{memberName(chore.memberId)}</span></button></article>)}</div>
    </section><aside className="dashboard-aside"><section className="panel"><p className="eyebrow">Everyone’s next turns</p><h2>The house team</h2><p className="muted small-copy">Jobs currently assigned to each roommate.</p><div className="team-list">{house.members.map((member, i) => <div className="team-row" key={member.id}><span className={`avatar avatar-${i % 4}`}>{member.name.slice(0, 1).toUpperCase()}</span><div><strong>{member.name}{member.userId === user.id ? ' (you)' : ''}</strong><small>{member.userId ? 'Joined' : 'Invite pending'}</small></div><span className="count-badge">{house.chores.filter(chore => chore.memberId === member.id).length}</span></div>)}</div><button className="secondary-button full-width" onClick={() => changeTab('house')}>Invite roommates</button></section><section className="panel history-panel"><p className="eyebrow">Little wins</p><h2>Recently done</h2>{house.history.length === 0 ? <p className="muted">Your completed chores will appear here. Ready for your first win?</p> : <ul>{house.history.slice(0, 5).map(item => <li key={item.id}><span className="history-check">✓</span><div><strong>{item.choreName}</strong><small>{memberName(item.memberId)} · {new Date(item.completedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</small></div></li>)}</ul>}</section></aside></div>}
    {tab === 'calendar' && <Calendar house={house} />}
    {tab === 'groceries' && <Groceries house={house} mutate={mutate} />}
    {tab === 'house' && <div className="dashboard-grid"><div className="form-stack"><InviteCard house={house} notify={notify} /><section className="panel"><h2>Your roomies</h2><div className="team-list">{house.members.map((member, i) => <div className="team-row" key={member.id}><span className={`avatar avatar-${i % 4}`}>{member.name.slice(0, 1).toUpperCase()}</span><div><strong>{member.name}</strong><small>{member.userId === house.ownerId ? 'House creator' : member.userId ? 'Joined the house' : 'Waiting to join'}</small></div>{member.userId === user.id && <span className="member-pill">You</span>}</div>)}</div></section></div><section className="panel house-settings"><p className="eyebrow">Make it work for you</p><h2>House settings</h2>{owner ? <form className="form-stack" onSubmit={async event => { event.preventDefault(); setBusy(true); setError(''); try { await mutate('/household', 'PATCH', { name: newName, rotate }); notify('House settings saved.'); } catch (problem) { setError(problem.message); } finally { setBusy(false); } }}><Field label="House name"><input required maxLength="60" value={newName} onChange={event => setNewName(event.target.value)} /></Field><label className="check-line"><input type="checkbox" checked={rotate} onChange={event => setRotate(event.target.checked)} /><span><strong>Rotate chore turns</strong><small>The next roommate takes over after a chore is completed.</small></span></label><button className="primary-button" disabled={busy}>Save settings</button><div className="divider" /><h3>Freshen up assignments</h3><p className="muted small-copy">Balance the current chores using their frequency and effort. This replaces manual assignments.</p>{confirmRebalance ? <><button className="secondary-button" type="button" disabled={busy} onClick={async () => { setBusy(true); try { await mutate('/rebalance'); setConfirmRebalance(false); notify('Chores balanced across the house.'); } catch (problem) { setError(problem.message); } finally { setBusy(false); } }}>Confirm rebalance</button><button type="button" className="text-button" onClick={() => setConfirmRebalance(false)}>Cancel</button></> : <button className="secondary-button" type="button" onClick={() => setConfirmRebalance(true)}>Rebalance chores</button>}</form> : <p className="muted">{house.rotate ? 'Chore turns rotate after each completion.' : 'Chore turns stay with their assigned roommate.'} The house creator manages these settings.</p>}</section></div>}
    {editor && <ChoreEditor chore={editor.id ? editor : null} house={house} onClose={() => setEditor(null)} onSave={form => mutate(editor.id ? `/chores/${editor.id}` : '/chores', editor.id ? 'PATCH' : 'POST', form)} onDelete={id => mutate(`/chores/${id}`, 'DELETE', {})} />}
  </div>;
}
