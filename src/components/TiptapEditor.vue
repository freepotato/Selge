<template>
  <div class="tiptap-editor">
    <editor-content :editor="editor" class="tiptap-content" />
  </div>
</template>

<script setup>
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TurndownService from 'turndown'
import { marked } from 'marked'
import { watch, onBeforeUnmount, onMounted, ref } from 'vue'

// 自定义 marked 渲染器，处理本地图片
const renderer = new marked.Renderer()
const originalImage = renderer.image
renderer.image = function(href, title, text) {
  // 处理本地图片
  if (typeof href === 'string' && href.startsWith('local:')) {
    const imageId = href.replace('local:', '')
    const imageSrc = localStorage.getItem('selge_image_' + imageId)
    if (imageSrc) {
      return `<img src="${imageSrc}" alt="${text}" title="${title || ''}" style="max-width: 100%; height: auto; display: block; margin: 8px 0; border-radius: 4px; border: 1px solid var(--bd, #e5e7eb); padding: 4px; background: var(--sur, #fff);" />`
    }
  }
  // 处理普通图片
  return originalImage.call(this, href, title, text)
}

marked.setOptions({
  renderer: renderer
})

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'blur'])

// 自定义 turndown 服务，处理本地图片
const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-'
})

// 自定义图片处理规则
turndown.addRule('localImage', {
  filter: function(node) {
    return node.nodeName === 'IMG' && node.src && (node.src.startsWith('data:') || node.src.startsWith('local:'))
  },
  replacement: function(content, node) {
    const src = node.src
    if (src.startsWith('data:')) {
      // 生成唯一的图片ID
      const imageId = 'img_' + Date.now() + '_' + Math.floor(Math.random() * 10000)
      // 保存图片到本地存储
      try {
        localStorage.setItem('selge_image_' + imageId, src)
      } catch (error) {
        console.error('Failed to save image to localStorage:', error)
      }
      return `![${node.alt || 'Pasted image'}](local:${imageId})`
    } else if (src.startsWith('local:')) {
      // 已经是本地图片格式
      return `![${node.alt || 'Pasted image'}](${src})`
    }
    return `![${node.alt || 'Image'}](${src})`
  }
})

const editor = useEditor({
  extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] }
    }),
    Placeholder.configure({ placeholder: props.placeholder })
  ],
  content: props.modelValue ? marked.parse(props.modelValue) : '',
  onUpdate: ({ editor }) => {
    const md = turndown.turndown(editor.getHTML())
    emit('update:modelValue', md)
  },
  onBlur: ({ editor }) => {
    const md = turndown.turndown(editor.getHTML())
    emit('update:modelValue', md)
    emit('blur')
  },
  editorProps: {
    attributes: {
      class: 'prose prose-sm sm:prose lg:prose-lg focus:outline-none'
    },
    handlePaste: (view, event) => {
      const items = Array.from(event.clipboardData?.items || [])
      const imageItem = items.find(item => item.type.startsWith('image/'))
      
      if (imageItem) {
        event.preventDefault()
        const file = imageItem.getAsFile()
        if (file) {
          const reader = new FileReader()
          reader.onload = function(e) {
            const imageSrc = e.target.result
            
            // 生成唯一的图片ID
            const imageId = 'img_' + Date.now() + '_' + Math.floor(Math.random() * 10000)
            
            // 保存图片到本地存储
            try {
              localStorage.setItem('selge_image_' + imageId, imageSrc)
            } catch (error) {
              console.error('Failed to save image to localStorage:', error)
            }
            
            // 生成 Markdown 图片语法，使用本地存储的图片ID
            const markdownImage = `![Pasted image](local:${imageId})`
            
            // 获取当前编辑器内容
            const currentContent = props.modelValue || ''
            
            // 简单处理：直接追加图片到内容末尾
            const newContent = currentContent + '\n' + markdownImage + '\n'
            
            // 更新模型值
            emit('update:modelValue', newContent)
            
            // 刷新编辑器内容
            if (editor.value && editor.value.commands) {
              editor.value.commands.setContent(marked.parse(newContent))
            }
          }
          reader.readAsDataURL(file)
        }
        return true
      }
      return false
    }
  }
})



