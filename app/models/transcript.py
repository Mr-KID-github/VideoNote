"""
音频转写结果数据模型
"""
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class TranscriptSegment:
    """单段转写片段"""
    start: float   # 开始时间（秒）
    end: float     # 结束时间（秒）
    text: str      # 转写文本


@dataclass
class TranscriptResult:
    """完整转写结果"""
    language: Optional[str]                # 检测到的语言 (zh / en / ...)
    full_text: str                         # 合并后的完整文本
    segments: List[TranscriptSegment]      # 时间轴分段
