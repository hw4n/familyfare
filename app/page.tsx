"use client";

import { useState } from "react";
import { motion } from "motion/react";

export default function Home() {
    const [searchName, setSearchName] = useState("");
    const [searchResult, setSearchResult] = useState<{
        totalUnpaidAmount: number;
        unpaidTransactions: Array<{
            participationId: string;
            transactionId: string;
            shareAmount: number;
            month: string;
            serviceName: string;
            totalAmount: number;
            paymentStatus: string;
        }>;
        balance: number;
        name: string;
        lastDepositAt?: string;
    } | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [error, setError] = useState("");

    const handleSearch = async () => {
        if (!searchName.trim()) return;

        setIsSearching(true);
        setError("");

        try {
            const response = await fetch(
                `/api/user?name=${encodeURIComponent(searchName.trim())}`
            );
            const data = await response.json();

            if (response.ok) {
                setSearchResult(data);
            } else {
                setError(data.error || "사용자를 찾을 수 없습니다.");
                setSearchResult(null);
            }
        } catch (error) {
            console.error("Search error:", error);
            setError("서버 오류가 발생했습니다.");
            setSearchResult(null);
        } finally {
            setIsSearching(false);
        }
    };

    const resetSearch = () => {
        setSearchName("");
        setSearchResult(null);
        setIsSearching(false);
        setError("");
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="w-full max-w-2xl mx-auto"
            >
                {/* 헤더 */}
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.6 }}
                    className="text-center mb-12"
                >
                    <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
                        요금 조회
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-300">
                        이름을 검색하여 납부할 금액을 확인하세요
                    </p>
                </motion.div>

                {/* 검색 섹션 */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                    className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 mb-8"
                >
                    <div className="space-y-6">
                        <div className="relative">
                            <motion.input
                                type="text"
                                value={searchName}
                                onChange={(e) => setSearchName(e.target.value)}
                                onKeyPress={(e) =>
                                    e.key === "Enter" && handleSearch()
                                }
                                placeholder="이름을 입력하세요..."
                                className="w-full px-6 py-4 text-lg bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 rounded-2xl focus:border-blue-500 focus:outline-none transition-colors duration-300"
                                whileFocus={{ scale: 1.02 }}
                                disabled={isSearching}
                            />
                            <motion.div
                                className="absolute right-4 top-1/2 transform -translate-y-1/2"
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <svg
                                    className="w-6 h-6 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                            </motion.div>
                        </div>

                        <motion.button
                            onClick={handleSearch}
                            disabled={!searchName.trim() || isSearching}
                            className="w-full py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-semibold rounded-2xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                            whileHover={{
                                scale: 1.02,
                                boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                            }}
                            whileTap={{ scale: 0.98 }}
                        >
                            {isSearching ? (
                                <div className="flex items-center justify-center space-x-2">
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{
                                            duration: 1,
                                            repeat: Infinity,
                                            ease: "linear",
                                        }}
                                        className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                                    />
                                    <span>검색 중...</span>
                                </div>
                            ) : (
                                "검색하기"
                            )}
                        </motion.button>
                    </div>
                </motion.div>

                {/* 결과 섹션 */}
                {(searchResult !== null || isSearching || error) && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8"
                    >
                        {isSearching ? (
                            <div className="text-center py-8">
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{
                                        duration: 1.5,
                                        repeat: Infinity,
                                    }}
                                    className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center"
                                >
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{
                                            duration: 2,
                                            repeat: Infinity,
                                            ease: "linear",
                                        }}
                                        className="w-8 h-8 border-2 border-white border-t-transparent rounded-full"
                                    />
                                </motion.div>
                                <p className="text-lg text-gray-600 dark:text-gray-300">
                                    &ldquo;{searchName}&rdquo;에 대한 정보를
                                    찾고 있습니다...
                                </p>
                            </div>
                        ) : error ? (
                            <div className="text-center py-8">
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{
                                        type: "spring",
                                        stiffness: 150,
                                    }}
                                    className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center"
                                >
                                    <svg
                                        className="w-8 h-8 text-red-600"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                </motion.div>
                                <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                                    검색 결과를 찾을 수 없습니다
                                </h3>
                                <p className="text-gray-600 dark:text-gray-300 mb-6">
                                    {error}
                                </p>
                                <button
                                    onClick={resetSearch}
                                    className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors duration-300"
                                >
                                    다시 검색하기
                                </button>
                            </div>
                        ) : searchResult ? (
                            <div>
                                <div className="text-center mb-8">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{
                                            type: "spring",
                                            stiffness: 200,
                                            damping: 10,
                                        }}
                                    >
                                        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
                                            {searchResult.name}님의 납부 현황
                                        </h2>

                                        {/* 총 미납 금액 */}
                                        <div className="inline-block mb-6">
                                            <motion.div
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{
                                                    delay: 0.3,
                                                    type: "spring",
                                                    stiffness: 150,
                                                }}
                                                className={`px-8 py-4 rounded-2xl shadow-lg text-white ${
                                                    searchResult.totalUnpaidAmount >
                                                    0
                                                        ? "bg-gradient-to-r from-red-500 to-pink-600"
                                                        : "bg-gradient-to-r from-green-500 to-emerald-600"
                                                }`}
                                            >
                                                <span className="text-sm font-medium">
                                                    {searchResult.totalUnpaidAmount >
                                                    0
                                                        ? "미납 금액"
                                                        : "납부 완료"}
                                                </span>
                                                <div className="text-4xl font-bold">
                                                    ₩
                                                    {searchResult.totalUnpaidAmount.toLocaleString()}
                                                </div>
                                            </motion.div>
                                        </div>

                                        {/* 잔고 및 입금 정보 표시 */}
                                        <div className="text-sm text-gray-600 dark:text-gray-300 mb-6 space-y-1">
                                            <div
                                                className={
                                                    searchResult.balance < 0
                                                        ? "text-red-600 dark:text-red-400"
                                                        : ""
                                                }
                                            >
                                                현재 잔고: ₩
                                                {searchResult.balance.toLocaleString()}
                                                {searchResult.balance < 0 && (
                                                    <span className="text-xs ml-2 px-2 py-1 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 rounded">
                                                        부족 금액이 미납에
                                                        포함됨
                                                    </span>
                                                )}
                                            </div>
                                            {searchResult.lastDepositAt && (
                                                <div className="text-blue-600 dark:text-blue-400">
                                                    마지막 입금일:{" "}
                                                    {new Date(
                                                        searchResult.lastDepositAt
                                                    ).toLocaleDateString(
                                                        "ko-KR",
                                                        {
                                                            year: "numeric",
                                                            month: "long",
                                                            day: "numeric",
                                                        }
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                </div>

                                {/* 미납 내역 상세 */}
                                {searchResult.unpaidTransactions.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.5 }}
                                        className="space-y-3"
                                    >
                                        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                                            미납 내역
                                        </h3>
                                        {searchResult.unpaidTransactions
                                            .sort((a, b) => {
                                                // 오래된 기록이 위로, 최신이 아래로 (오름차순)
                                                const [yearA, monthA] =
                                                    a.month.split("-");
                                                const [yearB, monthB] =
                                                    b.month.split("-");
                                                const dateA = new Date(
                                                    +yearA,
                                                    +monthA,
                                                    1
                                                );
                                                const dateB = new Date(
                                                    +yearB,
                                                    +monthB,
                                                    1
                                                );

                                                return (
                                                    dateA.getTime() -
                                                    dateB.getTime()
                                                );
                                            })
                                            .map((transaction, index) => (
                                                <motion.div
                                                    key={
                                                        transaction.participationId
                                                    }
                                                    initial={{
                                                        opacity: 0,
                                                        x: -20,
                                                    }}
                                                    animate={{
                                                        opacity: 1,
                                                        x: 0,
                                                    }}
                                                    transition={{
                                                        delay:
                                                            0.6 + index * 0.1,
                                                    }}
                                                    className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 flex justify-between items-center"
                                                >
                                                    <div>
                                                        <div className="font-medium text-gray-800 dark:text-white">
                                                            {
                                                                transaction.serviceName
                                                            }
                                                        </div>
                                                        <div className="text-sm text-gray-500 dark:text-gray-400">
                                                            {transaction.month}{" "}
                                                            • 총 ₩
                                                            {transaction.totalAmount.toLocaleString()}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-red-600">
                                                            ₩
                                                            {transaction.shareAmount.toLocaleString()}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            내 분담금
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            ))}
                                    </motion.div>
                                )}

                                {/* 완료 메시지 */}
                                {searchResult.totalUnpaidAmount === 0 && (
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ delay: 0.5 }}
                                        className="text-center py-6"
                                    >
                                        <div className="text-lg text-green-600 font-medium">
                                            🎉 모든 요금을 납부하셨습니다!
                                        </div>
                                    </motion.div>
                                )}

                                {/* 다시 검색 버튼 */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.8 }}
                                    className="text-center mt-8"
                                >
                                    <button
                                        onClick={resetSearch}
                                        className="px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-300"
                                    >
                                        다시 검색하기
                                    </button>
                                </motion.div>
                            </div>
                        ) : null}
                    </motion.div>
                )}

                {/* 푸터 */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
                    className="text-center mt-12 space-y-4"
                >
                    <div>
                        <a
                            href="/admin/login"
                            className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-300"
                        >
                            관리자 로그인
                        </a>
                    </div>
                </motion.div>
            </motion.div>
        </div>
    );
}
