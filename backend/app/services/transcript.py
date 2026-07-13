import re
import requests
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api.proxies import GenericProxyConfig
from app.config import settings

def _transcript_segment_text(segment) -> str:
    """
    Supports both older dict segments and newer FetchedTranscriptSnippet objects.
    """
    if isinstance(segment, dict):
        text = segment.get("text", "")
    else:
        text = getattr(segment, "text", "")
    return text.replace("\n", " ").strip()
def extract_video_id(url: str) -> str:
    """
    Extracts the 11-character video ID from various YouTube URL formats.
    """
    patterns = [
        r'(?:v=|\/v\/|embed\/|youtu\.be\/|\/shorts\/)([^#\&\?]{11})',
        r'(?:^|[^a-zA-Z0-9_-])([^a-zA-Z0-9_-]{11})(?:$|[^a-zA-Z0-9_-])' # fallback for bare ID
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    # Check if url itself is exactly 11 chars
    clean_url = url.strip()
    if len(clean_url) == 11 and re.match(r'^[a-zA-Z0-9_-]{11}$', clean_url):
        return clean_url
        
    raise ValueError("Could not parse YouTube video ID from URL")

def get_youtube_transcript(video_id: str) -> str:
    """
    Fetches the transcript text for the video_id.
    Tries to retrieve English transcript first, falling back to any available language.
    """
    try:
        proxy_config = None
        if settings.YOUTUBE_PROXY_URL:
            proxy_config = GenericProxyConfig(
                http_url=settings.YOUTUBE_PROXY_URL,
                https_url=settings.YOUTUBE_PROXY_URL,
            )

        transcript_list = YouTubeTranscriptApi(proxy_config=proxy_config).list(video_id)
        
        # Try to find English first
        try:
            transcript = transcript_list.find_transcript(['en'])
        except Exception:
            # Fall back to the first available transcript in the list (e.g. auto-generated Hindi)
            transcripts = list(transcript_list)
            if not transcripts:
                raise ValueError("No transcripts available for this video.")
            transcript = transcripts[0]
            
        # Fetch the transcript text segment data
        data = transcript.fetch()
        text_list = [_transcript_segment_text(item) for item in data]
        return " ".join(text_list)
        
    except Exception as e:
        metadata = get_video_metadata(video_id)
        return (
            "Transcript unavailable. YouTube blocked transcript access from the backend host. "
            f"Use the visible video metadata instead. Title: {metadata['title']}. "
            f"Author: {metadata['author']}. URL: {metadata['youtube_url']}. "
            f"Original transcript error: {str(e)}"
        )




def get_video_metadata(video_id: str) -> dict:
    """
    Scrapes video metadata (title, author, duration, thumbnail) from watch page.
    """
    url = f"https://www.youtube.com/watch?v={video_id}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9"
    }
    
    # Default fallback values
    metadata = {
        "video_id": video_id,
        "title": f"YouTube Video ({video_id})",
        "author": "YouTube Creator",
        "thumbnail": f"https://img.youtube.com/vi/{video_id}/hqdefault.jpg",
        "duration": 0,
        "youtube_url": url
    }
    
    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200:
            return metadata
            
        html = response.text
        
        # 1. Title Extraction
        title_match = re.search(r'<meta property="og:title" content="([^"]+)"', html)
        if title_match:
            metadata["title"] = title_match.group(1).replace("&quot;", '"').replace("&#39;", "'")
        else:
            title_tag = re.search(r'<title>([^<]+)</title>', html)
            if title_tag:
                # Remove " - YouTube" suffix
                raw_title = title_tag.group(1)
                metadata["title"] = re.sub(r'\s*-\s*YouTube$', '', raw_title)
                
        # 2. Author Extraction
        author_match = re.search(r'<link itemprop="name" content="([^"]+)"', html)
        if author_match:
            metadata["author"] = author_match.group(1)
        else:
            channel_match = re.search(r'"author"\s*:\s*"([^"]+)"', html)
            if channel_match:
                metadata["author"] = channel_match.group(1)
                
        # 3. Duration Extraction
        # Look for lengthSeconds inside ytPlayerResponse or ytInitialPlayerResponse
        duration_match = re.search(r'"lengthSeconds"\s*:\s*"(\d+)"', html)
        if duration_match:
            metadata["duration"] = int(duration_match.group(1))
        else:
            approx_duration = re.search(r'"approxDurationMs"\s*:\s*"(\d+)"', html)
            if approx_duration:
                metadata["duration"] = int(approx_duration.group(1)) // 1000
                
        # 4. Thumbnail Extraction
        thumb_match = re.search(r'<meta property="og:image" content="([^"]+)"', html)
        if thumb_match:
            metadata["thumbnail"] = thumb_match.group(1)
            
    except Exception:
        # Ignore errors and return fallbacks
        pass
        
    return metadata
