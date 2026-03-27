"""
VINote MCP server.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.services.mcp_service import mcp_server


def main():
    print("VINote MCP Server started", file=sys.stderr)

    while True:
        try:
            line = sys.stdin.readline()
            if not line:
                break

            request = json.loads(line.strip())
            response = mcp_server.handle_payload(request)
            if response is not None:
                print(json.dumps(response), flush=True)
        except Exception as exc:
            print(f"Error: {exc}", file=sys.stderr)


if __name__ == "__main__":
    main()
