# FamilyFare - 구독 서비스 요금 조회 시스템

FamilyFare는 가족이나 친구들과 함께 구독 서비스를 공유할 때 각자가 납부해야 할 금액을 조회할 수 있는 웹 애플리케이션입니다.

## 🚀 기능

-   **사용자 조회**: 이름으로 사용자 검색 및 미납 금액 확인
-   **구독 관리**: Netflix, Spotify 등 구독 서비스 관리
-   **요금 계산**: 구독료를 인원수로 나눈 개인별 납부 금액 자동 계산
-   **거래 내역**: 월별 결제 내역 및 상태 관리
-   **아름다운 UI**: Tailwind CSS와 Framer Motion을 활용한 모던한 디자인

## 🛠️ 기술 스택

-   **Frontend**: Next.js 15, React 19, TypeScript
-   **Styling**: Tailwind CSS 4
-   **Animation**: Framer Motion
-   **Database**: PostgreSQL + Prisma ORM
-   **API**: Next.js API Routes

## 📦 설치 및 설정

### 1. 의존성 설치

```bash
pnpm install
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/familyfare?schema=public"

# Security
ADMIN_PASSWORD="xxxxxxxxxxxxxxxxxx"
JWT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

### 3. 데이터베이스 설정

```bash
# Prisma 클라이언트 생성
pnpm db:generate

# 데이터베이스 마이그레이션
pnpm db:migrate

# 초기 데이터 시드
pnpm db:seed
```

### 4. 개발 서버 실행

```bash
pnpm dev
```

[http://localhost:3000](http://localhost:3000)에서 애플리케이션을 확인할 수 있습니다.

## 📊 데이터베이스 스키마

### 주요 모델

-   **User**: 사용자 정보 (이름, 연락처, 잔고)
-   **Service**: 구독 서비스 정보 (Netflix, Spotify 등)
-   **UserSubscription**: 사용자-서비스 구독 관계
-   **Transaction**: 거래 내역 (월별 결제 정보)

### 관계

-   User ↔ UserSubscription ↔ Service (다대다)
-   User → Transaction (일대다)
-   Service → Transaction (일대다)

## 🔗 API 엔드포인트

### User API (`/api/user`)

-   `GET ?name=이름`: 사용자 조회 및 미납 내역
-   `POST`: 새 사용자 생성

### Transaction API (`/api/transaction`)

-   `GET ?id=거래ID`: 특정 거래 조회
-   `GET ?userId=사용자ID&month=2025-01`: 거래 목록 조회
-   `POST`: 새 거래 생성
-   `PATCH`: 거래 상태 업데이트

### Service API (`/api/service`)

-   `GET`: 서비스 목록 조회
-   `GET ?id=서비스ID`: 특정 서비스 조회
-   `POST`: 새 서비스 생성

### Subscription API (`/api/subscription`)

-   `GET ?userId=사용자ID`: 구독 목록 조회
-   `POST`: 새 구독 생성
-   `DELETE`: 구독 취소

## 🎨 UI 컴포넌트

-   **검색창**: 사용자 이름 입력 및 검색
-   **결과 표시**: 납부할 금액을 시각적으로 표시
-   **애니메이션**: 검색 중 로딩 애니메이션
-   **반응형 디자인**: 모바일과 데스크톱 모두 지원

## 📝 사용 방법

1. 메인 페이지에서 이름을 입력합니다
2. 검색 버튼을 클릭하거나 Enter 키를 누릅니다
3. 해당 사용자의 납부할 금액이 표시됩니다
4. "다시 검색하기" 버튼으로 새로운 검색을 할 수 있습니다

## 🧪 개발용 명령어

```bash
# 개발 서버 실행
pnpm dev

# Prisma Studio (데이터베이스 GUI)
pnpm db:studio

# 데이터베이스 초기화
pnpm db:reset

# 린트 검사
pnpm lint

# 프로덕션 빌드
pnpm build
```

## 📄 라이선스

이 프로젝트는 MIT 라이선스를 따릅니다.
