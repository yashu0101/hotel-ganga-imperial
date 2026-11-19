import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import path from 'node:path';
import {createHmac} from 'node:crypto';
function load(file, mocks = {}, runtime = {}) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const compiledModule = { exports: {} };
  new Function('require', 'module', 'exports', 'process', 'fetch', source)((id) => { if (!(id in mocks)) throw Error('Unexpected dependency: ' + id); return mocks[id]; }, compiledModule, compiledModule.exports, runtime.process || process, runtime.fetch || fetch);
  return compiledModule.exports;
}
const dates = load('src/lib/reservation.ts');
const future = '2099-01-10';
const response = { NextResponse: { json: (value, options = {}) => Response.json(value, options) } };
const records = [];
const db = { getRooms: async () => [{ name: 'Deluxe Room', hidden: false }], getBanquetPackages: async () => [{ name: 'Gold', active: true }], addBooking: async (b) => { records.push(b); return { ...b, id: 'request-reference' }; } };
const booking = load('src/app/api/book/route.ts', { '@/lib/notifications': {deliverNotifications:async()=>({configured:false})}, 'next/server': response, '@/lib/db': db, '@/lib/reservation': dates, '@/lib/request-limit': {allowRequest:()=>true} });
const payload = {name:'Test Guest',mobile:'+919999999999',email:'',roomType:'Deluxe Room',checkin:future,checkout:'2099-01-12',guests:2};
const request = b => new Request('http://localhost/api/book', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b)});
test('rejects impossible dates, past dates and non-overnight stays',()=>{
 assert.equal(dates.validDate('2099-02-30'),false);
 assert.ok(dates.dateError('2000-01-01','2000-01-02',true));
 assert.ok(dates.dateError(future,future,true));
 assert.ok(dates.dateError(future,'',true));
 assert.equal(dates.dateError(future,'',false),'');
});
test('accepts multiple requests for the same category without falsely reserving all inventory',async()=>{
 assert.equal((await booking.POST(request(payload))).status,201);
 assert.equal((await booking.POST(request(payload))).status,201);
 assert.equal(records.length,2);
 assert.equal(records[0].amount,0);
});
test('rejects unknown rooms, invalid guest counts and incomplete stays',async()=>{
 for(const change of [{roomType:'Invalid'},{guests:-1},{guests:1.5},{guests:21},{checkout:''},{checkin:'2099-02-30'},{email:'bad'}]) assert.equal((await booking.POST(request({...payload,...change}))).status,400);
});
test('accepts single-day event request and only exposes request reference',async()=>{
 const result=await booking.POST(request({...payload,roomType:'Banquet - Gold',checkout:'',guests:100}));
 assert.equal(result.status,201);assert.deepEqual(await result.json(),{success:true,reference:'request-reference'});
});
test('unauthenticated users cannot mutate admin content or enquiries',async()=>{
 for(const name of ['rooms','offers','reviews','dining','banquet','enquiries']) {
  const route=load('src/app/api/'+name+'/route.ts',{'next/server':response,'@/lib/db':{},'@/lib/auth':{verifySession:async()=>({authenticated:false})}});
  for(const method of ['POST','PATCH','DELETE']) if(route[method]) assert.equal((await route[method](request({}))).status,401,name+' '+method);
 }
});
test('rate limiter blocks excessive attempts',()=>{const limiter=load('src/lib/request-limit.ts');assert.equal(limiter.allowRequest('test',2),true);assert.equal(limiter.allowRequest('test',2),true);assert.equal(limiter.allowRequest('test',2),false)});

test('validates and persists requested room counts',async()=>{
 assert.equal((await booking.POST(request({...payload,roomsRequested:0}))).status,400);
 assert.equal((await booking.POST(request({...payload,roomsRequested:11}))).status,400);
 assert.equal((await booking.POST(request({...payload,roomsRequested:2.5}))).status,400);
 assert.equal((await booking.POST(request({...payload,roomsRequested:3}))).status,201);
 assert.equal(records.at(-1).roomsRequested,3);
});

