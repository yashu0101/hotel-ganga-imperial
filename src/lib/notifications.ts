import {createHmac} from 'node:crypto';
import {getNotificationJobs,getBookings,markNotification} from '@/lib/db';
export function notificationConfigured(){const url=process.env.NOTIFICATION_WEBHOOK_URL;const secret=process.env.NOTIFICATION_WEBHOOK_SECRET;try{return !!url&&new URL(url).protocol==='https:'&&!!secret&&secret.length>=32}catch{return false}}
export async function deliverNotifications(bookingId?:string){
 if(!notificationConfigured())return {configured:false,delivered:0,pending:true};
 const jobs=(await getNotificationJobs()).filter(j=>j.status==='pending'&&(!bookingId||j.bookingId===bookingId)).slice(0,10);
 const bookings=await getBookings();let delivered=0;
 for(const job of jobs){const booking=bookings.find(b=>b.id===job.bookingId);if(!booking)continue;
 const timestamp=String(Date.now());const body=JSON.stringify({event:'reservation.requested',eventId:job.id,request:{reference:booking.id,name:booking.name,mobile:booking.mobile,email:booking.email,preference:booking.roomType,checkin:booking.checkin,checkout:booking.checkout,guests:booking.guests,roomsRequested:booking.roomsRequested??1,status:'pending'},instructions:{staff:'Review availability and contact the guest.',guest:'Acknowledge the request; do not describe it as a confirmed reservation.'}});
 const signature=createHmac('sha256',process.env.NOTIFICATION_WEBHOOK_SECRET!).update(timestamp+'.'+body).digest('hex');
 let ok=false;try{const response=await fetch(process.env.NOTIFICATION_WEBHOOK_URL!,{method:'POST',headers:{'Content-Type':'application/json','X-Hotel-Timestamp':timestamp,'X-Hotel-Signature':signature,'Idempotency-Key':job.id},body,signal:AbortSignal.timeout(4000),redirect:'error'});ok=response.ok}catch{ok=false}
 await markNotification(job.id,ok);if(ok)delivered++;
 }
 return {configured:true,delivered,pending:delivered<jobs.length};
}
