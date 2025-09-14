"use client";

import { useState } from "react";
import { motion } from "motion/react";

interface Transaction {
    id: string;
    totalAmount: number;
    month: string;
    status: string;
    description: string;
    createdAt?: string;
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

interface Service {
    id: string;
    name: string;
    displayName: string;
    maxMembers: number;
    currentMembers: number;
    availableSlots: number;
}

export default function TransactionsTab({
    transactions,
    services,
    onCreateTransaction,
    onRefresh,
}: {
    transactions: Transaction[];
    services: Service[];
    onCreateTransaction: (
        serviceId: string,
        totalAmount: number,
        month: string
    ) => void;
    onRefresh: () => void;
}) {
    const [newTransaction, setNewTransaction] = useState({
        serviceId: "",
        totalAmount: "",
        month: new Date().toISOString().slice(0, 7), // YYYY-MM
    });
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState<string | null>(null);
    const [isProcessingAll, setIsProcessingAll] = useState(false);
    const [processingProgress, setProcessingProgress] = useState<{
        current: number;
        total: number;
        currentTransaction: string;
    } | null>(null);

    const handleCreateTransaction = (e: React.FormEvent) => {
        e.preventDefault();
        onCreateTransaction(
            newTransaction.serviceId,
            parseInt(newTransaction.totalAmount),
            newTransaction.month
        );
        setNewTransaction({
            serviceId: "",
            totalAmount: "",
            month: new Date().toISOString().slice(0, 7),
        });
    };

    const handleDeleteTransaction = async (transactionId: string) => {
        // 해당 거래 정보 찾기
        const transaction = transactions.find((t) => t.id === transactionId);
        const paidParticipants =
            transaction?.participants.filter(
                (p) => p.paymentStatus === "PAID"
            ) || [];

        let confirmMessage = "이 거래를 삭제하시겠습니까?\n\n";

        if (paidParticipants.length > 0) {
            const totalRefund = paidParticipants.reduce(
                (sum, p) => sum + p.shareAmount,
                0
            );
            confirmMessage += `⚠️ 이미 결제한 사용자가 ${paidParticipants.length}명 있습니다.\n`;
            confirmMessage += `총 ₩${totalRefund.toLocaleString()}이 환불됩니다:\n\n`;
            paidParticipants.forEach((p) => {
                confirmMessage += `• ${
                    p.user.name
                }: ₩${p.shareAmount.toLocaleString()}\n`;
            });
            confirmMessage += "\n계속하시겠습니까?";
        } else {
            confirmMessage += "이 작업은 되돌릴 수 없습니다.";
        }

        if (!confirm(confirmMessage)) {
            return;
        }

        setIsDeleting(transactionId);

        try {
            const response = await fetch(
                `/api/transaction?id=${transactionId}`,
                {
                    method: "DELETE",
                }
            );

            if (response.ok) {
                const result = await response.json();
                onRefresh();

                let message = "거래가 성공적으로 삭제되었습니다!";

                if (result.refundInfo && result.refundInfo.refundedCount > 0) {
                    message += `\n\n💰 환불 처리 완료:`;
                    message += `\n• 환불 대상: ${result.refundInfo.refundedCount}명`;
                    message += `\n• 총 환불 금액: ₩${result.refundInfo.totalRefundedAmount.toLocaleString()}`;
                    message += `\n\n환불 상세:`;
                    result.refundInfo.refundedUsers.forEach((user: any) => {
                        message += `\n• ${
                            user.userName
                        }: ₩${user.refundedAmount.toLocaleString()}`;
                    });
                }

                alert(message);
            } else {
                const error = await response.json();
                alert(`거래 삭제 실패: ${error.error}`);
            }
        } catch (error) {
            console.error("Error deleting transaction:", error);
            alert("거래 삭제 중 오류가 발생했습니다.");
        } finally {
            setIsDeleting(null);
        }
    };

    const handleProcessPayments = async (transactionId: string) => {
        if (
            !confirm(
                "이 거래의 결제를 자동으로 처리하시겠습니까?\n잔고가 충분한 사용자는 자동으로 결제되고, 부족한 사용자는 미납 상태로 유지됩니다."
            )
        ) {
            return;
        }

        setIsProcessing(transactionId);

        try {
            const response = await fetch(
                `/api/transaction?id=${transactionId}&action=process_payments`,
                {
                    method: "PATCH",
                }
            );

            if (response.ok) {
                const result = await response.json();
                onRefresh();

                // 결과 메시지 생성
                const { summary, results } = result;
                let message = `결제 처리 완료!\n\n`;
                message += `총 ${summary.totalParticipants}명 중:\n`;
                message += `✅ 결제 완료: ${summary.paidCount}명\n`;
                message += `⏳ 미납: ${summary.pendingCount}명\n\n`;

                if (results.length > 0) {
                    message += "상세 결과:\n";
                    results.forEach((result: any) => {
                        const status =
                            result.status === "paid"
                                ? "✅"
                                : result.status === "already_paid"
                                ? "✅"
                                : "❌";
                        message += `${status} ${result.userName}: ${result.message}\n`;
                    });
                }

                alert(message);
            } else {
                const error = await response.json();
                alert(`결제 처리 실패: ${error.error}`);
            }
        } catch (error) {
            console.error("Error processing payments:", error);
            alert("결제 처리 중 오류가 발생했습니다.");
        } finally {
            setIsProcessing(null);
        }
    };

    const handleProcessAllTransactions = async () => {
        // 처리 가능한 거래들만 필터링 (PAID 상태가 아닌 것들)
        const pendingTransactions = transactions.filter(
            (t) => t.status !== "PAID"
        );

        if (pendingTransactions.length === 0) {
            alert("처리할 거래가 없습니다. 모든 거래가 이미 완료되었습니다.");
            return;
        }

        const confirmMessage =
            `총 ${pendingTransactions.length}개의 거래를 순차적으로 처리하시겠습니까?\n\n` +
            `처리될 거래들:\n` +
            pendingTransactions
                .map((t) => `• ${t.service.displayName} (${t.month})`)
                .join("\n") +
            `\n\n각 거래마다 잔고가 충분한 사용자는 자동으로 결제되고,\n부족한 사용자는 미납 상태로 유지됩니다.`;

        if (!confirm(confirmMessage)) {
            return;
        }

        setIsProcessingAll(true);
        setProcessingProgress({
            current: 0,
            total: pendingTransactions.length,
            currentTransaction: "",
        });

        const results = [];
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < pendingTransactions.length; i++) {
            const transaction = pendingTransactions[i];

            setProcessingProgress({
                current: i + 1,
                total: pendingTransactions.length,
                currentTransaction: `${transaction.service.displayName} (${transaction.month})`,
            });

            try {
                const response = await fetch(
                    `/api/transaction?id=${transaction.id}&action=process_payments`,
                    {
                        method: "PATCH",
                    }
                );

                if (response.ok) {
                    const result = await response.json();
                    results.push({
                        transaction: transaction,
                        success: true,
                        result: result,
                    });
                    successCount++;
                } else {
                    const error = await response.json();
                    results.push({
                        transaction: transaction,
                        success: false,
                        error: error.error,
                    });
                    errorCount++;
                }
            } catch (error) {
                console.error(
                    `Error processing transaction ${transaction.id}:`,
                    error
                );
                results.push({
                    transaction: transaction,
                    success: false,
                    error: "네트워크 오류",
                });
                errorCount++;
            }

            // 각 거래 처리 후 잠시 대기 (서버 부하 방지)
            if (i < pendingTransactions.length - 1) {
                await new Promise((resolve) => setTimeout(resolve, 500));
            }
        }

        // 처리 완료 후 데이터 새로고침
        onRefresh();

        // 결과 메시지 생성
        let message = `모든 거래 처리 완료!\n\n`;
        message += `총 ${pendingTransactions.length}개 거래 중:\n`;
        message += `✅ 성공: ${successCount}개\n`;
        if (errorCount > 0) {
            message += `❌ 실패: ${errorCount}개\n`;
        }
        message += `\n상세 결과:\n`;

        results.forEach((result, index) => {
            const status = result.success ? "✅" : "❌";
            const transaction = result.transaction;
            message += `${status} ${transaction.service.displayName} (${transaction.month})`;

            if (result.success && result.result.summary) {
                message += ` - 결제: ${result.result.summary.paidCount}명, 미납: ${result.result.summary.pendingCount}명\n`;
            } else if (!result.success) {
                message += ` - 오류: ${result.error}\n`;
            } else {
                message += `\n`;
            }
        });

        alert(message);

        setIsProcessingAll(false);
        setProcessingProgress(null);
    };

