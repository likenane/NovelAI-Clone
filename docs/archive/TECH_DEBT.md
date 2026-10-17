# Technical Debt & Backlog (TECH_DEBT.md)

이 문서는 당장 해결하기는 어렵지만, 향후 시스템의 안정성과 확장성을 위해 반드시 해결해야 할 아키텍처 부채(Technical Debt)와 개선 과제들을 기록합니다.

## ~~1. 알림 시스템 아키텍처의 취약성 (Notification System Brittle Architecture)~~ [RESOLVED]
- **발견일**: 2026-04-13
- **문제점**: 현재 로딩 상태("Scanning...")를 표시하는 알림은 생성 시 발급된 ID를 `try/finally` 블록에서 수동으로 추적하여 `removeNotification`으로 지워야 함. 비동기 작업 중 컴포넌트가 언마운트되거나 예기치 않은 에러가 발생할 경우, 알림이 영구적으로 화면에 남는(Zombie Notification) 레이스 컨디션에 매우 취약함.
- **해결 방안 (Zero-Trust Model 적용)**: 
  - `loading`, `generating` 타입에 "Dead Man's Switch" (60초 Absolute TTL) 타이머를 부여하여, 외부 컴포넌트가 알림을 지우지 못하고 크래시가 나더라도 1분 뒤 자동 소멸되도록 시스템이 방어합니다.
  - 어떠한 상태에서든 무조건 'X(닫기)' 버튼을 노출하여, 사용자에게 알림을 치울 수 있는 강제 통제권(Manual Sovereignty)을 보장합니다.
  - 에러나 정보 메시지는 텍스트 길이에 따라 자동으로 수명을 연장(Smart Duration)하거나 수동 해제할 때까지 무한정 대기(`duration: 0`)하도록 개선되었습니다.
