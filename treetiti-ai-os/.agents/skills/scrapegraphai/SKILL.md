---
name: scrapegraphai
description: ScrapeGraphAI expert — LLM-powered web scraping in Python. Use when building AI scraping pipelines to extract structured data from websites or local documents (HTML, XML, JSON, Markdown). Covers all graph types (SmartScraperGraph, SearchGraph, SmartScraperMultiGraph, SpeechGraph, ScriptCreatorGraph, ScriptCreatorMultiGraph), LLM configuration (OpenAI, Groq, Azure, Gemini, Ollama, MiniMax), Playwright headless setup, output schema hinting, proxy config, and full-text search mode. Trigger on "scrapegraphai", "smart scraper", "AI web scraping", "extract data with LLM", "SmartScraperGraph", "SearchGraph", or "scrape into structured JSON".
---

# ScrapeGraphAI — LLM Web Scraping (You Only Scrape Once)

ScrapeGraphAI is a Python library that combines LLMs with graph logic to create scraping pipelines. You describe WHAT data you want; it figures out HOW to extract it and returns structured JSON.

## Core Model

```
prompt + source  →  [Graph pipeline]  →  structured JSON dict
```

**Input source** can be a URL, a local file path (HTML/XML/JSON/MD), or raw `html_content` passed directly.

## Graph Pipelines

| Graph | Use case |
|-------|----------|
| `SmartScraperGraph` | Single page → extract data from a prompt |
| `SearchGraph` | Search a search engine, extract from top-N results across scraped pages |
| `SmartScraperMultiGraph` | Many URLs, single prompt, parallel LLM calls |
| `SpeechGraph` | Extract info from a page → generate an audio file (TTS) |
| `ScriptCreatorGraph` | Extract info → generate a reusable Python scraping script |
| `ScriptCreatorMultiGraph` | Multiple URLs → generate a multi-page scraping script |

All graphs have a `*MultiGraph` variant that runs LLM calls in parallel.

## Quick Start

```bash
pip install scrapegraphai
playwright install        # required for fetching website content
```

### Basic SmartScraperGraph (Ollama local)

```python
from scrapegraphai.graphs import SmartScraperGraph
import json

graph_config = {
    "llm": {
        "model": "ollama/llama3.2",
        "model_tokens": 8192,
        "format": "json",
    },
    "verbose": True,
    "headless": False,
}

graph = SmartScraperGraph(
    prompt="Extract the company description, founders and social media links",
    source="https://example.com/",
    config=graph_config,
)
result = graph.run()
print(json.dumps(result, indent=4))
```

## LLM Configurations

### OpenAI / compatible

```python
graph_config = {
    "llm": {
        "api_key": "YOUR_OPENAI_API_KEY",
        "model": "openai/gpt-4o-mini",
    },
    "verbose": True,
    "headless": False,
}
```

### Groq (fast, cheap)

```python
"model": "groq/llama-3.1-8b-instant",
"api_key": "YOUR_GROQ_API_KEY",
```

### Azure OpenAI

```python
"llm": {
    "api_key": "...",
    "model": "azure/openai/gpt-4o-mini",
    "azure_endpoint": "https://YOUR-RESOURCE.openai.azure.com",
    "api_version": "2024-02-15-preview",
}
```

### Gemini

```python
"llm": {
    "api_key": "...",
    "model": "gemini/gemini-1.5-pro",
}
```

### Local models — Ollama

```bash
ollama pull llama3.2
```

```python
"llm": {
    "model": "ollama/llama3.2",
    "model_tokens": 8192,
    "format": "json",
}
```

### Optional embeddings (for topic/vector search nodes)

```python
"embeddings": {
    "model": "ollama/nomic-embed-text",
    "base_url": "http://localhost:11434",
}
```

## Key Config Options

| Option | Effect |
|--------|--------|
| `verbose` | Print pipeline execution steps |
| `headless` | Playwright headless mode (False shows browser) |
| `llm.format: "json"` | Request JSON output (use with models that support it) |
| `use_legacy_response_parser` | Registry-wide or inside `llm` block: fall back to regex-based output parsing when `format:"json"` is unsupported |
| `model_tokens` | Context window size for local models |
| `search_engine` | For SearchGraph nodes: `"google"`, `"bing"`, `"duckduckgo"`, `"github"`, `"youtube"`, etc. |
| `include_raw_content` | Return raw page content alongside extracted data |

