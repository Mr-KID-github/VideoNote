import unittest

from app.models.transcript import TranscriptSegment
from app.services.note_media_service import NoteMediaService


class NoteMediaServiceTest(unittest.TestCase):
    def setUp(self):
        self.service = NoteMediaService()
        self.video_url = "https://www.youtube.com/watch?v=demo123"
        self.transcript = [
            TranscriptSegment(start=12.0, end=18.0, text="intro"),
            TranscriptSegment(start=95.0, end=105.0, text="core idea"),
            TranscriptSegment(start=180.0, end=190.0, text="wrap up"),
        ]

    def test_enrich_markdown_marks_only_key_sections(self):
        markdown = (
            "# Demo\n\n"
            "## Quick aside\n\n"
            "Tiny note.\n\n"
            "## Section A\n\n"
            "Point [01:35]\n\n"
            "- Item one\n- Item two\n- Item three\n\n"
            "## Section B\n\n"
            "This section has enough detail to count as a key moment even without an explicit inline timestamp.\n"
        )

        enriched = self.service.enrich_markdown(
            markdown=markdown,
            transcript_segments=self.transcript,
            video_url=self.video_url,
            output_language="en",
        )

        self.assertNotIn("# Demo [00:12]", enriched)
        self.assertNotIn("## Quick aside [", enriched)
        self.assertIn("## Section A [01:35](https://www.youtube.com/watch?v=demo123&t=95)", enriched)
        self.assertIn("## Section B [03:00](https://www.youtube.com/watch?v=demo123&t=180)", enriched)
        self.assertIn("[[Screenshot:01:35]]", enriched)
        self.assertIn("[[Screenshot:03:00]]", enriched)
        self.assertIn("[01:35](https://www.youtube.com/watch?v=demo123&t=95)", enriched)


if __name__ == "__main__":
    unittest.main()
