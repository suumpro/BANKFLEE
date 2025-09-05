# 서울 은행 서바이벌 - Asset 목록

현재는 모든 에셋이 임시 박스 형태로 구현되어 있습니다. 아래 목록의 에셋들을 실제 이미지/스프라이트로 교체하면 더욱 완성도 있는 게임이 될 것입니다.

## 1. 플레이어 캐릭터 (Player)
**현재 구현**: 주황색 박스 + 간단한 얼굴
**필요한 에셋**:
- 플레이어 캐릭터 스프라이트 (40x50px)
  - 직장인 버전: 양복 입은 캐릭터
  - 학생 버전: 캐주얼한 복장
  - 관광객 버전: 배낭과 카메라를 든 모습
- 애니메이션 프레임:
  - 걷기 (2-3프레임)
  - 점프 (1프레임)
  - 피격 (1프레임)

## 2. 은행열매 (Ginkgo Nuts)
**현재 구현**: 색상별 회전하는 박스
**필요한 에셋**:

### 일반 은행 (Normal)
- 크기: 25x25px
- 색상: 황금색 (#DAA520)
- 실제 은행열매 모양의 스프라이트

### 썩은 은행 (Rotten)
- 크기: 30x30px
- 색상: 갈색 (#8B4513)
- 썩은 은행열매 + 냄새 이펙트

### 거대 은행 (Giant)
- 크기: 40x40px
- 색상: 어두운 황금색 (#B8860B)
- 큰 은행열매 스프라이트

## 3. 배경 요소 (Background)
**현재 구현**: 그라디언트 배경 + 간단한 빌딩
**필요한 에셋**:

### 하늘 배경
- 가을 하늘 배경 (800x600px)
- 시간대별 변화: 아침 → 낮 → 저녁

### 서울 도심 배경
- 서울 스카이라인 실루엣
- 유명 건물들 (롯데타워, N서울타워 등)
- 은행나무가 늘어선 거리

### 지면
- 아스팔트 질감
- 가을 낙엽이 쌓인 보도

## 4. UI 요소 (User Interface)
**현재 구현**: 기본 HTML 버튼과 텍스트
**필요한 에셋**:
- 게임 로고
- 버튼 스프라이트 (일반/호버/눌림 상태)
- HP 바 디자인
- 점수 표시 패널

## 5. 파티클 이펙트 (Particles)
**현재 구현**: 색상별 작은 박스
**필요한 에셋**:
- 충돌 이펙트 파티클
- 은행잎 파티클 (바람에 날리는 효과)
- 먼지/냄새 이펙트

## 6. 음향 효과 (Audio) - 현재 미구현
**필요한 에셋**:
- 배경음악 (가을 분위기의 잔잔한 음악)
- 효과음:
  - 은행열매 떨어지는 소리
  - 플레이어 점프 소리
  - 충돌/피격 소리
  - 게임오버 음악

---

# Platformer 전환용 에셋 체크리스트

## 타일/타일맵
- 타일 크기: 32x32(px)
- 레이어: 배경(장식), 솔리드(충돌), 해저드(스파이크/가스)
- 필요 타일들:
  - 지면 상단/내부/측면, 떠있는 발판
  - 스파이크 타일(상단 삼각형), 가스 배출구 데칼(장식)
  - 장식: 은행나무, 표지판, 서울 거리 요소

## 패럴랙스 배경
- 도시 스카이라인 레이어 2~3장 (느린 스크롤)
- 하늘 그라디언트(또는 큰 고정 배경)

## 플레이어/적 스프라이트(기본 프록시 가능)
- 플레이어(26x30 전후): 대기/달리기/점프/피격 최소 프레임
- 적(24x24): 패트롤 적 걷기 2프레임, 피격/소멸 1프레임

## 수집품/파워업/골
- 코인(16x16) 2프레임 깜박임
- 파워업(24x24): 부츠, 우산, 마스크, 방독면 아이콘
- 골(깃발): 기둥/깃발 2~3 프레임 바람 애니메이션(선택)

## UI/HUD
- 코인 아이콘, 체력바(HP 채움형), 파워업 남은 시간/횟수 배지
- 일시정지/클리어/게임오버 패널 백그라운드

## SFX/BGM 매핑
- 점프, 스톰프(적 밟기), 코인 획득, 파워업 획득, 피격(가스/스파이크/적), 깃발 도달, 레벨 클리어, 게임오버
- BGM: 스테이지 BGM(루프), 클리어 지글

## 파일 구조 제안(Platformer 확장)
```
/assets
  /images
    /tiles
      - ground_*.png
      - platform_*.png
      - spike.png
      - gas_decal.png
    /parallax
      - skyline_layer1.png
      - skyline_layer2.png
    /entities
      - player_run_*.png
      - player_jump.png
      - enemy_patrol_*.png
      - coin_*.png
      - power_boots.png
      - power_umbrella.png
      - power_mask.png
      - power_gasmask.png
      - goal_flag.png
    /ui
      - hud_bar.png
      - hud_icons.png
      - overlay_panels.png
  /audio
    /music
      - stage_loop.mp3
      - level_clear.mp3
    /sfx
      - jump.wav
      - stomp.wav
      - coin.wav
      - powerup.wav
      - hurt.wav
      - goal.wav
      - gameover.wav
```

주의: 현재 코드는 모든 그래픽을 캔버스 도형으로 임시 렌더합니다. 위 에셋이 준비되면, 스프라이트 로더를 추가해 교체하면 됩니다.

## 7. 추가 게임 요소 (미래 확장)
**필요한 에셋**:
- 파워업 아이템들:
  - 마스크 (25x25px)
  - 우산 (30x30px)
  - 부츠 (25x25px)
  - 방독면 (30x30px)
- 특수 이벤트:
  - 청소차 스프라이트
  - 관광객 무리
  - 길거리 공연 무대

## 파일 구조 제안
```
/assets
  /images
    /characters
      - player_office.png
      - player_student.png
      - player_tourist.png
    /ginkgo
      - ginkgo_normal.png
      - ginkgo_rotten.png
      - ginkgo_giant.png
    /background
      - seoul_skyline.png
      - street_autumn.png
      - sky_gradient.png
    /ui
      - logo.png
      - buttons.png
      - hud_elements.png
    /effects
      - particles.png
      - impact_effects.png
  /audio
    /music
      - background_music.mp3
    /sfx
      - ginkgo_fall.wav
      - player_jump.wav
      - collision.wav
      - game_over.mp3
```

## 이미지 스펙
- 형식: PNG (투명배경 지원)
- 해상도: 게임 내 픽셀 단위와 일치
- 스타일: 픽셀 아트 또는 2D 카툰 스타일
- 색상: 가을 테마 (황금, 주황, 갈색, 녹색 톤)
