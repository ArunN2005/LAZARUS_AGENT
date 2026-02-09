import os
from dotenv import load_dotenv
load_dotenv()
import requests

key = os.getenv('GEMINI_API_KEY')
print(f'Key present: {bool(key)}')

models_to_test = [
    'gemini-3-flash-preview',
    'gemini-2.0-flash', 
    'gemini-2.0-flash-001',
    'gemini-1.5-flash',
]

for model in models_to_test:
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}'
    try:
        resp = requests.post(url, json={'contents':[{'parts':[{'text':'Say hello in 5 words'}]}]}, headers={'Content-Type':'application/json'}, timeout=10)
        print(f'{model}: {resp.status_code}')
        if resp.status_code == 200:
            text = resp.json()['candidates'][0]['content']['parts'][0]['text']
            print(f'  -> {text[:80]}')
    except Exception as e:
        print(f'{model}: ERROR - {e}')
