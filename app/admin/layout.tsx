import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "FamilyFare Admin",
    description: "FamilyFare 관리자 페이지",
};

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
