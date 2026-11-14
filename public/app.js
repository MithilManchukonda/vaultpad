const codeInput = document.getElementById("codeInput");
const notes = document.getElementById("notes");
const statusText = document.getElementById("status");

function showStatus(message) {
  statusText.textContent = message;
}

function getCode() {
  const code = codeInput.value.trim();
  if (code === "") {
    showStatus("Please enter your secret code first.");
    return null;
  }
  return code;
}

async function openPad() {
  const code = getCode();
  if (!code) return;

  showStatus("Opening...");
  try {
    const padId = await getPadId(code);
    const response = await fetch("/api/pads/" + padId);

    if (response.status === 404) {
      notes.value = "";
      showStatus("New pad. Write your notes and click Save.");
      return;
    }
    if (!response.ok) {
      showStatus("Server error. Try again.");
      return;
    }

    const data = await response.json();
    if (data.content === "") {
      notes.value = "";
      showStatus("Pad opened (empty).");
      return;
    }

    notes.value = await decryptText(code, data.content);
    showStatus("Pad opened.");
  } catch (err) {
    notes.value = "";
    showStatus("Could not open this pad. The data may be damaged.");
  }
}

async function savePad() {
  const code = getCode();
  if (!code) return;

  showStatus("Saving...");
  try {
    const padId = await getPadId(code);
    const locked = await encryptText(code, notes.value);

    const response = await fetch("/api/pads/" + padId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: locked }),
    });

    if (response.ok) {
      showStatus("Saved!");
    } else {
      showStatus("Could not save. Try again.");
    }
  } catch (err) {
    showStatus("Could not save. Check your connection.");
  }
}

async function deletePad() {
  const code = getCode();
  if (!code) return;

  const sure = confirm("Delete this pad forever? This cannot be undone.");
  if (!sure) return;

  showStatus("Deleting...");
  try {
    const padId = await getPadId(code);
    const response = await fetch("/api/pads/" + padId, { method: "DELETE" });

    if (response.status === 404) {
      showStatus("No pad found for this code.");
    } else if (response.ok) {
      notes.value = "";
      showStatus("Pad deleted.");
    } else {
      showStatus("Could not delete. Try again.");
    }
  } catch (err) {
    showStatus("Could not delete. Check your connection.");
  }
}

document.getElementById("openBtn").addEventListener("click", openPad);
document.getElementById("saveBtn").addEventListener("click", savePad);
document.getElementById("deleteBtn").addEventListener("click", deletePad);