// 外部内容变化时同步到编辑器
watch(() => props.modelValue, (val) => {
  if (!editor.value) return
  const currentMd = turndown.turndown(editor.value.getHTML())
  if (currentMd !== val) {
    editor.value.commands.setContent(val ? marked.parse(val) : '')
  }
})

// 暴露 editor 实例
defineExpose({ editor })
</script>

<style>
.tiptap-editor {
  position: relative;
  width: 100%;
  min-height: 420px;
  border: 1px solid var(--bd, #e5e7eb);
  border-radius: var(--r, 10px);
  background: var(--sur, #fff);
  overflow: hidden;
}

.tiptap-content {
  height: 100%;
  min-height: 420px;
  padding: 16px 20px;
  outline: none;
  overflow-y: auto;
}

/* 基础排版 */
.tiptap-content p {
  margin: 0 0 8px;
  line-height: 1.9;
  font-size: 14px;
}

/* 占位符 */
.tiptap-content p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: var(--t4, #adb5bd);
  pointer-events: none;
  height: 0;
  font-style: normal;
}

/* 标题 */
.tiptap-content h1 { font-size: 1.6em; font-weight: 700; margin: 16px 0 8px; line-height: 1.4; color: var(--t1); }
.tiptap-content h2 { font-size: 1.3em; font-weight: 600; margin: 14px 0 6px; line-height: 1.4; color: var(--t1); }
.tiptap-content h3 { font-size: 1.1em; font-weight: 600; margin: 12px 0 4px; line-height: 1.4; color: var(--t1); }

/* 粗体、斜体、删除线 */
.tiptap-content strong { font-weight: 600; }
.tiptap-content em { font-style: italic; }
.tiptap-content s { text-decoration: line-through; color: var(--t3); }

/* 行内代码 */
.tiptap-content code {
  font-family: 'Monaco', 'Menlo', 'Consolas', 'Courier New', monospace;
  background: var(--bg2, #f5f5f5);
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 0.9em;
  color: var(--t1);
}

/* 代码块 */
.tiptap-content pre {
  background: var(--bg2, #f5f5f5);
  border-radius: 8px;
  padding: 12px 16px;
  margin: 8px 0;
  overflow-x: auto;
  font-family: 'Monaco', 'Menlo', 'Consolas', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.6;
}

.tiptap-content pre code {
  background: none;
  padding: 0;
  font-size: inherit;
  border-radius: 0;
}

/* 引用 */
.tiptap-content blockquote {
  border-left: 3px solid var(--acbd, #c8e6c9);
  padding: 4px 0 4px 14px;
  margin: 8px 0;
  color: var(--t3, #6c757d);
}

.tiptap-content blockquote p {
  margin: 2px 0;
}

/* 列表 */
.tiptap-content ul, .tiptap-content ol {
  padding-left: 24px;
  margin: 8px 0;
}

.tiptap-content li {
  margin: 3px 0;
  line-height: 1.8;
}

.tiptap-content li p {
  margin: 2px 0;
}

/* 分割线 */
.tiptap-content hr {
  border: none;
  border-top: 1px solid var(--bd, #e5e7eb);
  margin: 16px 0;
}

/* 链接 */
.tiptap-content a {
  color: var(--ac, #3d6b30);
  text-decoration: underline;
  cursor: pointer;
}

/* 图片 */
.tiptap-content img {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 8px 0;
  border-radius: 4px;
  border: 1px solid var(--bd, #e5e7eb);
  padding: 4px;
  background: var(--sur, #fff);
}

/* 段落间距 */
.tiptap-content p.is-empty {
  min-height: 1.9em;
}

/* 光标 */
.tiptap-content .ProseMirror {
  min-height: 400px;
  outline: none;
  color: var(--t1, #1a1a1a);
}

/* 深色模式 */
[data-theme="dark"] .tiptap-content code {
  background: rgba(255,255,255,.08);
}

[data-theme="dark"] .tiptap-content pre {
  background: rgba(255,255,255,.06);
}

[data-theme="dark"] .tiptap-content blockquote {
  color: var(--t3);
}
</style>