# dashboards_school

학교 선생님들이 일정을 등록하면 모든 선생님 PC 바탕화면 위젯에 바로 보이는 일정 공유 프로그램.

- **진행 상황·인수인계: [docs/progress.md](docs/progress.md)** ← 이어서 작업할 때 여기부터
- 설계: [docs/design.md](docs/design.md)
- 사전 조사: [docs/research.md](docs/research.md)

## 구성

| 폴더 | 내용 |
|---|---|
| `desktop/` | 바탕화면 위젯 (Tauri 2 + React + TypeScript) |
| `server/` | 일정 서버 (PocketBase) |

## 개발 환경

필요: Node 20+, Rust (MSVC), Visual Studio C++ 빌드 도구, WebView2 (Windows 11 기본 포함)

```powershell
# 서버: PocketBase 내려받기 (체크섬 검증) 후 실행
.\server\get-pocketbase.ps1
.\server\bin\pocketbase.exe serve --dir server\pb_data --migrationsDir server\pb_migrations --hooksDir server\pb_hooks --publicDir server\pb_public
```

```powershell
# 위젯: 개발 모드 실행
cd desktop
npm install
npm run tauri dev
```

서버 관리자 화면: http://127.0.0.1:8090/_/ · Google 로그인 설정: [docs/google-oauth-setup.md](docs/google-oauth-setup.md)

```powershell
# 서버 권한 규칙 시험 (서버 실행 중, 관리자 계정 필요. 테스트 사용자를 만들고 지움)
$env:SU_EMAIL='관리자이메일'; $env:SU_PASS='관리자비밀번호'
node server\tests\rules.test.mjs
```
