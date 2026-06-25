import json
import google.generativeai as genai
from app.config import settings

def init_gemini(api_key: str):
    """
    Initializes Gemini configuration.
    """
    if not api_key:
        raise ValueError("GEMINI_API_KEY is not set")
    genai.configure(api_key=api_key)

def generate_summary(transcript: str, summary_type: str, api_key: str) -> str:
    """
    Generates summary of the video transcript using Gemini.
    summary_type: "short", "detailed", or "bullet"
    """
    init_gemini(api_key)
    model = genai.GenerativeModel(settings.GEMINI_MODEL)
    
    prompts = {
        "short": (
            "Write a concise, high-level summary of the following YouTube video transcript. "
            "Explain the main objective, target topic, and overall conclusion in 3-4 sentences. "
            "Format with a clean layout."
        ),
        "detailed": (
            "Provide a comprehensive, detailed summary of the following YouTube video transcript. "
            "Break it down into major sections with markdown headers. Explain the concepts, "
            "narratives, or examples used by the speaker. Conclude with a summary of the outcomes."
        ),
        "bullet": (
            "Summarize the following YouTube video transcript in a set of clear, actionable bullet points. "
            "Extract the most important facts, steps, or tips shared. Keep each bullet point concise "
            "and impactful."
        )
    }
    
    prompt = prompts.get(summary_type, prompts["short"])
    
    response = model.generate_content(
        f"{prompt}\n\nTranscript:\n{transcript}"
    )
    return response.text.strip()

def generate_study_notes(transcript: str, api_key: str) -> str:
    """
    Generates rich, beautifully structured study notes in markdown.
    """
    init_gemini(api_key)
    model = genai.GenerativeModel(settings.GEMINI_MODEL)
    
    prompt = (
        "You are an expert academic educator. Create highly structured, comprehensive study notes "
        "based on the following YouTube video transcript. Format the output in clean, readable markdown. "
        "Your study notes MUST include:\n"
        "1. **Overview & Key Theme**: A short introductory summary.\n"
        "2. **Core Concepts Glossary**: Key terms defined clearly.\n"
        "3. **Detailed Section-by-Section Explanations**: Major chapters/topics covered in depth.\n"
        "4. **Key Takeaways**: High-impact summaries.\n"
        "5. **Self-Assessment Questions**: 3-5 open-ended review questions to test understanding (without answers shown, so the user can think, or with hidden answers in markdown tags).\n"
        "\nTranscript:\n"
    )
    
    response = model.generate_content(f"{prompt}{transcript}")
    return response.text.strip()

def generate_quiz(transcript: str, api_key: str) -> str:
    """
    Generates a list of quiz questions (MCQs, True/False, Short answers) in JSON format.
    """
    init_gemini(api_key)
    model = genai.GenerativeModel(settings.GEMINI_MODEL)
    
    prompt = (
        "You are a teacher preparing a quiz for your class based on this video transcript. "
        "Generate 6 high-quality questions of various types based ONLY on the transcript content. "
        "Provide exactly: 3 Multiple Choice Questions (MCQs), 2 True/False Questions, and 1 Short Answer Question. "
        "\n"
        "The output MUST be a JSON array containing objects matching this schema:\n"
        "[\n"
        "  {\n"
        "    \"id\": 1,\n"
        "    \"type\": \"multiple_choice\",\n"
        "    \"question\": \"The question text?\",\n"
        "    \"options\": [\"Option A\", \"Option B\", \"Option C\", \"Option D\"],\n"
        "    \"correct_answer\": \"Option B\",\n"
        "    \"explanation\": \"Brief explanation of why Option B is correct based on the transcript.\"\n"
        "  },\n"
        "  {\n"
        "    \"id\": 4,\n"
        "    \"type\": \"true_false\",\n"
        "    \"question\": \"Statement representing True/False?\",\n"
        "    \"options\": [\"True\", \"False\"],\n"
        "    \"correct_answer\": \"True\",\n"
        "    \"explanation\": \"Brief explanation of why it is true/false.\"\n"
        "  },\n"
        "  {\n"
        "    \"id\": 6,\n"
        "    \"type\": \"short_answer\",\n"
        "    \"question\": \"Question requiring a short written response?\",\n"
        "    \"options\": [],\n"
        "    \"correct_answer\": \"Keyword/key phrase that must be in the answer\",\n"
        "    \"explanation\": \"What the correct answer should cover and why.\"\n"
        "  }\n"
        "]"
    )
    
    # Enable JSON response type
    generation_config = {"response_mime_type": "application/json"}
    
    response = model.generate_content(
        f"{prompt}\n\nTranscript:\n{transcript}",
        generation_config=generation_config
    )
    return response.text.strip()

