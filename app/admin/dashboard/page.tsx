"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";
import UsersTab from "../components/UsersTab";
import OverviewTab from "../components/OverviewTab";
import ServicesTab from "../components/ServicesTab";
import TransactionsTab from "../components/TransactionsTab";

interface User {
    id: string;
    name: string;
    balance: number;
    totalUnpaidAmount: number;
}

interface Service {
    id: string;
    name: string;
    displayName: string;
    maxMembers: number;
    currentMembers: number;
    availableSlots: number;
}

interface Transaction {
    id: string;
    totalAmount: number;
    month: string;
    status: string;
    description: string;
    service: {
        displayName: string;
    };
    participants: Array<{
        id: string;
        shareAmount: number;
        paymentStatus: string;
        user: {
            name: string;
        };
    }>;
}

export default function AdminDashboard() {
    const [users, setUsers] = useState<User[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<
        "overview" | "users" | "services" | "transactions"
    >("overview");
    const router = useRouter();

    // 인증 확인
    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const response = await fetch("/api/admin/auth");
            const data = await response.json();

            if (!data.authenticated) {
                router.push("/admin/login");
                return;
            }

            await loadData();
        } catch (error) {
            console.error("Auth check failed:", error);
            router.push("/admin/login");
        }
    };

    const loadData = async () => {
        try {
            const [usersRes, servicesRes, transactionsRes] = await Promise.all([
                fetch("/api/user"),
                fetch("/api/service"),
                fetch("/api/transaction"),
            ]);

            if (servicesRes.ok) {
                const servicesData = await servicesRes.json();
                setServices(servicesData.services || []);
            }

            if (transactionsRes.ok) {
                const transactionsData = await transactionsRes.json();
                setTransactions(transactionsData.transactions || []);
            }
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await fetch("/api/admin/auth", { method: "DELETE" });
            router.push("/admin/login");
        } catch (error) {
            console.error("Logout failed:", error);
        }
    };

    const createTransaction = async (
        serviceId: string,
        totalAmount: number,
        month: string
    ) => {
        try {
            const response = await fetch("/api/transaction", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    serviceId,
                    totalAmount: parseInt(totalAmount.toString()),
                    month,
                    description: `${
                        services.find((s) => s.id === serviceId)?.displayName
                    } 구독료 (${month})`,
                }),
            });

            if (response.ok) {
                await loadData();
                alert("거래가 성공적으로 생성되었습니다!");
            } else {
                const error = await response.json();
                alert(`거래 생성 실패: ${error.error}`);
            }
        } catch (error) {
            console.error("Error creating transaction:", error);
            alert("거래 생성 중 오류가 발생했습니다.");
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                    className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"
                />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center space-x-4">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                                <svg
                                    className="w-5 h-5 text-white"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
                                </svg>
                            </div>
                            <h1 className="text-xl font-semibold text-gray-900">
                                FamilyFare Admin
                            </h1>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                        >
                            로그아웃
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Navigation Tabs */}
                <div className="mb-8">
                    <nav className="flex space-x-8">
                        {[
                            { id: "overview", name: "개요", icon: "📊" },
                            { id: "users", name: "사용자 관리", icon: "👥" },
                            { id: "services", name: "서비스 관리", icon: "🔧" },
                            {
                                id: "transactions",
                                name: "거래 관리",
                                icon: "💰",
                            },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                                    activeTab === tab.id
                                        ? "bg-blue-100 text-blue-700"
                                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                                }`}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.name}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {activeTab === "overview" && (
                        <OverviewTab
                            services={services}
                            transactions={transactions}
                        />
                    )}
                    {activeTab === "users" && <UsersTab onRefresh={loadData} />}
                    {activeTab === "services" && (
                        <ServicesTab services={services} onRefresh={loadData} />
                    )}
                    {activeTab === "transactions" && (
                        <TransactionsTab
                            transactions={transactions}
                            services={services}
                            onCreateTransaction={createTransaction}
                            onRefresh={loadData}
                        />
                    )}
                </motion.div>
            </div>
        </div>
    );
}
