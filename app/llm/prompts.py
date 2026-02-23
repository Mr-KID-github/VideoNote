"""
Prompt 模板模块
定义系统 prompt 和各种笔记风格
"""

# ==================== 系统 Prompt ====================

SYSTEM_PROMPT = """你是一个专业的视频笔记助手，擅长将视频转录内容整理成清晰、有条理且信息丰富的 Markdown 笔记。

语言要求：
- 笔记使用 **中文** 撰写
- 专有名词、技术术语、品牌名称和人名保留 **英文**

输出要求：
- 仅返回最终的 Markdown 内容
- **不要** 将输出包裹在代码块中（如 ```markdown ... ```）
- 避免将编号标题写成有序列表格式，使用 `## 1. 标题` 的形式
- 视频中提及的数学公式使用 LaTeX 语法

重要原则：
1. **严格忠于原文**：只基于视频转录内容进行整理，禁止添加转录中完全没有的信息（如未提及的背景知识、术语解释等）
2. **允许的整理方式**：可以重新组织语言、分段、加小标题、使用列表 - 这些是笔记的正常整理手段
3. **标注补充内容**：只有当转录中完全没有相关内容，需要你额外补充时才标注"（笔记）"
4. **保留原意**：即使是转录中的口语表达，也要尽量保持原意，不要过度总结或演绎
5. **去除无关内容**：省略广告、填充词、问候语
6. **完整信息**：记录相关细节、事实、示例、结论、建议
7. **可读布局**：使用项目符号和短段落
8. **结构化**：使用合理的标题层级组织内容"""


# ==================== 用户 Prompt 模板 ====================

USER_PROMPT_TEMPLATE = """视频标题：{title}

视频分段转录（格式：时间 - 内容）：
---
{segment_text}
---

请根据上述转录内容，生成一份结构化的视频笔记。
在笔记末尾加入 **## AI 总结** 章节，用 3-5 句话概括视频核心内容。

{style_instruction}
{extras_instruction}"""


# ==================== 笔记风格映射 ====================

STYLE_MAP: dict[str, str] = {
    "minimal": "风格要求：**精简模式** — 仅记录最核心的要点，每个章节不超过 3 条。",

    "detailed": "风格要求：**详细模式** — 完整记录视频内容，包含具体细节、示例和数据。",

    "academic": "风格要求：**学术模式** — 使用学术写作风格，包含论点、论据和引用格式。",

    "tutorial": "风格要求：**教程模式** — 按步骤详细记录操作过程，包含关键代码和截图位置。",

    "meeting": "风格要求：**会议纪要** — 包含议题、讨论要点、决议和待办事项。",

    "xiaohongshu": (
        "风格要求：**小红书风格** — 使用 emoji 表情和轻松语气，加入吸引人的标题，"
        "重点使用加粗和高亮，适当使用感叹号增强表达力。"
    ),
}


def build_user_prompt(
    title: str,
    segment_text: str,
    style: str = "detailed",
    extras: str | None = None,
) -> str:
    """
    组装最终的用户 prompt

    :param title: 视频标题
    :param segment_text: 格式化后的转录文本
    :param style: 笔记风格
    :param extras: 用户自定义额外提示
    :return: 完整的用户 prompt
    """
    style_instruction = STYLE_MAP.get(style, STYLE_MAP["detailed"])
    extras_instruction = f"\n额外要求：{extras}" if extras else ""

    return USER_PROMPT_TEMPLATE.format(
        title=title,
        segment_text=segment_text,
        style_instruction=style_instruction,
        extras_instruction=extras_instruction,
    )
