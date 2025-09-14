import { PrismaClient } from "../app/generated/prisma";

const prisma = new PrismaClient();

async function main() {
    console.log("Starting seed...");

    // 데이터베이스 초기화 (모든 데이터 삭제)
    console.log("🗑️  데이터베이스 초기화 중...");

    // 관계가 있는 테이블들을 순서대로 삭제
    await prisma.transactionParticipant.deleteMany({});
    await prisma.transaction.deleteMany({});
    await prisma.userSubscription.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.service.deleteMany({});

    console.log("✅ 기존 데이터 모두 삭제 완료");
    console.log("🌱 새로운 데이터 생성 시작...");
    console.log("");

    // 서비스 생성
    const services = await Promise.all([
        prisma.service.upsert({
            where: { name: "spotify" },
            update: {},
            create: {
                name: "spotify",
                displayName: "Spotify Premium",
                maxMembers: 6,
            },
        }),
        prisma.service.upsert({
            where: { name: "youtube" },
            update: {},
            create: {
                name: "youtube",
                displayName: "YouTube Premium",
                maxMembers: 6,
            },
        }),
    ]);

    const spotifyId = services[0].id;
    const youtubeId = services[1].id;

    console.log(
        "Services created:",
        services.map((s) => s.displayName)
    );

    const toCreateUsers = [
        ["c657c60a", 60541, [spotifyId]],
        ["JSW", 37093, [spotifyId]],
        ["무해류", 14584, [spotifyId]],
        ["HaRang", 21320, [spotifyId, youtubeId]],
        [
            "김종도탁구클럽2대오너박창규모발이식전최후의핑퐁",
            6476,
            [spotifyId, youtubeId],
        ],
        ["백선생", 0, [youtubeId]],
        ["양디코다리조림", -11677, [youtubeId]],
        ["b02cd8a9e2be2e00", 1000000000, [spotifyId, youtubeId]],
        ["94049544497025ea", 1000000000, [youtubeId]],
    ] as [string, number, string[]][];

    // 테스트 사용자 생성
    const users = await Promise.all([
        ...toCreateUsers.map(([name, balance, services]) =>
            prisma.user.upsert({
                where: { name },
                update: {},
                create: {
                    name,
                    balance,
                    subscriptions: {
                        create: services.map((serviceId) => ({
                            serviceId,
                        })),
                    },
                },
            })
        ),
    ]);

    console.log(
        "Users created:",
        users.map((u) => u.name)
    );

    const toCreateSpotifyTX = [
        ["2025-03", 16626],
        ["2025-04", 17026],
        ["2025-05", 16151],
        ["2025-06", 15722],
        ["2025-07", 15732],
        ["2025-08", 15890],
    ] as [string, number][];

    const toCreateYoutubeTX = [
        ["2025-03", 12666],
        ["2025-04", 12860],
        ["2025-05", 20745],
        ["2025-06", 22168],
        ["2025-07", 22204],
        ["2025-08", 22091],
        ["2025-09", 22040],
    ] as [string, number][];

    await Promise.all(
        toCreateSpotifyTX.map(([month, amount]) =>
            prisma.transaction.upsert({
                where: { id: services[0].id, month },
                update: {},
                create: {
                    month,
                    totalAmount: amount,
                    serviceId: services[0].id,
                    type: "SUBSCRIPTION",
                    status: "PENDING",
                    participants: {
                        create: users
                            .filter((user) =>
                                toCreateUsers.some(
                                    ([name, , serviceIds]) =>
                                        name === user.name &&
                                        serviceIds.includes(services[0].id)
                                )
                            )
                            .map((user) => ({
                                userId: user.id,
                                shareAmount: amount / 6,
                            })),
                    },
                },
            })
        )
    );

    await Promise.all(
        toCreateYoutubeTX.map(([month, amount]) =>
            prisma.transaction.upsert({
                where: { id: services[1].id, month },
                update: {},
                create: {
                    month,
                    totalAmount: amount,
                    serviceId: services[1].id,
                    type: "SUBSCRIPTION",
                    status: "PENDING",
                    participants: {
                        create: users
                            .filter((user) =>
                                toCreateUsers.some(
                                    ([name, , serviceIds]) =>
                                        name === user.name &&
                                        serviceIds.includes(services[1].id)
                                )
                            )
                            .map((user) => ({
                                userId: user.id,
                                shareAmount: amount / 6,
                            })),
                    },
                },
            })
        )
    );
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
