import Tabs from './Tabs'

export default function SideBar() {
    return (
        <nav className='fixed inset-y-0 w-[250px] bg-blue-800 min-w-60 '>
            <aside className='relative w-full h-full flex flex-col'>
                <div className='relative w-full p-5 shrink-0 '>
                    <span className='text-white font-bold text-lg'>
                        Lead Management
                    </span>
                </div>
                <div className='w-full h-px bg-neutral-200 opacity-50 ' />
                <Tabs />

                <div className='w-full h-12 shrink-0 border-t border-t-white/50'></div>
            </aside>
        </nav>
    )
}
