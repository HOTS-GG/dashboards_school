# 학교 배포 (M7-b)

서버 PC 한 대를 상시 켜 두고, 선생님 PC에 위젯을 설치하는 절차. 스크립트는 저장소에 있고,
이 문서의 순서대로 서버 PC에서 한 번만 실행한다.

- 진행 상황: [progress.md](progress.md) · 설계: [design.md](design.md)
- **아직 실제 학교 서버에서 돌려 보지 않은 절차다.** 서버 PC에서 처음 실행할 때는 §8 점검 목록으로 확인한다.

## 1. 먼저 확인할 것

| 확인 | 왜 |
|---|---|
| 상시 켜 둘 PC (절전·최대 절전 끄기) | 꺼지면 모든 위젯이 오프라인 표시로 바뀐다 |
| 고정 IP 또는 DNS 이름 | 주소가 바뀌면 설치된 위젯이 서버를 못 찾는다 |
| 교무실·교실 PC가 서버 PC와 같은 망인지 | 망이 분리돼 있으면 서버 위치를 다시 정해야 한다 |
| V3 등 백신 예외에 `server\bin` | `pocketbase.exe`가 막히면 `Access is denied` |
| 디스크 여유 (DB + 백업 7개) | 백업은 서버 디스크에도 남는다 |

절전 끄기(관리자 PowerShell):

```powershell
powercfg /change standby-timeout-ac 0
powercfg /change hibernate-timeout-ac 0
powercfg /change monitor-timeout-ac 10
```

## 2. 서버 설치

```powershell
git clone https://github.com/HOTS-GG/dashboards_school.git C:\school-schedule
cd C:\school-schedule
.\server\get-pocketbase.ps1
```

관리자 계정은 **개발용과 다른 새 비밀번호**로 만든다 (progress.md §3).

```powershell
.\server\bin\pocketbase.exe superuser upsert <관리자이메일> <새 비밀번호> --dir server\pb_data
```

자동 시작 등록 + 방화벽 열기 (**관리자 PowerShell**):

```powershell
.\server\install-service.ps1
```

- `SchoolSchedule-Server` 작업 스케줄러 작업을 만든다: 부팅 시(로그인 전) SYSTEM 권한으로 실행,
  죽으면 1분 뒤 다시 실행(10번까지), 시간 제한 없음
- `0.0.0.0:8090`으로 열고 도메인·개인 네트워크 프로필에 TCP 8090 허용
- 되돌리기: `.\server\install-service.ps1 -Uninstall` (데이터는 그대로)

첫 실행 때 마이그레이션이 컬렉션·권한 규칙·Google 로그인을 적용한다. 이어서 Google 클라이언트
ID·보안 비밀번호를 넣는다 → [google-oauth-setup.md](google-oauth-setup.md).

확인:

```powershell
Get-ScheduledTask SchoolSchedule-* | Get-ScheduledTaskInfo     # LastTaskResult 267009 = 실행 중
```

다른 PC 브라우저에서 `http://<서버 IP>:8090/_/` 가 열리면 네트워크까지 된 것이다.

## 3. HTTPS

위젯 자동 업데이트는 `https` 주소만 받는다(2026-11-10 결정). PocketBase 앞에 Caddy를 세운다.

```powershell
.\server\get-caddy.ps1 -Hostname school-schedule.chunchon.gwe.hs.kr   # 실제로 쓸 이름
.\server\install-service.ps1 -WithHttps                                # 관리자 PowerShell
```

`-Hostname`은 선생님 PC가 서버를 부르는 이름이다. 두 길 중 하나(design.md §8-4):

**가) 학교 도메인 하위 주소** — 학교 DNS 관리자에게 이름 하나를 서버 IP로 지정해 달라고 요청.
서버가 인터넷에서 80·443으로 닿으면 Caddy가 공인 인증서를 자동으로 받는다
(`server\Caddyfile` 위쪽 `admin off` 블록에 이메일 추가). 선생님 PC에 아무것도 설치할 필요 없음.

**나) 내부 인증서** — 인터넷에서 닿지 않으면 Caddy가 자체 CA로 인증서를 만든다. 그 CA의 루트
인증서를 선생님 PC마다 신뢰 목록에 넣어야 한다. SYSTEM으로 돌 때 루트 인증서 위치:

```
C:\Windows\System32\config\systemprofile\AppData\Roaming\Caddy\pki\authorities\local\root.crt
```

각 PC에서(관리자):

```powershell
certutil -addstore -f Root \<서버>\share\root.crt
```

- 이름이 DNS로 안 풀리면 각 PC `C:\Windows\System32\drivers\etc\hosts`에 `서버IP  이름` 한 줄.
  PC마다 손이 가므로 가)를 먼저 시도한다.
- **미확인**: 나)로 갔을 때 Tauri 업데이터가 Windows 인증서 저장소의 루트를 신뢰하는지는 아직
  시험하지 않았다. 설치본 한 대에서 실제 업데이트까지 확인한 뒤 전체 배포할 것.

## 4. 위젯 빌드·배포

1. `desktop/src-tauri/src/settings.rs`의 `DEFAULT_SERVER_URL`을 서버 주소로 바꾼다
   (예: `https://school-schedule.chunchon.gwe.hs.kr`). 바꾸지 않으면 선생님마다 로그인 화면
   "서버 주소"에 직접 넣어야 한다.
