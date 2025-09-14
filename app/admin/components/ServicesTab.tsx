"use client";

import { useState } from "react";
import { motion } from "motion/react";

interface Service {
    id: string;
    name: string;
    displayName: string;
    maxMembers: number;
    currentMembers: number;
    availableSlots: number;
}

export default function ServicesTab({
    services,
    onRefresh,
}: {
    services: Service[];
    onRefresh: () => void;
}) {
    const [newService, setNewService] = useState({
        name: "",
        displayName: "",
        maxMembers: 1,
    });
    const [isCreating, setIsCreating] = useState(false);

    const handleCreateService = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);

        try {
            const response = await fetch("/api/service", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newService),
            });

            if (response.ok) {
                setNewService({ name: "", displayName: "", maxMembers: 1 });
                onRefresh();
                alert("서비스가 성공적으로 생성되었습니다!");
            } else {
                const error = await response.json();
                alert(`서비스 생성 실패: ${error.error}`);
            }
        } catch (error) {
            console.error("Error creating service:", error);
            alert("서비스 생성 중 오류가 발생했습니다.");
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* 새 서비스 생성 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    새 서비스 추가
                </h3>
                <form
                    onSubmit={handleCreateService}
                    className="grid grid-cols-1 md:grid-cols-4 gap-4"
                >
                    <input
                        type="text"
                        placeholder="서비스명 (예: netflix)"
                        value={newService.name}
                        onChange={(e) =>
                            setNewService({
                                ...newService,
                                name: e.target.value,
                            })
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        required
                    />
                    <input
                        type="text"
                        placeholder="표시명 (예: Netflix)"
                        value={newService.displayName}
                        onChange={(e) =>
                            setNewService({
                                ...newService,
                                displayName: e.target.value,
                            })
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        required
                    />
                    <input
                        type="number"
                        placeholder="최대 인원"
                        value={newService.maxMembers}
                        onChange={(e) =>
                            setNewService({
                                ...newService,
                                maxMembers: parseInt(e.target.value),
                            })
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        min="1"
                        required
                    />
                    <button
                        type="submit"
                        disabled={isCreating}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors duration-200"
                    >
                        {isCreating ? "생성 중..." : "추가"}
                    </button>
                </form>
            </div>

            {/* 서비스 목록 */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">
                        서비스 목록
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    서비스
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    현재 인원
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    최대 인원
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    남은 자리
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {services.map((service) => (
                                <tr key={service.id}>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <div className="text-sm font-medium text-gray-900">
                                                {service.displayName}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {service.name}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {service.currentMembers}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {service.maxMembers}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                service.availableSlots > 0
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-red-100 text-red-800"
                                            }`}
                                        >
                                            {service.availableSlots}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
