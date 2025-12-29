import React from 'react'

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
        <div>{id}{date}</div>
    )
}
