// All unexpected requests fail; this fixture never forwards to the network.
const old = 'https://bcfctxfulwyrslingscm.supabase.co/storage/v1/object/public/news-images/';
globalThis.fetch = async (input, options = {}) => {
 const url = new URL(typeof input === 'string' ? input : input.url ?? input.href);
 const method = options.method ?? 'GET';
 if (url.hostname !== 'zkpuyhrmyslmstzwojvw.supabase.co') throw new Error('Unexpected host in offline test');
 if (method === 'HEAD') return new Response(null, { status: process.env.PLAN_CASE === 'missing' ? 404 : 200 });
 if (method !== 'GET' || !url.pathname.startsWith('/rest/v1/')) throw new Error('Unexpected request; database writes are forbidden');
 const table = url.pathname.split('/').pop(), select = url.searchParams.get('select');
 let data = [];
 if (table === 'lms_instructors') {
   if (select !== 'user_id,avatar_url') throw new Error('Incorrect instructor primary key');
   data = [{ user_id: '00000000-0000-4000-8000-000000000001', avatar_url: process.env.PLAN_CASE === 'private' ? old.replace('/public/','/sign/')+'avatar.png?token=private' : old+'avatar.png' }];
 }
 if (table === 'news' && select === 'id,images') data = [{ id: '00000000-0000-4000-8000-000000000002', images: [old+'picture.png', "unchanged ' $saae_url_fix$ text"] }];
 return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
