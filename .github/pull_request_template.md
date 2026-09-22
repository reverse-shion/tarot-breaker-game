## Event Safety Preflight
- [ ] I read AGENTS.md and docs/EVENT_DEVELOPMENT_SYSTEM.md
- [ ] Current main HEAD recorded:
- [ ] Target event/segment:
- [ ] WORKING scope:
- [ ] LOCKED scope:
- [ ] Relevant VGC/Event/Integration contracts:
- [ ] Preflight command PASS:

## Checkpoint / CI
- [ ] Real-runtime checkpoint exists, or N/A for foundation-only change
- [ ] Checkpoint does not write production Progress/localStorage
- [ ] Event Safety / Main Merge Gate CI PASS

## Human Device Gates
- [ ] Isolated Device PASS recorded at exact SHA, or N/A
- [ ] Integration Device PASS recorded at exact SHA, or N/A
- [ ] No DEVICE VERIFIED regression

## Merge
- [ ] Integration contract satisfied, or foundation-only
- [ ] Product owner explicitly approved merge

Do not check a Device PASS box based on CI or AI inspection.
