#!/bin/bash
# App-level migrations (assessments, baselines) run in the separate `migrate`
# service AFTER GoTrue has initialized the auth schema. Nothing to do here.
echo "DB init complete. App migrations will run via the migrate service."
