from api.lib.llm_json import parse_llm_json_payload
from api.models import Agent2Output
import pytest

def test_parse_llm_json_payload_with_noise():
    text = """
    Voici l'analyse demandée :
    {
        "analyses": [],
        "analyzed_at": "2026-06-12T20:00:00Z"
    }
    J'espère que cela vous aidera.
    """
    result = parse_llm_json_payload(text, Agent2Output)
    assert isinstance(result, Agent2Output)
    assert result.analyzed_at == "2026-06-12T20:00:00Z"

def test_parse_llm_json_payload_invalid():
    text = "Pas de JSON ici."
    with pytest.raises(ValueError, match="Aucun bloc JSON trouvé"):
        parse_llm_json_payload(text, Agent2Output)
