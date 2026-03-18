import asyncio
import json
import httpx
from llama_index.core.agent.workflow import FunctionAgent
from llama_index.llms.openai import OpenAI


def http_call(
    url: str,
    method: str = "GET",
    body: str = "",
    headers: str = "",
) -> str:
    """Make an HTTP request to an agent or service.

    Args:
        url: The full URL to call.
        method: HTTP method: GET, POST, PUT, PATCH, DELETE.
        body: Request body as a JSON string (for POST/PUT/PATCH).
        headers: Additional headers as a JSON string, e.g. '{"Authorization": "Bearer token"}'.

    Returns:
        The response body as a string, prefixed with the status code.
    """
    parsed_headers = json.loads(headers) if headers else {}
    parsed_body = json.loads(body) if body else None

    with httpx.Client(timeout=30.0) as client:
        response = client.request(
            method=method.upper(),
            url=url,
            json=parsed_body,
            headers=parsed_headers,
        )
    return f"HTTP {response.status_code}: {response.text}"


def multiply(a: float, b: float) -> float:
    """Useful for multiplying two numbers."""
    return a * b


agent = FunctionAgent(
    tools=[multiply, http_call],
    llm=OpenAI(model="gpt-4o-mini"),
    system_prompt="You are a helpful assistant.",
)


async def main():
    response = await agent.run("What is 1234 * 4567?")
    print(str(response))


if __name__ == "__main__":
    asyncio.run(main())
