"""Fix imports in test_agents.py - move form_to_score etc to agent2_statistician"""
import re

with open('api/tests/test_agents.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Remove form_to_score, parse_xg_from_stats, h2h_summary from agent1 import
content = content.replace(
    '    form_to_score,\n    parse_xg_from_stats,\n    h2h_summary,\n',
    ''
)

# Add import from agent2_statistician before agent3 import
content = content.replace(
    'from api.agents.agent3_strategist import (',
    'from api.agents.agent2_statistician import (\n    form_to_score,\n    parse_xg_from_stats,\n    h2h_summary,\n)\nfrom api.agents.agent3_strategist import ('
)

with open('api/tests/test_agents.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done - imports fixed")
