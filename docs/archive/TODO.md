# Project To-Do List & Backlog

This document tracks feature requests, UI/UX improvements, and minor enhancements that are planned for future implementation.

## 🔴 [BUG] Pending Issue Tracker (2026-04-17)

### ~~1. Duplicate Novel: Sidebar Name Edit Mode Trigger~~ [RESOLVED]
- **Symptom**: 소설을 복제(Duplicate)하면 복제 자체는 정상적으로 완료되나, 좌측 사이드바 리스트에서 방금 복제된 소설의 이름이 다짜고짜 '이름 변경(편집 중)' 상태의 Input 필드로 전환되어 있음.
- **Resolution**: `App.tsx`에서 `handleDuplicateNovel`의 상태 변경 로직을 수정하여 편집 모드 진입 방지 및 포커스 즉시 이동으로 해결.

### ~~2. New Novel: Default Prompt Bleed (시스템 프롬프트 오염)~~ [RESOLVED]
- **Symptom**: '새 소설 만들기'를 하면 완전히 깔끔한 디폴트 상태(디렉토리의 `.md` 파일 원본) 시스템 프롬프트를 가져와야 하는데, 이전에 다른 소설 설정이나 이전 작업에서 저장해 둔 시스템 프롬프트가 복사(상속)되어 만들어지는 현상.
- **Resolution**: `src/App.tsx`의 `getMyDefaults()`에서 프롬프트 할당부를 수정. Parameters(온도 등)의 상속은 유지하되, Prompts(명령어)는 레거시 스토리지를 무시하고 하드코딩된 `GLOBAL_DEFAULTS`만을 참조하도록 생명주기를 분리(Decouple)하여 해결함.