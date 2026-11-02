# Google 로그인 설정 (학교 계정)

위젯의 "학교 계정으로 로그인"을 켜기 위한 1회 설정입니다. **학교 Google 계정**(`@chunchon.gwe.hs.kr`)으로 진행합니다.

## 1. Google Cloud 프로젝트 만들기

1. https://console.cloud.google.com 에 학교 계정으로 로그인
2. 상단 프로젝트 선택 → **새 프로젝트** → 이름 `학교 일정` → 만들기
   - 프로젝트를 만들 수 없다고 나오면 학교 Workspace 관리자가 막아 둔 것입니다. 관리자에게 요청하세요.

## 2. 동의 화면 (Google Auth Platform)

1. 메뉴 → **Google Auth Platform** → 시작하기
2. 앱 이름 `학교 일정`, 지원 이메일 = 본인 학교 계정
3. 대상(Audience): **내부(Internal)** 선택
   - 내부로 하면 학교 조직 계정만 로그인할 수 있고, Google 심사가 필요 없습니다.
4. 연락처 이메일 입력 → 완료

## 3. OAuth 클라이언트 만들기

1. Google Auth Platform → **클라이언트** → 클라이언트 만들기
2. 애플리케이션 유형: **데스크톱 앱**, 이름 `학교 일정 위젯`
3. 만들기 → **클라이언트 ID**와 **클라이언트 보안 비밀번호** 확인
   - 데스크톱 앱 유형은 리디렉션 주소를 따로 등록하지 않아도 됩니다 (위젯이 `http://127.0.0.1:<임시포트>`를 사용).

## 4. PocketBase에 등록

1. 서버 관리자 화면 http://127.0.0.1:8090/_/ 로그인
2. **Collections → users → 톱니바퀴(설정) → Options**
3. **OAuth2** 켜기 → **Add provider → Google**
4. 3번에서 받은 Client ID / Client secret 붙여넣기 → 저장

클라이언트 ID·비밀번호는 서버 DB(`server/pb_data`)에만 저장되고 git에는 올라가지 않습니다.

## 서버 쪽에 이미 들어간 보호 장치

- 로그인한 Google 계정 이메일이 `@chunchon.gwe.hs.kr`로 끝나지 않으면 서버가 거부 (`server/pb_hooks/auth.pb.js`)
- 사용자 계정은 Google 로그인으로만 생성, 비밀번호 로그인은 꺼짐
- 새 사용자는 항상 `member`. 관리자 지정은 서버 관리자 화면에서 users → 해당 사용자 → role = `admin`
