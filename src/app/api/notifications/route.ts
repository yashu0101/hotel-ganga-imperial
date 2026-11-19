import {NextResponse} from 'next/server';
import {verifySession} from '@/lib/auth';
import {getNotificationJobs} from '@/lib/db';
import {deliverNotifications,notificationConfigured} from '@/lib/notifications';
export async function GET(){if(!(await verifySession()).authenticated)return NextResponse.json({error:'Unauthorized'},{status:401});const jobs=await getNotificationJobs();return NextResponse.json({configured:notificationConfigured(),pending:jobs.filter(j=>j.status==='pending').length,delivered:jobs.filter(j=>j.status==='delivered').length})}
export async function POST(){if(!(await verifySession()).authenticated)return NextResponse.json({error:'Unauthorized'},{status:401});return NextResponse.json(await deliverNotifications())}
