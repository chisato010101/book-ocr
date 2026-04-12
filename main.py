import base64
from pathlib import Path

import anthropic
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import HTMLResponse, JSONResponse

app = FastAPI(title="Book OCR")
client = anthropic.Anthropic()

SUPPORTED_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20MB per image

EXTRACT_PROMPT = (
    "請完整擷取這張書頁圖片中的所有文字。"
    "盡量保留原始排版，包括段落換行與縮排。"
    "只輸出文字內容本身，不需要任何額外說明或評論。"
)


@app.get("/", response_class=HTMLResponse)
async def index():
    return Path("static/index.html").read_text(encoding="utf-8")


@app.post("/api/extract")
async def extract_text(files: list[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="請至少上傳一張圖片")
    if len(files) > 50:
        raise HTTPException(status_code=400, detail="一次最多上傳 50 張圖片")

    results = []

    for i, file in enumerate(files):
        content = await file.read()

        if len(content) > MAX_FILE_SIZE:
            results.append({
                "filename": file.filename,
                "page": i + 1,
                "success": False,
                "error": f"檔案過大（上限 20MB），目前：{len(content) // 1024 // 1024}MB",
            })
            continue

        media_type = file.content_type or "image/jpeg"
        # Normalize common aliases
        if media_type in ("image/jpg",):
            media_type = "image/jpeg"

        if media_type not in SUPPORTED_TYPES:
            results.append({
                "filename": file.filename,
                "page": i + 1,
                "success": False,
                "error": f"不支援的格式（{media_type}）。請轉換為 JPEG / PNG / WebP",
            })
            continue

        try:
            image_data = base64.standard_b64encode(content).decode("utf-8")

            response = client.messages.create(
                model="claude-opus-4-6",
                max_tokens=4096,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "image",
                            "source": {
                                "type": "base64",
                                "media_type": media_type,
                                "data": image_data,
                            },
                        },
                        {
                            "type": "text",
                            "text": EXTRACT_PROMPT,
                        },
                    ],
                }],
            )

            extracted = next(
                (b.text for b in response.content if b.type == "text"), ""
            )

            results.append({
                "filename": file.filename,
                "page": i + 1,
                "success": True,
                "text": extracted,
                "usage": {
                    "input_tokens": response.usage.input_tokens,
                    "output_tokens": response.usage.output_tokens,
                },
            })

        except anthropic.APIError as e:
            results.append({
                "filename": file.filename,
                "page": i + 1,
                "success": False,
                "error": f"API 錯誤：{e.message}",
            })

    return JSONResponse({"results": results})
