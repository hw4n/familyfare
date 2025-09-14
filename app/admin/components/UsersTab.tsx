"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";

interface User {
    id: string;
    name: string;
    balance: number;
    totalUnpaidAmount?: number;
    lastDepositAt?: string;
    activeSubscriptions?: Array<{
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
    availableSlots?: number;
}

export default function UsersTab({ onRefresh }: { onRefresh: () => void }) {
    const [users, setUsers] = useState<User[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [newUser, setNewUser] = useState({ name: "", balance: 0 });
    const [isCreating, setIsCreating] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [depositAmount, setDepositAmount] = useState<{
        [key: string]: number;
    }>({});
    const [isDepositing, setIsDepositing] = useState<string | null>(null);

    useEffect(() => {
        loadUsersData();
    }, []);

    const loadUsersData = async () => {
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
                const users = usersData.users || [];
                // activeSubscriptions 필드명 통일
                const normalizedUsers = users.map((user: User) => ({
                    ...user,
                    activeSubscriptions: user.activeSubscriptions || [],
                }));
                setUsers(normalizedUsers);
            } else {
                console.error("Failed to load users:", await usersRes.text());
                setUsers([]);
            }
        } catch (error) {
            console.error("Error loading users data:", error);
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
                await loadUsersData();
                onRefresh();
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
                await loadUsersData();
                onRefresh();
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
                await loadUsersData();
                onRefresh();
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

    const handleDeposit = async (userId: string) => {
        const amount = depositAmount[userId];
        if (!amount || amount <= 0) {
            alert("올바른 입금 금액을 입력해주세요.");
            return;
        }

        if (!confirm(`₩${amount.toLocaleString()}을 입금하시겠습니까?`)) {
            return;
        }

        setIsDepositing(userId);

        try {
            const response = await fetch("/api/user?action=deposit", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, amount }),
            });

            if (response.ok) {
                const result = await response.json();
                await loadUsersData();
                onRefresh();

                // 입금 후 입력 필드 초기화
                setDepositAmount((prev) => ({ ...prev, [userId]: 0 }));

                alert(
                    `입금 완료!\n\n` +
                        `사용자: ${result.user.name}\n` +
                        `입금 금액: ₩${result.user.depositedAmount.toLocaleString()}\n` +
                        `현재 잔고: ₩${result.user.balance.toLocaleString()}`
                );
            } else {
                const error = await response.json();
                alert(`입금 실패: ${error.error}`);
            }
        } catch (error) {
            console.error("Error processing deposit:", error);
            alert("입금 처리 중 오류가 발생했습니다.");
        } finally {
            setIsDepositing(null);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                    className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
                />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* 새 사용자 생성 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
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
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
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
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
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
                                    <div
                                        className={
                                            user.balance < 0
                                                ? "text-red-600"
                                                : ""
                                        }
                                    >
                                        잔고: ₩
                                        {user.balance?.toLocaleString() || 0}
                                        {user.balance < 0 && (
                                            <span className="text-xs ml-2 px-1 py-0.5 bg-red-100 text-red-600 rounded">
                                                부족분 포함됨
                                            </span>
                                        )}
                                    </div>
                                    <div
                                        className={
                                            (user.totalUnpaidAmount || 0) > 0
                                                ? "text-red-600"
                                                : "text-green-600"
                                        }
                                    >
                                        미납: ₩
                                        {(
                                            user.totalUnpaidAmount || 0
                                        ).toLocaleString()}
                                    </div>
                                    {user.lastDepositAt && (
                                        <div className="text-blue-600">
                                            마지막 입금:{" "}
                                            {new Date(
                                                user.lastDepositAt
                                            ).toLocaleDateString("ko-KR")}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* 현재 구독 서비스 */}
                        <div className="mb-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                                현재 구독 서비스
                            </h4>
                            <div className="space-y-2">
                                {(user.activeSubscriptions?.length ?? 0) > 0 ? (
                                    user.activeSubscriptions!.map(
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
                                                            subscription.service
                                                                .id
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
                                            !user.activeSubscriptions?.some(
                                                (sub) =>
                                                    sub.service.id ===
                                                    service.id
                                            ) &&
                                            (service.availableSlots || 0) > 0
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
                                                ({service.availableSlots || 0}
                                                자리)
                                            </span>
                                        </button>
                                    ))}
                            </div>
                            {services.filter(
                                (service) =>
                                    !user.activeSubscriptions?.some(
                                        (sub) => sub.service.id === service.id
                                    ) && (service.availableSlots || 0) > 0
                            ).length === 0 && (
                                <div className="text-sm text-gray-500">
                                    추가 가능한 서비스가 없습니다.
                                </div>
                            )}
                        </div>

                        {/* 잔고 입금 */}
                        <div className="mt-4 pt-4 border-t border-gray-200">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">
                                잔고 입금
                            </h4>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    placeholder="입금 금액"
                                    value={depositAmount[user.id] || ""}
                                    onChange={(e) =>
                                        setDepositAmount((prev) => ({
                                            ...prev,
                                            [user.id]:
                                                parseInt(e.target.value) || 0,
                                        }))
                                    }
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm text-black"
                                    min="1"
                                    step="1000"
                                />
                                <button
                                    onClick={() => handleDeposit(user.id)}
                                    disabled={
                                        isDepositing === user.id ||
                                        !depositAmount[user.id] ||
                                        depositAmount[user.id] <= 0
                                    }
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-sm font-medium"
                                >
                                    {isDepositing === user.id ? (
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{
                                                duration: 1,
                                                repeat: Infinity,
                                                ease: "linear",
                                            }}
                                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full inline-block"
                                        />
                                    ) : (
                                        "입금"
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