2. `desktop/src-tauri/tauri.conf.json`의 `version`을 올린다.
3. 설치 파일을 만들고 업데이트로 게시한다:

```powershell
.\scripts\publish-update.ps1 -ServerUrl https://school-schedule.chunchon.gwe.hs.kr -Notes "첫 배포"
```

`server\pb_public\updates\`에 설치 파일과 `latest.json`이 들어가고, 서버가 `/updates/`로 내보낸다.
선생님에게는 그 주소의 `*_x64-setup.exe`를 받아 설치하게 한다(관리자 권한 필요 없음,
`%LOCALAPPDATA%\SchoolSchedule\`). 다음부터는 위젯이 시작 1분 뒤·매일 스스로 확인한다.

**서명 키**(`%USERPROFILE%\.tauri\school-schedule.key`)를 잃으면 설치된 위젯에 업데이트를 보낼
수 없다. 다른 저장 장치에 백업해 둔다.

## 5. 백업

서버가 켜진 채로도 안전한 PocketBase 백업을 만들고, 다른 디스크·NAS로 복사한다.

```powershell
.\server\backup.ps1 -SaveCredential -Email <관리자이메일>      # 비밀번호 한 번 저장 (DPAPI)
.\server\backup.ps1 -CopyTo D:\backup\school-schedule          # 손으로 한 번 실행해 확인
.\server\backup.ps1 -Register -CopyTo \nas\backup\school-schedule   # 매일 23:00 (관리자)
```

- 저장된 비밀번호는 저장한 Windows 계정만 읽을 수 있다. 그래서 백업 작업은 **그 계정으로** 돈다
  (`-Register`가 그렇게 등록한다). 서버 작업(SYSTEM)과 다른 점.
- 최근 `-Keep`개(기본 7개)만 남기고 서버·복사본 양쪽에서 오래된 것을 지운다.
- 복사한 파일은 해시로 원본과 맞는지 확인한다.

**되돌리기**: 관리 화면 `http://<서버>:8090/_/` → Backups → 해당 백업 → Restore.
서버가 안 뜨는 상황이면 작업을 멈추고(`Stop-ScheduledTask SchoolSchedule-Server`),
`pb_data`를 옮겨 두고 백업 zip을 그 자리에 풀고 다시 시작한다.

## 6. 서버 PC 옮기기

1. 새 PC에 §2대로 설치하되 **서비스는 아직 시작하지 않는다**
2. 옛 PC: 백업 한 번(`.\server\backup.ps1 -CopyTo <이동 디스크>`) → 작업 멈추기
3. 새 PC: 백업 zip을 `server\pb_data`에 풀고 `install-service.ps1` 실행
4. 주소가 바뀌면 — DNS 이름을 새 IP로 돌리면 선생님 PC는 그대로다. IP를 직접 쓰고 있었다면
   `DEFAULT_SERVER_URL`을 바꿔 새 버전을 게시해야 하므로, 처음부터 이름으로 쓰는 쪽이 낫다.

## 7. 선생님 시범 사용

design.md §7의 M7 완료 기준: 시범 사용자 1주일 사용 중 문제 없음.

- 선생님 2~3명에게 설치 → 각자 Google 학교 계정으로 로그인 → 시간표 입력
- 본인을 관리자로: 관리 화면 users → 해당 사람 → `role = admin`
- 한 주 동안 볼 것: 재부팅 후 위젯이 혼자 뜨는지, 오프라인 표시가 맞는지, 알림이 수업·발표를
  방해하지 않는지, 로그(`%LOCALAPPDATA%\kr.hs.gwe.chunchon.dashboard\logs\`)에 오류가 없는지

## 8. 점검 목록

서버 PC에서 처음 올린 뒤 이 순서로 확인한다.

- [ ] `Get-ScheduledTask SchoolSchedule-Server | Get-ScheduledTaskInfo` → 실행 중
- [ ] 서버 PC 재부팅 → 로그인하지 않은 상태에서 다른 PC에서 `http://<서버>:8090/_/` 열림
- [ ] `node server\tests\rules.test.mjs` (환경변수 `SU_EMAIL`·`SU_PASS`) → 27/27
- [ ] 위젯 두 대에서 한쪽 등록 → 다른 쪽 1초 안에 보임
- [ ] 서버 작업을 멈추면 위젯이 "오프라인", 다시 시작하면 "실시간 연결됨"
- [ ] HTTPS 주소로 로그인됨 (인증서 경고 없음)
- [ ] `.\server\backup.ps1 -CopyTo …` → 복사본 생기고 해시 일치
- [ ] 버전을 올려 게시 → 설치된 위젯이 하루 안에 새 버전으로 바뀜

## 9. 문제가 생기면

| 증상 | 볼 곳 |
|---|---|
| 서버가 안 뜸 | `Get-ScheduledTaskInfo`의 `LastTaskResult`, `server\pb_data\logs` |
| `Access is denied` | V3 예외에 `server\bin` |
| 다른 PC에서 접속 안 됨 | 방화벽 규칙(`Get-NetFirewallRule -DisplayName 'School schedule*'`), 같은 망인지 |
| 인증서 경고 | §3 나)의 루트 인증서가 그 PC에 들어갔는지 |
| 업데이트가 안 옴 | `https` 주소인지, `/updates/latest.json`이 열리는지, 서명 키가 같은지 |
| 위젯이 로그인 못 함 | Google OAuth 설정, 계정 도메인(`@chunchon.gwe.hs.kr`) |
