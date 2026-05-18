# flASTer <img src="public/favicon.svg">
A [web interface](https://ctrl-escp.github.io/flaster/) for exploring JS code structures using [flAST](https://github.com/ctrl-escp/flast)

Helpful in investigating code structures when obfuscating and deobfuscating JS.

## Under development
Feel free to open feature requests on the Issues page

## Features
- Easily see which nodes are caught by the filter and find them in the code.
- Combine several filters into a single rule.
- **API Surface** — static detection of browser and runtime API usage in the loaded script.
- **Capabilities** — behavioral patterns (fingerprinting, anti-debugging, tracking, etc.) inferred from API surface hits.
- Enjoy the VS-Code editor in your browser to help make changes to the code being investigated.

## CLI

flASTer ships a Node CLI for local use, CI pipelines, and LLM-driven workflows.

### Install

```bash
npm install -g flaster
```

### Usage

```bash
flaster [<input>] [options]
```

`<input>` is a path to a `.js` file, `-` for stdin, or omitted when stdin is piped.

### Quick examples

```bash
# Analyse a file — report written beside it as sample-flaster-report.json
flaster ./sample.js

# Pipe source, get JSON on stdout
echo 'window.innerWidth' | flaster - --stdout --format json

# Self-contained HTML report
flaster ./sample.js --stdout --format html

# Obfuscation analysis only, extended detail
flaster ./sample.js --section obfuscation --full --stdout

# Full analysis, report obfuscation section only
flaster ./sample.js --only-section obfuscation
```

### Flag groups

| Group | Flags | Notes |
|-------|-------|-------|
| **Analysis** | `--section`, `--structures` | Controls which matchers run |
| **Report** | `--only-section`, `--exclude-section` | Filters the output; implies full analysis |
| **Output** | `--format`, `--output`, `--stdout`, `--full` | Combinable with either group |

`--section` and `--report` flags are **mutually exclusive** — use one group per invocation.

Run `flaster --help` for full flag reference.

### Exit codes

| Code | Condition |
|------|-----------|
| `0` | Success (including zero findings) |
| `1` | User error (bad flags, unknown ids) |
| `2` | Parse failed |
| `3` | Internal error |

**CI note:** findings never affect the exit code. Check `totalFindings` in the JSON output if your pipeline needs to fail on findings:

```bash
flaster ./script.js --stdout | jq 'if .totalFindings > 0 then error else . end'
```
