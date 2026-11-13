# 진행 상황 · 인수인계

마지막 갱신: 2026-11-13 · 새 컴퓨터/새 세션에서 작업을 이어갈 때 이 문서부터 읽는다.

> Claude에게: "docs/progress.md 읽고 다음 단계 이어서 해 줘"

## 1. 어디까지 했나

| 단계 | 상태 | 커밋 | 내용 |
|---|---|---|---|
| 조사·설계 | ✅ | `1cdb31b` | [research.md](research.md), [design.md](design.md) |
| M0 개발 환경 | ✅ | `1cdb31b` | Tauri 2 + React 위젯 뼈대, PocketBase 서버 폴더 |
| M1 서버 | ✅ | `d91cdbb` | 컬렉션·권한 규칙, 학교 Google 로그인, 시험 27개 통과 |
| M2 바탕화면 상주 | ✅ | `04b6b9c` | 바탕화면 고정(Win+D·탐색기 재시작 견딤), 트레이, 단일 실행, 위치 기억, 자동 시작 |
| M3 일정 보기 | ✅ | `3c8818e` | 위젯 로그인, 달력, 실시간 반영, 오프라인 캐시·자동 재연결 |
| M4 등록·수정·삭제 | ✅ | `84fb532` | 등록·수정 창, 반복(매일/주/월/년+종료일), 이 날만/전체 삭제, 10분 전 Windows 알림 |
| M5 시간표 | ✅ | `b8da9a8` | 내 시간표 표 입력, 지난 학기 복사, 교시 시각(관리자), 오늘 수업 줄·현재 교시 강조 |
| M6 안정성·배포 준비 | ✅ (일부 M7로) | `345c215` | 감시 프로세스 재시작, 로그, 전체화면 알림 보류, 화면 멈춤 감지·매일 새로 고침, 서버 주소 설정, 서명된 설치 파일·업데이트 게시 |
| M7-a 디자인 | ✅ | `0082494` | "승강장 행선 안내" 방향: 다음 일정 안내판, 노선 색 배지, 테마(자동/밝게/어둡게)·글씨 크기 설정. [DESIGN.md](../DESIGN.md), [PRODUCT.md](../PRODUCT.md) |
| **M7-b 학교 배포** | 🔄 진행 중 | `476e877` | 스크립트·절차 문서는 됨([deploy.md](deploy.md)), 실제 서버 PC 작업이 남음 — 아래 §3 |

M6에서 남은 확인 (사용자 직접 또는 M7):
- **자동 업데이트 실제 설치**: 업데이터가 `https` 주소만 허용 → **M7에서 서버를 HTTPS로 올린 뒤** 시험 (2026-11-10 결정: 내부망 http 허용 대신 HTTPS)
- **재부팅 후 자동 시작**: 설치본 등록은 확인됨(HKCU Run). 실제 재부팅은 미확인
- **전체화면·발표 중 알림 보류**: 코드만 확인, 실제 발표/게임 중 시험은 미확인

## 2. 확정된 결정

- **범위**: 순수한 일정 공유. 날씨·급식·외부 달력 연동은 넣지 않음
- **로그인**: Google 학교 계정만 (`@chunchon.gwe.hs.kr`). 동의 화면 "내부", OAuth 클라이언트 유형 "데스크톱 앱"
- **권한**: 로그인한 사람은 모두 보기·등록. 수정·삭제는 작성자 본인과 `role=admin`
- **시간표**: 1차는 선생님 본인 수업 직접 입력. 나이스 API는 반 단위만 제공해 보류 — 자동 연동 방법이 생기면 교체 (design.md §5.4)
- **버튼 독(소프트웨어 Stream Deck)**: 2차로 미룸
- **서버**: 학교/사무실 PC 1대에서 PocketBase, 내부망 전용
- **디자인**: "승강장 행선 안내" (2026-11-11 사용자 선택). 규칙은 루트 [DESIGN.md](../DESIGN.md), 값은 `desktop/src/styles/tokens.css`에만. 앰버는 "지금"에만, 분류는 노선 색+글자 배지. 이름·학교 상징은 미정

## 3. 다음 할 일: M7-b 학교 배포

완료 기준(design.md §7): 시범 사용자 1주일 사용 중 문제 없음.
**절차와 스크립트는 [deploy.md](deploy.md)에 다 있다. 남은 것은 서버 PC에서 실제로 돌려 보는 일.**

준비된 것 (2026-11-13, 코드만 — 실제 서버 PC에서는 아직 안 돌려 봄):
- `server\install-service.ps1` — 부팅 시 자동 시작(작업 스케줄러, SYSTEM, 죽으면 재실행) + 방화벽 TCP 8090, `-WithHttps`로 Caddy까지, `-Uninstall`로 되돌리기
- `server\get-caddy.ps1` + `server\Caddyfile` — HTTPS 앞단(체크섬 검증, SSE 버퍼링 끔)
- `server\backup.ps1` — PocketBase 백업 API + 다른 디스크/NAS로 복사·해시 확인, 매일 23시 작업 등록, 최근 7개만 보관
- `docs\deploy.md` — 준비·설치·HTTPS·위젯 배포·백업·서버 PC 옮기기·점검 목록·문제 해결

