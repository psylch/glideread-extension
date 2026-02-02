# AI Streaming Output Support

> Status: Discussion / Future Feature

## Problem

AI tools (ChatGPT, Claude.ai, etc.) stream text token-by-token into the DOM. Current GlideRead approach replaces text nodes with `<span>` structures for bionic reading, which conflicts with streaming — new tokens get appended outside our wrapper elements, causing format breakage or missed processing.

## Approaches to Explore

### 1. Deferred Processing (safest)
- Detect elements being actively streamed (frequent mutations)
- Skip processing during streaming
- Process after mutations stop for ~500ms
- **Pro:** No DOM conflicts, clean result
- **Con:** No effect during streaming

### 2. Real-time Tracking (most complex)
- Watch `characterData` mutations (text content changes)
- On change: strip old bionic formatting, reprocess entire element
- Debounce/throttle to manage performance
- **Pro:** Real-time bionic effect
- **Con:** Performance cost, complexity, may interfere with streaming

### 3. Hybrid (recommended direction)
- During streaming: only apply font scaling via CSS class (no DOM modification)
- After streaming ends: apply full bionic reading
- Font scaling is pure CSS, doesn't break DOM structure
- **Pro:** Immediate readability boost + full bionic after streaming
- **Con:** Need to reliably detect "streaming done"

## Sites to Investigate

- ChatGPT (chat.openai.com) — how does it render streamed tokens?
- Claude.ai — same question
- Gemini (gemini.google.com)
- Perplexity
- Local tools (Ollama web UIs, etc.)

## Key Questions

- How does each site append streamed tokens? (innerHTML replace vs text node append vs DOM diff)
- Can we reliably detect "streaming in progress" vs "done"?
- What's the performance budget for real-time reprocessing?

## Next Steps

- [ ] Inspect DOM mutation patterns on ChatGPT and Claude.ai during streaming
- [ ] Prototype deferred processing with mutation-idle detection
- [ ] Benchmark reprocessing cost on a typical streamed response
