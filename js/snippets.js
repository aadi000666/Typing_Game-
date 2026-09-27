export const snippets = {
  standard: [
    { title: "Warm up / 01", text: "The best way to predict the future is to create it." },
    { title: "Warm up / 02", text: "Small steps every day add up to remarkable change." },
    { title: "Warm up / 03", text: "Stay curious. Keep building. Make something useful." },
    { title: "Warm up / 04", text: "Focus is choosing what to leave unfinished." }
  ],
  javascript: [
    { title: "JavaScript / 01", text: "const clamp = (value, min, max) => Math.min(Math.max(value, min), max);" },
    { title: "JavaScript / 02", text: "const unique = items => [...new Set(items)];\n\nconsole.log(unique([2, 2, 5, 8]));" },
    { title: "JavaScript / 03", text: "async function loadProfile(userId) {\n  const response = await fetch(`/api/users/${userId}`);\n  return response.json();\n}" }
  ],
  python: [
    { title: "Python / 01", text: "def fibonacci(limit):\n    a, b = 0, 1\n    while a < limit:\n        yield a\n        a, b = b, a + b" },
    { title: "Python / 02", text: "from collections import Counter\n\nwords = ['ship', 'build', 'ship']\nprint(Counter(words))" },
    { title: "Python / 03", text: "class Timer:\n    def __init__(self):\n        self.elapsed = 0\n\n    def tick(self, delta):\n        self.elapsed += delta" }
  ],
  cpp: [
    { title: "C++ / 01", text: "#include <iostream>\n#include <vector>\n\nint main() {\n    std::vector<int> values{2, 4, 6};\n    for (const auto value : values) {\n        std::cout << value << '\\n';\n    }\n}" },
    { title: "C++ / 02", text: "template <typename T>\nT clamp(T value, T low, T high) {\n    return value < low ? low : (value > high ? high : value);\n}" }
  ],
  html: [
    { title: "HTML / 01", text: "<main class=\"workspace\">\n  <h1>Build something useful.</h1>\n  <button type=\"button\">Get started</button>\n</main>" },
    { title: "HTML / 02", text: "<article aria-labelledby=\"title\">\n  <h2 id=\"title\">A small, good idea</h2>\n  <p>Make it real, then make it better.</p>\n</article>" }
  ]
};