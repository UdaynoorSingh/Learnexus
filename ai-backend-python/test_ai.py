import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()
try:
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
    model = genai.GenerativeModel('gemini-1.5-flash')
    response = model.generate_content("Hello")
    print("SUCCESS")
except Exception as e:
    import traceback
    traceback.print_exc()
