import unittest

from app.llm.prompts import build_system_prompt, build_user_prompt, normalize_output_language


class PromptBuilderTest(unittest.TestCase):
    def test_normalize_output_language_defaults_to_chinese(self):
        self.assertEqual(normalize_output_language(None), "zh-CN")
        self.assertEqual(normalize_output_language("unexpected"), "zh-CN")
        self.assertEqual(normalize_output_language("en"), "en")

    def test_build_system_prompt_changes_with_language(self):
        chinese_prompt = build_system_prompt("zh-CN")
        english_prompt = build_system_prompt("en")

        self.assertIn("笔记主体必须使用中文", chinese_prompt)
        self.assertIn("must be written in English", english_prompt)

    def test_build_user_prompt_localizes_summary_title_and_extras(self):
        chinese_prompt = build_user_prompt(
            title="示例",
            segment_text="00:00 - 内容",
            style="detailed",
            extras="保留术语",
            output_language="zh-CN",
        )
        english_prompt = build_user_prompt(
            title="Example",
            segment_text="00:00 - Content",
            style="detailed",
            extras="Keep terms",
            output_language="en",
        )

        self.assertIn("## AI 总结", chinese_prompt)
        self.assertIn("额外要求：保留术语", chinese_prompt)
        self.assertIn("## AI Summary", english_prompt)
        self.assertIn("Additional requirements: Keep terms", english_prompt)


if __name__ == "__main__":
    unittest.main()
