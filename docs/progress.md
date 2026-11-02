# 진행 상황 · 인수인계

마지막 갱신: 2026-11-03 · 새 컴퓨터/새 세션에서 작업을 이어갈 때 이 문서부터 읽는다.

> Claude에게: "docs/progress.md 읽고 다음 단계 이어서 해 줘"

## 1. 어디까지 했나

| 단계 | 상태 | 커밋 | 내용 |
|---|---|---|---|
| 조사·설계 | ✅ | `1cdb31b` | [research.md](research.md), [design.md](design.md) |
| M0 개발 환경 | ✅ | `1cdb31b` | Tauri 2 + React 위젯 뼈대, PocketBase 서버 폴더 |
| M1 서버 | ✅ | `d91cdbb` | 컬렉션·권한 규칙, 학교 Google 로그인, 시험 27개 통과 |
| M2 바탕화면 상주 | ✅ | `04b6b9c` | 바탕화면 고정(Win+D·탐색기 재시작 견딤), 트레이, 단일 실행, 위치 기억, 자동 시작 |
| M3 일정 보기 | ✅ | `3c8818e` | 위젯 로그인, 달력, 실시간 반영, 오프라인 캐시·자동 재연결 |
| **M4 등록·수정·삭제** | ⏭ 다음 | | 아래 §3 |
| M5 시간표 | | | 본인 수업 직접 입력 + 교시 시각 |
| M6 안정성·배포 | | | 크래시 재시작, 전체화면 감지, 로그, 자동 업데이트, 설치 파일 |
| M7 디자인·배포 | | | 디자인 적용, 학교 서버 PC 배포, 시범 사용 |

M2 중 **재부팅 후 자동 시작**은 설치 파일이 있어야 시험 가능 → M6에서 확인.

## 2. 확정된 결정

- **범위**: 순수한 일정 공유. 날씨·급식·외부 달력 연동은 넣지 않음
- **로그인**: Google 학교 계정만 (`@chunchon.gwe.hs.kr`). 동의 화면 "내부", OAuth 클라이언트 유형 "데스크톱 앱"
- **권한**: 로그인한 사람은 모두 보기·등록. 수정·삭제는 작성자 본인과 `role=admin`
- **시간표**: 1차는 선생님 본인 수업 직접 입력. 나이스 API는 반 단위만 제공해 보류 — 자동 연동 방법이 생기면 교체 (design.md §5.4)
- **버튼 독(소프트웨어 Stream Deck)**: 2차로 미룸
- **서버**: 학교/사무실 PC 1대에서 PocketBase, 내부망 전용
- **디자인**: 사용자가 따로 만들어 넣음. 색·글꼴·간격은 `desktop/src/styles/tokens.css`에만 둔다. 현재 화면은 임시 디자인

## 3. 다음 할 일: M4

완료 기준(design.md §7): 본인 일정만 수정 가능, 반복 일정 표시, 10분 전 알림.

- 등록 창: `＋` 버튼 또는 날짜 더블클릭 → 제목, 날짜·시간, 종일, 장소, 메모, 분류, 반복
- 상세 시트(`EventDetail.tsx`)에 본인/관리자일 때 수정·삭제 버튼
- 반복: `events.rrule`(RRULE 문자열) + `exdates`. 화면에서 rrule.js로 펼쳐 Schedule-X에 넣기
- 종일 일정 저장 규칙: start·end 모두 해당 날짜 00:00(Asia/Seoul), end는 **마지막 날 포함** (`lib/calendar.ts`가 이 규칙으로 표시함)
- 알림: `tauri-plugin-notification`, 캐시된 일정 기준 시작 10분 전. 일정이 바뀌면 다시 계산
- 서버 규칙은 이미 준비됨 (작성자 강제·관리자 예외·종료<시작 거부)

## 4. 새 컴퓨터 세팅 순서

1. 설치: Git, Node 20+, Rust(MSVC, `rustup`), Visual Studio C++ 빌드 도구. WebView2는 Windows 11 기본 포함
2. `git clone https://github.com/HOTS-GG/dashboards_school.git`
3. 서버
   ```powershell
   .\server\get-pocketbase.ps1        # 실행 파일 받기 (체크섬 검증)
   .\server\bin\pocketbase.exe superuser upsert <이메일> <8자 이상 비밀번호> --dir server\pb_data
   .\server\bin\pocketbase.exe serve --http 127.0.0.1:8090 --dir server\pb_data --migrationsDir server\pb_migrations --hooksDir server\pb_hooks --publicDir server\pb_public
   ```
   - 첫 실행 시 마이그레이션이 테이블·규칙·Google 로그인 켜기까지 자동 적용
   - **V3 백신이 `pocketbase.exe`를 막으면** V3 예외에 `server\bin` 추가 (증상: `Access is denied`)
4. Google 로그인: 관리 화면 http://127.0.0.1:8090/_/ → users → 설정 → OAuth2 → Google에 클라이언트 ID·보안 비밀번호 입력 (값은 Google Cloud 콘솔 → Google Auth Platform → 클라이언트에서 확인). 자세히: [google-oauth-setup.md](google-oauth-setup.md)
5. 본인을 앱 관리자로: 위젯에서 한 번 로그인 → 관리 화면 users → 본인 → `role = admin`
6. 위젯: `cd desktop` → `npm install` → `npm run tauri dev`
7. 디자인 스킬 훅·엔진(선택): `npx impeccable install -y --providers=claude --scope=project` (스킬 문서는 저장소에 있음, 엔진·훅 설정은 PC별)
8. 확인: 서버 실행 중에 `node server\tests\rules.test.mjs` (환경변수 `SU_EMAIL`, `SU_PASS` 필요) → 27/27

## 5. 알아 둘 함정

- **Windows에서 PocketBase는 `pb_hooks`를 바꿔도 자동 재시작 안 됨** → 서버를 직접 껐다 켜기. 마이그레이션도 서버 시작 시 적용
- 관리 화면에서 컬렉션을 바꾸면 PocketBase가 `server/pb_migrations/`에 **자동 마이그레이션 파일**을 만든다. 커밋 전에 내용 확인 (OAuth 비밀번호는 들어가지 않음)
- `onRecordAuthWithOAuth2Request` 훅에서 `e.oAuth2User`를 읽다 오류가 났음 → 도메인 검사는 `onRecordCreate`(users)에서 함
- 개발 중 `Port 1420 is already in use` → 이전 세션의 Vite가 남은 것. 해당 node 프로세스 종료
- PowerShell P/Invoke에서 `$null`을 문자열 인자로 넘기면 `""`가 됨 → `[NullString]::Value` 사용
- 위젯 개발 모드(`tauri dev`)는 앱을 강제 종료하면 Vite도 같이 꺼짐
- 서버 관리자(superuser)와 앱 사용자(users)는 **별개 계정**. 같은 이메일이어도 앱 권한은 users의 `role`로 정해짐

## 6. 위치 정리

| 무엇 | 어디 |
|---|---|
| 위젯 설정(항상 위·잠금·서버 주소) | `%APPDATA%\kr.hs.gwe.chunchon.dashboard\settings.json` |
| 위젯 창 위치 | 같은 폴더 `.window-state.json` |
| 위젯 로그인 정보 | Windows 자격 증명 관리자 (`kr.hs.gwe.chunchon.dashboard`) |
| 위젯 오프라인 캐시 | WebView2 localStorage (`events-cache-v1`) |
| 서버 DB·계정·OAuth 설정 | `server\pb_data` (git 제외) |
