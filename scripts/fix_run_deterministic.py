"""Fix run_deterministic in agent3_strategist.py - use model_dump() instead of .get()"""

with open('api/agents/agent3_strategist.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the problematic line
old = "    stats_map = {a.get(\"match_id\"): a for a in input_data.statistics.analyses}"
new = "    stats_map = {a.match_id: a.model_dump() for a in input_data.statistics.analyses}"

if old in content:
    content = content.replace(old, new)
    with open('api/agents/agent3_strategist.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Fixed: replaced .get() with .model_dump()")
else:
    print("Pattern not found - checking file content...")
    # Find the run_deterministic function
    idx = content.find("def run_deterministic")
    if idx >= 0:
        # Print lines around it
        lines = content[idx:idx+500].split('\n')
        for i, line in enumerate(lines[:10]):
            print(f"  {i}: {line}")
    else:
        print("run_deterministic not found!")
