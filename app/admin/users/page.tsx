"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { useRouter } from "next/navigation";

interface User {
    id: string;
    name: string;
    balance: number;
    totalUnpaidAmount: number;
    activeSubscriptions: Array<{
        id: string;
        service: {
            id: string;
            name: string;
            displayName: string;
        };
    }>;
}

interface Service {
    id: string;
    name: string;
    displayName: string;
    maxMembers: number;
    currentMembers: number;
    availableSlots: number;
}

export default function AdminUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newUser, setNewUser] = useState({ name: "", balance: 0 });
    const [isCreating, setIsCreating] = useState(false);
    const router = useRouter();

    useEffect(() => {
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

        checkAuth();
    }, [router]);

    const loadData = async () => {
        try {
            const [servicesRes, usersRes] = await Promise.all([
                fetch("/api/service"),
                fetch("/api/user"), // admin 인증된 상태에서 모든 사용자 조회
            ]);

            if (servicesRes.ok) {
                const servicesData = await servicesRes.json();
                setServices(servicesData.services || []);
            }

            if (usersRes.ok) {
                const usersData = await usersRes.json();
                setUsers(usersData.users || []);
            } else {
                console.error("Failed to load users:", await usersRes.text());
                setUsers([]);
            }
        } catch (error) {
            console.error("Error loading data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);

        try {
            const response = await fetch("/api/user", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newUser.name,
                    initialBalance: newUser.balance,
                }),
            });

            if (response.ok) {
                setNewUser({ name: "", balance: 0 });
                await loadData();
                alert("사용자가 성공적으로 생성되었습니다!");
            } else {
                const error = await response.json();
                alert(`사용자 생성 실패: ${error.error}`);
            }
        } catch (error) {
            console.error("Error creating user:", error);
            alert("사용자 생성 중 오류가 발생했습니다.");
        } finally {
            setIsCreating(false);
        }
    };

    const handleAddToService = async (userId: string, serviceId: string) => {
        try {
            const response = await fetch("/api/subscription", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, serviceId }),
            });

            if (response.ok) {
                await loadData();
                alert("사용자가 서비스에 추가되었습니다!");
            } else {
                const error = await response.json();
                alert(`추가 실패: ${error.error}`);
            }
        } catch (error) {
            console.error("Error adding user to service:", error);
            alert("서비스 추가 중 오류가 발생했습니다.");
        }
    };

    const handleRemoveFromService = async (
        userId: string,
        serviceId: string
    ) => {
        try {
            const response = await fetch("/api/subscription", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, serviceId }),
            });

            if (response.ok) {
                await loadData();
                alert("사용자가 서비스에서 제거되었습니다!");
            } else {
                const error = await response.json();
                alert(`제거 실패: ${error.error}`);
            }
        } catch (error) {
            console.error("Error removing user from service:", error);
            alert("서비스 제거 중 오류가 발생했습니다.");
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
                            <button
                                onClick={() => router.push("/admin/dashboard")}
                                className="text-blue-600 hover:text-blue-800"
                            >
                                ← 대시보드로 돌아가기
                            </button>
                            <h1 className="text-xl font-semibold text-gray-900">
                                사용자 관리
                            </h1>
                        </div>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* 새 사용자 생성 */}
                <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        새 사용자 추가
                    </h3>
                    <form
                        onSubmit={handleCreateUser}
                        className="grid grid-cols-1 md:grid-cols-3 gap-4"
                    >
                        <input
                            type="text"
                            placeholder="사용자 이름"
                            value={newUser.name}
                            onChange={(e) =>
                                setNewUser({ ...newUser, name: e.target.value })
                            }
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                        <input
                            type="number"
                            placeholder="초기 잔고"
                            value={newUser.balance}
                            onChange={(e) =>
                                setNewUser({
                                    ...newUser,
                                    balance: parseInt(e.target.value) || 0,
                                })
                            }
                            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            min="0"
                        />
                        <button
                            type="submit"
                            disabled={isCreating}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200"
                        >
                            {isCreating ? "생성 중..." : "사용자 추가"}
                        </button>
                    </form>
                </div>

                {/* 사용자 목록 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {users.map((user) => (
                        <motion.div
                            key={user.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white rounded-xl shadow-sm p-6"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-semibold text-gray-900">
                                        {user.name}
                                    </h3>
                                    <div className="text-sm text-gray-500 space-y-1">
                                        <div>
                                            잔고: ₩
                                            {user.balance.toLocaleString()}
                                        </div>
                                        <div
                                            className={
                                                user.totalUnpaidAmount > 0
                                                    ? "text-red-600"
                                                    : "text-green-600"
                                            }
                                        >
                                            미납: ₩
                                            {user.totalUnpaidAmount.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* 현재 구독 서비스 */}
                            <div className="mb-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">
                                    현재 구독 서비스
                                </h4>
                                <div className="space-y-2">
                                    {user.activeSubscriptions.length > 0 ? (
                                        user.activeSubscriptions.map(
                                            (subscription) => (
                                                <div
                                                    key={subscription.id}
                                                    className="flex justify-between items-center bg-green-50 px-3 py-2 rounded-lg"
                                                >
                                                    <span className="text-sm font-medium text-green-800">
                                                        {
                                                            subscription.service
                                                                .displayName
                                                        }
                                                    </span>
                                                    <button
                                                        onClick={() =>
                                                            handleRemoveFromService(
                                                                user.id,
                                                                subscription
                                                                    .service.id
                                                            )
                                                        }
                                                        className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200"
                                                    >
                                                        제거
                                                    </button>
                                                </div>
                                            )
                                        )
                                    ) : (
                                        <div className="text-sm text-gray-500">
                                            구독 중인 서비스가 없습니다.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* 서비스 추가 */}
                            <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">
                                    서비스 추가
                                </h4>
                                <div className="grid grid-cols-2 gap-2">
                                    {services
                                        .filter(
                                            (service) =>
                                                !user.activeSubscriptions.some(
                                                    (sub) =>
                                                        sub.service.id ===
                                                        service.id
                                                ) && service.availableSlots > 0
                                        )
                                        .map((service) => (
                                            <button
                                                key={service.id}
                                                onClick={() =>
                                                    handleAddToService(
                                                        user.id,
                                                        service.id
                                                    )
                                                }
                                                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                                            >
                                                {service.displayName}
                                                <span className="text-blue-500 ml-1">
                                                    ({service.availableSlots}
                                                    자리)
                                                </span>
                                            </button>
                                        ))}
                                </div>
                                {services.filter(
                                    (service) =>
                                        !user.activeSubscriptions.some(
                                            (sub) =>
                                                sub.service.id === service.id
                                        ) && service.availableSlots > 0
                                ).length === 0 && (
                                    <div className="text-sm text-gray-500">
                                        추가 가능한 서비스가 없습니다.
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
