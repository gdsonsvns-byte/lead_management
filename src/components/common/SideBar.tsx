'use client';
import { ChevronRight } from 'lucide-react'
import Tabs from './Tabs'
import { useState } from 'react';

export default function SideBar() {
    const [open, setOpen] = useState(false);
    return (
        <nav className={`fixed inset-y-0 w-[250px] bg-blue-800 min-w-60 lg:translate-x-0 -translate-x-full transition-all z-100 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
            <aside className='relative w-full h-full flex flex-col'>
                <div className='relative w-full p-5 shrink-0 '>
                    <span className='text-white font-bold text-lg'>
                        Lead Management
                    </span>
                </div>
                <div className='w-full h-px bg-neutral-200 opacity-50 ' />
                <Tabs setOpen={setOpen} />
                <div className='w-full h-12 shrink-0 border-t border-t-white/50'></div>
            </aside>
            <button onClick={() => setOpen(!open)} className='lg:hidden absolute bottom-0 -right-10 z-100 cursor-pointer w-10 h-10 flex items-center justify-center bg-blue-800 hover:bg-blue-600 transition-all duration-300'>
                <ChevronRight className='text-white' size={14} />
            </button>
        </nav>
    )
}