def answer_rag_question(query: str, context_chunks: list[dict], chat_history: list[dict], api_key: str) -> str:
    """
    Answers a question about the video transcript using the context chunks retrieved from similarity search.
    """
    init_gemini(api_key)
    model = genai.GenerativeModel(settings.GEMINI_MODEL)
    
    # Format context chunks
    context_str = ""
    for idx, c in enumerate(context_chunks):
        context_str += f"[Source {idx+1}]: {c['content']}\n\n"
        
    # Format chat history
    history_str = ""
    for msg in chat_history:
        history_str += f"{msg['sender'].capitalize()}: {msg['message']}\n"
        
    prompt = (
        "You are an interactive learning assistant helping a student understand a video transcript. "
        "Below are several excerpt chunks retrieved from the video transcript that are highly relevant to the user's question. "
        "You also have access to the conversation history.\n\n"
        "Instructions:\n"
        "- Answer the question accurately using ONLY the provided transcript excerpts. If the information is not in the excerpts, "
        "use the general transcript summary or say you cannot find the details in the text.\n"
        "- Cite your sources by appending [Source 1], [Source 2], etc. to the facts where relevant.\n"
        "- Keep the tone helpful, encouraging, and clear.\n\n"
        f"Transcript Excerpts:\n{context_str}\n"
        f"Conversation History:\n{history_str}\n"
        f"User Question: {query}\n"
        "Assistant Answer:"
    )
    
    response = model.generate_content(prompt)
    return response.text.strip()

def generate_social_content(transcript: str, api_key: str) -> dict:
    """
    Generates 4 distinct repurposing content formats in JSON format.
    """
    init_gemini(api_key)
    model = genai.GenerativeModel(settings.GEMINI_MODEL)
    
    prompt = (
        "Repurpose the following video transcript into four popular social content formats. "
        "Generate high-quality, engaging content for each.\n"
        "1. **LinkedIn Post**: Engaging hook, bullet points of value, professional tone, hashtags, call to action.\n"
        "2. **Twitter/X Thread**: A thread of 5-6 tweets. Each tweet must be numbered (e.g. 1/6, 2/6) and have punchy takeaways with high-interest spacing. Keep tweets short (< 280 chars).\n"
        "3. **Blog Post**: A structured, short articles/blog format with an intro hook, subheaders (H2, H3), and a conclusion wrap-up.\n"
        "4. **Instagram Carousel**: Slide-by-slide layout instructions (Slide 1: Title, Slide 2-5: Core ideas, Slide 6: Call to Action/Save this post).\n"
        "\n"
        "The output MUST be a JSON object matching this schema:\n"
        "{\n"
        "  \"linkedin_post\": \"...text containing post...\",\n"
        "  \"twitter_thread\": \"...text containing numbered tweets...\",\n"
        "  \"blog_post\": \"...markdown containing blog...\",\n"
        "  \"instagram_carousel\": \"...text with slide by slide details...\"\n"
        "}"
    )
    
    generation_config = {"response_mime_type": "application/json"}
    
    response = model.generate_content(
        f"{prompt}\n\nTranscript:\n{transcript}",
        generation_config=generation_config
    )
    
    # Try parsing to return dict
    try:
        return json.loads(response.text.strip())
    except Exception:
        # If parsing fails, create a structured dict with the raw response
        return {
            "linkedin_post": "Failed to parse JSON. Raw content: " + response.text,
            "twitter_thread": "",
            "blog_post": "",
            "instagram_carousel": ""
        }
