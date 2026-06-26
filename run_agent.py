import os
from google import genai

# Khởi tạo client
client = genai.Client()

meta_prompt = """
[Dán đoạn Meta-Prompt ở trên vào đây]
"""

# Gọi model để thực thi (đảm bảo Agent có quyền ghi file nếu dùng framework hỗ trợ tool calling)
response = client.models.generate_content(
    model="gemini-2.5-pro",
    contents=meta_prompt
)

print(response.text)
