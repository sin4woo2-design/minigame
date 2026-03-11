# Minigame MVP

글로벌 무료 미니게임 MVP (웹)

## 포함 기능
- 미니게임 3종
  - Tap Dash (반응속도)
  - Memory Flip (카드 짝맞추기)
  - Color Rush (색상 판단)
- 공통 UI (게임 전환, 프로필, 테마)
- 점수 저장 (localStorage)
- 기본 랭킹 (로컬 디바이스 기준)
- 결제 훅 (백엔드 연동 포인트 + 데모 언락)
- 스킨/테마 시스템

## 실행
```bash
cd /home/sin4woo2/미니게임
python3 -m http.server 8080
# 브라우저: http://localhost:8080
```

## 결제 훅 연동
`app.js`의 `PAYMENT_CONFIG` 수정:
- `checkoutEndpoint`: 서버 결제 세션 생성 API
- `verifyEndpoint`: 결제 완료 검증 API

현재는 데모를 위해 `Demo Unlock ($1)` 버튼으로 프리미엄을 즉시 활성화 가능.

## 다음 단계
- Stripe Checkout 실제 연동
- 서버 DB 기반 글로벌 랭킹
- 소셜/친구코드 대전
