# 사전 조사: 바탕화면 일정 대시보드

조사일: 2026-11-03 · 별(★)·최근 커밋은 GitHub API 기준 조사 시점 값 · 확정 설계는 [design.md](design.md)

## 0. 만들 것 (요약)

> **범위: 순수한 일정 공유만.** 사람이 등록한 일정을 모두가 바탕화면에서 본다. 날씨·급식·시간표·외부 달력 연동 등 부가 기능은 넣지 않는다.

- **서버 1대**: 일정 저장 + 등록/조회 API (+ 실시간 반영)
- **등록 화면**: 사람들이 달력에 일정을 추가 (웹 페이지면 충분)
- **바탕화면 클라이언트**: 사용자 PC 바탕화면에 달력/일정을 위젯처럼 띄움 (Windows 우선)

## 1. 거의 같은 걸 이미 만든 프로젝트 (구조 참고용)

"공유 달력 + 서버 + 벽/화면에 상시 표시" 조합은 주로 **가족 대시보드** 분야에 많습니다. 학교용으로 바꾸면 우리 프로젝트와 거의 같은 구조입니다.

| 저장소 | ★ | 스택 | 참고할 점 |
|---|---|---|---|
| [MagicMirrorOrg/MagicMirror](https://github.com/MagicMirrorOrg/MagicMirror) | 24.1k | Node/Electron | 모듈형 상시 표시 대시보드의 원조. 캘린더 모듈(iCal 구독) 구조가 참고 1순위 |
| [mr-reb00t/marco](https://github.com/mr-reb00t/marco) | 23 | TS | 셀프호스팅 벽걸이 달력 + 대시보드 (브라우저 표시) |
| [onurceri/family-os](https://github.com/onurceri/family-os) | 29 | TS | 공유 달력 + "kitchen-wall display" — 등록/표시 분리 구조 |
| [caspii/dinkydash](https://github.com/caspii/dinkydash) | 99 | Python | 이미 가진 화면(TV·태블릿)에 띄우는 디지털 가족 달력 |
| [MooreSi/HomeBoard](https://github.com/MooreSi/HomeBoard) | 49 | JS | 달력·카운트다운·커스텀 레이아웃 |
| [sandydargoport/prism](https://github.com/sandydargoport/prism) | 130 | TS | 셀프호스팅 가족 대시보드, 외부 서비스 연동 |
| [pablitofernandez/FamilyNido](https://github.com/pablitofernandez/FamilyNido) | 72 | C# | 공유 달력 + **학교 일정(school agenda)** 포함 PWA |
| [mgiakalaras/RoomBoard](https://github.com/mgiakalaras/RoomBoard) | 1 | ASP.NET | **학교용** 교실 예약 + 키오스크 표시 |
| [natixco/tabby](https://github.com/natixco/tabby) | 170 | TS | 학교 시간표 데스크톱 앱 (오래됨, 2021) |

## 2. 바탕화면 위젯을 띄우는 방법 (클라이언트)

| 저장소 | ★ | 방식 | 평가 |
|---|---|---|---|
| [tauri-apps/tauri](https://github.com/tauri-apps/tauri) | 112k | Rust + 웹 UI | **추천.** 설치파일 작고(수 MB) 투명·항상 아래·트레이 창 가능. 디자인은 HTML/CSS로 자유롭게 |
| [electron/electron](https://github.com/electron/electron) | 124k | Node + 웹 UI | 가장 쉬움, 대신 무거움(100MB+) |
| [fzf404/Monit](https://github.com/fzf404/Monit) | 853 | Electron + Vue | 데스크톱 위젯 모음 — 창 설정(투명·고정) 코드 참고용 |
| [amaan-mohib/delta-widgets](https://github.com/amaan-mohib/delta-widgets) | 27 | Tauri + TS | Windows 위젯 메이커 — Tauri 위젯 창 구현 예시 |
| [alanfloyd-dev/desktop-todo-widget](https://github.com/alanfloyd-dev/desktop-todo-widget) | 20 | Tauri | Windows 바탕화면 할 일/일정 위젯 — 규모가 비슷 |
| [p32929/google-calender-widget](https://github.com/p32929/google-calender-widget) | 31 | Electron | **구글 캘린더 데스크톱 위젯** — 가장 직접적인 예시 |
| [glzr-io/zebar](https://github.com/glzr-io/zebar) | 3.1k | Tauri | 웹 기술로 작업표시줄/위젯 제작하는 도구 |
| [lively-community/lively](https://github.com/lively-community/lively) | 20k | C# | 웹페이지를 **배경화면 자체**로 띄움 (클릭 상호작용은 제한적) |
| [rainmeter/rainmeter](https://github.com/rainmeter/rainmeter) | 6.1k | C++ 스킨 | 사용자가 Rainmeter를 따로 설치해야 함 — 배포용으로 비추천 |

**결론**: Tauri 앱 하나로 "바탕화면 고정 창 + 트레이 아이콘 + 자동 시작"을 구성하고, 화면은 웹(HTML/CSS)으로 그리면 디자인을 따로 만들어 넣기 쉽습니다.

## 3. 달력 UI 라이브러리

| 저장소 | ★ | 라이선스 | 비고 |
|---|---|---|---|
| [fullcalendar/fullcalendar](https://github.com/fullcalendar/fullcalendar) | 20.7k | MIT | 업계 표준. 월/주/일 뷰, 드래그 등록. 일부 기능(리소스·타임라인)은 유료 |
| [schedule-x/schedule-x](https://github.com/schedule-x/schedule-x) | 2.6k | MIT | 최신·가벼움, 테마 커스터마이즈 쉬움 — **커스텀 디자인 입히기에 유리** |
| [vkurko/calendar](https://github.com/vkurko/calendar) | 2.3k | MIT | FullCalendar 호환 API, 리소스/타임라인 뷰가 무료 |
| [nhn/tui.calendar](https://github.com/nhn/tui.calendar) | 12.7k | MIT | 한국(NHN) 제작, 한글 친화. 단 2024년 이후 업데이트 멈춤 |
| [bigcalendar/react-big-calendar](https://github.com/bigcalendar/react-big-calendar) | 8.8k | MIT | React 전용 |

## 4. 서버 (일정 저장·공유)

| 저장소 | ★ | 비고 |
|---|---|---|
| [pocketbase/pocketbase](https://github.com/pocketbase/pocketbase) | 61.6k | **추천.** 실행파일 1개 = DB + REST API + 실시간 구독 + 로그인 + 관리자 화면. 학교 규모엔 충분 |
| [supabase/supabase](https://github.com/supabase/supabase) | 114k | Postgres 기반, 기능 많지만 셀프호스팅은 무거움 |
| [Kozea/Radicale](https://github.com/Kozea/Radicale) | 5.2k | 표준 CalDAV 서버(GPL). 폰 기본 달력·아웃룩과 바로 동기화하고 싶을 때 |
| [lennart-k/rustical](https://github.com/lennart-k/rustical) | 564 | 가벼운 CalDAV 서버 |

**PocketBase**를 쓰면 "누가 일정 등록 → 모든 PC 위젯에 즉시 반영"이 실시간 구독으로 바로 됩니다. CalDAV 서버(Radicale 등)는 외부 달력 연동용이라 순수 공유 범위에서는 필요 없습니다.

## 5. 추천 조합 (초안)

```
[등록 웹페이지]  ──┐
                   ├─▶ PocketBase 서버 (일정 DB + 실시간)
[바탕화면 위젯] ◀─┘
 Tauri + Schedule-X
```

참고 프로젝트 중에서는 MagicMirror·family-os처럼 날씨·사진·할 일까지 묶은 것이 많지만, 우리는 **달력/일정 부분 구조만** 참고합니다. (나이스 API 연동은 범위에서 제외)

## 6. 기능 목록 (초안, 2026-11-03 요구사항 반영)

### A. 위젯 상주 · 안정성
- 바탕화면 고정 창 (항상 아래 / 항상 위 / 일반 전환), 투명·테두리 없음, 작업표시줄에 안 보임
- 위치·크기 기억, 모서리 자석 붙기, 멀티 모니터·DPI 대응, 잠금(클릭 통과) 모드
- 트레이 아이콘 메뉴, Windows 시작 시 자동 실행
- 단일 인스턴스 (중복 실행 방지)
- 오프라인 캐시: 서버가 끊겨도 마지막 일정 표시, 재연결 시 자동 동기화
- 크래시 시 자동 재시작 + 로그 파일, 자동 업데이트 (Tauri updater)
- 저사양 모드: 전체화면 앱/게임 실행 중 렌더링 일시정지

### B. 일정 공유 (핵심)
- 월/주/일/목록(오늘·다가오는 일정) 보기
- 일정 등록·수정·삭제 (제목, 날짜·시간, 종일, 장소, 메모, 색상/분류)
- 반복 일정, 실시간 반영 (등록 즉시 모든 PC에 표시)
- 권한: 보기 전용 / 등록 가능 / 관리자, 그룹(반·부서)별 달력
- 일정 시작 전 알림 (Windows 토스트)

### C. 시간표 (가능하면)
- 요일×교시 시간표를 직접 입력, 현재 교시·다음 교시 강조
- 확장 옵션: 나이스 API로 학교 시간표 자동 불러오기

### D. 버튼 독 (소프트웨어 Stream Deck)
- 아이콘 버튼 격자, 버튼 개수·크기·배치 변경
- 버튼 동작: 프로그램 실행, 파일/폴더 열기, 웹사이트 열기, 단축키 보내기, 여러 동작 연속 실행(매크로)
- 아이콘·이름·색 지정, 실행 파일에서 아이콘 자동 추출, 드래그로 순서 변경
- 페이지/폴더로 버튼 묶기, 프로필 전환
- 설정 내보내기/가져오기 (다른 PC로 복사)
- 참고: [Macro-Deck-App/Macro-Deck](https://github.com/Macro-Deck-App/Macro-Deck) ★1.7k (Apache-2.0, 가장 비슷), [bitfocus/companion](https://github.com/bitfocus/companion) ★2.4k, [nekename/OpenDeck](https://github.com/nekename/OpenDeck) ★2.4k

### E. 꾸미기
- 위젯 배치 편집 (달력·시간표·독 영역 켜기/끄기, 크기 조절)
- 테마(라이트/다크/사용자 색), 투명도, 글꼴 크기

## 7. 1차 버전 범위 (2026-11-03 확정)

| 항목 | 결정 |
|---|---|
| 서버 | 학교/사무실 내부 PC 한 대에서 PocketBase 실행 (같은 네트워크 안에서만 접속) |
| 등록 권한 | **모두 등록.** 사용자마다 계정 생성. 본인 일정만 수정·삭제, 관리자는 전체 |
| 시간표 | **1차 포함, 본인 수업 직접 입력.** (나이스는 반 단위만 제공해 보류, 자동 연동 방법이 생기면 교체) |
| 버튼 독 | **2차로 미룸** |

### 1차에 들어가는 것
- **A 위젯 상주·안정성 전부**: 바탕화면 고정, 위치 기억, 트레이, 자동 시작, 중복 실행 방지, 오프라인 캐시, 크래시 재시작, 전체화면 앱 감지 시 일시정지
- **B 일정 공유 전부**: 월/주/일/목록, 등록·수정·삭제, 반복, 실시간 반영, 알림
- **C 시간표**: 본인 수업 직접 입력 + 현재 교시 강조
- **E 꾸미기 기본**: 테마, 투명도, 영역 켜기/끄기

### 2차로 미루는 것
- D 버튼 독 전체, 그룹(반·부서)별 달력

### 확인 필요
- ~~나이스 API 키~~ → 시간표 직접 입력으로 바뀌어 1차에는 불필요
- 계정 가입 방식 → **학교 계정(@chunchon.gwe.hs.kr)으로 로그인** 방향 (2026-11-03)
  - DNS 확인 결과 이 도메인은 **Google Workspace**(메일 MX 1순위)와 **Microsoft 365**(관리형 테넌트) 둘 다 연결돼 있음
  - **결정: Google 로그인 사용** (선생님들이 주로 쓰는 계정)
  - PocketBase가 Google·Microsoft OAuth2 로그인을 기본 지원 → 별도 비밀번호 없이 "학교 계정으로 로그인", 서버에서 이메일이 `@chunchon.gwe.hs.kr`인지 검사해 외부인 차단
  - 바탕화면 앱은 "데스크톱 앱용 OAuth" (localhost로 돌아오는 방식)를 쓰므로 서버가 학교 내부 IP여도 문제없음
  - **학교 계정 관리자 확인 필요**: 앱 등록(Google Cloud 프로젝트 또는 Azure 앱 등록)은 개인도 가능하지만, 학교 관리 콘솔에서 외부 앱 접근을 막아 두었으면 관리자 승인이 필요
- 서버 PC가 꺼지면 위젯은 캐시만 보여 줌 → 서버 PC는 상시 켜 둬야 함

## 8. 받은 스킬 저장소 11개 평가

| 저장소 | 이 프로젝트에 필요? | 이유 |
|---|---|---|
| **pbakaus/impeccable** | ✅ 추천 | UI 디자인 리뷰·다듬기(`critique`, `polish`, `audit`) + AI스러운 디자인 자동 감지. "디자인 따로 만들어 넣기"와 직결 |
| **Leonxlnx/taste-skill** | ✅ 추천 (택1 고려) | v2.1부터 **대시보드·앱 화면 전용 모드**. 디자인 방향을 정하고 브라우저로 직접 검사 |
| DietrichGebert/ponytail | △ 선택 | 코드 최소화 성향 + 리뷰/감사 명령. 모든 세션에 상시 개입하는 훅 + 작업 통계 수집 |
| cloudflare/security-audit-skill | △ 나중에 | 서버 공개 직전 보안 점검용. 지금 단계엔 이릅니다 |
| affaan-m/ECC | ✕ | 하네스 전체를 바꾸는 대형 설정 묶음. 이 규모 프로젝트엔 과함 |
| Panniantong/Agent-Reach | ✕ | 트위터·레딧 등 웹 검색용. 개발과 무관 |
| heygen-com/hyperframes | ✕ | HTML → 동영상 렌더링 |
| debpalash/VoiceStudio | ✕ | 음성 합성/클로닝 |
| NationalSecurityAgency/ghidra | ✕ | 리버스 엔지니어링 도구 |
| tashfeenahmed/freellmapi | ✕ | 무료 LLM API 프록시 (개인 실험용 명시) |
| deepseek-ai/DeepInfer | ✕ | LLM 추론 서버 (GPU 필요) |
