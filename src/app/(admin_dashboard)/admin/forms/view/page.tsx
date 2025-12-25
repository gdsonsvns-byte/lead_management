import UsersData from "@/src/components/common/UsersData";

export default async function ViewDataPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
    const { id } = await searchParams;

    if (!id) {
        return (
            <section className="p-6">
                <h1 className="text-xl font-semibold text-red-600">
                    No form ID provided.
                </h1>
            </section>
        );
    }

    return (
        <section className='relative p-5 overflow-hidden'>
            <UsersData formId={id} />
        </section>
    )
}