### Legacy parser example (for strict-JSON-phobic models)

```python
graph_config = {
    "llm": {
        "api_key": "...",
        "model": "groq/llama-3.1-8b-instant",
        "use_legacy_response_parser": True,
    },
    "verbose": True,
    "headless": False,
}
graph = SmartScraperGraph(
    prompt="...",
    source="https://example.com/",
    config=graph_config,
)
```

## SmartScraperMultiGraph (multiple URLs)

```python
from scrapegraphai.graphs import SmartScraperMultiGraph

graph = SmartScraperMultiGraph(
    prompt="Extract job titles, location and salary from each listing",
    source=["https://site.com/jobs/1", "https://site.com/jobs/2"],
    config=graph_config,
)
result = graph.run()
```

## SearchGraph (search engine → top results)

```python
from scrapegraphai.graphs import SearchGraph

graph_config = {
    "llm": {"api_key": "...", "model": "openai/gpt-4o-mini"},
    "max_results": 5,           # default: 3
    "search_engine": "google",  # or bing / duckduckgo / github / youtube
    "verbose": True,
    "headless": True,
}
graph = SearchGraph(
    prompt="List prices and features for the top laptops",
    source="https://google.com",
    config=graph_config,
)
result = graph.run()
```

## Scraping Local Documents

```python
from scrapegraphai.graphs import SmartScraperGraph

graph = SmartScraperGraph(
    prompt="Extract the key findings and methodology",
    source="path/to/report.html",   # also works with .xml, .json, .md
    config=graph_config,
)
result = graph.run()
```

You can also pass a directory (e.g. a docs folder) so multiple local files are treated as a single source.

## ScriptCreatorGraph (generate reusable scraper)

```python
from scrapegraphai.graphs import ScriptCreatorGraph

graph = ScriptCreatorGraph(
    prompt="Generate a Python script that extracts product names and prices",
    source="https://example.com/",
    config=graph_config,
)
result = graph.run()   # result is a Python script
```

## Prompt Writing Best Practices

- **Be specific about the schema**: mention exact fields, e.g. "including a list of {name, price, currency}".
- **Name the shape** you want back: "return a JSON object with keys `products` (array of `{title, price, url}`)".
- **Ask for descriptions over raw text**: "a description of what the company does" yields readable results.
- For the best strict-JSON fidelity, prefer models/tokenizers that honor `"format": "json"` (OpenAI, newer Groq/Llama) or enable `use_legacy_response_parser`.

## Managed API (alternative to self-hosting)

ScrapeGraphAI also offers a hosted cloud API with official SDKs — zero infrastructure for JS rendering, anti-bot, crawl + scheduled monitor jobs, billed per credit:

- Python SDK: `pip install scrapegraph-py` (auth via `SGAI_API_KEY`)
- JS/TS SDK: `npm install @scrapegraphai/js`
- API docs: https://docs.scrapegraphai.com/introduction
- MCP server: https://smithery.ai/server/@ScrapeGraphAI/scrapegraph-mcp

Use the open-source library when you want on-prem/local LLMs (Ollama), full control, and cost tuning. Use the API when you want managed stealth rendering and scaling.

## Gotchas

- **Telemetry**: opt out with `SCRAPEGRAPHAI_TELEMETRY_ENABLED=false`.
- Install in a virtualenv to avoid dependency conflicts.
- `playwright install` (not just the pip package) is required or page fetching fails.
- LLM model naming convention is `provider/model` OR `provider/group/model` (e.g. `azure/openai/gpt-4o-mini`).
- Multi-graphs make parallel LLM calls — mind rate limits and token cost.

## Example Output

```json
{
    "description": "ScrapeGraphAI transforms websites into clean, organized data.",
    "founders": [
        {"name": "Marco Vinciguerra", "role": "Founder & Software Engineer"}
    ],
    "social_media_links": {
        "linkedin": "https://www.linkedin.com/company/101881123",
        "github": "https://github.com/ScrapeGraphAI/Scrapegraph-ai"
    }
}
```