import SideBar from "@/src/components/common/SideBar";
import TopBar from "@/src/components/common/TopBar";
import AuthBoundary from "@/src/context/auth_boundry";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthBoundary>
            <main className="flex min-h-screen">
                <SideBar />
                <section className="flex-1 lg:pl-[250px] pl-0 bg-blue-50 w-full">
                    <TopBar />
                    {children}
                </section>
            </main>
        </AuthBoundary>
    );
}
