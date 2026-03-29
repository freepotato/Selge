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
import { watch, onBeforeUnmount } from 'vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue', 'blur'])

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  bulletListMarker: '-'
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

onBeforeUnmount(() => {
  if (editor.value) editor.value.destroy()
})
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
  font-family: 'JetBrains Mono', monospace;
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
  font-family: 'JetBrains Mono', monospace;
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
