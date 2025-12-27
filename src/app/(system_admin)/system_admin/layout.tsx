import SideBar from "@/src/components/common/SideBar";
import TopBar from "@/src/components/common/TopBar";

export default async function SystemAdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <main className="flex min-h-screen">
            <SideBar />
            <section className="flex-1 pl-[250px] bg-blue-50 w-full">
                <TopBar />
                {children}
            </section>
        </main>
    );
}
