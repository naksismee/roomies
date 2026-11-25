import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import './Flow.css';
import houseLogo from './assets/roomies-house-logo.png';
import strawberryLogo from './assets/roomies-strawberry-transparent.png';
import { api, IS_DEMO } from './api';
import { ErrorMessage, Field, Logo } from './ui';
import Setup from './Setup';
import Dashboard from './Dashboard';

const readPage = () => window.location.hash.slice(1).split('?')[0] || (new URLSearchParams(window.location.search).has('invite') ? 'join' : 'home');
function Loader({ overlay = false }) {
  return <div className={`loading-screen ${overlay ? 'strawberry-transition' : ''}`} role="status" aria-label="Loading Roomies"><img src={strawberryLogo} alt="" /><div className="loading-bar" aria-hidden="true"><span /></div><p>Cleaning things up…</p></div>;
}
function Auth({ mode, onAuth, navigate, joining }) {
  const signup = mode === 'signup';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try { const result = await api(`/auth/${mode}`, 'POST', { name, email, password }); await onAuth(result.user); }
    catch (problem) { setError(problem.message); }
    finally { setBusy(false); }
  }
  if (IS_DEMO) return <section className="join-card panel"><img className="join-mascot" src={houseLogo} alt="Pixel house" /><p className="eyebrow">Make yourself at home</p><h1 className="page-title">Build your demo house.</h1><p className="page-description">Try the full setup flow. No email or password needed; your demo is saved in this browser.</p><form className="form-stack" onSubmit={submit}><Field label="Your name"><input autoFocus required maxLength="50" value={name} onChange={event => setName(event.target.value)} placeholder="What should your roomies call you?" /></Field><ErrorMessage>{error}</ErrorMessage><button className="primary-button" disabled={busy}>{busy ? 'One moment…' : joining ? 'Continue to join' : 'Set up my house'}</button></form></section>;
  return <section className="auth-layout"><div className="auth-story"><img src={houseLogo} alt="Pixel house and broom" /><p className="eyebrow">A little less housework drama</p><h1>{signup ? 'Your happy home starts here.' : 'Welcome home, roomie.'}</h1><p>Shared chores. Fair turns. More time for the good stuff.</p></div><div className="auth-card"><p className="eyebrow">{joining ? 'You’re invited' : 'Make yourself at home'}</p><h2>{signup ? 'Create your account' : 'Log in to Roomies'}</h2><p className="muted">{signup ? 'One account for your house and your next little quests.' : 'Pick up right where your household left off.'}</p><form className="form-stack" onSubmit={submit}>{signup && <Field label="Your name"><input autoFocus required maxLength="50" autoComplete="name" value={name} onChange={event => setName(event.target.value)} placeholder="What should your roomies call you?" /></Field>}<Field label="Email address"><input autoFocus={!signup} type="email" required maxLength="254" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="you@example.com" /></Field><Field label="Password" hint={signup ? 'At least 8 characters.' : undefined}><input required type="password" minLength={signup ? 8 : undefined} maxLength="128" autoComplete={signup ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} /></Field><ErrorMessage>{error}</ErrorMessage><button className="primary-button full-width" disabled={busy}>{busy ? 'One moment…' : signup ? 'Create account' : 'Log in'}</button></form><p className="auth-switch">{signup ? 'Already a roomie?' : 'New around here?'} <button type="button" className="text-button" onClick={() => navigate(signup ? 'login' : 'signup')}>{signup ? 'Log in' : 'Create an account'}</button></p></div></section>;
}
function Join({ user, pendingCode, setPendingCode, onJoin, navigate }) {
  const [code, setCode] = useState(pendingCode || '');
  const [preview, setPreview] = useState(null);
  const [memberId, setMemberId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!pendingCode) return;
    let active = true;
    api(`/invites/${encodeURIComponent(pendingCode)}`).then(result => { if (active) { setPreview(result); setMemberId(result.members[0]?.id || ''); } }).catch(problem => { if (active) setError(problem.message); });
    return () => { active = false; };
  }, [pendingCode]);
  async function submit(event) {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      if (!preview) {
        const result = await api(`/invites/${encodeURIComponent(code.trim())}`);
        setPreview(result); setMemberId(result.members[0]?.id || ''); setPendingCode(code.trim());
      } else if (!user) { setPendingCode(code.trim()); navigate('signup'); }
      else await onJoin({ code: code.trim(), memberId });
    } catch (problem) { setError(problem.message); }
    finally { setBusy(false); }
  }
  return <section className="join-card panel"><img className="join-mascot" src={houseLogo} alt="Pixel house" /><p className="eyebrow">There’s a place for you</p><h1 className="page-title">Join your house.</h1><p className="page-description">Ask a roommate for the house code, or open the invite link they shared.</p>{IS_DEMO && <div className="note demo-join-note">Demo codes work within this browser. Try the sample house with <button type="button" className="text-button" onClick={() => { setCode('ROOMIESDEMO1'); setPendingCode('ROOMIESDEMO1'); }}>ROOMIESDEMO1</button>.</div>}{user?.houseId ? <div className="note">You already belong to a household. <button className="text-button" onClick={() => navigate('dashboard')}>Open your dashboard</button></div> : <form className="form-stack" onSubmit={submit}><Field label="House code"><input autoFocus required maxLength="12" autoComplete="off" className="invite-code" value={code} onChange={event => { setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')); setPreview(null); setError(''); }} placeholder="Your 12-character code" /></Field>{preview && <div className="join-preview"><span className="member-pill">House found</span><h2>{preview.name}</h2>{user ? <Field label="Which roommate are you?"><select value={memberId} onChange={event => setMemberId(event.target.value)}>{preview.members.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}<option value="">I’m a new roommate</option></select></Field> : <p>Create an account or log in to join this house.</p>}</div>}<ErrorMessage>{error}</ErrorMessage><button className="primary-button" disabled={busy}>{busy ? 'One moment…' : !preview ? 'Find my house' : user ? 'Join this house' : 'Create account to join'}</button>{preview && !user && <button className="text-button" type="button" onClick={() => { setPendingCode(code.trim()); navigate('login'); }}>Already have an account? Log in</button>}</form>}</section>;
}

function Landing({ navigate, user, onDemo }) {
  return <div className="hero-content"><div className="hero-copy"><img className="house-mascot" src={houseLogo} alt="Roomies pixel house and broom" /><p className="eyebrow">Shared house chores</p><h1>Keep the house fair without awkward reminders.</h1><p className="intro">Create a house, invite your roommates, rotate chores, and see whose turn it is next.</p><div className="actions">{IS_DEMO && !user && <button className="primary-button" onClick={onDemo}>Try the demo</button>}<button className={IS_DEMO && !user ? "secondary-button" : "primary-button"} onClick={() => navigate(user?.houseId ? 'dashboard' : user ? 'setup' : 'signup')}>{user?.houseId ? 'Open my house' : 'Create a house'}</button><button className="secondary-button" onClick={() => navigate('join')}>Join with code</button></div></div><div className="phone-preview" aria-label="Example Roomies chore board"><div className="phone-header"><span>Today’s quests</span><strong>Example house</strong></div><div className="quest-card"><p>Kitchen reset</p><h2>Ananya’s turn</h2><span>A little teamwork goes a long way.</span></div><div className="chore-list">{[{ name: 'Kitchen reset', person: 'Ananya', time: 'Today' }, { name: 'Bins out', person: 'Maya', time: 'Tomorrow' }, { name: 'Bathroom sparkle', person: 'Josh', time: 'Friday' }].map(chore => <article className="chore-item" key={chore.name}><div><h3>{chore.name}</h3><p>{chore.person}</p></div><span>{chore.time}</span></article>)}</div></div></div>;
}

export default function App() {
  const [page, setPage] = useState(readPage);
  const [transitioning, setTransitioning] = useState(true);
  const transitionTimer = useRef(null);
  const startTransition = useCallback(() => {
    clearTimeout(transitionTimer.current);
    setTransitioning(true);
    transitionTimer.current = setTimeout(() => setTransitioning(false), 750);
  }, []);
  useEffect(() => { startTransition(); }, [page, startTransition]);
  useEffect(() => () => clearTimeout(transitionTimer.current), []);
  const [user, setUser] = useState(null);
  const [house, updateHouse] = useState(null);
  const [booting, setBooting] = useState(true);
  const [bootError, setBootError] = useState('');
  const [toast, setToast] = useState('');
  const [pendingCode, updateCode] = useState(() => {
    const fromLink = new URLSearchParams(window.location.search).get('invite');
    try { return fromLink || sessionStorage.getItem('roomies-invite') || ''; } catch { return fromLink || ''; }
  });
  const setPendingCode = code => { updateCode(code); try { code ? sessionStorage.setItem('roomies-invite', code) : sessionStorage.removeItem('roomies-invite'); } catch { /* Optional convenience storage. */ } };
  const navigate = useCallback(next => { window.location.hash = next; setPage(next); window.scrollTo(0, 0); }, []);
  const setHouse = useCallback(incoming => updateHouse(current => !current || incoming.id !== current.id || (incoming.revision || 0) >= (current.revision || 0) ? incoming : current), []);
  useEffect(() => { const changed = () => { setPage(readPage()); window.scrollTo(0, 0); }; window.addEventListener('hashchange', changed); return () => window.removeEventListener('hashchange', changed); }, []);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const result = await api('/session');
        if (!active) return;
        setUser(result.user);
        if (result.user?.houseId) {
          const data = await api('/household');
          if (!active) return;
          setHouse(data.house);
          if (!window.location.hash && !new URLSearchParams(window.location.search).has('invite')) navigate('dashboard');
        }
      } catch (problem) { if (active) setBootError(problem.message); }
      finally { if (active) setBooting(false); }
    }
    load();
    return () => { active = false; };
  }, [navigate, setHouse]);
  useEffect(() => {
    if (!user?.houseId) return;
    let active = true;
    const poll = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      api('/household').then(result => { if (active) setHouse(result.house); }).catch(problem => { if (active && problem.status === 401) { setUser(null); updateHouse(null); navigate('login'); } });
    }, 8000);
    return () => { active = false; clearInterval(poll); };
  }, [user?.houseId, navigate, setHouse]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 7000); return () => clearTimeout(timer); }, [toast]);
  async function authenticated(nextUser) {
    setUser(nextUser);
    if (nextUser.houseId) { const result = await api('/household'); setHouse(result.house); navigate('dashboard'); }
    else navigate(pendingCode ? 'join' : 'setup');
  }
  async function created(payload) {
    const result = await api('/households', 'POST', payload);
    setUser(result.user); setHouse(result.house); navigate('dashboard'); setToast('Your house is ready. Welcome home!');
  }
  async function joined(payload) {
    const result = await api('/join', 'POST', payload);
    setUser(result.user); setHouse(result.house); setPendingCode('');
    window.history.replaceState(null, '', `${window.location.pathname}#dashboard`);
    navigate('dashboard'); setToast('You’re in! Welcome to your house.');
  }
  async function openDemo() {
    try { const result = await api('/demo', 'POST', {}); setUser(result.user); setHouse(result.house); navigate('dashboard'); }
    catch (problem) { setToast(problem.message); }
  }
  async function logout() {
    try { await api('/auth/logout', 'POST', {}); setUser(null); updateHouse(null); setPendingCode(''); navigate('home'); }
    catch (problem) { setToast(problem.message); }
  }
  if (booting) return <Loader />;
  let screen;
  if (page === 'login' || page === 'signup') screen = user ? <div className="join-card panel"><h1 className="page-title">You’re already logged in.</h1><button className="primary-button" onClick={() => navigate(user.houseId ? 'dashboard' : pendingCode ? 'join' : 'setup')}>Continue</button></div> : <Auth key={page} mode={page} navigate={navigate} onAuth={authenticated} joining={Boolean(pendingCode)} />;
  else if (page === 'setup') screen = user ? user.houseId ? <div className="join-card panel"><h1 className="page-title">Your house is ready.</h1><button className="primary-button" onClick={() => navigate('dashboard')}>Open my house</button></div> : <Setup user={user} onCreate={created} onTransition={startTransition} /> : <Auth mode="signup" onAuth={authenticated} navigate={navigate} joining={false} />;
  else if (page === 'join') screen = <Join user={user} pendingCode={pendingCode} setPendingCode={setPendingCode} onJoin={joined} navigate={navigate} />;
  else if (page === 'dashboard') screen = user && house ? <Dashboard user={user} house={house} setHouse={setHouse} notify={setToast} onTransition={startTransition} /> : user ? <div className="join-card panel"><h1 className="page-title">Let’s find your home.</h1><div className="actions"><button className="primary-button" onClick={() => navigate('setup')}>Create a house</button><button className="secondary-button" onClick={() => navigate('join')}>Join with code</button></div></div> : <Auth mode="login" navigate={navigate} onAuth={authenticated} joining={Boolean(pendingCode)} />;
  else screen = <Landing navigate={navigate} user={user} onDemo={openDemo} />;
  return <main className="app-shell"><section className={`hero-card ${page !== 'home' ? 'flow-shell' : ''}`}><header className="top-bar"><Logo onClick={() => navigate('home')} /><div className="header-actions">{user ? <><button className="text-button account-name" onClick={() => navigate(user.houseId ? 'dashboard' : 'setup')}>{user.name}</button><button className="small-button" onClick={logout}>{IS_DEMO ? "Exit demo" : "Log out"}</button></> : <button className="small-button" onClick={() => IS_DEMO ? openDemo() : navigate(page === 'login' ? 'signup' : 'login')}>{IS_DEMO ? 'Try demo' : page === 'login' ? 'Sign up' : 'Log in'}</button>}</div></header>{IS_DEMO && <div className="demo-notice"><span className="demo-label">Portfolio demo</span><span>Explore freely. Changes are saved only in your browser.</span></div>}{bootError && <div className="server-notice"><ErrorMessage>{bootError}</ErrorMessage><button className="small-button" onClick={() => window.location.reload()}>Try again</button></div>}{screen}<footer className="site-footer"><span>Roomies · A little teamwork. A happier home.</span><button type="button" className="text-button" onClick={() => navigate('home')}>Home</button></footer></section>{transitioning && <Loader overlay />}{toast && <div className="toast" role="status"><span>{toast}</span><button className="icon-button" onClick={() => setToast('')} aria-label="Dismiss message">×</button></div>}</main>;
}
