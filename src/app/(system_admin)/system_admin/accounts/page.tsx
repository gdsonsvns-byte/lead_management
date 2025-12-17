import Accounts from '@/src/components/Accounts'
import Spinner from '@/src/components/ui/spinner'
import React, { Suspense } from 'react'

export default function ListAccountPage() {
  return (
    <section className='relative w-full p-5'>
      <h1 className='font-bold text-zinc-800 text-lg'>
        Accounts List
      </h1>
      <div className='relative mt-8'>
        <Suspense fallback={<Spinner />} >
          <Accounts />
        </Suspense>
      </div>
    </section>
  )
}
