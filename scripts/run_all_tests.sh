#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ART_DIR="$ROOT_DIR/test-artifacts/$(date +%Y%m%d_%H%M%S)"
LOG_DIR="$ART_DIR/logs"
JUNIT_DIR="$ART_DIR/junit"
mkdir -p "$LOG_DIR" "$JUNIT_DIR"

# ---- ENV: защита от расхода токенов ----
export ENVIRONMENT=test
export LLM_PROVIDER=fake
export BLOCK_EXTERNAL_IO=true
export FAKE_LLM_MODE=echo
export PYTHONUNBUFFERED=1

# Общие PyTest опции
PYTEST_OPTS="-ra --maxfail=10 --durations=25"

run() {
  local name="$1"; shift
  local junit="$JUNIT_DIR/${name}.xml"
  echo "▶ $name"
  set +e
  "$@" --junitxml "$junit" $PYTEST_OPTS >"$LOG_DIR/${name}.log" 2>&1
  local rc=$?
  set -e
  echo "■ $name -> exit=$rc | junit=$junit | log=$LOG_DIR/${name}.log"
  echo "$name,$rc,$junit,$LOG_DIR/${name}.log" >> "$ART_DIR/steps.csv"
  return $rc
}

summary_line () {
  local title="$1"; local path="$2"
  if [ -f "$path" ]; then
    echo "  - $title: $path"
  fi
}

pushd "$ROOT_DIR/backend" >/dev/null

# 1) Критические: Token Protection (останавливаем, если упали)
run token_protection_simple  python3 -m pytest tests/test_token_protection_simple.py -v || { echo "❌ token_protection_simple failed"; exit 1; }
run token_protection_full    python3 -m pytest tests/test_token_protection.py -v        || { echo "❌ token_protection_full failed"; exit 1; }

# 2) WebSocket блок
run ws_critical_fixes   python3 -m pytest tests/test_websocket_critical_fixes.py -v || true
run ws_security_fixes   python3 -m pytest tests/test_websocket_security_fixes.py -v || true
run ws_integration      python3 -m pytest tests/test_websocket_integration.py -v    || true
run ws_manager          python3 -m pytest tests/test_websocket_manager.py -v        || true
run ws_stress           python3 -m pytest tests/test_websocket_stress.py -v         || true
run ws_all              python3 -m pytest tests/test_websocket*.py -v               || true

# 3) Realtime & Integration (старые backend/tests)
run rt_api               python3 -m pytest tests/test_realtime_api.py -v                 || true
run rt_integration       python3 -m pytest tests/test_integration_realtime.py -v        || true
run rt_cross_channel     python3 -m pytest tests/test_integration_cross_channel.py -v   || true

popd >/dev/null

# 4) Централизованные (новая структура)
pushd "$ROOT_DIR" >/dev/null
run unit_api              python3 -m pytest tests/backend/unit/test_api.py -v                              || true
run integ_database        python3 -m pytest tests/backend/integration/test_database.py -v                  || true
run integ_full_qa         python3 -m pytest tests/backend/integration/test_full_qa_pipeline.py -v          || true
run integ_qa_embed        python3 -m pytest tests/backend/integration/test_qa_embeddings.py -v             || true
run integ_qa_search_v1    python3 -m pytest tests/backend/integration/test_qa_search.py -v                 || true
run integ_qa_search_v2    python3 -m pytest tests/backend/integration/test_qa_search2.py -v                || true
run integ_vector_search   python3 -m pytest tests/backend/integration/test_vector_search.py -v             || true
run integ_tg_delivery     python3 -m pytest tests/backend/integration/test_telegram_delivery.py -v         || true
run integ_tg_operator     python3 -m pytest tests/backend/integration/test_telegram_operator_message.py -v || true
run integ_widget_billing  python3 -m pytest tests/backend/integration/test_widget_billing.py -v            || true
run integ_widget_cfg_api  python3 -m pytest tests/backend/integration/test_widget_config_api.py -v         || true
run integ_widget_domain   python3 -m pytest tests/backend/integration/test_widget_domain_validation.py -v  || true
run integ_widget_person   python3 -m pytest tests/backend/integration/test_widget_personalization.py -v    || true
run integ_widget_qa       python3 -m pytest tests/backend/integration/test_widget_qa.py -v                 || true
run integ_widget_full     python3 -m pytest tests/backend/integration/test_widget_settings_full_flow.py -v || true
run integ_all             python3 -m pytest tests/backend/integration/ -v                                  || true

# 5) Security / AI / E2E / Legacy
run security_all          python3 -m pytest tests/backend/security/test_security.py -v             || true
run ai_all                python3 -m pytest tests/backend/ai/test_ai.py -v                         || true
run e2e_doc_upload        python3 -m pytest tests/e2e/test_document_upload.py -v                   || true
run legacy_admin_settings python3 -m pytest scripts/backend/legacy/test_admin_settings_api.py -v   || true

# 6) Полные группы
pushd "$ROOT_DIR/backend" >/dev/null
run backend_all_legacy    python3 -m pytest tests/ -v || true
popd >/dev/null
run backend_all_new       python3 -m pytest tests/backend/ -v || true

# ---- Сводка и поиск падений ----
echo "[]" > "$ART_DIR/summary.json"

# простая выжимка падений из логов
FAILS="$ART_DIR/failures.txt"
: > "$FAILS"
grep -RInE "(=+ FAILURES =+|short test summary info|FAILED )" "$LOG_DIR" || true | sed 's/^/ /' >> "$FAILS"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ТЕСТЫ ЗАВЕРШЕНЫ. Артефакты:"
summary_line "Каталог" "$ART_DIR"
summary_line "Сводка падений" "$FAILS"
echo "  JUnit отчёты: $JUNIT_DIR"
echo "  Логи:         $LOG_DIR"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"