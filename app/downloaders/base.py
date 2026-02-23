"""
下载器抽象基类
所有平台的下载器都需要继承此类并实现 download 方法
"""
from abc import ABC, abstractmethod
from typing import Optional

from app.models.audio import AudioDownloadResult


class Downloader(ABC):
    """视频/音频下载器基类"""

    @abstractmethod
    def download(self, video_url: str, output_dir: str) -> AudioDownloadResult:
        """
        下载视频的音频轨道

        :param video_url: 视频链接
        :param output_dir: 输出目录
        :return: 下载结果元数据
        """
        ...

    def detect_video_id(self, video_url: str) -> Optional[str]:
        """从 URL 中提取视频 ID（子类可覆盖）"""
        return None
