import { balance, today, uid } from './api';

const KEY = 'roomies-portfolio-demo-v1';
function plusDays(value, amount) {
  const d = new Date(`${value}T12:00:00`);
  d.setDate(d.getDate() + amount);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function sampleHouse() {
  const members = [{ id: 'ananya', name: 'Ananya', userId: 'demo-owner' }, { id: 'maya', name: 'Maya', userId: null }, { id: 'josh', name: 'Josh', userId: null }];
  const chores = [
    { name: 'Wipe benches and stovetop', area: 'Kitchen', frequencyDays: 1, effort: 1, memberId: 'ananya', dueDate: today() },
    { name: 'Take the bins out', area: 'Kitchen', frequencyDays: 7, effort: 1, memberId: 'maya', dueDate: today() },
    { name: 'Clean the shower and toilet', area: 'Bathroom', frequencyDays: 7, effort: 3, memberId: 'josh', dueDate: plusDays(today(), 1) },
    { name: 'Vacuum shared floors', area: 'Living room', frequencyDays: 7, effort: 2, memberId: 'ananya', dueDate: plusDays(today(), 2) },
    { name: 'Wash dishes and clear the sink', area: 'Kitchen', frequencyDays: 1, effort: 1, memberId: 'maya', dueDate: plusDays(today(), -1) },
    { name: 'Wipe the sink and mirror', area: 'Bathroom', frequencyDays: 3, effort: 1, memberId: 'josh', dueDate: plusDays(today(), 3) },
  ].map(chore => ({ ...chore, id: uid() }));
  return { id: uid(), revision: 1, name: 'The Pink House', type: 'apartment', living: 'sharing', ownerId: 'demo-owner', features: ['chores', 'groceries'], areas: ['Kitchen', 'Bathroom', 'Living room'], members, chores, groceries: [{ id: uid(), name: 'Strawberries', quantity: '2 punnets', purchased: false, addedBy: 'Ananya' }, { id: uid(), name: 'Dish soap', quantity: '1 bottle', purchased: false, addedBy: 'Maya' }, { id: uid(), name: 'Oat milk', quantity: '2 litres', purchased: true, addedBy: 'Josh' }], history: [], rotate: true, inviteCode: 'ROOMIESDEMO1', createdAt: new Date().toISOString() };
}
export async function demoApi(route, method = 'GET', body = {}) {
  let db;
  try { db = JSON.parse(localStorage.getItem(KEY)) || { user: null, houses: [] }; }
  catch { db = { user: null, houses: [] }; }
  const persist = result => {
    try { localStorage.setItem(KEY, JSON.stringify(db)); }
    catch { throw new Error('Roomies needs browser storage to save this demo. Allow site storage and try again.'); }
    return result;
  };
  if (route === '/session') return { user: db.user };
  if (route === '/demo') {
    const house = sampleHouse();
    db = { user: { id: 'demo-owner', name: 'Ananya', houseId: house.id }, houses: [house] };
    return persist({ user: db.user, house });
  }
  if (route === '/auth/signup' || route === '/auth/login') {
    if (!body.name?.trim()) throw new Error('Enter your name to start your demo household.');
    db.user = { id: uid(), name: body.name.trim().slice(0, 50), houseId: null };
    return persist({ user: db.user });
  }
  if (route === '/auth/logout') { db.user = null; return persist({ ok: true }); }
  if (route.startsWith('/invites/')) {
    const code = decodeURIComponent(route.split('/').pop()).toUpperCase();
    let house = db.houses.find(item => item.inviteCode === code);
    if (!house && code === 'ROOMIESDEMO1') { house = sampleHouse(); db.houses.push(house); persist({}); }
    if (!house) throw new Error('Demo house not found in this browser. Try the sample code ROOMIESDEMO1.');
    return { name: house.name, members: house.members.filter(member => !member.userId).map(({ id, name }) => ({ id, name })) };
  }
  if (!db.user) throw new Error('Start a demo or create a demo profile first.');
  if (route === '/households' && method === 'POST') {
    if (db.user.houseId) throw new Error('You already have a demo house.');
    if (!body.name?.trim()) throw new Error('Give your house a name.');
    if (body.features.includes('chores') && !body.chores.length) throw new Error('Choose at least one chore.');
    const members = body.members.map((member, index) => ({ ...member, name: index === 0 ? db.user.name : member.name.trim(), userId: index === 0 ? db.user.id : null }));
    const chores = body.chores.map(chore => ({ ...chore, id: uid(), frequencyDays: Number(chore.frequencyDays), dueDate: today() }));
    const assignments = balance(chores, members);
    if (body.assignmentMode !== 'manual') chores.forEach(chore => { chore.memberId = assignments[chore.id]; });
    const house = { ...body, id: uid(), revision: 1, name: body.name.trim(), ownerId: db.user.id, members, chores, groceries: [], history: [], inviteCode: uid().replace(/-/g, '').slice(0, 12).toUpperCase(), createdAt: new Date().toISOString() };
    db.houses.push(house); db.user.houseId = house.id;
    return persist({ user: db.user, house });
  }
  if (route === '/join') {
    if (db.user.houseId) throw new Error('You already belong to a demo house.');
    const house = db.houses.find(item => item.inviteCode === body.code.toUpperCase());
    if (!house) throw new Error('That demo house is not in this browser.');
    let member = house.members.find(item => item.id === body.memberId && !item.userId);
    if (body.memberId && !member) throw new Error('That roommate spot has already been claimed.');
    if (!member) { if (house.members.length >= 12) throw new Error('This house has reached its 12-member limit.'); member = { id: uid(), name: db.user.name }; house.members.push(member); }
    member.userId = db.user.id; member.name = db.user.name; db.user.houseId = house.id; house.revision++;
    return persist({ user: db.user, house });
  }
  const house = db.houses.find(item => item.id === db.user.houseId);
  if (!house) throw new Error('Create or join a demo house first.');
  if (route === '/household' && method === 'GET') return { house };
  const ownerAction = () => { if (house.ownerId !== db.user.id) throw new Error('Only the house creator can change this setting.'); };
  let extra = {};
  if (route === '/household' && method === 'PATCH') { ownerAction(); if (body.name !== undefined) { if (!body.name.trim()) throw new Error('Enter a house name.'); house.name = body.name.trim(); } if (typeof body.rotate === 'boolean') house.rotate = body.rotate; }
  else if (route === '/rebalance') { ownerAction(); const assignments = balance(house.chores, house.members); house.chores.forEach(chore => { chore.memberId = assignments[chore.id]; }); }
  else if (route === '/chores' && method === 'POST') {
    if (!body.name?.trim() || Number(body.frequencyDays) < 1 || Number(body.frequencyDays) > 365) throw new Error('Enter a chore name and a repeat interval between 1 and 365 days.');
    house.chores.push({ ...body, id: uid(), name: body.name.trim(), frequencyDays: Number(body.frequencyDays), dueDate: today() });
  } else if (route.startsWith('/chores/')) {
    const chore = house.chores.find(item => item.id === route.split('/')[2]);
    if (!chore) throw new Error('That chore no longer exists.');
    if (route.endsWith('/complete')) {
      const completion = { id: uid(), choreId: chore.id, choreName: chore.name, memberId: chore.memberId, completedBy: db.user.id, completedAt: new Date().toISOString(), previousDueDate: chore.dueDate, previousMemberId: chore.memberId };
      house.history.unshift(completion); house.history = house.history.slice(0, 1000); chore.lastCompletionId = completion.id;
      chore.dueDate = plusDays(chore.dueDate < today() ? today() : chore.dueDate, chore.frequencyDays);
      if (house.rotate) chore.memberId = house.members[(house.members.findIndex(member => member.id === chore.memberId) + 1) % house.members.length].id;
      extra = { completionId: completion.id };
    } else if (route.endsWith('/undo')) {
      const completion = house.history.find(item => item.id === body.completionId);
      if (!completion || chore.lastCompletionId !== completion.id) throw new Error('That chore changed again. Refresh to see the latest version.');
      chore.dueDate = completion.previousDueDate; chore.memberId = completion.previousMemberId; delete chore.lastCompletionId;
      house.history = house.history.filter(item => item.id !== completion.id);
    } else if (method === 'DELETE') house.chores = house.chores.filter(item => item.id !== chore.id);
    else if (method === 'PATCH') {
      if (!body.name?.trim() || Number(body.frequencyDays) < 1 || Number(body.frequencyDays) > 365) throw new Error('Enter a valid chore name and repeat interval.');
      Object.assign(chore, { name: body.name.trim(), frequencyDays: Number(body.frequencyDays), memberId: body.memberId, dueDate: body.dueDate }); delete chore.lastCompletionId;
    }
  } else if (route === '/groceries' && method === 'POST') {
    if (!body.name?.trim()) throw new Error('Enter a grocery item.');
    house.groceries.push({ id: uid(), name: body.name.trim(), quantity: body.quantity?.trim() || '', purchased: false, addedBy: db.user.name });
  } else if (route.startsWith('/groceries/')) {
    const item = house.groceries.find(item => item.id === route.split('/')[2]);
    if (!item) throw new Error('That grocery item is no longer on the list.');
    if (method === 'DELETE') house.groceries = house.groceries.filter(entry => entry.id !== item.id);
    else item.purchased = Boolean(body.purchased);
  } else throw new Error('That demo action was not found.');
  house.revision++;
  return persist({ house, ...extra });
}
