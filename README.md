# Tap Dash Arena (Monetization-first MVP)

모바일 세로 UX 중심의 미니게임 MVP.

## 핵심 구조
- 코어 게임 1개 집중: 45초 Survival (Tap Dash Arena)
- 메타 루프: 코인, 일일 미션, 연속 접속 스트릭
- 상점: 스킨 구매/장착
- 프리미엄($0.99) 훅: 프리미엄 스킨 라인 및 기능 확장 포인트
- 로컬 랭킹: 시즌 TOP 점수 저장

## 실행
```bash
cd /home/sin4woo2/미니게임
python3 -m http.server 8080
```

## 배포
Vercel에 정적 배포 가능.

## 결제 연동 지점
- `app.js` 의 `premiumBtn.onclick`
- TODO 주석 위치에 Stripe Checkout 세션 생성/리다이렉트 연결

## 다음 추천
1. Stripe 실결제($0.99) 연결
2. Supabase/Firebase 랭킹 API 전환
3. 광고 보상형 코인(Rewarded) 추가
4. A/B 테스트: 미션 보상량, 스킨 가격
