// Talks to the Google Apps Script Web App backend (see /apps-script/Code.gs).
// Set VITE_API_URL in .env to your deployed /exec URL to enable live Google Sheet sync.
// Falls back to local-only mode (in-memory, seeded from data.json) when unset.

const API_URL = import.meta.env.VITE_API_URL || '';

export const isLive = () => Boolean(API_URL);

export async function fetchAll() {
  if (!API_URL) throw new Error('no-api');
  const res = await fetch(API_URL, { method: 'GET' });
  if (!res.ok) throw new Error('Fetch failed: ' + res.status);
  return res.json();
}

async function post(payload) {
  if (!API_URL) throw new Error('no-api');
  // Apps Script Web Apps don't support custom headers well with CORS preflight,
  // so we send as text/plain and parse JSON on the Apps Script side.
  const res = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Request failed: ' + res.status);
  return res.json();
}

export const addItem = (item) => post({ action: 'addItem', ...item });
export const addSharedItem = (payload) => post({ action: 'addSharedItem', ...payload });
export const updateItem = (item) => post({ action: 'updateItem', ...item });
export const deleteItem = (id) => post({ action: 'deleteItem', id });
export const addCategory = (project, category) => post({ action: 'addCategory', project, category });
export const deleteCategory = (project, category) => post({ action: 'deleteCategory', project, category });
export const addProject = (project, category) => post({ action: 'addProject', project, category });
export const transferItem = (payload) => post({ action: 'transferItem', ...payload });