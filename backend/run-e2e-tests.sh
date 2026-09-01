#!/bin/bash
# Run Phase 18 E2E workflow tests
export JWT_SECRET="test_jwt_secret_for_phase18_e2e_testing_only"
export NODE_ENV="test"
cd "$(dirname "$0")"
node --experimental-vm-modules tests/phase18_e2e_workflow.test.js
