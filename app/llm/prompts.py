from typing import Literal

OutputLanguage = Literal["en", "zh-CN"]
DEFAULT_OUTPUT_LANGUAGE: OutputLanguage = "zh-CN"
SUPPORTED_OUTPUT_LANGUAGES: tuple[OutputLanguage, ...] = ("en", "zh-CN")

STYLE_MAP: dict[str, str] = {
    "minimal": "Minimal notes focused on the most important points.",
    "detailed": "Detailed notes with examples, details, and supporting facts.",
    "academic": "Academic writing style with arguments, evidence, and citations when present.",
    "tutorial": "Step-by-step tutorial format with key actions and examples.",
    "meeting": "Meeting minutes with agenda, discussion points, decisions, and follow-ups.",
    "xiaohongshu": "Xiaohongshu-style notes with a lighter tone and stronger highlights.",
}

STYLE_INSTRUCTIONS: dict[OutputLanguage, dict[str, str]] = {
    "zh-CN": {
        "minimal": "风格要求：使用精简模式，只保留每个章节最核心的要点。",
        "detailed": "风格要求：使用详细模式，尽量完整记录内容、示例、结论和关键细节。",
        "academic": "风格要求：使用学术表达，整理论点、论据和原文中明确出现的引用关系。",
        "tutorial": "风格要求：使用教程模式，按步骤整理流程、方法和关键操作。",
        "meeting": "风格要求：使用会议纪要模式，整理议题、讨论要点、决策和待办事项。",
        "xiaohongshu": "风格要求：使用小红书风格，语气更轻松，适度使用 emoji 和高亮表达。",
    },
    "en": {
        "minimal": "Style requirement: use a minimal format and keep only the core takeaways for each section.",
        "detailed": "Style requirement: use a detailed format and preserve examples, conclusions, and supporting details.",
        "academic": "Style requirement: use an academic tone and organize claims, evidence, and explicit references from the transcript.",
        "tutorial": "Style requirement: use a tutorial format and present the workflow as clear step-by-step guidance.",
        "meeting": "Style requirement: use meeting minutes format with agenda items, discussion points, decisions, and follow-ups.",
        "xiaohongshu": "Style requirement: use a Xiaohongshu-style tone with light emoji usage and stronger highlights.",
    },
}

SYSTEM_PROMPTS: dict[OutputLanguage, str] = {
    "zh-CN": """你是一名专业的视频笔记助手，负责把视频转录整理成结构清晰、信息准确的 Markdown 笔记。

语言要求：
- 笔记主体必须使用中文。
- 品牌名、专有名词、代码、接口名和原本就是英文的人名可以保留英文。

输出要求：
- 只返回最终 Markdown，不要包裹在代码块中。
- 不要把章节标题写成有序列表，使用标准 Markdown 标题层级。
- 数学公式使用 LaTeX 语法。

整理原则：
1. 严格基于转录内容，不要补充转录中没有明确出现的事实。
2. 可以重组语序、分段、添加小标题和列表，但不要改变原意。
3. 去掉寒暄、口头禅、重复和明显无关内容。
4. 保留关键事实、例子、步骤、结论和建议。
5. 每个主要章节都放一个截图标记，格式为 [[Screenshot:MM:SS]]。
6. 如果视频很短，至少放 2 到 3 个截图标记。""",
    "en": """You are a professional video note assistant. Convert raw video transcripts into clear, accurate Markdown notes.

Language requirements:
- The note body must be written in English.
- Keep brand names, proper nouns, code, API names, and names that are already in another language when appropriate.

Output requirements:
- Return only the final Markdown content. Do not wrap it in a code block.
- Do not format section headings as numbered lists; use normal Markdown heading levels.
- Use LaTeX syntax for math expressions.

Editing principles:
1. Stay faithful to the transcript and do not invent facts that are not explicitly present.
2. You may reorganize sentences, paragraphs, headings, and lists, but do not change the meaning.
3. Remove greetings, filler words, repetition, and obviously irrelevant content.
4. Preserve important facts, examples, steps, conclusions, and recommendations.
5. Add one screenshot marker to every major section using [[Screenshot:MM:SS]].
6. If the video is short, include at least 2 to 3 screenshot markers.""",
}

USER_PROMPT_TEMPLATES: dict[OutputLanguage, str] = {
    "zh-CN": """视频标题：{title}

视频分段转录（格式：时间 - 内容）：
---
{segment_text}
---

请根据上面的转录内容生成一份结构化视频笔记。
请在笔记末尾增加 **## AI 总结** 章节，用 3 到 5 句话概括视频核心内容。

{style_instruction}
{extras_instruction}""",
    "en": """Video title: {title}

Segmented transcript (format: timestamp - content):
---
{segment_text}
---

Please generate a structured video note from the transcript above.
Add a **## AI Summary** section at the end with 3 to 5 sentences summarizing the core ideas.

{style_instruction}
{extras_instruction}""",
}


def normalize_output_language(output_language: str | None) -> OutputLanguage:
    if output_language == "en":
        return "en"
    return DEFAULT_OUTPUT_LANGUAGE


def build_system_prompt(output_language: str | None = None) -> str:
    language = normalize_output_language(output_language)
    return SYSTEM_PROMPTS[language]


def build_user_prompt(
    title: str,
    segment_text: str,
    style: str = "detailed",
    extras: str | None = None,
    output_language: str | None = None,
) -> str:
    language = normalize_output_language(output_language)
    style_instruction = STYLE_INSTRUCTIONS[language].get(style, STYLE_INSTRUCTIONS[language]["detailed"])
    if extras:
        extras_instruction = (
            f"额外要求：{extras}" if language == "zh-CN" else f"Additional requirements: {extras}"
        )
    else:
        extras_instruction = ""

    return USER_PROMPT_TEMPLATES[language].format(
        title=title,
        segment_text=segment_text,
        style_instruction=style_instruction,
        extras_instruction=extras_instruction,
    )
