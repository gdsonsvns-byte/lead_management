import AddNewUser from '@/src/components/common/add_new_user'
import Spinner from '@/src/components/ui/spinner'
import { Suspense } from 'react'

export default function page() {
    return (
        <section className='relative w-full p-5'>
            <div className='w-full relative bg-white p-5 rounded-2xl shadow'>
                <h1 className='font-bold text-zinc-800 text-lg'>
                    Add New User
                </h1>
                <div className='relative mt-8'>
                    <Suspense fallback={<Spinner />} >
                        <AddNewUser />
                    </Suspense>
                </div>
            </div>
        </section>
    )
}