    return (
        <div className="space-y-6">
            {/* 새 거래 생성 */}
            <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    새 거래 추가
                </h3>
                <form
                    onSubmit={handleCreateTransaction}
                    className="grid grid-cols-1 md:grid-cols-4 gap-4"
                >
                    <select
                        value={newTransaction.serviceId}
                        onChange={(e) =>
                            setNewTransaction({
                                ...newTransaction,
                                serviceId: e.target.value,
                            })
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        required
                    >
                        <option value="">서비스 선택</option>
                        {services.map((service) => (
                            <option key={service.id} value={service.id}>
                                {service.displayName}
                            </option>
                        ))}
                    </select>
                    <input
                        type="number"
                        placeholder="실제 결제 금액"
                        value={newTransaction.totalAmount}
                        onChange={(e) =>
                            setNewTransaction({
                                ...newTransaction,
                                totalAmount: e.target.value,
                            })
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        min="1"
                        required
                    />
                    <input
                        type="month"
                        value={newTransaction.month}
                        onChange={(e) =>
                            setNewTransaction({
                                ...newTransaction,
                                month: e.target.value,
                            })
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                        required
                    />
                    <button
                        type="submit"
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200"
                    >
                        거래 생성
                    </button>
                </form>
            </div>

            {/* 거래 목록 */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-900">
                            거래 목록
                        </h3>
                        <button
                            onClick={handleProcessAllTransactions}
                            disabled={
                                isProcessingAll ||
                                transactions.filter((t) => t.status !== "PAID")
                                    .length === 0
                            }
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-2"
                        >
                            {isProcessingAll ? (
                                <>
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{
                                            duration: 1,
                                            repeat: Infinity,
                                            ease: "linear",
                                        }}
                                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                                    />
                                    <span>처리 중...</span>
                                </>
                            ) : (
                                <>
                                    <span>⚡</span>
                                    <span>모든 거래 처리</span>
                                </>
                            )}
                        </button>
                    </div>

                    {/* 진행 상황 표시 */}
                    {processingProgress && (
                        <div className="mt-4 p-3 bg-purple-50 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-purple-700">
                                    처리 중:{" "}
                                    {processingProgress.currentTransaction}
                                </span>
                                <span className="text-sm text-purple-600">
                                    {processingProgress.current} /{" "}
                                    {processingProgress.total}
                                </span>
                            </div>
                            <div className="w-full bg-purple-200 rounded-full h-2">
                                <div
                                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                                    style={{
                                        width: `${
                                            (processingProgress.current /
                                                processingProgress.total) *
                                            100
                                        }%`,
                                    }}
                                ></div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    서비스
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    월
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    총 금액
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    참여자
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    상태
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    작업
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {transactions
                                .sort((a, b) => {
                                    // 최신 거래가 아래에 오도록 정렬 (오름차순)
                                    const [yearA, monthA] = a.month.split("-");
                                    const [yearB, monthB] = b.month.split("-");
                                    const dateA = new Date(+yearA, +monthA, 1);
                                    const dateB = new Date(+yearB, +monthB, 1);
                                    return dateA.getTime() - dateB.getTime();
                                })
                                .map((transaction) => (
                                    <tr key={transaction.id}>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {
                                                    transaction.service
                                                        .displayName
                                                }
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {transaction.description}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {transaction.month}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                            ₩
                                            {transaction.totalAmount.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {transaction.participants.length}명
                                            <div className="text-xs">
                                                {transaction.participants.map(
                                                    (p) => (
                                                        <span
                                                            key={p.id}
                                                            className={`inline-block mr-1 ${
                                                                p.paymentStatus ===
                                                                "PAID"
                                                                    ? "text-green-600"
                                                                    : "text-red-600"
                                                            }`}
                                                        >
                                                            {p.user.name}
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                                    transaction.status ===
                                                    "PAID"
                                                        ? "bg-green-100 text-green-800"
                                                        : "bg-yellow-100 text-yellow-800"
                                                }`}
                                            >
                                                {transaction.status === "PAID"
                                                    ? "완료"
                                                    : "대기"}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={() =>
                                                        handleProcessPayments(
                                                            transaction.id
                                                        )
                                                    }
                                                    disabled={
                                                        isProcessing ===
                                                            transaction.id ||
                                                        transaction.status ===
                                                            "PAID" ||
                                                        isProcessingAll
                                                    }
                                                    className="text-blue-600 hover:text-blue-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                                >
                                                    {isProcessing ===
                                                    transaction.id ? (
                                                        <motion.div
                                                            animate={{
                                                                rotate: 360,
                                                            }}
                                                            transition={{
                                                                duration: 1,
                                                                repeat: Infinity,
                                                                ease: "linear",
                                                            }}
                                                            className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full inline-block"
                                                        />
                                                    ) : transaction.status ===
                                                      "PAID" ? (
                                                        "완료됨"
                                                    ) : (
                                                        "결제처리"
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() =>
                                                        handleDeleteTransaction(
                                                            transaction.id
                                                        )
                                                    }
                                                    disabled={
                                                        isDeleting ===
                                                            transaction.id ||
                                                        isProcessingAll
                                                    }
                                                    className="text-red-600 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                                >
                                                    {isDeleting ===
                                                    transaction.id ? (
                                                        <motion.div
                                                            animate={{
                                                                rotate: 360,
                                                            }}
                                                            transition={{
                                                                duration: 1,
                                                                repeat: Infinity,
                                                                ease: "linear",
                                                            }}
                                                            className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full inline-block"
                                                        />
                                                    ) : (
                                                        "삭제"
                                                    )}
                                                </button>
                                            </div>
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
