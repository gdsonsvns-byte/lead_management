import React from 'react'
import DashboardCard from './system_admin_dashboard_card'

export default function SystemAdminDashboard() {
    return (
        <section className='relative w-full'>
            <h1 className='font-bold text-zinc-700 text-lg font-mono capitalize'>
                Dashboard
            </h1>
            <span className='text-xs font-mono text-gray-700'>
                Overview of All user data and detais of every accounts.
            </span>

            <div className='relative mt-8'>
                <DashboardCard />
            </div>
        </section>
    )
}
