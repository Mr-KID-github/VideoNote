import html
import socket
from urllib.parse import urlsplit, urlunsplit

import markdown
from fastapi import Request

from app.config import settings
from app.models.note_library import PublicSharedNoteResponse
from app.services.video_link_service import build_embed_url

_LOCAL_HOSTS = {"127.0.0.1", "localhost", "0.0.0.0", "::1"}


def build_share_url(request: Request, share_token: str) -> str:
    base_url = _resolve_share_base_url(request)
    return f"{base_url}/share/{share_token}"


def render_shared_note_html(note: PublicSharedNoteResponse) -> str:
    title = html.escape(note.title or "Shared note")
    rendered_content = markdown.markdown(
        html.escape(note.content or ""),
        extensions=[
            "fenced_code",
            "tables",
            "nl2br",
            "sane_lists",
        ],
    )
    video_link = ""
    if note.video_url:
        safe_video_url = html.escape(note.video_url, quote=True)
        video_link = (
            '<p class="meta"><strong>Source video:</strong> '
            f'<a href="{safe_video_url}" target="_blank" rel="noreferrer">{safe_video_url}</a></p>'
        )
    video_embed = ""
    if note.video_url:
        embed_url = build_embed_url(note.video_url)
        if embed_url:
            safe_embed_url = html.escape(embed_url, quote=True)
            video_embed = f"""
        <aside class="video-panel">
          <div class="video-panel-inner">
            <div class="video-title">Source Video</div>
            <iframe
              src="{safe_embed_url}"
              title="Source video"
              loading="lazy"
              allowfullscreen
            ></iframe>
          </div>
        </aside>"""

    return f"""<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title} - VINote</title>
    <style>
      :root {{
        color-scheme: light;
        font-family: "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
        background: #f5f7fb;
        color: #18212f;
      }}
      body {{
        margin: 0;
        padding: 32px 16px;
      }}
      main {{
        max-width: 1280px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid #dbe3f1;
        border-radius: 18px;
        box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
        overflow: hidden;
      }}
      header {{
        padding: 28px 32px 20px;
        background: linear-gradient(135deg, #eff6ff, #f8fafc);
        border-bottom: 1px solid #e2e8f0;
      }}
      h1 {{
        margin: 0 0 12px;
        font-size: 28px;
        line-height: 1.2;
      }}
      .meta {{
        margin: 6px 0;
        color: #475569;
        font-size: 14px;
      }}
      .content {{
        padding: 28px 32px 32px;
        line-height: 1.75;
      }}
      .layout {{
        display: grid;
        gap: 0;
      }}
      .video-panel {{
        padding: 24px 24px 24px 0;
        background: #f8fafc;
        border-left: 1px solid #e2e8f0;
      }}
      .video-panel-inner {{
        position: sticky;
        top: 24px;
      }}
      .video-title {{
        font-size: 14px;
        font-weight: 600;
        color: #475569;
        margin: 0 0 12px;
      }}
      .video-panel iframe {{
        width: 100%;
        aspect-ratio: 16 / 9;
        border: 0;
        border-radius: 16px;
        background: #0f172a;
      }}
      .content h1,
      .content h2,
      .content h3,
      .content h4 {{
        color: #0f172a;
        line-height: 1.3;
        margin: 1.5em 0 0.6em;
      }}
      .content h1 {{
        font-size: 1.9rem;
        border-bottom: 1px solid #e2e8f0;
        padding-bottom: 0.35em;
      }}
      .content h2 {{
        font-size: 1.45rem;
      }}
      .content h3 {{
        font-size: 1.15rem;
      }}
      .content p,
      .content ul,
      .content ol,
      .content blockquote,
      .content pre,
      .content table {{
        margin: 0 0 1rem;
      }}
      .content ul,
      .content ol {{
        padding-left: 1.5rem;
      }}
      .content li {{
        margin: 0.25rem 0;
      }}
      .content blockquote {{
        border-left: 4px solid #93c5fd;
        background: #f8fbff;
        color: #334155;
        padding: 0.75rem 1rem;
      }}
      .content code {{
        background: #eef2ff;
        color: #1e3a8a;
        border-radius: 6px;
        padding: 0.1rem 0.35rem;
        font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
        font-size: 0.92em;
      }}
      .content pre {{
        overflow-x: auto;
        background: #0f172a;
        color: #e2e8f0;
        border-radius: 12px;
        padding: 1rem;
      }}
      .content pre code {{
        background: transparent;
        color: inherit;
        padding: 0;
        border-radius: 0;
      }}
      .content img {{
        display: block;
        max-width: 100%;
        height: auto;
        border-radius: 12px;
        border: 1px solid #dbe3f1;
      }}
      .content table {{
        width: 100%;
        border-collapse: collapse;
      }}
      .content th,
      .content td {{
        border: 1px solid #dbe3f1;
        padding: 0.65rem 0.8rem;
        text-align: left;
        vertical-align: top;
      }}
      .content th {{
        background: #f8fafc;
      }}
      .content hr {{
        border: 0;
        border-top: 1px solid #e2e8f0;
        margin: 1.5rem 0;
      }}
      pre,
      code {{
        font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
      }}
      a {{
        color: #2563eb;
      }}
      @media (min-width: 1024px) {{
        .layout.has-video {{
          grid-template-columns: minmax(0, 1fr) 360px;
        }}
      }}
      @media (max-width: 1023px) {{
        .video-panel {{
          padding: 0 24px 24px;
          border-left: 0;
          border-top: 1px solid #e2e8f0;
        }}
      }}
    </style>
  </head>
  <body>
    <main>
      <header>
        <h1>{title}</h1>
        <p class="meta"><strong>Shared from VINote</strong></p>
        <p class="meta">Created: {html.escape(note.created_at.isoformat())}</p>
        <p class="meta">Updated: {html.escape(note.updated_at.isoformat())}</p>
        {video_link}
      </header>
      <div class="layout{' has-video' if video_embed else ''}">
        <section class="content">
          {rendered_content}
        </section>
        {video_embed}
      </div>
    </main>
  </body>
</html>"""


def _resolve_share_base_url(request: Request) -> str:
    configured = settings.share_base_url.rstrip("/")
    if configured:
        return configured

    parsed = urlsplit(str(request.base_url))
    hostname = parsed.hostname or ""
    public_host = _detect_lan_ip() if hostname in _LOCAL_HOSTS else hostname
    port = parsed.port or settings.port

    if (parsed.scheme == "http" and port == 80) or (parsed.scheme == "https" and port == 443):
        netloc = public_host
    else:
        netloc = f"{public_host}:{port}"

    return urlunsplit((parsed.scheme or "http", netloc, "", "", "")).rstrip("/")


def _detect_lan_ip() -> str:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
            sock.connect(("8.8.8.8", 80))
            address = sock.getsockname()[0]
            if address and address not in _LOCAL_HOSTS:
                return address
    except OSError:
        pass

    try:
        address = socket.gethostbyname(socket.gethostname())
        if address and address not in _LOCAL_HOSTS:
            return address
    except OSError:
        pass

    return "127.0.0.1"
