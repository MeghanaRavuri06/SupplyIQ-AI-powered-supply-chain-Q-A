from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
import os
import pandas as pd
import io
from typing import List

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://ai-powered-supply-chain.vercel.app"
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

csv_store = {"data": None, "filename": None}

client = Groq(api_key=os.getenv("GROQ_API_KEY"))


class Message(BaseModel):
    role: str
    content: str


class QuestionRequest(BaseModel):
    question: str
    history: List[Message] = []


@app.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")

    contents = await file.read()

    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 5MB.")

    df = pd.read_csv(io.StringIO(contents.decode("utf-8")))
    csv_store["data"] = df
    csv_store["filename"] = file.filename

    # Generate auto insights
    insights = []

    # 1. Low stock items (stock < 50)
    low_stock = df[df["quantity_in_stock"] < 50][["product_name", "quantity_in_stock"]].to_dict("records")
    if low_stock:
        items = ", ".join([f"{r['product_name']} ({r['quantity_in_stock']} units)" for r in low_stock])
        insights.append({"type": "warning", "title": "Low Stock Alert", "body": items})

    # 2. Overordered items (orders > stock)
    overordered = df[df["quantity_ordered"] > df["quantity_in_stock"]][["product_name", "quantity_ordered", "quantity_in_stock"]].to_dict("records")
    if overordered:
        items = ", ".join([f"{r['product_name']} (ordered {r['quantity_ordered']}, stock {r['quantity_in_stock']})" for r in overordered])
        insights.append({"type": "danger", "title": "Stock Deficit", "body": items})

    # 3. Pending orders by supplier
    if "delivery_status" in df.columns and "supplier" in df.columns:
        pending = df[df["delivery_status"] == "Pending"].groupby("supplier").size().reset_index(name="count")
        if not pending.empty:
            top = pending.sort_values("count", ascending=False).iloc[0]
            insights.append({"type": "info", "title": "Supplier Watch", "body": f"{top['supplier']} has the most pending orders ({int(top['count'])})"})

    # 4. Preview (first 5 rows)
    preview = df.head(5).to_dict("records")
    columns = list(df.columns)

    return {
        "filename": file.filename,
        "rows": len(df),
        "columns": columns,
        "preview": preview,
        "insights": insights
    }


@app.post("/ask")
async def ask_question(body: QuestionRequest):
    if csv_store["data"] is None:
        raise HTTPException(status_code=400, detail="No CSV uploaded yet.")

    df = csv_store["data"]
    csv_preview = df.head(100).to_csv(index=False)

    system_prompt = f"""You are SupplyIQ, an intelligent supply chain analyst assistant.
You have been given the following inventory/order data in CSV format:

{csv_preview}

Answer clearly and concisely based only on the data above.
If the answer requires calculation (totals, averages, counts), do it and show the result.
If the data doesn't contain enough info to answer, say so honestly.
Keep answers focused and formatted cleanly. Use bullet points for lists."""

    # Build message history (last 3 exchanges = 6 messages)
    messages = []
    for msg in body.history[-6:]:
        messages.append({"role": msg.role, "content": msg.content})
    messages.append({"role": "user", "content": body.question})

    response = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=[{"role": "system", "content": system_prompt}] + messages,
        max_tokens=1024
    )

    return {"answer": response.choices[0].message.content}


@app.get("/status")
async def status():
    if csv_store["data"] is None:
        return {"loaded": False}
    return {
        "loaded": True,
        "filename": csv_store["filename"],
        "rows": len(csv_store["data"])
    }