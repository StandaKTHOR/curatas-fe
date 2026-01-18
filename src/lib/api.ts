export const API_BASE=import.meta.env.VITE_API_BASE||'http://localhost:8080'
export async function listItems(q:string){const u=new URL(`${API_BASE}/public/v1/catalog/items`);if(q)u.searchParams.set('q',q);const r=await fetch(u);if(!r.ok)throw new Error('Load failed');return r.json()}
export async function getItem(id:string){const r=await fetch(`${API_BASE}/public/v1/catalog/items/${id}`);if(!r.ok)throw new Error('Load failed');return r.json()}
export async function sendFeedback(body:any){const r=await fetch(`${API_BASE}/public/v1/feedback`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error('Send failed');return r.json()}
