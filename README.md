# Open WebUI Computer — Better Copy Response

A Tampermonkey userscript that adds a **“复制完整回答” (Copy Full Response)** button to Open WebUI Computer.

It helps preserve the structure of an assistant's response when copying text, including paragraph breaks, lists, tables, and code blocks.

## Features

- **Copy the complete response** with one click.
- **Preserve paragraph breaks** instead of flattening the response into a single block of text.
- **Keep list formatting** for ordered and unordered lists.
- **Preserve table structure** using tab-separated columns.
- **Keep code block line breaks** and indentation.
- **Support dynamically rendered responses** using a DOM observer.
- **No external service required.** The script does not intentionally transmit response content to a remote server.

## Requirements

- A browser that supports Tampermonkey.
- Open WebUI Computer accessible on port `8000`.
- A compatible Open WebUI interface with a recognizable native response-copy button and `.prose` response content.

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) in your browser.
2. Open the Tampermonkey dashboard.
3. Create a new userscript.
4. Copy the contents of [`openwebui-computer-copy-fix.user.js`](./openwebui-computer-copy-fix.user.js) into the editor.
5. Save the script.
6. Open or refresh your Open WebUI Computer page on port `8000`.
7. Look for the **复制完整回答** button beside the native response-copy button.

## Configuration

The userscript is configured to run on HTTP and HTTPS pages using port `8000`.

It does not contain a hard-coded server IP address, hostname, API key, or access token.

If your Open WebUI Computer instance uses a different port, update the port check in the script and review the Tampermonkey matching rules accordingly.

## Privacy

- No personal server address is hard-coded into the published script.
- No API keys, access tokens, or passwords are required.
- The script does not intentionally send copied response content to external services.
- The script operates on page content locally in the browser.

Because this userscript uses broad HTTP/HTTPS matching rules, Tampermonkey may load it on other websites before the port check exits. Review the script before installing it, and only install userscripts you trust.

## Limitations

- Open WebUI interface changes may affect button detection or response extraction.
- Table formatting is converted to tab-separated text, not a Markdown table.
- Exact formatting may vary depending on the response's HTML structure.
- Browser clipboard permissions may affect copying in some environments.

## Contributing

Bug reports, suggestions, and pull requests are welcome.

When reporting an issue, please include:
- Your browser and Tampermonkey versions.
- Your Open WebUI version, if known.
- The behavior you expected and what happened instead.

**Please remove private IP addresses, access tokens, API keys, passwords, and other sensitive information from logs and screenshots before sharing them.**

## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.
