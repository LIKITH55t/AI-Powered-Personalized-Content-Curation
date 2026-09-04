const goalEl = document.getElementById("goal");
const promptEl = document.getElementById("prompt");

chrome.storage.local.get(["goal", "prompt"], (s) => {
  if (s.goal) goalEl.value = s.goal;
  if (s.prompt) promptEl.value = s.prompt;
});

document.getElementById("save").addEventListener("click", async () => {
  const goal = goalEl.value;
  const prompt = promptEl.value;
  await chrome.storage.local.set({ goal, prompt });
  try {
    await fetch("http://127.0.0.1:8000/api/intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal, prompt }),
    });
  } catch (e) {
    console.warn(e);
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: "ORION_RESCORE", goal, prompt });
  window.close();
});