서버 PC에서 할 일 (순서는 deploy.md):
- **서버 PC 결정·준비**: 상시 켜 둘 PC, 절전 끄기, 고정 IP 또는 DNS 이름, 교무실 PC와 같은 망인지, V3 예외
- **설치**: clone → `get-pocketbase.ps1` → 관리자 계정을 **개발용과 다른 새 비밀번호로** → `install-service.ps1`(관리자) → Google OAuth 값 입력
- **HTTPS 방식 결정**(design.md §8-4): 가) 학교 도메인 하위 주소(DNS 관리자 협조, 선생님 PC 손 안 감) ← 먼저 시도 / 나) Caddy 내부 인증서(각 PC에 루트 인증서 `certutil -addstore`). **나)로 가면 Tauri 업데이터가 Windows 저장소의 루트를 신뢰하는지 한 대에서 꼭 먼저 시험**
- **위젯 기본 서버 주소**: `desktop/src-tauri/src/settings.rs`의 `DEFAULT_SERVER_URL`을 학교 주소로 → version 올리고 `scripts\publish-update.ps1 -ServerUrl <https 주소>`
- **백업**: `backup.ps1 -SaveCredential` → `-CopyTo`로 한 번 → `-Register`
- **앱 아이콘**: 아직 Tauri 기본 아이콘. 이름·학교 상징이 정해지면 `npx tauri icon <png>`
- **시범 사용**: 선생님 2~3명 설치 → 1주일 (deploy.md §7의 볼 것)

### M7-b 배포 스크립트 메모
- **서비스는 NSSM 대신 작업 스케줄러**로 함 — Windows 기본 기능만 쓰고 설치할 것이 없다. 부팅 트리거 + SYSTEM + `ExecutionTimeLimit = PT0S`(시간 제한 없음) + 실패 시 1분 뒤 재시작(10번)
- `install-service.ps1`은 pb_data/pb_hooks 등 경로를 `$PSScriptRoot` 기준으로 넣는다 → **저장소 폴더를 서버 PC 로컬 디스크에** 두어야 한다(네트워크 공유 금지)
- `backup.ps1`의 비밀번호는 DPAPI(`Export-Clixml`)로 `server\pb_data\backup-credential.xml`(git 제외)에 저장 → **저장한 Windows 계정만** 읽는다. 그래서 백업 작업만 그 계정(S4U)으로 돌고 서버 작업은 SYSTEM
- 백업은 `POST /api/backups`(superuser 토큰)로 서버가 직접 만들게 한다 — 실행 중 `pb_data`를 그냥 복사하면 SQLite WAL 때문에 깨질 수 있다. 복원은 관리 화면 Backups → Restore
- Caddy 호스트 이름은 머신 환경 변수 `SCHOOL_SERVER_HOST`로 넘긴다(`get-caddy.ps1`이 설정) → SYSTEM 작업에서도 보인다. Caddy는 2.10.0 핀, 릴리스 체크섬 검증
- `reverse_proxy`에 `flush_interval -1` — PocketBase 실시간(SSE)이 버퍼링되면 위젯 반영이 늦는다
- 스크립트 주석·출력은 기존 스크립트대로 영어(PowerShell 5.1이 BOM 없는 UTF-8 .ps1의 한글을 깨뜨린다). 문서는 한국어
- 검증 수준: 세 스크립트 모두 파서 통과, 작업 스케줄러 API(`New-ScheduledTask*` 설정·SYSTEM/S4U 주체)와 Caddy 2.10.0 내려받기 주소는 실제로 확인. **등록·백업·HTTPS 실행 자체는 서버 PC에서 해 봐야 한다**

### M7-a 디자인 구현 메모
- 진행: impeccable `init`(PRODUCT.md) → 방향 고르기 페이지(4안 중 "승강장 행선 안내") → 코드로 구현 → 마무리 검토·DESIGN.md. 방향 계약은 `.impeccable/surfaces/desktop-src-app-tsx.md`
- 새 파일: `components/NextBoard.tsx`(안내판·배지·범례), `SettingsSheet.tsx`, `Icon.tsx`(직접 그린 아이콘 세트), `lib/prefs.ts`(테마·글씨 크기·오늘 수업 줄, localStorage `prefs-v1`)
- 달력: Schedule-X 자체 머리글을 숨기고 우리 탐색 줄(‹ 범위 › 오늘, 월/주/일/목록) 사용 — `@schedule-x/calendar-controls`. 창이 넓어지면 Schedule-X가 주 보기로 바꾸고 탭이 따라감
- **브라우저 미리보기**: `cd desktop && npx vite --port 1420` → `http://localhost:1420/preview.html` (Tauri 대신 가짜 응답). 로그인 상태로 보려면 `desktop/.preview/session.json`에 세션(git 제외)
- 마무리 검토는 이 세션 규칙상 하위 에이전트 없이 같은 대화 안에서 수행(검토 결과: 고칠 것 3개 → 모두 해결)

