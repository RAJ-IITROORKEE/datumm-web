import {auth,clerkClient} from '@clerk/nextjs/server';
import {handleProfileRequest} from '@/lib/onboarding-profile.mjs';

export const dynamic='force-dynamic';

async function handle(request:Request) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || !process.env.CLERK_SECRET_KEY) return Response.json({detail:'Account profile storage is not configured.'},{status:503,headers:{'Cache-Control':'private, no-store'}});
  const {userId}=await auth();
  const client=await clerkClient();
  return handleProfileRequest(request,{userId,loadUser:id=>client.users.getUser(id),saveMetadata:(id,metadata)=>client.users.updateUserMetadata(id,metadata)});
}

export const GET=handle;
export const PUT=handle;