test('local booking and its notification event are persisted in one atomic file replacement',async()=>{
 const files=new Map([['/virtual/data/db.json',JSON.stringify({bookings:[],config:{rooms:[]}})]]);let renames=0;
 const fakeFs={readFileSync:p=>files.get(p),writeFileSync:(p,v)=>files.set(p,v),existsSync:p=>files.has(p)||p==='/virtual/data',mkdirSync:()=>{},renameSync:(a,b)=>{renames++;files.set(b,files.get(a));files.delete(a)},unlinkSync:p=>files.delete(p)};
 const dbModule=load('src/lib/db.ts',{'fs':{default:fakeFs},'path':{default:path.posix},'./config':{SITE_CONFIG:{rooms:[]}}},{process:{env:{},cwd:()=>'/virtual'}});
 const saved=await dbModule.addBooking({...payload,roomsRequested:2,gender:'other',country:'',city:'',amount:0});
 const result=JSON.parse(files.get('/virtual/data/db.json'));
 assert.equal(renames,1);assert.equal(result.bookings[0].id,saved.id);assert.equal(result.notificationJobs[0].bookingId,saved.id);assert.equal(result.notificationJobs[0].status,'pending');
 files.set('/virtual/data/db.json','broken JSON');
 await assert.rejects(()=>dbModule.getBookings());assert.equal(files.get('/virtual/data/db.json'),'broken JSON');
});

test('Postgres saves the booking and event in the same transaction',async()=>{
 let transaction=[];const sql=(strings,...values)=>({query:strings.join('?'),values});sql.transaction=async queries=>{transaction=queries;return [[],[]]};
 const dbModule=load('src/lib/db.ts',{'fs':{default:{}},'path':{default:path.posix},'./config':{SITE_CONFIG:{rooms:[]}},'@neondatabase/serverless':{neon:()=>sql}},{process:{env:{DATABASE_URL:'test-only'},cwd:()=>'/virtual'}});
 const saved=await dbModule.addBooking({...payload,roomsRequested:2,gender:'other',country:'',city:'',amount:0});
 assert.equal(transaction.length,2);assert.match(transaction[0].query,/INSERT INTO bookings/);assert.match(transaction[1].query,/INSERT INTO notification_outbox/);assert.equal(transaction[1].values[0],saved.id);
});

test('notifications stay queued when disabled and never call an external endpoint',async()=>{
 const notifications=load('src/lib/notifications.ts',{'node:crypto':{createHmac},'@/lib/db':{}},{process:{env:{}},fetch:()=>{throw Error('Must not send')}});
 assert.equal(notifications.notificationConfigured(),false);assert.equal((await notifications.deliverNotifications()).configured,false);
});

test('notification failures are retryable, signed and use a stable idempotency key',async()=>{
 const secret='test-secret-that-is-at-least-32-characters';const calls=[],statuses=[];
 const mocks={getNotificationJobs:async()=>[{id:'event-1',bookingId:'booking-1',status:'pending'}],getBookings:async()=>[{...payload,id:'booking-1',roomType:payload.roomType}],markNotification:async(id,ok)=>statuses.push(ok)};
 const notifications=load('src/lib/notifications.ts',{'node:crypto':{createHmac},'@/lib/db':mocks},{process:{env:{NOTIFICATION_WEBHOOK_URL:'https://notifications.example.test/hotel',NOTIFICATION_WEBHOOK_SECRET:secret}},fetch:async(url,options)=>{calls.push(options);return {ok:calls.length>1}}});
 assert.equal((await notifications.deliverNotifications()).delivered,0);
 assert.equal((await notifications.deliverNotifications()).delivered,1);assert.deepEqual(statuses,[false,true]);
 assert.equal(calls[0].headers['Idempotency-Key'],calls[1].headers['Idempotency-Key']);
 assert.equal(calls[0].headers['X-Hotel-Signature'],createHmac('sha256',secret).update(calls[0].headers['X-Hotel-Timestamp']+'.'+calls[0].body).digest('hex'));
 assert.equal(JSON.parse(calls[0].body).request.status,'pending');
});

test('only unambiguous nightly rates produce an estimate',()=>{
 assert.equal(dates.nightlyRate('₹3,000/night'),3000);
 assert.equal(dates.nightlyRate('INR 4500 per night'),4500);
 assert.equal(dates.nightlyRate('₹3000–4500/night'),null);
 assert.equal(dates.nightlyRate('Rate on request'),null);
 assert.equal(dates.nightlyRate('₹3000/night for 2 adults'),null);
});
