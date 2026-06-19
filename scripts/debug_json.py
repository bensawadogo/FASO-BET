import requests

url = "https://raw.githubusercontent.com/openfootball/football.json/master/2023-24/en.1.json"
try:
    r = requests.get(url, timeout=10)
    data = r.json()
    # Print keys to understand structure
    print("Top level keys:", data.keys())
    # Inspect first round if exists
    if "rounds" in data and len(data["rounds"]) > 0:
        print("First round sample keys:", data["rounds"][0].keys())
        if "matches" in data["rounds"][0] and len(data["rounds"][0]["matches"]) > 0:
            print("First match sample:", data["rounds"][0]["matches"][0])
    else:
        print("Structure unexpected:", data)
except Exception as e:
    print(f"Error: {e}")
