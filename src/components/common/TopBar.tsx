import { Bell } from 'lucide-react'
import Breadcrumb from './Breadcrumb'
import Profile from './Profile'

export default function TopBar() {
    return (
        <header className='sticky top-0 z-50 w-full px-5 py-3 bg-white shadow-sm flex items-center justify-between'>
            <div className='relative max-w-[70%] truncate '>
                <Breadcrumb />
            </div>
            <div className='relative flex items-center gap-5 '>
                <Bell />
                <Profile />
            </div>
        </header>
    )
}
