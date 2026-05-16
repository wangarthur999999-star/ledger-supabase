"""Test batch enrichment with 3 notes."""
import sys, os, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from batch_enrich_notes import find_pending_notes, enrich_note

pending = find_pending_notes()
print(f'Total pending: {len(pending)}')

for i, f in enumerate(pending[:3]):
    name = f.stem[:50]
    print(f'\n[{i+1}/3] {f.parent.name}/{name}')
    result = enrich_note(f)
    if result and 'error' not in result:
        print(f'  core_points: {result.get("core_points", [])}')
        print(f'  golden_quotes: {result.get("golden_quotes", [])}')
        print(f'  action_items: {result.get("action_items", [])}')
    else:
        print(f'  ERROR: {result}')
    time.sleep(1)

print('\nDone.')
