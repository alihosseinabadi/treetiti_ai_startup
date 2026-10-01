"""Phase 0: the test suite always runs as development.

validate_prod() is fail-closed (unset APP_ENV = production), so without
this every TestClient lifespan would refuse to boot. Production behavior
is covered explicitly in test_security_phase0.py via Settings(...) with
app_env="production" — no process env juggling needed.
"""

import os

os.environ.setdefault("APP_ENV", "development")
