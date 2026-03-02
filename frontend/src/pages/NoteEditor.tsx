import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Save, Download, Share2, MoreHorizontal, ArrowLeft, Edit3, Eye } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useNoteStore } from '../stores/noteStore'

export function NoteEditor() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { content, title, setContent } = useNoteStore()
  const [isPreview, setIsPreview] = useState(false)
  const [localTitle, setLocalTitle] = useState(title || '')

  useEffect(() => {
    if (id && !content) {
      // TODO: Load note from API
    }
  }, [id])

  const handleSave = () => {
    // TODO: Save to API
    console.log('Saving:', { title: localTitle, content })
  }

  const handleExport = () => {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${localTitle || 'note'}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <input
            type="text"
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            placeholder="无标题笔记"
            className="text-lg font-medium bg-transparent outline-none border-none focus:ring-0 w-64"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setIsPreview(false)}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
                !isPreview
                  ? 'bg-white dark:bg-[#202020] shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              <Edit3 className="w-4 h-4" />
              编辑
            </button>
            <button
              onClick={() => setIsPreview(true)}
              className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-md transition-colors ${
                isPreview
                  ? 'bg-white dark:bg-[#202020] shadow-sm'
                  : 'text-gray-500'
              }`}
            >
              <Eye className="w-4 h-4" />
              预览
            </button>
          </div>

          <button
            onClick={handleSave}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            title="保存"
          >
            <Save className="w-5 h-5" />
          </button>
          <button
            onClick={handleExport}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            title="导出"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            title="分享"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 编辑/预览区 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 编辑区 */}
        <div className={`flex-1 flex flex-col ${isPreview ? 'hidden md:flex' : 'flex'}`}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="flex-1 w-full p-4 resize-none outline-none bg-white dark:bg-[#191919] font-mono text-sm"
            placeholder="# 开始编写你的笔记...

## 要点1
内容...

## 要点2
内容..."
          />
        </div>

        {/* 预览区 */}
        <div className={`flex-1 border-l border-gray-200 dark:border-gray-700 overflow-auto bg-gray-50 dark:bg-[#202020] ${!isPreview ? 'hidden md:flex' : 'flex'}`}>
          <div className="prose dark:prose-invert max-w-none p-6 w-full">
            <ReactMarkdown
              components={{
                code({ node, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '')
                  return match ? (
                    <SyntaxHighlighter
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                      className="rounded-lg"
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  ) : (
                    <code className={`${className} bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded`} {...props}>
                      {children}
                    </code>
                  )
                },
                h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 pb-2 border-b">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl font-bold mt-6 mb-3">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg font-semibold mt-4 mb-2">{children}</h3>,
                p: ({ children }) => <p className="mb-3 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-6 mb-3">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-6 mb-3">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                blockquote: ({ children }) => <blockquote className="border-l-4 border-primary-light dark:border-primary-dark pl-4 italic my-4">{children}</blockquote>,
              }}
            >
              {content || '*暂无内容*'}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}
