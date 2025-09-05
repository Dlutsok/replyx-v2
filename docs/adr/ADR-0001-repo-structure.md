# ADR-0001: Unified Repository Structure

## Context
Смешение воркеров, дубли схем, нет единого места для docs.

## Decision
- Вводим `docs/` как источник истины.
- Каждый сервис имеет README и запись в service-catalog.
- Изменения в коде → обновление соответствующих docs.

## Consequences
- Быстрее онбординг, меньше расхождений, предсказуемые PR.
