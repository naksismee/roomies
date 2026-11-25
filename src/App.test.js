import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from './App';
import Setup from './Setup';

beforeEach(() => {
  window.history.replaceState(null, '', '/');
  localStorage.clear();
  sessionStorage.clear();
  window.scrollTo = jest.fn();
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ user: null }) });
});

test('home opens signup and submits account details to the server', async () => {
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: 'Create a house' }));
  expect(await screen.findByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Alice' } });
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: 'alice@example.com' } });
  fireEvent.change(screen.getByLabelText(/Password/), { target: { value: 'test-password-123' } });
  global.fetch.mockResolvedValueOnce({ ok: false, status: 409, json: async () => ({ error: 'That email already has an account.' }) });
  fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('That email already has an account.');
  expect(global.fetch).toHaveBeenLastCalledWith('/api/auth/signup', expect.objectContaining({ method: 'POST', body: JSON.stringify({ name: 'Alice', email: 'alice@example.com', password: 'test-password-123' }) }));
});

test('setup keeps draft data and creates a household through all six steps', async () => {
  const onCreate = jest.fn().mockResolvedValue(undefined);
  render(<Setup user={{ id: 'alice', name: 'Alice' }} onCreate={onCreate} />);
  fireEvent.change(screen.getByLabelText('House name'), { target: { value: 'Pink House' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByRole('heading', { name: 'Better when you share.' })).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText(/Groceries/));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByRole('heading', { name: 'Every corner counts.' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByRole('heading', { name: 'Small jobs. Happy house.' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.change(screen.getByLabelText('Roommate 1'), { target: { value: 'Bob' } });
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByRole('heading', { name: 'A fair start for everyone.' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Create my house' }));
  await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1));
  expect(onCreate.mock.calls[0][0]).toEqual(expect.objectContaining({ name: 'Pink House', features: ['chores', 'groceries'], rotate: true }));
  expect(onCreate.mock.calls[0][0].members[1].name).toBe('Bob');
  expect(onCreate.mock.calls[0][0].chores.length).toBeGreaterThan(0);
});

test('a grocery-only solo household skips irrelevant chore screens', () => {
  render(<Setup user={{ id: 'solo', name: 'Solo' }} onCreate={jest.fn()} />);
  fireEvent.change(screen.getByLabelText('House name'), { target: { value: 'Solo home' } });
  fireEvent.click(screen.getByLabelText(/Just me/));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  fireEvent.click(screen.getByLabelText(/Chores/));
  fireEvent.click(screen.getByLabelText(/Groceries/));
  fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  expect(screen.getByRole('heading', { name: 'Meet your roomies.' })).toBeInTheDocument();
  expect(screen.queryByLabelText('Roommate 1')).not.toBeInTheDocument();
});
