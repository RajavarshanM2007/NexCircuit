import { auth } from '@/lib/auth'


import { ProfileForm }    from '@/components/account/ProfileForm'
import { ProfileHeading } from '@/components/account/ProfileHeading'

export default async function ProfilePage() {
  const session = await auth()
  return (
    <div>
      <ProfileHeading customerId={(session?.user as any)?.customerId} />
      <ProfileForm user={session?.user} />
    </div>
  )
}
