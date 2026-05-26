"""Fix the test_mixed assertion value from 47 to 53"""

with open('api/tests/test_agents.py', 'r', encoding='utf-8') as f:
    content = f.read()

old = 'assert form_to_score("DLWWD") == 47  # arrondi de 46.67'
new = 'assert form_to_score("DLWWD") == 53  # D=1,L=0,W=3,W=3,D=1 = 8/15*100 = 53.3'

if old in content:
    content = content.replace(old, new)
    with open('api/tests/test_agents.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed!")
else:
    print("Pattern not found!")
    # Debug: show the line
    for line in content.split('\n'):
        if 'DLWWD' in line:
            print(f"  Found: {repr(line)}")
