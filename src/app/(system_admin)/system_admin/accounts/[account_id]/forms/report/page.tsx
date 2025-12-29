import FollowupReport from '@/src/components/common/followup_report';
import Spinner from '@/src/components/ui/spinner';
import { Suspense } from 'react'

export default async function ReportPage({ searchParams }: { searchParams: Promise<{ id?: string, date?: string }> }) {
    const { id, date } = await searchParams;

    if (!id || !date) {
        return (
            <section className="p-6">
                <h1 className="text-xl font-semibold text-red-600">
                    Invalid request.
                </h1>
            </section>
        );
    }

    return (
        <section className='relative p-5'>
            <Suspense fallback={<Spinner />}>
                <FollowupReport id={id} date={date} />
            </Suspense>
        </section>
    )
}