### M6 구현 메모
- **감시 프로세스**(`main.rs`): 설치본은 인자 없이 실행되면 감시자가 되어 `--child`로 위젯을 띄우고, 비정상 종료 시 3초 뒤 재실행(10분에 5번 넘으면 중단). 종료 코드 0(트레이 종료·업데이트·중복 실행 인계)이면 감시자도 종료. 개발 모드(`tauri dev`)에는 감시자 없음
- 로그: `%LOCALAPPDATA%\kr.hs.gwe.chunchon.dashboard\logs\` — `widget.log`(1MB×7개), `watchdog.log`
- `health.rs`: 5초마다 `SHQueryUserNotificationState`로 전체화면·발표 감지 → `quiet-mode` 이벤트. 화면 하트비트 3분 끊기면 `reload()`
- 알림은 "시작 10분 전 ~ 끝날 때까지" 유효 → 발표 중 보류된 알림이 끝난 뒤 "진행 중"으로 표시
- 화면 오류는 `main.tsx`의 `Recover`가 잡아 30초 뒤 자동 새로 고침. 매일 04시 이후 첫 확인 때 새로 고침
- **업데이트 게시**: `scripts\publish-update.ps1 -ServerUrl <서버주소>` (먼저 `tauri.conf.json` version 올리기) → `server\pb_public\updates\`에 설치 파일+`latest.json`. 위젯은 시작 1분 뒤·매일 확인
- **서명 키**: `%USERPROFILE%\.tauri\school-schedule.key` (비밀번호 없음, 저장소 밖). **백업 필수** — 잃으면 설치된 위젯에 업데이트 불가. 공개 키는 `tauri.conf.json`에 있음
- 설치본은 `%LOCALAPPDATA%\SchoolSchedule\desktop.exe`(현재 사용자 설치, 관리자 권한 불필요). 자동 시작은 HKCU Run `SchoolSchedule`
- 현재 위젯 버전 0.1.1 (업데이트 시험으로 올림)
- PowerShell 5.1은 네이티브 프로그램의 stderr를 오류로 취급 → 빌드는 `cmd /c`로 실행

### M5 구현 메모
- `lib/timetable.ts`: `TimetableSource` 인터페이스(`load(term) → Lesson[]`) — 지금은 `manualSource`. 자동 연동은 이걸 하나 더 구현해 `syncTimetable(…, source)`로 교체
- 학기: 3~8월 `YYYY-1`, 9~12월 `YYYY-2`, 1~2월은 전년도 `-2` (`termOf`)
- 시간표·교시 시각 캐시: localStorage `timetable-cache-v1`. 로그아웃 시 일정 캐시와 함께 지움
- "오늘 수업" 줄은 *내* 다음 수업을 보여 줌(학교 다음 교시가 아님). 켜기/끄기는 localStorage `show-today-strip`
- 관리자 여부(`role`)는 로그인/시작 시 받은 값 → 바꾼 뒤엔 위젯 Ctrl+R 또는 재로그인
- `rules.test.mjs`는 실제 교시 시각과 겹치지 않게 빈 교시 번호로 시험함

### M4 구현 메모
- 반복은 rrule.js 대신 `lib/recurrence.ts`에서 직접 펼침 (FREQ·INTERVAL·UNTIL만 지원, `exdates`는 건너뛸 날짜 "YYYY-MM-DD")
- 종일 일정 저장 규칙: start·end 모두 해당 날짜 00:00(Asia/Seoul), end는 **마지막 날 포함**
- 반복 일정 수정은 시리즈 전체 수정. 한 날만 지우기는 `exdates`에 추가
- 반복 일정은 시작일이 오래돼도 받아오도록 fetch 필터에 `rrule != ""` 포함
- 알림은 30초마다 확인, 보낸 기록은 localStorage `notified-v1` (재시작해도 중복 없음). 종일 일정은 알림 없음
- Schedule-X 4는 `preact@10`이 필요 (11이 깔리면 npm ERESOLVE)

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
| 위젯 로그 | `%LOCALAPPDATA%\kr.hs.gwe.chunchon.dashboard\logs\` |
| 설치된 위젯 | `%LOCALAPPDATA%\SchoolSchedule\` |
| 업데이트 서명 키 | `%USERPROFILE%\.tauri\school-schedule.key` (백업 필수) |
| 게시된 업데이트 | `server\pb_public\updates\` (git 제외) |
| 서버 백업 (서버 PC) | `server\pb_data\backups\` + `backup.ps1 -CopyTo`로 지정한 곳 |
| 백업용 관리자 비밀번호 | `server\pb_data\backup-credential.xml` (DPAPI, git 제외) |
| 서버·HTTPS 자동 시작 작업 | 작업 스케줄러 `SchoolSchedule-Server` / `-Https` / `-Backup` |
