export function autoResize(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

export function setStatus(statusEl, msg) {
  statusEl.textContent = `Status: ${msg}`;
}

export function setButtonLabel(btn, text) {
  btn.textContent = text;
}

// export function clearOutputs(els) {
//   const { outputOriginalEl, outputEnglishEl, outputReplyEl, chatInput, outputReplyHindiEl } = els;

//   outputOriginalEl.value = "";
//   outputEnglishEl.value = "";
//   outputReplyEl.value = "";
//   chatInput.value = "";
//   if (outputReplyHindiEl) outputReplyHindiEl.value = "";

//   autoResize(outputOriginalEl);
//   autoResize(outputEnglishEl);
//   autoResize(outputReplyEl);
//   autoResize(chatInput);
//   if (outputReplyHindiEl) autoResize(outputReplyHindiEl);
// }


export function clearOutputs(els) {
  // For textareas/inputs
  if (els.outputOriginalEl) els.outputOriginalEl.value = "";
  if (els.outputEnglishEl) els.outputEnglishEl.value = "";
  if (els.outputReplyEl) els.outputReplyEl.value = "";

  // If these are <pre> or <div> instead of input/textarea:
  if (els.outputOriginalEl) els.outputOriginalEl.textContent = "";
  if (els.outputEnglishEl) els.outputEnglishEl.textContent = "";
  if (els.outputReplyEl) els.outputReplyEl.textContent = "";

  // Optional: clear chat input too
  if (els.chatInput) els.chatInput.value = "";
}
