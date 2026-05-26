"""Add PipelineResult type alias to api/models.py"""

with open('api/models.py', 'r') as f:
    content = f.read()

# Find the marker for Health section
health_marker = "# ─── Health ─────────────────────────────────────────────────────"

# Find the existing PipelineError class end
pipeline_error_end = content.index("class PipelineError(BaseModel):")
# Find the end of PipelineError class (next class/next section)
rest_after_pipeline_error = content[pipeline_error_end:]
lines = rest_after_pipeline_error.split('\n')
end_idx = 0
for i, line in enumerate(lines):
    if line.strip().startswith('class ') or line.strip().startswith('# ───'):
        end_idx = i
        break

# Reconstruct: keep everything before + including PipelineError, then add result type
before = content[:pipeline_error_end]
rest = '\n'.join(lines[end_idx:])  # from the next section onward

new_section = before + '''class PipelineError(BaseModel):
    status: str = "error"
    agent: int
    message: str
    pipeline_ran_at: str


# Type Union pour le pipeline (equivalent de PipelineResult en TS)
PipelineResult = Union[PipelineSuccess, PipelineNoMatches, PipelineError]


'''

content = new_section + rest

with open('api/models.py', 'w') as f:
    f.write(content)
print("Fixed: PipelineResult added")
